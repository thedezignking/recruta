-- Recruta bot, phase A (ADR 0007): an explainable match grade per application,
-- derived from the latest successful screening run plus recruiter corrections.
-- Kept in its own table so grading never bumps applications.updated_at, which
-- review_application uses for stale-change protection.
create table public.application_matches (
  agency_id uuid not null,
  application_id uuid not null,
  run_id uuid not null,
  band text not null check (band in ('strong', 'partial', 'weak')),
  required_met integer not null check (required_met >= 0),
  required_total integer not null check (required_total >= 0),
  preferred_met integer not null check (preferred_met >= 0),
  preferred_total integer not null check (preferred_total >= 0),
  gaps jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (agency_id, application_id),
  foreign key (agency_id, application_id)
    references public.applications(agency_id, id) on delete cascade,
  foreign key (agency_id, run_id)
    references public.screening_runs(agency_id, id) on delete cascade
);
create index application_matches_band on public.application_matches(agency_id, band);

alter table public.application_matches enable row level security;
revoke all on public.application_matches from public, anon, authenticated;
grant select on public.application_matches to authenticated;
grant all on public.application_matches to service_role;
create policy application_matches_read on public.application_matches
  for select to authenticated
  using (private.can_review_application(agency_id, application_id));

-- Bands use required criteria; a job with only preferred criteria is graded
-- on those instead. Corrections override the model's verdict.
--   weak:    any criterion contradicted, or fewer than half supported
--   strong:  every criterion supported
--   partial: otherwise
create function private.refresh_application_match(p_agency uuid, p_application uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.screening_runs;
  v_req_total integer; v_req_met integer; v_req_contra boolean;
  v_pref_total integer; v_pref_met integer; v_pref_contra boolean;
  v_total integer; v_met integer; v_contra boolean;
  v_gaps jsonb; v_band text;
begin
  select * into r from public.screening_runs
  where agency_id = p_agency and application_id = p_application and status = 'succeeded'
  order by finished_at desc nulls last, created_at desc
  limit 1;
  if not found or r.assessment is null then
    delete from public.application_matches
    where agency_id = p_agency and application_id = p_application;
    return;
  end if;

  with req as (
    select (e->>'id')::uuid as id, e->>'label' as label, e->>'requirement_type' as kind
    from jsonb_array_elements(coalesce(r.input_snapshot->'requirements', '[]'::jsonb)) e
  ), crit as (
    select (c->>'requirementId')::uuid as id, c->>'verdict' as verdict, c->>'followUp' as follow_up
    from jsonb_array_elements(coalesce(r.assessment->'criteria', '[]'::jsonb)) c
  ), corr as (
    select distinct on (requirement_id) requirement_id as id, verdict
    from public.screening_corrections
    where agency_id = p_agency and run_id = r.id
    order by requirement_id, created_at desc
  ), merged as (
    select req.id, req.label, req.kind, crit.follow_up,
      coalesce(corr.verdict, crit.verdict, 'unclear') as verdict
    from req
    left join crit on crit.id = req.id
    left join corr on corr.id = req.id
  )
  select
    count(*) filter (where kind = 'required'),
    count(*) filter (where kind = 'required' and verdict = 'supported'),
    coalesce(bool_or(kind = 'required' and verdict = 'contradicted'), false),
    count(*) filter (where kind = 'preferred'),
    count(*) filter (where kind = 'preferred' and verdict = 'supported'),
    coalesce(bool_or(kind = 'preferred' and verdict = 'contradicted'), false),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'requirementId', id, 'label', label, 'type', kind,
          'verdict', verdict, 'followUp', follow_up
        ) order by kind desc, label
      ) filter (where verdict <> 'supported'),
      '[]'::jsonb
    )
  into v_req_total, v_req_met, v_req_contra, v_pref_total, v_pref_met, v_pref_contra, v_gaps
  from merged;

  if v_req_total > 0 then
    v_total := v_req_total; v_met := v_req_met; v_contra := v_req_contra;
  else
    v_total := v_pref_total; v_met := v_pref_met; v_contra := v_pref_contra;
  end if;
  if v_total = 0 then
    delete from public.application_matches
    where agency_id = p_agency and application_id = p_application;
    return;
  end if;

  v_band := case
    when v_contra or v_met * 2 < v_total then 'weak'
    when v_met = v_total then 'strong'
    else 'partial'
  end;

  insert into public.application_matches(
    agency_id, application_id, run_id, band,
    required_met, required_total, preferred_met, preferred_total, gaps, updated_at
  ) values (
    p_agency, p_application, r.id, v_band,
    v_req_met, v_req_total, v_pref_met, v_pref_total, v_gaps, now()
  )
  on conflict (agency_id, application_id) do update set
    run_id = excluded.run_id, band = excluded.band,
    required_met = excluded.required_met, required_total = excluded.required_total,
    preferred_met = excluded.preferred_met, preferred_total = excluded.preferred_total,
    gaps = excluded.gaps, updated_at = excluded.updated_at;
