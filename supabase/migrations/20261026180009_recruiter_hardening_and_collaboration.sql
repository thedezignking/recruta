-- Explicit employer access; no candidate/application/private-note grants.
create or replace function private.is_active_agency_member(target_agency_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.agency_memberships m join public.agencies g on g.id=m.agency_id where m.agency_id=target_agency_id and m.user_id=(select auth.uid()) and m.status='active' and g.status='active');
$$;
create or replace function private.has_agency_role(target_agency_id uuid,allowed_roles text[])
returns boolean language sql stable security definer set search_path='' as $$
 select private.is_active_agency_member(target_agency_id) and exists(select 1 from public.agency_memberships where agency_id=target_agency_id and user_id=(select auth.uid()) and status='active' and role=any(allowed_roles));
$$;
create or replace function private.can_review_job(p_agency_id uuid,p_job_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select private.is_active_agency_member(p_agency_id) and exists(select 1 from public.agency_memberships m join public.jobs j on j.agency_id=m.agency_id and j.id=p_job_id
 where m.agency_id=p_agency_id and m.user_id=(select auth.uid()) and m.status='active' and (m.role in ('owner','administrator','recruitment_manager') or exists(select 1 from public.job_assignments a where a.agency_id=p_agency_id and a.job_id=p_job_id and a.user_id=m.user_id)));
$$;
create or replace function private.is_active_client_member(target_client_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.client_memberships m join public.clients c on c.id=m.client_id join public.agencies g on g.id=m.agency_id
 where m.client_id=target_client_id and m.user_id=(select auth.uid()) and m.status='active' and c.status='active' and g.status='active');
$$;
create or replace function private.has_client_role(p_client_id uuid,p_roles text[])
returns boolean language sql stable security definer set search_path='' as $$
 select private.is_active_client_member(p_client_id) and exists(select 1 from public.client_memberships where client_id=p_client_id and user_id=(select auth.uid()) and status='active' and role=any(p_roles));
$$;
create or replace function public.portal_memberships()
returns table(agency_id uuid,client_id uuid,role text,client_name text,agency_name text)
language sql stable security definer set search_path='' as $$
 select m.agency_id,m.client_id,m.role,c.name,g.name from public.client_memberships m
 join public.clients c on c.id=m.client_id and c.agency_id=m.agency_id join public.agencies g on g.id=m.agency_id
 where m.user_id=(select auth.uid()) and m.status='active' and c.status='active' and g.status='active' order by m.created_at,m.client_id;
$$;
revoke all on function public.portal_memberships() from public,anon;
grant execute on function public.portal_memberships() to authenticated;
alter table public.client_invitations add column job_id uuid;
alter table public.client_invitations add constraint client_invitation_job_fk
  foreign key (client_id,job_id) references public.jobs(client_id,id) on delete restrict;

create or replace function private.can_access_client_job(p_job_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.client_job_access a
    join public.client_memberships m on (m.agency_id,m.client_id,m.user_id)=(a.agency_id,a.client_id,a.user_id)
    join public.clients c on c.id=a.client_id and c.agency_id=a.agency_id
    join public.agencies g on g.id=a.agency_id
    where a.job_id=p_job_id and a.user_id=(select auth.uid()) and m.status='active'
      and c.status='active' and g.status='active');
$$;
revoke all on function private.can_access_client_job(uuid) from public,anon;
grant execute on function private.can_access_client_job(uuid) to authenticated;
drop policy jobs_read_authorized on public.jobs;
create policy jobs_read_authorized on public.jobs for select to authenticated
  using(private.is_active_agency_member(agency_id) or private.can_access_client_job(id));
do $$ declare t text; begin
  foreach t in array array['job_requirements','job_workflow_stages'] loop
    execute format('drop policy %I on public.%I',t||'_read',t);
    execute format('create policy %I on public.%I for select to authenticated using(private.is_active_agency_member(agency_id) or private.can_access_client_job(job_id))',t||'_read',t);
  end loop;
end $$;
drop policy job_assignments_read on public.job_assignments;
create policy job_assignments_read on public.job_assignments for select to authenticated using(private.is_active_agency_member(agency_id));
drop policy if exists client_job_access_manage on public.client_job_access;
revoke insert,update,delete on public.client_job_access from authenticated;
drop policy client_invitations_manage on public.client_invitations;
create policy client_invitations_read on public.client_invitations for select to authenticated using(
  private.has_agency_role(agency_id,array['owner','administrator','recruitment_manager'])
  or (job_id is not null and private.can_review_job(agency_id,job_id))
  or private.has_client_role(client_id,array['client_administrator'])
);
create policy client_invitations_create on public.client_invitations for insert to authenticated with check(
  (private.has_agency_role(agency_id,array['owner','administrator','recruitment_manager'])
    or (job_id is not null and private.can_review_job(agency_id,job_id))
    or private.has_client_role(client_id,array['client_administrator']))
  and (job_id is null or private.can_review_job(agency_id,job_id) or private.can_access_client_job(job_id))
  and invited_by=(select auth.uid())
  and (role<>'client_administrator' or private.has_agency_role(agency_id,array['owner','administrator','recruitment_manager']) or private.has_client_role(client_id,array['client_administrator']))
);
create policy client_invitations_update on public.client_invitations for update to authenticated
 using(accepted_at is null and (private.has_agency_role(agency_id,array['owner','administrator','recruitment_manager']) or (job_id is not null and private.can_review_job(agency_id,job_id)) or private.has_client_role(client_id,array['client_administrator'])))
 with check(private.has_agency_role(agency_id,array['owner','administrator','recruitment_manager']) or (job_id is not null and private.can_review_job(agency_id,job_id)) or private.has_client_role(client_id,array['client_administrator']));
revoke insert,update,delete on public.client_invitations from authenticated;
grant insert(agency_id,client_id,job_id,email,role,token_hash,expires_at,invited_by),update(token_hash,expires_at,revoked_at) on public.client_invitations to authenticated;

-- Assigned recruiters can inspect delivery receipts for their job invitations.
drop policy communications_read on public.communications;
create policy communications_read on public.communications for select to authenticated using(
 case when related_entity_type='application' then private.can_review_application(agency_id,related_entity_id)
 when related_entity_type='client_invitation' then private.has_agency_role(agency_id,array['owner','administrator','recruitment_manager']) or exists(
  select 1 from public.client_invitations i where i.id=related_entity_id and i.agency_id=communications.agency_id and i.job_id is not null and private.can_review_job(i.agency_id,i.job_id)
 ) else private.has_agency_role(agency_id,array['owner','administrator','recruitment_manager']) end);

create table public.candidate_submissions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  job_id uuid not null,
  application_id uuid not null,
  document_id uuid references public.candidate_documents(id) on delete restrict,
  candidate_name text not null,
  summary text not null check(char_length(trim(summary)) between 10 and 5000),
  shared_by uuid not null references auth.users(id) on delete restrict,
  shared_at timestamptz not null default clock_timestamp(),
  withdrawn_at timestamptz,
  unique(agency_id,id),
  foreign key(agency_id,job_id,application_id) references public.applications(agency_id,job_id,id) on delete restrict,
  foreign key(agency_id,job_id) references public.jobs(agency_id,id) on delete restrict
);
create or replace function public.job_collaborator_directory(p_agency_id uuid,p_job_id uuid)
returns table(user_id uuid,role text,name text,email text,has_access boolean)
language plpgsql stable security definer set search_path='' as $$ begin
 if auth.uid() is null or not private.can_review_job(p_agency_id,p_job_id) then raise exception 'permission_denied'; end if;
 return query select m.user_id,m.role,coalesce(nullif(p.full_name,''),u.email,'Organization member'),coalesce(u.email,'')::text,
 exists(select 1 from public.client_job_access a where a.job_id=p_job_id and a.user_id=m.user_id)
 from public.client_memberships m join public.jobs j on j.client_id=m.client_id and j.agency_id=m.agency_id
 join auth.users u on u.id=m.user_id left join public.user_profiles p on p.id=m.user_id
 where j.id=p_job_id and j.agency_id=p_agency_id and m.status='active' order by m.created_at,m.user_id;
