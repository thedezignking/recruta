-- Durable screening work and immutable source/output snapshots. No provider call
-- runs in a transaction, and screening never changes the recruitment lifecycle.
alter table public.candidate_documents add constraint candidate_documents_tenant_application_id unique(agency_id,application_id,id);
create table public.screening_runs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  application_id uuid not null,
  document_id uuid not null,
  requested_by uuid references auth.users(id) on delete set null,
  request_id text not null,
  idempotency_key uuid not null,
  input_snapshot jsonb not null,
  input_fingerprint text not null,
  model text not null check (char_length(model) between 1 and 100),
  prompt_version text not null,
  extractor_version text not null,
  status text not null default 'queued' check(status in ('queued','running','succeeded','failed','cancelled')),
  attempts integer not null default 0 check(attempts between 0 and 3),
  available_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  extraction jsonb,
  assessment jsonb,
  provider_metadata jsonb,
  failure_code text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  foreign key(agency_id,application_id) references public.applications(agency_id,id) on delete restrict,
  foreign key(agency_id,application_id,document_id) references public.candidate_documents(agency_id,application_id,id) on delete restrict,
  unique(agency_id,idempotency_key),
  unique(agency_id,id)
);
create table private.screening_request_keys (
  agency_id uuid not null,
  key uuid not null,
  run_id uuid not null,
  primary key(agency_id,key),
  foreign key(agency_id,run_id) references public.screening_runs(agency_id,id) on delete restrict
);
revoke all on private.screening_request_keys from public,anon,authenticated,service_role;
create unique index screening_runs_one_active on public.screening_runs(application_id)
  where status in ('queued','running');
create index screening_runs_queue on public.screening_runs(available_at,created_at) where status in ('queued','running');
create index screening_runs_application on public.screening_runs(agency_id,application_id,created_at desc,id desc);
create index screening_runs_document on public.screening_runs(document_id);
create index screening_runs_requester on public.screening_runs(requested_by);
alter table public.screening_runs enable row level security;
revoke all on public.screening_runs from public,anon,authenticated;
grant select(id,agency_id,application_id,document_id,requested_by,model,prompt_version,extractor_version,status,attempts,available_at,extraction,assessment,provider_metadata,failure_code,created_at,started_at,finished_at)
  on public.screening_runs to authenticated;
grant all on public.screening_runs to service_role;
create policy screening_runs_read_reviewers on public.screening_runs for select to authenticated
  using(private.can_review_application(agency_id,application_id));

create function private.screening_actor_can_review(p_agency uuid,p_application uuid,p_actor uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.agency_memberships m
    join public.applications a on a.agency_id=m.agency_id and a.id=p_application
    where m.agency_id=p_agency and m.user_id=p_actor and m.status='active'
    and (m.role in ('owner','administrator','recruitment_manager') or exists(
      select 1 from public.job_assignments ja where ja.agency_id=p_agency and ja.job_id=a.job_id and ja.user_id=p_actor)));
