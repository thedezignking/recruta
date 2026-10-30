-- P1: close direct-write bypasses without changing the later draft/receipt contracts.
-- New private helpers are never exposed as caller-writable APIs.
create or replace function private.can_mutate_job(p_agency_id uuid, p_job_id uuid, p_allow_owned_draft boolean)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_agency_role(p_agency_id, array['owner','administrator','recruitment_manager'])
    and exists (select 1 from public.jobs where agency_id=p_agency_id and id=p_job_id)
    or (private.has_agency_role(p_agency_id, array['recruiter']) and exists (
      select 1 from public.jobs j where j.agency_id=p_agency_id and j.id=p_job_id and (
        (p_allow_owned_draft and j.status='draft' and j.published_at is null and j.created_by=auth.uid())
        or exists(select 1 from public.job_assignments a where a.agency_id=p_agency_id and a.job_id=j.id and a.user_id=auth.uid())
      )
    ));
$$;
revoke all on function private.can_mutate_job(uuid,uuid,boolean) from public, anon, authenticated;

create or replace function private.validate_job_aggregate_input(p_job jsonb, p_requirements jsonb, p_questions jsonb)
returns void language plpgsql set search_path = '' as $$
declare v_item jsonb; v_option jsonb;
begin
  if jsonb_typeof(p_job) is distinct from 'object'
    or jsonb_typeof(p_requirements) is distinct from 'array'
    or jsonb_typeof(p_questions) is distinct from 'array'
  then raise exception 'invalid_job_details'; end if;
  if jsonb_array_length(p_requirements)>50 or jsonb_array_length(p_questions)>20
    or char_length(trim(coalesce(p_job->>'title',''))) not between 2 and 160
    or char_length(coalesce(p_job->>'description',''))>20000
    or char_length(coalesce(p_job->>'department',''))>120
    or char_length(coalesce(p_job->>'location',''))>160
    or char_length(coalesce(p_job->>'employmentType',''))>80
    or char_length(coalesce(p_job->>'applicationFormIntro',''))>1200
  then raise exception 'invalid_job_details'; end if;
  -- Preserve the existing constraint error for invalid headcount and atomic rollback.
  if coalesce((p_job->>'positionsRequired')::integer,1) not between 1 and 1000
  then raise exception using errcode='23514',message='invalid_job_positions'; end if;
  if nullif(p_job->>'salaryMin','')::numeric<0 or nullif(p_job->>'salaryMax','')::numeric<0
    or nullif(p_job->>'salaryMax','')::numeric<nullif(p_job->>'salaryMin','')::numeric
  then raise exception 'invalid_salary_range'; end if;
  for v_item in select value from jsonb_array_elements(p_requirements) loop
    if jsonb_typeof(v_item) is distinct from 'object'
      or char_length(trim(coalesce(v_item->>'label',''))) not between 2 and 240
      or char_length(coalesce(v_item->>'description',''))>2000
      or coalesce(v_item->>'type','required') not in ('required','preferred')
    then raise exception 'invalid_job_requirement'; end if;
  end loop;
  for v_item in select value from jsonb_array_elements(p_questions) loop
    if jsonb_typeof(v_item) is distinct from 'object'
      or char_length(trim(coalesce(v_item->>'label',''))) not between 2 and 240
      or char_length(coalesce(v_item->>'helpText',''))>500
      or coalesce(v_item->>'questionType','long_text') not in ('short_text','long_text','yes_no','single_select')
      or jsonb_typeof(coalesce(v_item->'options','[]'::jsonb)) is distinct from 'array'
    then raise exception 'invalid_job_question'; end if;
    if jsonb_array_length(coalesce(v_item->'options','[]'::jsonb))>20 then raise exception 'invalid_question_options'; end if;
    for v_option in select value from jsonb_array_elements(coalesce(v_item->'options','[]'::jsonb)) loop
      if jsonb_typeof(v_option) is distinct from 'string' or char_length(trim(v_option#>>'{}')) not between 1 and 120
      then raise exception 'invalid_question_options'; end if;
    end loop;
  end loop;
end;
$$;
revoke all on function private.validate_job_aggregate_input(jsonb,jsonb,jsonb) from public, anon, authenticated;

-- Normalize old duplicate primary labels using the existing job pointer, preserving
-- any previous explicit access as collaborator. New handoffs remove the old primary.
update public.job_assignments a set assignment_role='collaborator'
from public.jobs j
where a.agency_id=j.agency_id and a.job_id=j.id and a.assignment_role='primary'
  and a.user_id is distinct from j.primary_recruiter_id;
create unique index job_assignments_one_primary_idx on public.job_assignments(job_id)
  where assignment_role='primary';

create or replace function public.create_manual_job(
  p_agency_id uuid,
  p_client_id uuid,
  p_new_client jsonb,
  p_job jsonb,
  p_requirements jsonb default '[]'::jsonb,
  p_questions jsonb default '[]'::jsonb,
  p_publish boolean default false,
  p_request_id_header text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_client_id uuid := p_client_id;
  v_job_id uuid;
  v_workflow_id uuid := nullif(p_job ->> 'workflowTemplateId', '')::uuid;
  v_primary_recruiter_id uuid := coalesce(nullif(p_job ->> 'primaryRecruiterId', '')::uuid, v_user_id);
  v_creation_request_id text := nullif(left(trim(p_request_id_header), 200), '');
  v_new_client_name text := nullif(trim(p_new_client ->> 'name'), '');
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if not private.has_agency_role(p_agency_id, array['owner','administrator','recruitment_manager','recruiter']) then
    raise exception 'permission_denied';
  end if;

  if not private.has_agency_role(p_agency_id, array['owner','administrator','recruitment_manager'])
    and v_primary_recruiter_id <> v_user_id then raise exception 'permission_denied'; end if;

  if v_creation_request_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(p_agency_id::text || ':job:' || v_creation_request_id, 0)
    );
    select j.id into v_job_id
    from public.jobs j
    where j.agency_id = p_agency_id
      and j.creation_request_id = v_creation_request_id;
    if v_job_id is not null then
      if not private.can_mutate_job(p_agency_id, v_job_id, true) then raise exception 'permission_denied'; end if;
      return v_job_id;
    end if;
  end if;

  perform private.validate_job_aggregate_input(p_job, p_requirements, p_questions);
  if v_client_id is null then
    v_client_id := public.create_organization(p_agency_id, p_new_client, null, p_request_id_header);
  elsif not exists (
    select 1 from public.clients c
    where c.id = v_client_id
      and c.agency_id = p_agency_id
      and c.status <> 'archived'
  ) then
    raise exception 'organization_not_found';
  end if;

  if v_workflow_id is not null and not exists (
    select 1 from public.workflow_templates wt
    where wt.id = v_workflow_id and wt.agency_id = p_agency_id and wt.is_active
  ) then raise exception 'workflow_not_found'; end if;

  if not exists (
    select 1 from public.agency_memberships m
    where m.agency_id = p_agency_id
      and m.user_id = v_primary_recruiter_id
      and m.status = 'active'
      and m.role in ('owner','administrator','recruitment_manager','recruiter')
  ) then raise exception 'recruiter_not_found'; end if;

  insert into public.jobs (
    agency_id, client_id, workflow_template_id, title, description, department, location,
    employment_type, work_arrangement, experience_min_years, seniority_level, salary_min, salary_max, currency, salary_period, positions_required,
    status, priority, primary_recruiter_id, deadline_at, accepting_applications, created_by,
    source, public_slug, published_at, application_form_intro, creation_request_id
  ) values (
    p_agency_id, v_client_id, v_workflow_id, trim(p_job ->> 'title'), coalesce(p_job ->> 'description', ''),
    nullif(trim(p_job ->> 'department'), ''), nullif(trim(p_job ->> 'location'), ''),
    nullif(trim(p_job ->> 'employmentType'), ''), nullif(p_job ->> 'workArrangement', ''),
    nullif(p_job ->> 'experienceMinYears', '')::integer, nullif(p_job ->> 'seniorityLevel', ''),
    nullif(p_job ->> 'salaryMin', '')::numeric, nullif(p_job ->> 'salaryMax', '')::numeric,
    upper(nullif(trim(p_job ->> 'currency'), '')), nullif(p_job ->> 'salaryPeriod', ''), coalesce((p_job ->> 'positionsRequired')::integer, 1),
    case when p_publish then 'open' else 'draft' end,
    coalesce(nullif(p_job ->> 'priority', ''), 'normal'), v_primary_recruiter_id,
    nullif(p_job ->> 'deadlineAt', '')::timestamptz, p_publish, v_user_id, 'manual',
    nullif(p_job ->> 'publicSlug', ''), case when p_publish then now() else null end,
    nullif(trim(p_job ->> 'applicationFormIntro'), ''), v_creation_request_id
  ) returning id into v_job_id;

  insert into public.job_requirements (
    agency_id, job_id, label, description, requirement_type, is_required, sort_order
  )
  select p_agency_id, v_job_id, trim(item ->> 'label'), nullif(trim(item ->> 'description'), ''),
    coalesce(item ->> 'type', 'required'), coalesce(item ->> 'type', 'required') = 'required', ordinality::integer
  from jsonb_array_elements(coalesce(p_requirements, '[]'::jsonb)) with ordinality as rows(item, ordinality);

  insert into public.job_application_questions (
    agency_id, job_id, label, help_text, question_type, options, is_required, sort_order
  )
  select p_agency_id, v_job_id, trim(item ->> 'label'), nullif(trim(item ->> 'helpText'), ''),
    coalesce(item ->> 'questionType', 'long_text'), coalesce(item -> 'options', '[]'::jsonb),
    coalesce((item ->> 'isRequired')::boolean, false), ordinality::integer
  from jsonb_array_elements(coalesce(p_questions, '[]'::jsonb)) with ordinality as rows(item, ordinality);

  if v_workflow_id is not null then
    insert into public.job_workflow_stages (
      agency_id, job_id, name, stage_type, sort_order, requires_approval
    )
    select p_agency_id, v_job_id, name, stage_type, sort_order, requires_approval
    from public.workflow_stages
    where workflow_template_id = v_workflow_id;
  end if;

  insert into public.job_assignments (agency_id, job_id, user_id, assignment_role)
  values (p_agency_id, v_job_id, v_primary_recruiter_id, 'primary');

  insert into public.activity_events (
    agency_id, actor_user_id, event_type, entity_type, entity_id, request_id, metadata
  ) values (
    p_agency_id, v_user_id,
    case when p_publish then 'job.published' else 'job.draft_created' end,
    'job', v_job_id, v_creation_request_id,
    jsonb_build_object('source', 'manual', 'client_id', v_client_id)
  );

  return v_job_id;
end;
$$;

revoke all on function public.create_manual_job(uuid,uuid,jsonb,jsonb,jsonb,jsonb,boolean,text)
  from public, anon;
grant execute on function public.create_manual_job(uuid,uuid,jsonb,jsonb,jsonb,jsonb,boolean,text)
  to authenticated;


create or replace function public.update_draft_job(
  p_agency_id uuid,
  p_job_id uuid,
  p_expected_updated_at timestamptz,
  p_client_id uuid,
  p_new_client jsonb,
  p_job jsonb,
  p_requirements jsonb,
  p_questions jsonb,
  p_request_id_header text default null
) returns public.jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.jobs;
  v_client_id uuid := p_client_id;
  v_workflow_id uuid := nullif(p_job ->> 'workflowTemplateId', '')::uuid;
  v_recruiter_id uuid := nullif(p_job ->> 'primaryRecruiterId', '')::uuid;
  v_request_id text := nullif(left(trim(p_request_id_header), 200), '');
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into v_job from public.jobs
  where id = p_job_id and agency_id = p_agency_id for update;
  if v_job.id is null then raise exception 'job_not_found'; end if;
  if not (
    private.has_agency_role(p_agency_id, array['owner','administrator','recruitment_manager'])
    or (private.has_agency_role(p_agency_id, array['recruiter']) and
      (v_job.created_by = auth.uid() or exists (
        select 1 from public.job_assignments a
        where a.agency_id = p_agency_id and a.job_id = p_job_id and a.user_id = auth.uid()
      )))
  ) then raise exception 'permission_denied'; end if;
  if v_job.status <> 'draft' or v_job.published_at is not null then
    raise exception 'job_not_draft';
  end if;
  if v_request_id is not null and exists (
    select 1 from public.activity_events e
    where e.agency_id = p_agency_id and e.entity_id = p_job_id
      and e.actor_user_id = auth.uid() and e.event_type = 'job.draft_updated'
      and e.request_id = v_request_id
  ) then return v_job; end if;
  if v_job.updated_at is distinct from p_expected_updated_at then
    raise exception 'stale_job';
  end if;
  if pg_catalog.char_length(trim(coalesce(p_job ->> 'title', ''))) not between 2 and 160
    or pg_catalog.char_length(trim(coalesce(p_job ->> 'description', ''))) not between 20 and 20000
    or coalesce((p_job ->> 'positionsRequired')::integer, 0) not between 1 and 1000
    or pg_catalog.jsonb_typeof(p_requirements) <> 'array'
    or pg_catalog.jsonb_typeof(p_questions) <> 'array'
    or pg_catalog.jsonb_array_length(p_requirements) > 50
    or pg_catalog.jsonb_array_length(p_questions) > 20
  then raise exception 'invalid_job_details'; end if;
  if v_client_id is null then
    v_client_id := public.create_organization(p_agency_id, p_new_client, null, v_request_id);
  elsif not exists (
    select 1 from public.clients c
    where c.id = v_client_id and c.agency_id = p_agency_id and c.status <> 'archived'
  ) then raise exception 'organization_not_found'; end if;
  if v_workflow_id is not null and not exists (
    select 1 from public.workflow_templates wt
    where wt.id = v_workflow_id and wt.agency_id = p_agency_id and wt.is_active
  ) then raise exception 'workflow_not_found'; end if;
  v_recruiter_id := coalesce(v_recruiter_id, v_job.primary_recruiter_id);
  if not private.has_agency_role(p_agency_id, array['owner','administrator','recruitment_manager'])
    and v_recruiter_id is distinct from v_job.primary_recruiter_id
    and v_recruiter_id is distinct from auth.uid() then raise exception 'permission_denied'; end if;
  perform private.validate_job_aggregate_input(p_job, p_requirements, p_questions);
  if not exists (
    select 1 from public.agency_memberships m
    where m.agency_id = p_agency_id and m.user_id = v_recruiter_id and m.status = 'active'
      and m.role in ('owner','administrator','recruitment_manager','recruiter')
  ) then raise exception 'recruiter_not_found'; end if;

  update public.jobs set
    client_id = v_client_id,
    workflow_template_id = v_workflow_id,
    title = trim(p_job ->> 'title'),
    description = coalesce(p_job ->> 'description', ''),
    department = nullif(trim(p_job ->> 'department'), ''),
    location = nullif(trim(p_job ->> 'location'), ''),
    employment_type = nullif(trim(p_job ->> 'employmentType'), ''),
    work_arrangement = nullif(p_job ->> 'workArrangement', ''),
    experience_min_years = nullif(p_job ->> 'experienceMinYears', '')::integer,
    seniority_level = nullif(p_job ->> 'seniorityLevel', ''),
    salary_min = nullif(p_job ->> 'salaryMin', '')::numeric,
    salary_max = nullif(p_job ->> 'salaryMax', '')::numeric,
    currency = upper(nullif(trim(p_job ->> 'currency'), '')),
    salary_period = nullif(p_job ->> 'salaryPeriod', ''),
    positions_required = coalesce((p_job ->> 'positionsRequired')::integer, 1),
    priority = coalesce(nullif(p_job ->> 'priority', ''), 'normal'),
    primary_recruiter_id = v_recruiter_id,
    deadline_at = nullif(p_job ->> 'deadlineAt', '')::timestamptz,
    application_form_intro = nullif(trim(p_job ->> 'applicationFormIntro'), ''),
    updated_at = now()
  where id = p_job_id returning * into v_job;

  delete from public.job_requirements where job_id = p_job_id and agency_id = p_agency_id;
  insert into public.job_requirements
    (agency_id, job_id, label, description, requirement_type, is_required, sort_order)
  select p_agency_id, p_job_id, trim(item ->> 'label'), nullif(trim(item ->> 'description'), ''),
    coalesce(item ->> 'type', 'required'), coalesce(item ->> 'type', 'required') = 'required', ordinality::integer
  from jsonb_array_elements(coalesce(p_requirements, '[]'::jsonb)) with ordinality as rows(item, ordinality);

  delete from public.job_application_questions where job_id = p_job_id and agency_id = p_agency_id;
  insert into public.job_application_questions
    (agency_id, job_id, label, help_text, question_type, options, is_required, sort_order)
  select p_agency_id, p_job_id, trim(item ->> 'label'), nullif(trim(item ->> 'helpText'), ''),
    coalesce(item ->> 'questionType', 'long_text'), coalesce(item -> 'options', '[]'::jsonb),
    coalesce((item ->> 'isRequired')::boolean, false), ordinality::integer
  from jsonb_array_elements(coalesce(p_questions, '[]'::jsonb)) with ordinality as rows(item, ordinality);

  delete from public.job_workflow_stages where job_id = p_job_id and agency_id = p_agency_id;
  if v_workflow_id is not null then
    insert into public.job_workflow_stages
      (agency_id, job_id, name, stage_type, sort_order, requires_approval)
    select p_agency_id, p_job_id, name, stage_type, sort_order, requires_approval
    from public.workflow_stages where workflow_template_id = v_workflow_id;
  end if;

  delete from public.job_assignments
  where job_id = p_job_id and agency_id = p_agency_id and assignment_role = 'primary';
  insert into public.job_assignments (agency_id, job_id, user_id, assignment_role)
  values (p_agency_id, p_job_id, v_recruiter_id, 'primary')
  on conflict (job_id, user_id) do update set assignment_role = 'primary';

  insert into public.activity_events
    (agency_id, actor_user_id, event_type, entity_type, entity_id, request_id, metadata)
  values (p_agency_id, auth.uid(), 'job.draft_updated', 'job', p_job_id, v_request_id,
    jsonb_build_object('client_id', v_client_id, 'title', v_job.title));
  return v_job;
end;
$$;

revoke all on function public.update_draft_job(uuid,uuid,timestamptz,uuid,jsonb,jsonb,jsonb,jsonb,text)
  from public, anon;
grant execute on function public.update_draft_job(uuid,uuid,timestamptz,uuid,jsonb,jsonb,jsonb,jsonb,text)
  to authenticated;


create or replace function public.publish_job(
  p_job_id uuid,
  p_public_slug text,
  p_request_id_header text default null
) returns public.jobs
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
  if not private.can_mutate_job(v_job.agency_id, v_job.id, true) then
    raise exception 'permission_denied';
  end if;
  if v_job.status not in ('draft','open','on_hold') then raise exception 'job_cannot_be_published'; end if;

  update public.jobs
  set status = 'open',
      accepting_applications = true,
      public_slug = coalesce(public_slug, nullif(trim(p_public_slug), '')),
      published_at = coalesce(published_at, now()),
      updated_at = now()
  where id = p_job_id
  returning * into v_job;

  insert into public.activity_events (
    agency_id, actor_user_id, event_type, entity_type, entity_id, request_id, metadata
  ) values (
    v_job.agency_id, auth.uid(), 'job.published', 'job', v_job.id, p_request_id_header,
    jsonb_build_object('public_slug', v_job.public_slug)
  );
  return v_job;
end;
$$;

create or replace function public.assign_job(
  p_job_id uuid, p_user_id uuid, p_assignment_role text, p_request_id_header text default null
) returns public.job_assignments
language plpgsql security definer set search_path='' as $$
declare v_job public.jobs; v_assignment public.job_assignments;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into v_job from public.jobs where id=p_job_id for update;
  if v_job.id is null then raise exception 'job_not_found'; end if;
  if not private.has_agency_role(v_job.agency_id,array['owner','administrator','recruitment_manager'])
  then raise exception 'permission_denied'; end if;
  if p_assignment_role is null or p_assignment_role not in ('primary','collaborator','manager')
  then raise exception 'invalid_assignment_role'; end if;
  if not exists(select 1 from public.agency_memberships m
    where m.agency_id=v_job.agency_id and m.user_id=p_user_id and m.status='active'
      and m.role in ('owner','administrator','recruitment_manager','recruiter'))
  then raise exception 'assignee_not_active'; end if;
  if p_assignment_role<>'primary' and v_job.primary_recruiter_id=p_user_id
  then raise exception 'primary_assignment_required'; end if;
  if p_assignment_role='primary' then
    delete from public.job_assignments
      where agency_id=v_job.agency_id and job_id=v_job.id and assignment_role='primary' and user_id<>p_user_id;
  end if;
  insert into public.job_assignments(agency_id,job_id,user_id,assignment_role)
  values(v_job.agency_id,v_job.id,p_user_id,p_assignment_role)
  on conflict(job_id,user_id) do update set assignment_role=excluded.assignment_role
  returning * into v_assignment;
  update public.jobs set
    primary_recruiter_id=case when p_assignment_role='primary' then p_user_id else primary_recruiter_id end,
    updated_at=now() where id=v_job.id;
  insert into public.activity_events(agency_id,actor_user_id,event_type,entity_type,entity_id,request_id,metadata)
  values(v_job.agency_id,auth.uid(),'job.assigned','job',v_job.id,p_request_id_header,
    jsonb_build_object('user_id',p_user_id,'assignment_role',p_assignment_role));
  return v_assignment;
end;
$$;

create or replace function public.transition_job(
  p_job_id uuid,
  p_status text,
  p_request_id_header text default null
) returns public.jobs
language plpgsql security definer set search_path = '' as $$
declare
  v_job public.jobs;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into v_job from public.jobs where id = p_job_id for update;
  if v_job.id is null then raise exception 'job_not_found'; end if;
  if not private.can_mutate_job(v_job.agency_id, v_job.id, false) then raise exception 'permission_denied'; end if;
  if not (
    (v_job.status = 'open' and p_status in ('on_hold','filled','cancelled','closed_unfilled'))
    or (v_job.status = 'on_hold' and p_status in ('open','cancelled','closed_unfilled'))
  ) then raise exception 'invalid_job_transition'; end if;

  update public.jobs
  set status = p_status,
      accepting_applications = case when p_status = 'open' then accepting_applications else false end,
      updated_at = now()
  where id = p_job_id returning * into v_job;

  insert into public.activity_events(agency_id, actor_user_id, event_type, entity_type, entity_id, request_id, metadata)
  values (v_job.agency_id, auth.uid(), 'job.status_changed', 'job', v_job.id, p_request_id_header, jsonb_build_object('to', p_status));
  return v_job;
end;
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
  if not private.can_mutate_job(v_job.agency_id, v_job.id, true) then raise exception 'permission_denied'; end if;
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

create or replace function public.convert_hiring_request_to_job(
  p_request_id uuid,
  p_workflow_template_id uuid,
  p_deadline_at timestamptz,
  p_priority text,
  p_primary_recruiter_id uuid,
  p_idempotency_key text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  request_row public.hiring_requests;
  existing_job_id uuid;
  new_job_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select * into request_row from public.hiring_requests where id = p_request_id for update;
  if request_row.id is null then raise exception 'request_not_found'; end if;
  if not private.has_agency_role(request_row.agency_id, array['owner','administrator','recruitment_manager']) then
    raise exception 'permission_denied';
  end if;
  select id into existing_job_id from public.jobs where hiring_request_id = p_request_id;
  if existing_job_id is not null then return existing_job_id; end if;
  if request_row.status <> 'approved' or request_row.approved_revision_id is null then raise exception 'approved_revision_required'; end if;
  if not exists (select 1 from public.workflow_templates where id = p_workflow_template_id and agency_id = request_row.agency_id and is_active) then
    raise exception 'invalid_workflow_template';
  end if;
  if not exists (select 1 from public.agency_memberships where agency_id = request_row.agency_id and user_id = p_primary_recruiter_id and status = 'active' and role in ('owner','administrator','recruitment_manager','recruiter')) then
    raise exception 'invalid_recruiter';
  end if;

  insert into public.jobs(
    agency_id, client_id, hiring_request_id, source_revision_id, workflow_template_id, title, description,
    department, location, employment_type, work_arrangement, salary_min, salary_max, currency,
    positions_required, status, priority, primary_recruiter_id, deadline_at, created_by
  ) values (
    request_row.agency_id, request_row.client_id, request_row.id, request_row.approved_revision_id, p_workflow_template_id,
    request_row.title, request_row.description, request_row.department, request_row.location, request_row.employment_type,
    request_row.work_arrangement, request_row.salary_min, request_row.salary_max, request_row.currency,
    request_row.positions_required, 'open', p_priority, p_primary_recruiter_id, p_deadline_at, auth.uid()
  ) returning id into new_job_id;

  insert into public.job_requirements(agency_id, job_id, label, description, requirement_type, is_required, sort_order)
  select agency_id, new_job_id, label, description, requirement_type, requirement_type = 'required', sort_order
  from public.hiring_request_requirements where hiring_request_id = p_request_id;

  insert into public.job_workflow_stages(agency_id, job_id, name, stage_type, sort_order, requires_approval)
  select request_row.agency_id, new_job_id, name, stage_type, sort_order, requires_approval
  from public.workflow_stages where workflow_template_id = p_workflow_template_id;

  insert into public.job_assignments(agency_id, job_id, user_id, assignment_role)
  values (request_row.agency_id, new_job_id, p_primary_recruiter_id, 'primary');

  -- Employer access is granted explicitly through the collaboration operation.

  insert into public.activity_events(agency_id, actor_user_id, event_type, entity_type, entity_id, request_id, metadata)
  values (request_row.agency_id, auth.uid(), 'job.created_from_request', 'job', new_job_id, p_idempotency_key, jsonb_build_object('hiring_request_id', p_request_id));
  return new_job_id;
end;
$$;

-- Keep only deliberate public columns; no blanket SELECT on future private data.
revoke select on public.jobs from public, anon;
grant select(id,agency_id,client_id,title,description,department,location,
  employment_type,work_arrangement,experience_min_years,seniority_level,
  salary_min,salary_max,currency,salary_period,positions_required,deadline_at,
  accepting_applications,status,public_slug,published_at,application_form_intro)
on public.jobs to anon;
drop policy if exists jobs_public_published_read on public.jobs;
create policy jobs_public_published_read on public.jobs for select to anon using(
  status='open' and accepting_applications and public_slug is not null and published_at is not null
  and exists(select 1 from public.agencies g where g.id=jobs.agency_id and g.status='active')
);

-- Every app writer now has an authorized RPC. Revoke inherited PUBLIC grants and
-- per-column grants too, and remove permissive mutation policies as defense in depth.
do $$
declare v_table text; v_columns text; v_policy record;
begin
  foreach v_table in array array['jobs','job_requirements','job_application_questions','job_workflow_stages','job_assignments'] loop
    execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from public, anon, authenticated',v_table);
    select string_agg(quote_ident(a.attname),',') into v_columns
      from pg_attribute a where a.attrelid=format('public.%I',v_table)::regclass and a.attnum>0 and not a.attisdropped;
    execute format('revoke insert (%s), update (%s), references (%s) on public.%I from public, anon, authenticated',v_columns,v_columns,v_columns,v_table);
    for v_policy in select polname from pg_policy where polrelid=format('public.%I',v_table)::regclass and polcmd in ('a','w','d','*') loop
      execute format('drop policy %I on public.%I',v_policy.polname,v_table);
    end loop;
  end loop;
end $$;

revoke all on function public.publish_job(uuid,text,text),
  public.assign_job(uuid,uuid,text,text),public.transition_job(uuid,text,text),
  public.delete_empty_manual_job(uuid,text),
  public.convert_hiring_request_to_job(uuid,uuid,timestamptz,text,uuid,text)
from public,anon;
grant execute on function public.publish_job(uuid,text,text),
  public.assign_job(uuid,uuid,text,text),public.transition_job(uuid,text,text),
  public.delete_empty_manual_job(uuid,text),
  public.convert_hiring_request_to_job(uuid,uuid,timestamptz,text,uuid,text)
to authenticated;

