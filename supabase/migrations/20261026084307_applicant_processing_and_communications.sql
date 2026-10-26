create table public.agency_processing_settings (
  agency_id uuid primary key references public.agencies(id) on delete restrict,
  screening_enabled boolean not null default false,
  automatic_screening boolean not null default false,
  acknowledge_applications boolean not null default true,
  review_reminder_hours integer not null default 24 check(review_reminder_hours between 1 and 720),
  updated_at timestamptz not null default now(),
  check(not automatic_screening or screening_enabled)
);
alter table public.agency_processing_settings enable row level security;
revoke all on public.agency_processing_settings from anon,authenticated;
grant select on public.agency_processing_settings to authenticated;
grant all on public.agency_processing_settings to service_role;
create policy processing_settings_read on public.agency_processing_settings for select to authenticated
  using(private.is_active_agency_member(agency_id));

create function public.save_processing_settings(p_agency_id uuid,p_settings jsonb,p_request_id text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.has_agency_role(p_agency_id,array['owner','administrator']) then raise exception 'permission_denied' using errcode='42501'; end if;
  insert into public.agency_processing_settings(agency_id,screening_enabled,automatic_screening,acknowledge_applications,review_reminder_hours)
    values(p_agency_id,(p_settings->>'screeningEnabled')::boolean,(p_settings->>'automaticScreening')::boolean,
      (p_settings->>'acknowledgeApplications')::boolean,(p_settings->>'reviewReminderHours')::integer)
  on conflict(agency_id) do update set screening_enabled=excluded.screening_enabled,automatic_screening=excluded.automatic_screening,
    acknowledge_applications=excluded.acknowledge_applications,review_reminder_hours=excluded.review_reminder_hours,updated_at=now();
  insert into public.activity_events(agency_id,actor_user_id,event_type,entity_type,entity_id,request_id,metadata)
    values(p_agency_id,auth.uid(),'agency.processing_settings_updated','agency',p_agency_id,p_request_id,p_settings);
end $$;
revoke all on function public.save_processing_settings(uuid,jsonb,text) from public,anon;
grant execute on function public.save_processing_settings(uuid,jsonb,text) to authenticated;

create table public.screening_corrections (
  id uuid primary key,agency_id uuid not null,application_id uuid not null,run_id uuid not null,
  requirement_id uuid not null,verdict text not null check(verdict in ('supported','not_found','contradicted','unclear')),
  explanation text not null check(char_length(explanation) between 5 and 2000),
  author_user_id uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),
  foreign key(agency_id,application_id) references public.applications(agency_id,id) on delete restrict,
  foreign key(agency_id,run_id) references public.screening_runs(agency_id,id) on delete restrict
);
create index screening_corrections_run on public.screening_corrections(agency_id,run_id,created_at desc,id desc);
alter table public.screening_corrections enable row level security;
revoke all on public.screening_corrections from anon,authenticated;
grant select on public.screening_corrections to authenticated;
grant all on public.screening_corrections to service_role;
create policy screening_corrections_read on public.screening_corrections for select to authenticated using(private.can_review_application(agency_id,application_id));
create function public.correct_screening(p_agency_id uuid,p_application_id uuid,p_payload jsonb,p_request_id text)
returns void language plpgsql security definer set search_path='' as $$
declare r public.screening_runs; previous public.screening_corrections;
begin
  if auth.uid() is null or not private.can_review_application(p_agency_id,p_application_id) then raise exception 'permission_denied' using errcode='42501'; end if;
  select * into r from public.screening_runs where id=(p_payload->>'runId')::uuid and agency_id=p_agency_id and application_id=p_application_id and status='succeeded';
  if not found or not exists(select 1 from jsonb_array_elements(r.assessment->'criteria') c where c->>'requirementId'=p_payload->>'requirementId') then raise exception 'invalid_screening_correction'; end if;
  select * into previous from public.screening_corrections where id=(p_payload->>'id')::uuid;
  if found then
    if previous.agency_id<>p_agency_id or previous.application_id<>p_application_id or previous.run_id<>r.id or previous.author_user_id is distinct from auth.uid()
      or previous.requirement_id<>(p_payload->>'requirementId')::uuid or previous.verdict<>p_payload->>'verdict' or previous.explanation<>p_payload->>'explanation' then raise exception 'idempotency_conflict'; end if;
    return;
  end if;
  insert into public.screening_corrections(id,agency_id,application_id,run_id,requirement_id,verdict,explanation,author_user_id)
    values((p_payload->>'id')::uuid,p_agency_id,p_application_id,r.id,(p_payload->>'requirementId')::uuid,p_payload->>'verdict',p_payload->>'explanation',auth.uid());
  insert into public.activity_events(agency_id,actor_user_id,event_type,entity_type,entity_id,request_id,metadata)
    values(p_agency_id,auth.uid(),'application.screening_corrected','application',p_application_id,p_request_id,jsonb_build_object('runId',r.id,'correctionId',p_payload->>'id'));