$$;
revoke all on function private.screening_actor_can_review(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function private.screening_actor_can_review(uuid,uuid,uuid) to service_role;

create function private.request_application_screening(p_agency_id uuid,p_application_id uuid,p_document_id uuid,p_key uuid,p_model text,p_request_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.applications; d public.candidate_documents; r public.screening_runs;
  snapshot jsonb; fingerprint text;
begin
  if auth.uid() is null or not private.can_review_application(p_agency_id,p_application_id) then
    raise exception 'application_not_found';
  end if;
  -- Serialize per application; an active job cannot be duplicated by concurrent requests.
  select * into a from public.applications where agency_id=p_agency_id and id=p_application_id for update;
  perform pg_advisory_xact_lock(hashtextextended(p_agency_id::text||p_key::text,0));
  select s.* into r from private.screening_request_keys k join public.screening_runs s on s.id=k.run_id
    where k.agency_id=p_agency_id and k.key=p_key;
  if found then
    if r.application_id<>p_application_id or r.document_id<>p_document_id then raise exception 'idempotency_conflict'; end if;
    return jsonb_build_object('id',r.id,'status',r.status);
  end if;
  if a.status in ('placed','rejected','withdrawn') or not exists(select 1 from public.jobs where id=a.job_id and status='open') then
    raise exception 'screening_not_eligible';
  end if;
  select * into d from public.candidate_documents where agency_id=p_agency_id
    and application_id=p_application_id and candidate_id=a.candidate_id and id=p_document_id and document_type='resume';
  if not found then raise exception 'document_not_found'; end if;
  select * into r from public.screening_runs where application_id=p_application_id and status in ('queued','running');
  if found then
    if r.document_id<>p_document_id then raise exception 'screening_already_running'; end if;
    insert into private.screening_request_keys values(p_agency_id,p_key,r.id);
    return jsonb_build_object('id',r.id,'status',r.status);
  end if;
  if p_key is null or p_model is null or char_length(p_model) not between 1 and 100 or p_request_id is null or char_length(p_request_id)>200 then
    raise exception 'invalid_screening_request';
  end if;
  select jsonb_build_object(
    'job',jsonb_build_object('id',j.id,'title',j.title,'description',j.description),
    'document',jsonb_build_object('id',d.id,'file_name',d.file_name,'storage_path',d.storage_path,'content_type',d.content_type,'size_bytes',d.size_bytes),
    'requirements',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'label',q.label,'description',q.description,'requirement_type',q.requirement_type,'version',q.version) order by q.sort_order,q.id)
      from public.job_requirements q where q.agency_id=p_agency_id and q.job_id=a.job_id),'[]'::jsonb),
    'answers',coalesce((select jsonb_agg(jsonb_build_object('id',ans.id,'question',q.label,'answer',ans.answer) order by q.sort_order,ans.id)
      from public.application_answers ans join public.job_application_questions q on q.id=ans.question_id and q.agency_id=ans.agency_id
      where ans.agency_id=p_agency_id and ans.application_id=p_application_id),'[]'::jsonb)
  ) into snapshot from public.jobs j where j.id=a.job_id and j.agency_id=p_agency_id;
  if pg_column_size(snapshot)>250000 or jsonb_array_length(snapshot->'requirements')>100 or jsonb_array_length(snapshot->'answers')>100 then
    raise exception 'screening_input_too_large';
  end if;
  fingerprint:=md5(snapshot::text||p_model||'screening-v1/extraction-v1');
  select * into r from public.screening_runs where application_id=p_application_id and input_fingerprint=fingerprint and status='succeeded' order by created_at desc limit 1;
  if found then
    insert into private.screening_request_keys values(p_agency_id,p_key,r.id);
    return jsonb_build_object('id',r.id,'status',r.status);
  end if;
  if (select count(*) from public.screening_runs where agency_id=p_agency_id and created_at>now()-interval '1 hour')>=100
    or (select count(*) from public.screening_runs where application_id=p_application_id and created_at>now()-interval '1 day')>=5 then
    raise exception 'screening_rate_limited';
  end if;
  insert into public.screening_runs(agency_id,application_id,document_id,requested_by,request_id,idempotency_key,input_snapshot,input_fingerprint,model,prompt_version,extractor_version)
    values(p_agency_id,p_application_id,p_document_id,auth.uid(),p_request_id,p_key,snapshot,fingerprint,p_model,'screening-v1','extraction-v1') returning * into r;
  insert into private.screening_request_keys values(p_agency_id,p_key,r.id);
  update public.applications set processing_status='pending' where id=a.id;
  insert into public.activity_events(agency_id,actor_user_id,event_type,entity_type,entity_id,request_id,metadata)
    values(p_agency_id,auth.uid(),'application.processing_requested','application',a.id,p_request_id,jsonb_build_object('runId',r.id,'documentId',d.id));
  return jsonb_build_object('id',r.id,'status',r.status);
