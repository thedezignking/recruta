-- Applicant review is job-scoped for recruiters; managers retain agency-wide access.
create or replace function private.can_review_job(p_agency_id uuid, p_job_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.agency_memberships m
    join public.jobs j on j.agency_id=m.agency_id and j.id=p_job_id
    where m.agency_id=p_agency_id and m.user_id=(select auth.uid()) and m.status='active'
      and (m.role in ('owner','administrator','recruitment_manager') or exists (
        select 1 from public.job_assignments a
        where a.agency_id=p_agency_id and a.job_id=p_job_id and a.user_id=m.user_id
      ))
  );
$$;
create or replace function private.can_review_application(p_agency_id uuid, p_application_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.applications a where a.agency_id=p_agency_id
    and a.id=p_application_id and private.can_review_job(a.agency_id,a.job_id));
$$;
revoke all on function private.can_review_job(uuid,uuid), private.can_review_application(uuid,uuid) from public, anon;
grant execute on function private.can_review_job(uuid,uuid), private.can_review_application(uuid,uuid) to authenticated;

-- Existing job-assignment policies already restrict writes to managers.

alter table public.applications add column owner_user_id uuid;
alter table public.applications add constraint applications_owner_membership_fk
  foreign key (agency_id,owner_user_id) references public.agency_memberships(agency_id,user_id) on delete restrict;
create index applications_inbox_cursor_idx on public.applications(agency_id,submitted_at desc,id desc);
create index applications_owner_idx on public.applications(agency_id,owner_user_id,submitted_at desc,id desc);

create table public.application_notes (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  application_id uuid not null,
  author_user_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default clock_timestamp(),
  foreign key (agency_id,application_id) references public.applications(agency_id,id) on delete restrict
);
create index application_notes_application_idx on public.application_notes(agency_id,application_id,created_at desc,id desc);
alter table public.application_notes enable row level security;
create policy application_notes_read on public.application_notes for select to authenticated
  using (private.can_review_application(agency_id,application_id));
revoke all on public.application_notes from public,anon,authenticated;
grant select on public.application_notes to authenticated;
grant all on public.application_notes to service_role;

-- Close direct-write bypasses. Intake continues through the existing service-only transaction.
do $$ declare p record; begin
  for p in select tablename,policyname from pg_policies where schemaname='public'
    and tablename in ('applications','candidates','application_answers','candidate_documents') and cmd in ('ALL','INSERT','UPDATE','DELETE')
  loop execute format('drop policy %I on public.%I',p.policyname,p.tablename); end loop;
end $$;
drop policy applications_read_agency on public.applications;
create policy applications_read_reviewers on public.applications for select to authenticated
  using (private.can_review_job(agency_id,job_id));
drop policy candidates_read_agency on public.candidates;
create policy candidates_read_reviewers on public.candidates for select to authenticated using (
  private.has_agency_role(agency_id,array['owner','administrator','recruitment_manager'])
  or exists(select 1 from public.applications a where a.candidate_id=candidates.id and a.agency_id=candidates.agency_id)
);
drop policy application_answers_read_agency on public.application_answers;
create policy application_answers_read_reviewers on public.application_answers for select to authenticated
  using (private.can_review_application(agency_id,application_id));
drop policy candidate_documents_read_agency on public.candidate_documents;
create policy candidate_documents_read_reviewers on public.candidate_documents for select to authenticated
  using (private.can_review_application(agency_id,application_id));
revoke insert,update,delete on public.applications,public.candidates,public.application_answers,public.candidate_documents from authenticated;

drop policy activity_events_read on public.activity_events;
create policy activity_events_read on public.activity_events for select to authenticated using (
  private.is_active_agency_member(agency_id)
  and (entity_type<>'application' or private.can_review_application(agency_id,entity_id))
);