end $$;
revoke all on function public.correct_screening(uuid,uuid,jsonb,text) from public,anon;
grant execute on function public.correct_screening(uuid,uuid,jsonb,text) to authenticated;

alter table public.candidates add column email_suppressed boolean not null default false;
alter table public.communications drop constraint communications_status_check;
alter table public.communications add constraint communications_status_check check(status in ('pending','sending','sent','delivered','failed','permanent_failure','cancelled'));
alter table public.communications add column application_id uuid,add column sender_user_id uuid references auth.users(id) on delete set null,
  add column subject text check(char_length(subject) between 1 and 200),add column body text check(char_length(body) between 1 and 10000),
  add column reply_to text,add column available_at timestamptz not null default now(),add column lease_token uuid,add column lease_until timestamptz,
  add column provider_event_at timestamptz,add column failure_code text,
  add foreign key(agency_id,application_id) references public.applications(agency_id,id) on delete restrict;
create index communications_application on public.communications(agency_id,application_id,created_at desc,id desc) where application_id is not null;
create index communications_delivery_queue on public.communications(available_at,created_at) where subject is not null and status in ('pending','sending');
drop policy communications_read on public.communications;
create policy communications_read on public.communications for select to authenticated using(
  case when related_entity_type='application' then private.can_review_application(agency_id,related_entity_id)
    else private.has_agency_role(agency_id,array['owner','administrator','recruitment_manager']) end);
revoke select on public.communications from authenticated;
grant select(id,agency_id,recipient_email,message_type,related_entity_type,related_entity_id,status,provider_message_id,attempt_count,idempotency_key,last_error,sent_at,delivered_at,created_at,application_id,sender_user_id,subject,body,reply_to,available_at,failure_code) on public.communications to authenticated;

create function public.queue_candidate_message(p_agency_id uuid,p_application_id uuid,p_key uuid,p_payload jsonb,p_request_id text)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.applications; c public.candidates; existing public.communications; identifier uuid;
begin
  if auth.uid() is null or not private.can_review_application(p_agency_id,p_application_id) then raise exception 'permission_denied' using errcode='42501'; end if;
  select * into a from public.applications where agency_id=p_agency_id and id=p_application_id for update;
  if p_key is null then raise exception 'invalid_message'; end if;
  select * into existing from public.communications where agency_id=p_agency_id and idempotency_key='candidate:'||p_key::text;
  if found then
    if existing.application_id<>p_application_id or existing.sender_user_id is distinct from auth.uid() or existing.subject<>p_payload->>'subject' or existing.body<>p_payload->>'body' or existing.message_type<>p_payload->>'kind' then raise exception 'idempotency_conflict'; end if;
    return existing.id;
  end if;
  select * into c from public.candidates where id=a.candidate_id and agency_id=p_agency_id;
  if c.email_suppressed then raise exception 'candidate_email_suppressed'; end if;
  if jsonb_typeof(p_payload) is distinct from 'object' or p_payload->>'kind' is null or p_payload->>'subject' is null or p_payload->>'body' is null
    or p_payload->>'kind' not in ('custom','missing_information','status_update','rejection')
    or char_length(btrim(p_payload->>'subject')) not between 1 and 200 or char_length(btrim(p_payload->>'body')) not between 1 and 10000
    or p_payload->>'subject' ~ '[\r\n]' then raise exception 'invalid_message'; end if;
  if p_payload->>'kind'='rejection' and (a.status<>'rejected' or (p_payload->>'confirmed')::boolean is not true) then raise exception 'rejection_requires_review'; end if;
  if a.status in ('placed','rejected','withdrawn') and p_payload->>'kind'='missing_information' then raise exception 'application_not_eligible'; end if;
  if (select count(*) from public.communications where agency_id=p_agency_id and application_id=p_application_id and created_at>now()-interval '1 hour' and subject is not null)>=10 then raise exception 'message_rate_limited'; end if;
  insert into public.communications(agency_id,application_id,sender_user_id,recipient_email,message_type,related_entity_type,related_entity_id,idempotency_key,subject,body,reply_to)
    select p_agency_id,p_application_id,auth.uid(),c.email,p_payload->>'kind','application',p_application_id,'candidate:'||p_key::text,
      btrim(p_payload->>'subject'),btrim(p_payload->>'body'),contact_email from public.agencies where id=p_agency_id returning id into identifier;
  insert into public.activity_events(agency_id,actor_user_id,event_type,entity_type,entity_id,request_id,metadata)
    values(p_agency_id,auth.uid(),'communication.requested','application',p_application_id,p_request_id,jsonb_build_object('communicationId',identifier,'kind',p_payload->>'kind'));
  return identifier;