end;
$$;
revoke all on function private.request_application_screening(uuid,uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function private.request_application_screening(uuid,uuid,uuid,uuid,text,text) to authenticated;
create function public.request_application_screening(p_agency_id uuid,p_application_id uuid,p_document_id uuid,p_key uuid,p_model text,p_request_id text)
returns jsonb language sql security invoker set search_path='' as $$
  select private.request_application_screening(p_agency_id,p_application_id,p_document_id,p_key,p_model,p_request_id);
$$;
revoke all on function public.request_application_screening(uuid,uuid,uuid,uuid,text,text) from public,anon;
grant execute on function public.request_application_screening(uuid,uuid,uuid,uuid,text,text) to authenticated;

-- Trusted worker only. Leases prevent stale completions; retries are bounded.
create function public.claim_screening_run()
returns setof public.screening_runs language plpgsql security invoker set search_path='' as $$
declare r public.screening_runs;
begin
  for r in select s.* from public.screening_runs s join public.applications a on a.id=s.application_id
    where s.status in ('queued','running') and (s.status='queued' or s.lease_until<now())
    and (s.attempts>=3 or a.status in ('placed','rejected','withdrawn')
      or not exists(select 1 from public.jobs j where j.id=a.job_id and j.status='open')
      or not private.screening_actor_can_review(s.agency_id,s.application_id,s.requested_by))
    limit 100 for update of s skip locked loop
    update public.screening_runs set status=case when r.attempts>=3 then 'failed' else 'cancelled' end,
      failure_code=case when r.attempts>=3 then 'attempts_exhausted' else 'access_or_eligibility_changed' end,
      lease_token=null,lease_until=null,finished_at=clock_timestamp() where id=r.id;
    update public.applications set processing_status='failed' where id=r.application_id;
    insert into public.activity_events(agency_id,event_type,entity_type,entity_id,request_id,metadata)
      values(r.agency_id,'application.processing_failed','application',r.application_id,r.request_id,jsonb_build_object('runId',r.id,'code','access_or_attempts_exhausted'));
  end loop;
  return query with next_run as (
    select s.id from public.screening_runs s where s.attempts<3
      and ((s.status='queued' and s.available_at<=now()) or (s.status='running' and s.lease_until<now()))
      order by s.available_at,s.created_at,s.id for update skip locked limit 1
  ), claimed as (
    update public.screening_runs s set status='running',attempts=s.attempts+1,lease_token=gen_random_uuid(),
      lease_until=clock_timestamp()+interval '5 minutes',started_at=coalesce(s.started_at,clock_timestamp()),failure_code=null
      from next_run n where s.id=n.id returning s.*
  ), app as (
    update public.applications a set processing_status='extracting' from claimed c where a.id=c.application_id returning a.id
  ) select c.* from claimed c;
end;
$$;
revoke all on function public.claim_screening_run() from public,anon,authenticated;
grant execute on function public.claim_screening_run() to service_role;

create function public.finish_screening_run(p_id uuid,p_lease uuid,p_result jsonb,p_failure_code text,p_retryable boolean)
returns boolean language plpgsql security invoker set search_path='' as $$
declare r public.screening_runs; success boolean; eligible boolean; retry boolean;
begin
  select * into r from public.screening_runs where id=p_id and status='running' and lease_token=p_lease and lease_until>now() for update;
  if not found then return false; end if;
  eligible:=private.screening_actor_can_review(r.agency_id,r.application_id,r.requested_by)
    and exists(select 1 from public.applications a join public.jobs j on j.id=a.job_id
      where a.id=r.application_id and a.status not in ('placed','rejected','withdrawn') and j.status='open');
  success:=p_failure_code is null and p_result is not null and eligible;
  if success and (jsonb_typeof(p_result->'extraction') is distinct from 'object' or jsonb_typeof(p_result->'assessment') is distinct from 'object') then
    raise exception 'invalid_screening_result';
  end if;
  retry:=not success and eligible and coalesce(p_retryable,false) and r.attempts<3;
  update public.screening_runs set status=case when not eligible then 'cancelled' when success then 'succeeded' when retry then 'queued' else 'failed' end,
    extraction=case when success then p_result->'extraction' end,
    assessment=case when success then p_result->'assessment' end,
    provider_metadata=case when success then p_result->'provider' end,
    failure_code=case when not eligible then 'access_or_eligibility_changed' when success then null else left(coalesce(p_failure_code,'processing_failed'),100) end,
    available_at=case when retry then clock_timestamp()+make_interval(secs=>60*power(2,r.attempts-1)::integer) else available_at end,
    finished_at=case when retry then null else clock_timestamp() end,lease_token=null,lease_until=null where id=p_id;
  update public.applications set processing_status=case when success then
    case when exists(select 1 from jsonb_array_elements(p_result->'assessment'->'criteria') c where c->>'verdict' in ('not_found','unclear')) then 'needs_information' else 'ready' end
    when retry then 'pending' else 'failed' end where id=r.application_id;
  insert into public.activity_events(agency_id,event_type,entity_type,entity_id,request_id,metadata)
    values(r.agency_id,case when success then 'application.processing_ready' else 'application.processing_failed' end,'application',r.application_id,r.request_id,
      jsonb_build_object('runId',r.id,'attempt',r.attempts,'retryScheduled',retry));
  return true;
end;
$$;
revoke all on function public.finish_screening_run(uuid,uuid,jsonb,text,boolean) from public,anon,authenticated;
grant execute on function public.finish_screening_run(uuid,uuid,jsonb,text,boolean) to service_role;
notify pgrst,'reload schema';