-- Only this narrow private function can change application review state.
create or replace function private.review_application(
  p_agency_id uuid,p_application_id uuid,p_action text,p_payload jsonb,
  p_expected_updated_at timestamptz,p_request_id text
) returns public.applications language plpgsql security definer set search_path = '' as $$
declare
  v_app public.applications;
  v_target text;
  v_owner uuid;
  v_note uuid;
  v_reason text := nullif(trim(p_payload->>'reason'),'');
  v_before jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not private.can_review_application(p_agency_id,p_application_id) then raise exception 'application_not_found'; end if;
  select * into v_app from public.applications where agency_id=p_agency_id and id=p_application_id for update;
  if v_app.id is null then raise exception 'application_not_found'; end if;
  -- Notes are idempotent by their client-generated UUID, even after a lost response.
  if p_action='note' then
    v_note := (p_payload->>'noteId')::uuid;
    if v_note is null or char_length(trim(coalesce(p_payload->>'body',''))) not between 1 and 5000 then
      raise exception 'invalid_note';
    end if;
    if exists(select 1 from public.application_notes where id=v_note) then
      if not exists(select 1 from public.application_notes where id=v_note and agency_id=p_agency_id
        and application_id=p_application_id and author_user_id=auth.uid() and body=trim(p_payload->>'body')) then
        raise exception 'idempotency_conflict';
      end if;
      return v_app;
    end if;
    insert into public.application_notes(id,agency_id,application_id,author_user_id,body)
      values(v_note,p_agency_id,p_application_id,auth.uid(),trim(p_payload->>'body'));
    insert into public.activity_events(agency_id,actor_user_id,event_type,entity_type,entity_id,request_id,metadata)
      values(p_agency_id,auth.uid(),'application.note_added','application',p_application_id,p_request_id,jsonb_build_object('noteId',v_note));
    return v_app;
  end if;
  if p_expected_updated_at is null or v_app.updated_at<>p_expected_updated_at then raise exception 'application_changed'; end if;
  if p_action='transition' then
    v_target:=p_payload->>'status';
    if not (
      (v_app.status='received' and v_target in ('in_review','rejected','withdrawn')) or
      (v_app.status='in_review' and v_target in ('shortlisted','rejected','withdrawn')) or
      (v_app.status='shortlisted' and v_target in ('in_review','client_review','interview','rejected','withdrawn')) or
      (v_app.status='client_review' and v_target in ('in_review','shortlisted','interview','rejected','withdrawn')) or
      (v_app.status='interview' and v_target in ('shortlisted','offer','rejected','withdrawn')) or
      (v_app.status='offer' and v_target in ('interview','rejected','withdrawn')) or
      (v_app.status in ('rejected','withdrawn') and v_target='in_review')
    ) or v_target is null then raise exception 'invalid_application_transition'; end if;
    if (v_target in ('rejected','withdrawn') or v_app.status in ('rejected','withdrawn'))
      and char_length(coalesce(v_reason,''))<5 then raise exception 'transition_reason_required'; end if;
    if char_length(coalesce(v_reason,''))>2000 then raise exception 'invalid_reason'; end if;
    v_before:=jsonb_build_object('from',v_app.status,'to',v_target,'reason',v_reason);
    update public.applications set status=v_target,updated_at=clock_timestamp()
      where id=p_application_id returning * into v_app;
  elsif p_action='assign' then
    v_owner:=nullif(p_payload->>'ownerUserId','')::uuid;
    if v_owner is not null and not exists (
      select 1 from public.agency_memberships m where m.agency_id=p_agency_id and m.user_id=v_owner and m.status='active'
        and (m.role in ('owner','administrator','recruitment_manager') or exists (
          select 1 from public.job_assignments j where j.agency_id=p_agency_id and j.job_id=v_app.job_id and j.user_id=v_owner
        ))
    ) then raise exception 'invalid_application_owner'; end if;
    if not private.has_agency_role(p_agency_id,array['owner','administrator','recruitment_manager'])
      and (v_owner is distinct from auth.uid() or (v_app.owner_user_id is not null and v_app.owner_user_id<>auth.uid())) then
      raise exception 'permission_denied';
    end if;
    if v_app.owner_user_id is not distinct from v_owner then return v_app; end if;
    v_before:=jsonb_build_object('fromOwner',v_app.owner_user_id,'toOwner',v_owner);
    update public.applications set owner_user_id=v_owner,updated_at=clock_timestamp()
      where id=p_application_id returning * into v_app;
  else raise exception 'invalid_application_action';
  end if;
  insert into public.activity_events(agency_id,actor_user_id,event_type,entity_type,entity_id,request_id,metadata)
    values(p_agency_id,auth.uid(),case when p_action='transition' then 'application.status_changed' else 'application.owner_changed' end,
      'application',p_application_id,p_request_id,v_before);
  return v_app;