end $$;
revoke all on function public.job_collaborator_directory(uuid,uuid) from public,anon;
grant execute on function public.job_collaborator_directory(uuid,uuid) to authenticated;
create unique index candidate_submissions_active_idx on public.candidate_submissions(application_id) where withdrawn_at is null;
create index candidate_submissions_job_idx on public.candidate_submissions(agency_id,job_id,shared_at desc,id desc);
alter table public.candidate_submissions enable row level security;
create policy submissions_read on public.candidate_submissions for select to authenticated
  using(private.can_review_job(agency_id,job_id) or (withdrawn_at is null and private.can_access_client_job(job_id)));
revoke all on public.candidate_submissions from public,anon,authenticated;
grant select on public.candidate_submissions to authenticated;
grant all on public.candidate_submissions to service_role;

create table public.submission_feedback (
  id uuid primary key,
  agency_id uuid not null,
  submission_id uuid not null,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  recommendation text not null check(recommendation in ('proceed','discuss','pass')),
  strengths text not null default '' check(char_length(strengths)<=3000),
  concerns text not null default '' check(char_length(concerns)<=3000),
  comment text not null check(char_length(trim(comment)) between 5 and 5000),
  created_at timestamptz not null default clock_timestamp(),
  foreign key(agency_id,submission_id) references public.candidate_submissions(agency_id,id) on delete restrict
);
create index submission_feedback_history_idx on public.submission_feedback(agency_id,submission_id,created_at desc,id desc);
alter table public.submission_feedback enable row level security;
create policy feedback_read on public.submission_feedback for select to authenticated using(exists(
  select 1 from public.candidate_submissions s where s.id=submission_id and s.agency_id=submission_feedback.agency_id
));
revoke all on public.submission_feedback from public,anon,authenticated;
grant select on public.submission_feedback to authenticated;
grant all on public.submission_feedback to service_role;

