alter table public.jobs
  add column salary_period text
  constraint jobs_salary_period_check
  check (salary_period in ('hourly', 'daily', 'weekly', 'monthly', 'annually'));

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

  if v_creation_request_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(p_agency_id::text || ':job:' || v_creation_request_id, 0)
    );
    select j.id into v_job_id
    from public.jobs j
    where j.agency_id = p_agency_id
      and j.creation_request_id = v_creation_request_id;
    if v_job_id is not null then return v_job_id; end if;
  end if;

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
  if not exists (
    select 1 from public.agency_memberships m
    where m.agency_id = p_agency_id and m.user_id = v_recruiter_id and m.status = 'active'
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