end $$;
revoke all on function public.queue_candidate_message(uuid,uuid,uuid,jsonb,text) from public,anon;
grant execute on function public.queue_candidate_message(uuid,uuid,uuid,jsonb,text) to authenticated;

create function public.retry_candidate_message(p_agency_id uuid,p_id uuid,p_request_id text)
returns void language plpgsql security definer set search_path='' as $$
declare m public.communications;
begin
  select * into m from public.communications where agency_id=p_agency_id and id=p_id for update;
  if auth.uid() is null or m.application_id is null or not private.can_review_application(p_agency_id,m.application_id) then raise exception 'permission_denied' using errcode='42501'; end if;
  if m.status='pending' then return; end if;
  -- Resend's provider idempotency window is 24h; ambiguous old attempts need operator reconciliation.
  if m.status<>'failed' or m.created_at<now()-interval '23 hours' then raise exception 'message_not_retryable'; end if;
  update public.communications set status='pending',available_at=now(),attempt_count=0,failure_code=null,last_error=null where id=m.id;
  insert into public.activity_events(agency_id,actor_user_id,event_type,entity_type,entity_id,request_id,metadata)
    values(p_agency_id,auth.uid(),'communication.retry_requested','application',m.application_id,p_request_id,jsonb_build_object('communicationId',m.id));
end $$;
revoke all on function public.retry_candidate_message(uuid,uuid,text) from public,anon;
grant execute on function public.retry_candidate_message(uuid,uuid,text) to authenticated;

create function public.cancel_candidate_message(p_agency_id uuid,p_id uuid,p_request_id text)
returns void language plpgsql security definer set search_path='' as $$
declare m public.communications;
begin
  select * into m from public.communications where id=p_id and agency_id=p_agency_id for update;
  if auth.uid() is null or m.application_id is null or not private.can_review_application(p_agency_id,m.application_id) then raise exception 'permission_denied' using errcode='42501'; end if;
  if m.status='cancelled' then return; end if;
  if m.status<>'pending' then raise exception 'message_already_processing'; end if;
  update public.communications set status='cancelled',failure_code='cancelled_by_recruiter' where id=m.id;
  insert into public.activity_events(agency_id,actor_user_id,event_type,entity_type,entity_id,request_id,metadata)
    values(p_agency_id,auth.uid(),'communication.cancelled','application',m.application_id,p_request_id,jsonb_build_object('communicationId',m.id));
end $$;
revoke all on function public.cancel_candidate_message(uuid,uuid,text) from public,anon;
grant execute on function public.cancel_candidate_message(uuid,uuid,text) to authenticated;