create or replace function public.manage_job_collaborator(p_agency_id uuid,p_job_id uuid,p_user_id uuid,p_action text,p_request_id text)
returns void language plpgsql security definer set search_path='' as $$
declare j public.jobs; begin
  if auth.uid() is null or not private.can_review_job(p_agency_id,p_job_id) then raise exception 'permission_denied'; end if;
  select * into j from public.jobs where id=p_job_id and agency_id=p_agency_id for update;
  if p_action='grant' then
    if not exists(select 1 from public.client_memberships where agency_id=p_agency_id and client_id=j.client_id and user_id=p_user_id and status='active') then raise exception 'invalid_collaborator'; end if;
    insert into public.client_job_access(agency_id,client_id,job_id,user_id,access_role)
      select p_agency_id,j.client_id,j.id,p_user_id,case when role='client_administrator' then 'administrator' else role end
      from public.client_memberships where client_id=j.client_id and user_id=p_user_id and status='active'
      on conflict(job_id,user_id) do nothing;
  elsif p_action='revoke' then
    delete from public.client_job_access where job_id=p_job_id and agency_id=p_agency_id and user_id=p_user_id;
  else raise exception 'invalid_action'; end if;
  insert into public.activity_events(agency_id,actor_user_id,event_type,entity_type,entity_id,request_id,metadata)
    values(p_agency_id,auth.uid(),'job.collaborator_'||p_action,'job',p_job_id,p_request_id,jsonb_build_object('user_id',p_user_id));
end $$;