end;
$$;
revoke all on function private.refresh_application_match(uuid, uuid) from public, anon, authenticated;

create function private.screening_run_match_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'succeeded' and old.status is distinct from 'succeeded' then
    perform private.refresh_application_match(new.agency_id, new.application_id);
  end if;
  return null;
end;
$$;
revoke all on function private.screening_run_match_trigger() from public, anon, authenticated;
create trigger screening_runs_refresh_match
  after update of status on public.screening_runs
  for each row execute function private.screening_run_match_trigger();

create function private.screening_correction_match_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.refresh_application_match(new.agency_id, new.application_id);
  return null;
end;
$$;
revoke all on function private.screening_correction_match_trigger() from public, anon, authenticated;
create trigger screening_corrections_refresh_match
  after insert on public.screening_corrections
  for each row execute function private.screening_correction_match_trigger();

-- Grade applications that were already screened.
select private.refresh_application_match(agency_id, application_id)
from (
  select distinct agency_id, application_id
  from public.screening_runs
  where status = 'succeeded'
) screened;

-- The inbox shows each application's grade and can filter by band.
create or replace function public.application_inbox(p_agency_id uuid,p_filters jsonb default '{}'::jsonb)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with filtered as (
    select a.*,c.full_name,c.email,c.phone,j.title,j.public_slug,o.name organization_name,p.full_name owner_name,
      m.band match_band,m.required_met match_required_met,m.required_total match_required_total,
      m.preferred_met match_preferred_met,m.preferred_total match_preferred_total
    from public.applications a
    join public.candidates c on c.agency_id=a.agency_id and c.id=a.candidate_id
    join public.jobs j on j.agency_id=a.agency_id and j.id=a.job_id
    join public.agencies g on g.id=a.agency_id
    join public.clients o on o.agency_id=j.agency_id and o.id=j.client_id
    left join public.user_profiles p on p.id=a.owner_user_id
    left join public.application_matches m on m.agency_id=a.agency_id and m.application_id=a.id
    where a.agency_id=p_agency_id
      and (nullif(p_filters->>'submittedFrom','') is null or a.submitted_at >= ((p_filters->>'submittedFrom')::date::timestamp at time zone g.timezone))
      and (nullif(p_filters->>'submittedTo','') is null or a.submitted_at < (((p_filters->>'submittedTo')::date+1)::timestamp at time zone g.timezone))
      and (nullif(p_filters->>'jobId','') is null or a.job_id=(p_filters->>'jobId')::uuid)
      and (nullif(p_filters->>'candidateId','') is null or a.candidate_id=(p_filters->>'candidateId')::uuid)
      and (nullif(p_filters->>'status','') is null or a.status=p_filters->>'status')
      and (nullif(p_filters->>'processingStatus','') is null or a.processing_status=p_filters->>'processingStatus')
      and (nullif(p_filters->>'source','') is null or a.source=p_filters->>'source')
      and (nullif(p_filters->>'owner','') is null or
        (p_filters->>'owner'='mine' and a.owner_user_id=(select auth.uid())) or
        (p_filters->>'owner'='unassigned' and a.owner_user_id is null))
      and (nullif(p_filters->>'match','') is null or
        (p_filters->>'match'='ungraded' and m.band is null) or m.band=p_filters->>'match')
      and (nullif(p_filters->>'q','') is null or strpos(lower(concat_ws(' ',c.full_name,c.email,j.title,o.name)),lower(p_filters->>'q'))>0)
  ), page as (
    select * from filtered where p_filters->>'cursorAt' is null
      or (submitted_at,id)<((p_filters->>'cursorAt')::timestamptz,(p_filters->>'cursorId')::uuid)
    order by submitted_at desc,id desc limit 26
  ), visible as (select * from page order by submitted_at desc,id desc limit 25)
  select jsonb_build_object(
    'items',coalesce((select jsonb_agg(jsonb_build_object(
      'id',id,'status',status,'processing_status',processing_status,'source',source,'submitted_at',submitted_at,
      'owner_user_id',owner_user_id,'owner_name',owner_name,
      'match',case when match_band is null then null else jsonb_build_object('band',match_band,
        'required_met',match_required_met,'required_total',match_required_total,
        'preferred_met',match_preferred_met,'preferred_total',match_preferred_total) end,
      'candidates',jsonb_build_object('id',candidate_id,'full_name',full_name,'email',email,'phone',phone),
      'jobs',jsonb_build_object('id',job_id,'title',title,'public_slug',public_slug,'clients',jsonb_build_object('name',organization_name))
    ) order by submitted_at desc,id desc) from visible),'[]'::jsonb),
    'total',(select count(*) from filtered),
    'nextCursor',case when (select count(*) from page)>25 then
      (select jsonb_build_object('at',submitted_at,'id',id) from visible order by submitted_at,id limit 1) else null end
  );
$$;