end;
$$;
revoke all on function private.review_application(uuid,uuid,text,jsonb,timestamptz,text) from public,anon;
grant execute on function private.review_application(uuid,uuid,text,jsonb,timestamptz,text) to authenticated;
create or replace function public.review_application(
  p_agency_id uuid,p_application_id uuid,p_action text,p_payload jsonb,
  p_expected_updated_at timestamptz default null,p_request_id text default null
) returns public.applications language sql security invoker set search_path = '' as $$
  select private.review_application(p_agency_id,p_application_id,p_action,p_payload,p_expected_updated_at,p_request_id);
$$;
revoke all on function public.review_application(uuid,uuid,text,jsonb,timestamptz,text) from public,anon;
grant execute on function public.review_application(uuid,uuid,text,jsonb,timestamptz,text) to authenticated;

-- The invoker's table RLS governs every list row, join, count, and search result.
create or replace function public.application_inbox(p_agency_id uuid,p_filters jsonb default '{}'::jsonb)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with filtered as (
    select a.*,c.full_name,c.email,c.phone,j.title,j.public_slug,o.name organization_name,p.full_name owner_name
    from public.applications a
    join public.candidates c on c.agency_id=a.agency_id and c.id=a.candidate_id
    join public.jobs j on j.agency_id=a.agency_id and j.id=a.job_id
    join public.clients o on o.agency_id=j.agency_id and o.id=j.client_id
    left join public.user_profiles p on p.id=a.owner_user_id
    where a.agency_id=p_agency_id
      and (nullif(p_filters->>'jobId','') is null or a.job_id=(p_filters->>'jobId')::uuid)
      and (nullif(p_filters->>'candidateId','') is null or a.candidate_id=(p_filters->>'candidateId')::uuid)
      and (nullif(p_filters->>'status','') is null or a.status=p_filters->>'status')
      and (nullif(p_filters->>'processingStatus','') is null or a.processing_status=p_filters->>'processingStatus')
      and (nullif(p_filters->>'source','') is null or a.source=p_filters->>'source')
      and (nullif(p_filters->>'owner','') is null or
        (p_filters->>'owner'='mine' and a.owner_user_id=(select auth.uid())) or
        (p_filters->>'owner'='unassigned' and a.owner_user_id is null))
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
      'candidates',jsonb_build_object('id',candidate_id,'full_name',full_name,'email',email,'phone',phone),
      'jobs',jsonb_build_object('id',job_id,'title',title,'public_slug',public_slug,'clients',jsonb_build_object('name',organization_name))
    ) order by submitted_at desc,id desc) from visible),'[]'::jsonb),
    'total',(select count(*) from filtered),
    'nextCursor',case when (select count(*) from page)>25 then
      (select jsonb_build_object('at',submitted_at,'id',id) from visible order by submitted_at,id limit 1) else null end
  );
$$;
revoke all on function public.application_inbox(uuid,jsonb) from public,anon;
grant execute on function public.application_inbox(uuid,jsonb) to authenticated;

notify pgrst,'reload schema';