create or replace function public.share_candidate(p_agency_id uuid,p_application_id uuid,p_summary text,p_withdraw boolean,p_request_id text,p_document_id uuid default null,p_expected_submission_id uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.applications; v_id uuid; v_name text; begin
  if auth.uid() is null or not private.can_review_application(p_agency_id,p_application_id) then raise exception 'permission_denied'; end if;
  select * into a from public.applications where id=p_application_id and agency_id=p_agency_id for update;
  if p_withdraw then
    if p_expected_submission_id is null then raise exception 'submission_changed'; end if;
    update public.candidate_submissions set withdrawn_at=clock_timestamp() where application_id=a.id and id=p_expected_submission_id and withdrawn_at is null returning id into v_id;
    if v_id is null then
      if exists(select 1 from public.candidate_submissions where application_id=a.id and id=p_expected_submission_id and withdrawn_at is not null) then return p_expected_submission_id; end if;
      raise exception 'submission_changed';
    end if;
  else
    if a.status not in ('shortlisted','client_review','interview','offer') then raise exception 'shortlist_before_sharing'; end if;
    if char_length(trim(p_summary)) not between 10 and 5000 then raise exception 'invalid_summary'; end if;
    if p_document_id is not null and not exists(select 1 from public.candidate_documents where id=p_document_id and agency_id=p_agency_id and application_id=a.id) then raise exception 'permission_denied'; end if;
    select full_name into v_name from public.candidates where id=a.candidate_id and agency_id=p_agency_id;
    insert into public.candidate_submissions(agency_id,job_id,application_id,document_id,candidate_name,summary,shared_by)
      values(p_agency_id,a.job_id,a.id,p_document_id,v_name,trim(p_summary),auth.uid())
      on conflict(application_id) where withdrawn_at is null do nothing returning id into v_id;
    if v_id is null then
      select id into v_id from public.candidate_submissions where application_id=a.id and withdrawn_at is null and summary=trim(p_summary) and document_id is not distinct from p_document_id;
      if v_id is null then raise exception 'submission_exists'; end if;
      return v_id;
    end if;
  end if;
  insert into public.activity_events(agency_id,actor_user_id,event_type,entity_type,entity_id,request_id,metadata)
    values(p_agency_id,auth.uid(),case when p_withdraw then 'candidate.submission_withdrawn' else 'candidate.shared' end,'application',a.id,p_request_id,jsonb_build_object('submission_id',v_id));
  return v_id;
end $$;

create or replace function public.submit_candidate_feedback(p_submission_id uuid,p_feedback_id uuid,p_payload jsonb,p_request_id text)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.candidate_submissions; old public.submission_feedback; begin
  select * into s from public.candidate_submissions where id=p_submission_id for share;
  if auth.uid() is null or s.id is null or s.withdrawn_at is not null or not private.can_access_client_job(s.job_id) then raise exception 'permission_denied'; end if;
  if not exists(select 1 from public.client_job_access a join public.client_memberships m on (m.client_id,m.user_id)=(a.client_id,a.user_id)
    where a.job_id=s.job_id and a.user_id=auth.uid() and m.status='active' and m.role<>'reviewer' and a.access_role<>'reviewer') then raise exception 'permission_denied'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_feedback_id::text,0));
  select * into old from public.submission_feedback where id=p_feedback_id;
  if old.id is not null then
    if old.submission_id=p_submission_id and old.author_user_id=auth.uid() and old.recommendation=p_payload->>'recommendation'
      and old.comment=trim(p_payload->>'comment') and old.strengths=coalesce(p_payload->>'strengths','') and old.concerns=coalesce(p_payload->>'concerns','') then return old.id; end if;
    raise exception 'idempotency_conflict';
  end if;
  insert into public.submission_feedback(id,agency_id,submission_id,author_user_id,recommendation,strengths,concerns,comment)
    values(p_feedback_id,s.agency_id,s.id,auth.uid(),p_payload->>'recommendation',coalesce(p_payload->>'strengths',''),coalesce(p_payload->>'concerns',''),trim(p_payload->>'comment'));
  insert into public.activity_events(agency_id,actor_user_id,event_type,entity_type,entity_id,request_id,metadata)
    values(s.agency_id,auth.uid(),'candidate.feedback_received','application',s.application_id,p_request_id,jsonb_build_object('submission_id',s.id,'feedback_id',p_feedback_id));
  return p_feedback_id;
end $$;
revoke all on function public.manage_job_collaborator(uuid,uuid,uuid,text,text),public.share_candidate(uuid,uuid,text,boolean,text,uuid,uuid),public.submit_candidate_feedback(uuid,uuid,jsonb,text) from public,anon;
grant execute on function public.manage_job_collaborator(uuid,uuid,uuid,text,text),public.share_candidate(uuid,uuid,text,boolean,text,uuid,uuid),public.submit_candidate_feedback(uuid,uuid,jsonb,text) to authenticated;