create function public.claim_candidate_message() returns setof public.communications language plpgsql security invoker set search_path='' as $$
begin
  update public.communications m set status='cancelled',failure_code='access_or_eligibility_changed',lease_token=null,lease_until=null
    from public.applications a join public.candidates c on c.id=a.candidate_id join public.jobs j on j.id=a.job_id
    where m.application_id=a.id and m.subject is not null and (m.status='pending' or (m.status='sending' and m.lease_until<now()))
    and (c.email_suppressed or not exists(select 1 from public.agencies ag where ag.id=m.agency_id and ag.status='active')
      or (m.sender_user_id is not null and not private.screening_actor_can_review(m.agency_id,a.id,m.sender_user_id))
      or (m.message_type='missing_information' and (a.status in ('placed','rejected','withdrawn') or j.status<>'open'))
      or (m.message_type='rejection' and a.status<>'rejected'));
  update public.communications set status='failed',failure_code='attempts_exhausted',lease_token=null,lease_until=null
    where subject is not null and (status='pending' or (status='sending' and lease_until<now())) and (attempt_count>=3 or created_at<now()-interval '23 hours');
  return query with next_message as (select id from public.communications where subject is not null and attempt_count<3 and available_at<=now()
    and (status='pending' or (status='sending' and lease_until<now())) order by available_at,created_at,id for update skip locked limit 1)
  update public.communications m set status='sending',attempt_count=m.attempt_count+1,lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes'
    from next_message n where m.id=n.id returning m.*;
end $$;
revoke all on function public.claim_candidate_message() from public,anon,authenticated;
grant execute on function public.claim_candidate_message() to service_role;

create function public.finish_candidate_message(p_id uuid,p_lease uuid,p_provider_id text,p_failure text,p_retryable boolean)
returns boolean language plpgsql security invoker set search_path='' as $$
declare m public.communications;
begin
  select * into m from public.communications where id=p_id and status='sending' and lease_token=p_lease and lease_until>now() for update;
  if not found then return false; end if;
  update public.communications set status=case when p_provider_id is not null then 'sent' when p_retryable and attempt_count<3 then 'pending' when p_retryable then 'failed' else 'permanent_failure' end,
    provider_message_id=p_provider_id,sent_at=case when p_provider_id is not null then now() else null end,failure_code=p_failure,
    available_at=now()+make_interval(secs=>60*attempt_count),lease_token=null,lease_until=null where id=m.id;
  insert into public.activity_events(agency_id,event_type,entity_type,entity_id,metadata)
    values(m.agency_id,case when p_provider_id is not null then 'communication.sent' else 'communication.failed' end,'application',m.application_id,jsonb_build_object('communicationId',m.id,'code',p_failure));
  return true;
