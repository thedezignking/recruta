-- Early capture: unfinished custom rows are private until a complete publication.
create table public.job_draft_content(
  job_id uuid primary key,
  agency_id uuid not null,
  requirements jsonb not null default '[]' check(jsonb_typeof(requirements)='array' and jsonb_array_length(requirements)<=50),
  questions jsonb not null default '[]' check(jsonb_typeof(questions)='array' and jsonb_array_length(questions)<=20),
  foreign key(agency_id,job_id) references public.jobs(agency_id,id) on delete cascade
);
alter table public.job_draft_content enable row level security;
revoke all on public.job_draft_content from public,anon,authenticated;
grant select on public.job_draft_content to authenticated;
grant all on public.job_draft_content to service_role;
create policy job_draft_content_read on public.job_draft_content for select to authenticated using(
  private.can_review_job(agency_id,job_id)
  or (private.has_agency_role(agency_id,array['recruiter']) and exists(
    select 1 from public.jobs j where j.agency_id=job_draft_content.agency_id
      and j.id=job_draft_content.job_id and j.status='draft' and j.published_at is null and j.created_by=auth.uid()
  ))
);

create or replace function private.validate_job_draft_input(p_job jsonb,p_requirements jsonb,p_questions jsonb)
returns void language plpgsql set search_path='' as $$
declare v_item jsonb; v_option jsonb;
begin
  perform private.validate_job_aggregate_input(p_job,'[]','[]');
  if jsonb_typeof(p_requirements) is distinct from 'array' or jsonb_typeof(p_questions) is distinct from 'array'
  then raise exception 'invalid_job_details'; end if;
  if jsonb_array_length(p_requirements)>50 or jsonb_array_length(p_questions)>20 then raise exception 'invalid_job_details'; end if;
  for v_item in select value from jsonb_array_elements(p_requirements) loop
    if jsonb_typeof(v_item) is distinct from 'object' or jsonb_typeof(v_item->'label') is distinct from 'string'
      or char_length(v_item->>'label')>160 or char_length(coalesce(v_item->>'description',''))>1000
      or coalesce(v_item->>'type','required') not in ('required','preferred')
    then raise exception 'invalid_job_requirement'; end if;
  end loop;
  for v_item in select value from jsonb_array_elements(p_questions) loop
    if jsonb_typeof(v_item) is distinct from 'object' or jsonb_typeof(v_item->'label') is distinct from 'string'
      or char_length(v_item->>'label')>240 or char_length(coalesce(v_item->>'helpText',''))>500
      or coalesce(v_item->>'questionType','long_text') not in ('short_text','long_text','yes_no','single_select')
      or jsonb_typeof(coalesce(v_item->'options','[]')) is distinct from 'array'
    then raise exception 'invalid_job_question'; end if;
    if jsonb_array_length(coalesce(v_item->'options','[]'))>20 then raise exception 'invalid_question_options'; end if;
    for v_option in select value from jsonb_array_elements(coalesce(v_item->'options','[]')) loop
      if jsonb_typeof(v_option) is distinct from 'string' or char_length(v_option#>>'{}')>120
      then raise exception 'invalid_question_options'; end if;
    end loop;
  end loop;
end;
$$;
revoke all on function private.validate_job_draft_input(jsonb,jsonb,jsonb) from public,anon,authenticated;

create or replace function private.validate_job_publication_input(p_job jsonb,p_requirements jsonb,p_questions jsonb)
returns void language plpgsql set search_path='' as $$
declare v_item jsonb;
begin
  perform private.validate_job_aggregate_input(p_job,p_requirements,p_questions);
  if char_length(trim(coalesce(p_job->>'description',''))) < 20
    or coalesce(p_job->>'workArrangement','') not in ('on_site','hybrid','remote')
  then raise exception 'job_publication_incomplete'; end if;
  for v_item in select value from jsonb_array_elements(p_questions) loop
    if v_item->>'questionType'='single_select' and (
      jsonb_array_length(coalesce(v_item->'options','[]'))<2
      or (select count(distinct lower(trim(value#>>'{}'))) from jsonb_array_elements(v_item->'options')) <> jsonb_array_length(v_item->'options')
    ) then raise exception 'invalid_question_options'; end if;
  end loop;
end;
$$;
revoke all on function private.validate_job_publication_input(jsonb,jsonb,jsonb) from public,anon,authenticated;

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
  v_draft_requirements jsonb := p_requirements;
  v_draft_questions jsonb := p_questions;
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

  if p_publish then
    perform private.validate_job_publication_input(p_job,p_requirements,p_questions);
  else
    perform private.validate_job_draft_input(p_job,p_requirements,p_questions);
    p_requirements := '[]'; p_questions := '[]';
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

  if not p_publish then
    insert into public.job_draft_content(agency_id,job_id,requirements,questions)
    values(p_agency_id,v_job_id,v_draft_requirements,v_draft_questions);
  end if;
  return v_job_id;
end;
$$;

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
  v_draft_requirements jsonb := p_requirements;
  v_draft_questions jsonb := p_questions;
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
    or pg_catalog.char_length(coalesce(p_job ->> 'description', '')) > 20000
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
  perform private.validate_job_draft_input(p_job,p_requirements,p_questions);
  p_requirements := '[]'; p_questions := '[]';
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
  insert into public.job_draft_content(agency_id,job_id,requirements,questions)
  values(p_agency_id,p_job_id,v_draft_requirements,v_draft_questions)
  on conflict(job_id) do update set requirements=excluded.requirements,questions=excluded.questions;
  return v_job;
end;
$$;

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
  v_draft public.job_draft_content;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into v_job from public.jobs where id = p_job_id for update;
  if v_job.id is null then raise exception 'job_not_found'; end if;
  if not private.can_mutate_job(v_job.agency_id, v_job.id, true) then
    raise exception 'permission_denied';
  end if;
  if v_job.status not in ('draft','open','on_hold') then raise exception 'job_cannot_be_published'; end if;

  if v_job.status='draft' then
    select * into v_draft from public.job_draft_content where agency_id=v_job.agency_id and job_id=v_job.id;
    if v_draft.job_id is not null then
      perform private.validate_job_publication_input(
        jsonb_build_object('title',v_job.title,'description',v_job.description,'workArrangement',v_job.work_arrangement,
          'positionsRequired',v_job.positions_required,'salaryMin',v_job.salary_min,'salaryMax',v_job.salary_max),
        v_draft.requirements,v_draft.questions);
      delete from public.job_requirements where agency_id=v_job.agency_id and job_id=v_job.id;
      delete from public.job_application_questions where agency_id=v_job.agency_id and job_id=v_job.id;
      insert into public.job_requirements(agency_id,job_id,label,description,requirement_type,is_required,sort_order)
      select v_job.agency_id,v_job.id,trim(item->>'label'),nullif(item->>'description',''),
        item->>'type',(item->>'type')='required',ordinality::integer
      from jsonb_array_elements(v_draft.requirements) with ordinality as rows(item,ordinality);
      insert into public.job_application_questions(agency_id,job_id,label,help_text,question_type,options,is_required,sort_order)
      select v_job.agency_id,v_job.id,trim(item->>'label'),nullif(item->>'helpText',''),
        coalesce(item->>'questionType','long_text'),coalesce(item->'options','[]'),coalesce((item->>'isRequired')::boolean,false),ordinality::integer
      from jsonb_array_elements(v_draft.questions) with ordinality as rows(item,ordinality);
      delete from public.job_draft_content where job_id=v_job.id;
    end if;
  end if;
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