create or replace function public.accept_client_invitation(p_token_hash text)
returns public.client_memberships language plpgsql security definer set search_path='' as $$
declare i public.client_invitations; m public.client_memberships; begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into i from public.client_invitations where token_hash=p_token_hash and revoked_at is null and (accepted_at is not null or expires_at>now()) for update;
  if i.id is null then raise exception 'Invitation is invalid or expired'; end if;
  if lower(i.email)<>lower(coalesce(auth.jwt()->>'email','')) then raise exception 'Invitation email does not match signed-in user'; end if;
  if i.accepted_at is not null then
    select * into m from public.client_memberships where client_id=i.client_id and user_id=auth.uid() and status='active';
    if m.id is null then raise exception 'permission_denied'; end if;
    return m;
  end if;
  if not exists(select 1 from public.clients c join public.agencies a on a.id=c.agency_id where c.id=i.client_id and c.status='active' and a.status='active') then raise exception 'permission_denied'; end if;
  insert into public.user_profiles(id,full_name) select id,coalesce(nullif(raw_user_meta_data->>'full_name',''),email,'Team member') from auth.users where id=auth.uid() on conflict(id) do nothing;
  insert into public.client_memberships(agency_id,client_id,user_id,role,status)
    values(i.agency_id,i.client_id,auth.uid(),i.role,'active')
    on conflict(client_id,user_id) do update set status='active',role=case when client_memberships.status<>'active' then excluded.role when client_memberships.role='client_administrator' then client_memberships.role when excluded.role='hiring_manager' then excluded.role else client_memberships.role end returning * into m;
  if i.job_id is not null then
    insert into public.client_job_access(agency_id,client_id,job_id,user_id,access_role)
      values(i.agency_id,i.client_id,i.job_id,auth.uid(),case when i.role='client_administrator' then 'administrator' else i.role end)
      on conflict(job_id,user_id) do nothing;
  end if;
  update public.client_invitations set accepted_at=now() where id=i.id;
  insert into public.activity_events(agency_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(i.agency_id,auth.uid(),'client_invitation.accepted','client_membership',m.id,jsonb_build_object('invitation_id',i.id,'job_id',i.job_id));
  return m;
end $$;

-- Durable intake throttling before private storage uploads. Service role only.
create table private.portal_request_keys(id uuid primary key references public.hiring_requests(id) on delete cascade,actor_id uuid not null references auth.users(id) on delete cascade,payload jsonb not null);
revoke all on private.portal_request_keys from public,anon,authenticated;
create or replace function public.save_client_request(p_id uuid,p_client_id uuid,p_payload jsonb,p_expected_updated_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.hiring_requests; a uuid; k private.portal_request_keys; item jsonb; n integer:=0; begin
  if auth.uid() is null or not private.has_client_role(p_client_id,array['client_administrator','hiring_manager']) then raise exception 'permission_denied'; end if;
  if char_length(trim(coalesce(p_payload->>'title',''))) not between 2 and 160 or char_length(trim(coalesce(p_payload->>'description',''))) not between 20 and 10000
    or octet_length(p_payload::text)>100000 or jsonb_array_length(coalesce(p_payload->'requirements','[]'::jsonb))>50 then raise exception 'invalid_request'; end if;
  if exists(select 1 from jsonb_array_elements(coalesce(p_payload->'requirements','[]'::jsonb)) x where char_length(trim(coalesce(x->>'label',''))) not between 2 and 160 or char_length(coalesce(x->>'description',''))>1000) then raise exception 'invalid_request'; end if;
  select agency_id into a from public.clients where id=p_client_id;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into r from public.hiring_requests where id=p_id for update;
  if r.id is not null then
    if r.client_id<>p_client_id or r.agency_id<>a then raise exception 'permission_denied'; end if;
    if p_expected_updated_at is null then
      select * into k from private.portal_request_keys where id=p_id;
      if k.actor_id=auth.uid() and k.payload=p_payload then return jsonb_build_object('id',r.id,'status',r.status,'updated_at',r.updated_at); end if;
      raise exception 'request_changed';
    end if;
    if r.updated_at<>p_expected_updated_at or r.status not in ('draft','clarification_requested') then raise exception 'request_changed'; end if;
  else
    if p_expected_updated_at is not null then raise exception 'request_changed'; end if;
    insert into public.hiring_requests(id,agency_id,client_id,submitted_by,title,status) values(p_id,a,p_client_id,auth.uid(),p_payload->>'title','draft');
    insert into private.portal_request_keys values(p_id,auth.uid(),p_payload);
  end if;
  update public.hiring_requests set title=p_payload->>'title',description=p_payload->>'description',
    positions_required=(p_payload->>'positionsRequired')::integer,department=nullif(p_payload->>'department',''),
    location=nullif(p_payload->>'location',''),employment_type=nullif(p_payload->>'employmentType',''),work_arrangement=p_payload->>'workArrangement',
    salary_min=nullif(p_payload->>'salaryMin','')::numeric,salary_max=nullif(p_payload->>'salaryMax','')::numeric,currency=nullif(upper(p_payload->>'currency'),''),
    target_hire_date=nullif(p_payload->>'targetHireDate','')::date,additional_instructions=nullif(p_payload->>'additionalInstructions',''),updated_at=clock_timestamp()
    where id=p_id returning * into r;
  delete from public.hiring_request_requirements where hiring_request_id=p_id;
  for item in select value from jsonb_array_elements(coalesce(p_payload->'requirements','[]'::jsonb)) loop
    insert into public.hiring_request_requirements(agency_id,hiring_request_id,requirement_type,label,description,sort_order)
      values(a,p_id,item->>'type',item->>'label',nullif(item->>'description',''),n); n:=n+1;
  end loop;
  insert into public.activity_events(agency_id,actor_user_id,event_type,entity_type,entity_id,metadata)
    values(a,auth.uid(),'hiring_request.draft_saved','hiring_request',r.id,jsonb_build_object('client_id',p_client_id));
  return jsonb_build_object('id',r.id,'status',r.status,'updated_at',r.updated_at);
end $$;
revoke all on function public.save_client_request(uuid,uuid,jsonb,timestamptz) from public,anon;
grant execute on function public.save_client_request(uuid,uuid,jsonb,timestamptz) to authenticated;

create table private.public_intake_limits (
  job_id uuid not null references public.jobs(id) on delete cascade,
  fingerprint text not null,
  bucket timestamptz not null,
  attempts integer not null,
  primary key(job_id,fingerprint,bucket)
);
revoke all on private.public_intake_limits from public,anon,authenticated;
create or replace function public.reserve_public_intake(p_job_id uuid,p_fingerprint text)
returns boolean language plpgsql security definer set search_path='' as $$
declare n integer; begin
  if auth.role()<>'service_role' or char_length(p_fingerprint)<>64 then raise exception 'permission_denied'; end if;
  insert into private.public_intake_limits(job_id,fingerprint,bucket,attempts)
    values(p_job_id,p_fingerprint,date_trunc('hour',now()),1)
    on conflict(job_id,fingerprint,bucket) do update set attempts=public_intake_limits.attempts+1 returning attempts into n;
  delete from private.public_intake_limits where bucket<now()-interval '2 days';
  return n<=10;
end $$;
revoke all on function public.reserve_public_intake(uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_public_intake(uuid,text) to service_role;
alter table public.applications add column submitted_profile jsonb not null default '{}'::jsonb,add column intake_payload_hash text;
create or replace function public.submit_public_application(
  p_application_id uuid,
  p_agency_id uuid,
  p_job_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_linkedin_url text,
  p_cover_note text,
  p_document jsonb,
  p_answers jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_job public.jobs;
  v_candidate_id uuid;
begin
  select * into v_job from public.jobs
  where id = p_job_id and agency_id = p_agency_id for share;
  if v_job.id is null or v_job.status <> 'open' or not v_job.accepting_applications or v_job.published_at is null then
    raise exception 'job_not_accepting_applications';
  end if;

  insert into public.candidates (agency_id, full_name, email, phone, linkedin_url)
  values (p_agency_id, trim(p_full_name), lower(trim(p_email)), nullif(trim(p_phone), ''), nullif(trim(p_linkedin_url), ''))
  on conflict (agency_id, email_normalized) do update
    set full_name = public.candidates.full_name,
        phone = coalesce(excluded.phone, public.candidates.phone),
        linkedin_url = coalesce(excluded.linkedin_url, public.candidates.linkedin_url),
        updated_at = now()
  returning id into v_candidate_id;

  insert into public.applications (
    id, agency_id, job_id, candidate_id, status, processing_status, source, cover_note, submitted_profile, intake_payload_hash
  ) values (
    p_application_id, p_agency_id, p_job_id, v_candidate_id, 'received', 'pending', 'public_form', nullif(trim(p_cover_note), ''), jsonb_build_object('fullName',trim(p_full_name),'phone',nullif(trim(p_phone),''),'linkedinUrl',nullif(trim(p_linkedin_url),'')),p_document->>'intakeHash'
  );

  insert into public.candidate_documents (
    agency_id, candidate_id, application_id, document_type, file_name, storage_path, content_type, size_bytes
  ) values (
    p_agency_id, v_candidate_id, p_application_id, 'resume', p_document ->> 'fileName',
    p_document ->> 'storagePath', p_document ->> 'contentType', (p_document ->> 'sizeBytes')::bigint
  );

  insert into public.application_answers (agency_id, job_id, application_id, question_id, answer)
  select p_agency_id, p_job_id, p_application_id, (item ->> 'questionId')::uuid, item -> 'answer'
  from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) as rows(item);

  insert into public.activity_events (
    agency_id, actor_user_id, event_type, entity_type, entity_id, metadata
  ) values (
    p_agency_id, null, 'application.received', 'application', p_application_id,
    jsonb_build_object('job_id', p_job_id, 'candidate_id', v_candidate_id, 'source', 'public_form')
  );

  return jsonb_build_object('applicationId', p_application_id, 'candidateId', v_candidate_id);
end;
$$;
create or replace function public.application_inbox(p_agency_id uuid,p_filters jsonb default '{}'::jsonb)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with filtered as (
    select a.*,c.full_name,c.email,c.phone,j.title,j.public_slug,o.name organization_name,p.full_name owner_name
    from public.applications a
    join public.candidates c on c.agency_id=a.agency_id and c.id=a.candidate_id
    join public.jobs j on j.agency_id=a.agency_id and j.id=a.job_id
    join public.agencies g on g.id=a.agency_id
    join public.clients o on o.agency_id=j.agency_id and o.id=j.client_id
    left join public.user_profiles p on p.id=a.owner_user_id
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

create or replace function public.delete_empty_manual_job(
  p_job_id uuid,
  p_request_id_header text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.jobs;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into v_job from public.jobs where id = p_job_id for update;
  if v_job.id is null then raise exception 'job_not_found'; end if;
  if not (
    private.has_agency_role(v_job.agency_id, array['owner','administrator','recruitment_manager'])
    or (
      private.has_agency_role(v_job.agency_id, array['recruiter'])
      and (v_job.created_by = auth.uid() or exists (
        select 1 from public.job_assignments a
        where a.job_id = v_job.id and a.user_id = auth.uid()
      ))
    )
  ) then raise exception 'permission_denied'; end if;
  if v_job.source <> 'manual' then raise exception 'converted_job_cannot_be_deleted'; end if;
  if exists (select 1 from public.applications a where a.job_id = v_job.id) then
    raise exception 'job_has_applications';
  end if;

  if exists(select 1 from public.client_invitations where job_id=v_job.id)
    or exists(select 1 from public.client_job_access where job_id=v_job.id) then
    raise exception 'job_has_collaboration_history';
  end if;

  delete from public.jobs where id = v_job.id;
  insert into public.activity_events (
    agency_id, actor_user_id, event_type, entity_type, entity_id, request_id, metadata
  ) values (
    v_job.agency_id, auth.uid(), 'job.deleted', 'job', v_job.id,
    nullif(left(trim(p_request_id_header), 200), ''),
    jsonb_build_object('title', v_job.title, 'client_id', v_job.client_id, 'previous_status', v_job.status)
  );
  return jsonb_build_object('id', v_job.id, 'clientId', v_job.client_id);
end;
$$;

revoke all on function public.delete_empty_manual_job(uuid,text) from public, anon;
grant execute on function public.delete_empty_manual_job(uuid,text) to authenticated;