end $$;
revoke all on function public.finish_candidate_message(uuid,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.finish_candidate_message(uuid,uuid,text,text,boolean) to service_role;

create table private.communication_webhook_events(id text primary key,created_at timestamptz not null default now());
revoke all on private.communication_webhook_events from public,anon,authenticated;
create function public.record_email_event(p_event_id text,p_provider_id text,p_status text,p_at timestamptz,p_suppress boolean default false)
returns boolean language plpgsql security definer set search_path='' as $$
declare m public.communications;
begin
  if p_status is null or p_at is null or p_event_id is null or char_length(p_event_id) not between 1 and 200 or p_status not in ('sent','delivered','permanent_failure') then raise exception 'invalid_event'; end if;
  select * into m from public.communications where provider_message_id=p_provider_id for update;
  if not found then return false; end if;
  insert into private.communication_webhook_events(id) values(p_event_id) on conflict do nothing;
  if not found then return true; end if;
  if m.provider_event_at>p_at or (m.status='permanent_failure' and p_status<>'permanent_failure') or (m.status='delivered' and p_status='sent') then return true; end if;
  update public.communications set status=p_status,provider_event_at=p_at,delivered_at=case when p_status='delivered' then p_at else delivered_at end,
    failure_code=case when p_status='permanent_failure' then 'provider_delivery_failure' else null end where id=m.id;
  if p_status='permanent_failure' and p_suppress and m.application_id is not null then
    update public.candidates set email_suppressed=true where agency_id=m.agency_id and id=(select candidate_id from public.applications where id=m.application_id);
  end if;
  return true;
end $$;
revoke all on function public.record_email_event(text,text,text,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.record_email_event(text,text,text,timestamptz,boolean) to service_role;

create table public.application_intake_tasks (
  id uuid primary key default gen_random_uuid(),agency_id uuid not null,application_id uuid not null,
  status text not null default 'pending' check(status in ('pending','running','done','failed','cancelled')),
  attempts integer not null default 0,available_at timestamptz not null default now(),lease_token uuid,lease_until timestamptz,failure_code text,
  created_at timestamptz not null default now(),unique(application_id),
  foreign key(agency_id,application_id) references public.applications(agency_id,id) on delete restrict
);
create index application_intake_tasks_queue on public.application_intake_tasks(available_at,created_at) where status in ('pending','running');
alter table public.application_intake_tasks enable row level security;
revoke all on public.application_intake_tasks from public,anon,authenticated;
grant select(id,agency_id,application_id,status,attempts,failure_code,created_at) on public.application_intake_tasks to authenticated;
grant all on public.application_intake_tasks to service_role;
create policy intake_tasks_reviewers on public.application_intake_tasks for select to authenticated using(private.can_review_application(agency_id,application_id));
create function private.enqueue_application_intake() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.application_intake_tasks(agency_id,application_id) values(new.agency_id,new.id) on conflict(application_id) do nothing;
  return new;
end $$;
revoke all on function private.enqueue_application_intake() from public,anon,authenticated;
create trigger application_intake_enqueued after insert on public.applications for each row execute function private.enqueue_application_intake();

create function public.claim_application_intake() returns setof public.application_intake_tasks language plpgsql security invoker set search_path='' as $$
begin
  update public.application_intake_tasks set status='failed',failure_code='attempts_exhausted',lease_token=null,lease_until=null
    where attempts>=3 and (status='pending' or (status='running' and lease_until<now()));
  return query with next_task as (select id from public.application_intake_tasks where attempts<3 and available_at<=now()
    and (status='pending' or (status='running' and lease_until<now())) order by available_at,created_at,id for update skip locked limit 1)
  update public.application_intake_tasks t set status='running',attempts=t.attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes'
    from next_task n where t.id=n.id returning t.*;
end $$;
revoke all on function public.claim_application_intake() from public,anon,authenticated;
grant execute on function public.claim_application_intake() to service_role;

create function public.prepare_application_intake(p_id uuid,p_lease uuid,p_model text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare t public.application_intake_tasks; a public.applications; c public.candidates; j public.jobs; ag public.agencies;
  settings public.agency_processing_settings; reviewer uuid; document uuid; prior_actor text; result jsonb;
begin
  select * into t from public.application_intake_tasks where id=p_id and status='running' and lease_token=p_lease and lease_until>now() for update;
  if not found then return jsonb_build_object('committed',false); end if;
  select * into a from public.applications where id=t.application_id;
  select * into j from public.jobs where id=a.job_id;
  select * into ag from public.agencies where id=t.agency_id;
  if ag.status<>'active' or j.status<>'open' or a.status in ('placed','rejected','withdrawn') then
    update public.application_intake_tasks set status='cancelled',lease_token=null,lease_until=null where id=t.id;
    return jsonb_build_object('committed',true,'cancelled',true);
  end if;
  select * into settings from public.agency_processing_settings where agency_id=t.agency_id;
  select * into c from public.candidates where id=a.candidate_id;
  if coalesce(settings.acknowledge_applications,true) and not c.email_suppressed then
    insert into public.communications(agency_id,application_id,recipient_email,message_type,related_entity_type,related_entity_id,idempotency_key,subject,body,reply_to)
      values(t.agency_id,a.id,c.email,'application_received','application',a.id,'application-received:'||a.id::text,
        'Application received: '||left(j.title,170),'Thanks, '||c.full_name||'. Your application for '||j.title||' has been received by '||ag.name||'. We will contact you by email if we need anything else.',ag.contact_email)
      on conflict(agency_id,idempotency_key) do nothing;
  end if;
  if settings.screening_enabled and settings.automatic_screening then
    if p_model is null then raise exception 'screening_not_configured'; end if;
    select m.user_id into reviewer from public.agency_memberships m where m.agency_id=t.agency_id and m.status='active'
      and private.screening_actor_can_review(t.agency_id,a.id,m.user_id)
      order by (m.user_id=a.owner_user_id) desc nulls last,case when m.role='owner' then 0 when m.role='administrator' then 1 else 2 end,m.user_id limit 1;
    select id into document from public.candidate_documents where agency_id=t.agency_id and application_id=a.id order by created_at desc,id desc limit 1;
    if reviewer is null or document is null then raise exception 'screening_reviewer_or_document_missing'; end if;
    prior_actor:=current_setting('request.jwt.claim.sub',true);
    perform set_config('request.jwt.claim.sub',reviewer::text,true);
    result:=private.request_application_screening(t.agency_id,a.id,document,t.id,p_model,'intake:'||t.id::text);
    perform set_config('request.jwt.claim.sub',coalesce(prior_actor,''),true);
  end if;
  update public.application_intake_tasks set status='done',lease_token=null,lease_until=null,failure_code=null where id=t.id;
  return jsonb_build_object('committed',true,'screening',result);
end $$;
revoke all on function public.prepare_application_intake(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.prepare_application_intake(uuid,uuid,text) to service_role;

create function public.fail_application_intake(p_id uuid,p_lease uuid)
returns void language sql security invoker set search_path='' as $$
  update public.application_intake_tasks set status=case when attempts<3 then 'pending' else 'failed' end,
    available_at=now()+interval '2 minutes',lease_token=null,lease_until=null,failure_code='intake_processing_failed'
    where id=p_id and status='running' and lease_token=p_lease and lease_until>now();
$$;
revoke all on function public.fail_application_intake(uuid,uuid) from public,anon,authenticated;
grant execute on function public.fail_application_intake(uuid,uuid) to service_role;
create function public.retry_application_intake(p_agency_id uuid,p_application_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.can_review_application(p_agency_id,p_application_id) then raise exception 'permission_denied' using errcode='42501'; end if;
  update public.application_intake_tasks set status='pending',attempts=0,available_at=now(),failure_code=null where agency_id=p_agency_id and application_id=p_application_id and status='failed';
end $$;
revoke all on function public.retry_application_intake(uuid,uuid) from public,anon;
grant execute on function public.retry_application_intake(uuid,uuid) to authenticated;

create function public.checkpoint_screening_extraction(p_id uuid,p_lease uuid,p_extraction jsonb,p_metadata jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  update public.screening_runs set extraction=p_extraction,provider_metadata=p_metadata where id=p_id and status='running' and lease_token=p_lease and lease_until>now();
  return found;
end $$;
revoke all on function public.checkpoint_screening_extraction(uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.checkpoint_screening_extraction(uuid,uuid,jsonb,jsonb) to service_role;
grant execute on function private.request_application_screening(uuid,uuid,uuid,uuid,text,text) to service_role;

create function public.screening_evidence_context(p_agency_id uuid,p_application_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.can_review_application(p_agency_id,p_application_id) then raise exception 'permission_denied' using errcode='42501'; end if;
  return coalesce((select jsonb_object_agg(id::text,jsonb_build_object('requirements',input_snapshot->'requirements','answers',input_snapshot->'answers'))
    from (select id,input_snapshot from public.screening_runs where agency_id=p_agency_id and application_id=p_application_id order by created_at desc,id desc limit 20) r),'{}'::jsonb);
end $$;
revoke all on function public.screening_evidence_context(uuid,uuid) from public,anon;
grant execute on function public.screening_evidence_context(uuid,uuid) to authenticated;
grant usage on schema private to service_role;

-- Retain validated extraction across a transient assessment failure.
create or replace function public.finish_screening_run(p_id uuid,p_lease uuid,p_result jsonb,p_failure_code text,p_retryable boolean)
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
    extraction=case when success then p_result->'extraction' else r.extraction end,
    assessment=case when success then p_result->'assessment' end,
    provider_metadata=case when success then p_result->'provider' else r.provider_metadata end,
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
