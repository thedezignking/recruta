-- Public role details are separate from private recruiter guidance and budgets.
alter table public.jobs
  add column employment_arrangement text check (employment_arrangement in ('permanent','fixed_term','temporary','freelance','consultancy','internship','apprenticeship','volunteer','other')),
  add column working_hours text not null default 'not_specified' check(working_hours in ('full_time','part_time','flexible','not_specified')),
  add column contract_duration text check(char_length(contract_duration)<=160),
  add column remote_eligibility text check(remote_eligibility in ('anywhere','restricted')),
  add column remote_details text check(char_length(remote_details)<=500),
  add column salary_visibility text not null default 'public' check(salary_visibility in ('public','hidden','negotiable')),
  add column salary_basis text not null default 'not_specified' check(salary_basis in ('gross','net','not_specified')),
  add column content_version integer not null default 0;
update public.jobs set working_hours=case lower(employment_type) when 'full-time' then 'full_time' when 'part-time' then 'part_time' else 'not_specified' end,
 employment_arrangement=case lower(employment_type) when 'contract' then 'fixed_term' when 'temporary' then 'temporary' when 'freelance' then 'freelance' when 'consultancy' then 'consultancy' when 'internship' then 'internship' when 'apprenticeship' then 'apprenticeship' when 'volunteer' then 'volunteer' when 'other' then 'other' end;
grant select(employment_arrangement,working_hours,contract_duration,remote_eligibility,remote_details,salary_visibility,salary_basis) on public.jobs to anon;
alter table public.jobs add constraint hidden_salary_projection check(salary_visibility='public' or (salary_min is null and salary_max is null));

create table public.job_internal_briefs(
 job_id uuid primary key, agency_id uuid not null,
 hiring_reason text check(hiring_reason in ('growth','replacement','project','seasonal','other')),
 target_start_date date, sourcing_brief text check(char_length(sourcing_brief)<=5000),
 salary_min numeric check(salary_min>=0), salary_max numeric check(salary_max>=0),
 currency text, salary_period text,
 check(salary_min is null or salary_max is null or salary_max>=salary_min),
 foreign key(agency_id,job_id) references public.jobs(agency_id,id) on delete cascade
);
alter table public.job_internal_briefs enable row level security;
revoke all on public.job_internal_briefs from public,anon,authenticated;
grant select on public.job_internal_briefs to authenticated;
grant all on public.job_internal_briefs to service_role;
create policy internal_brief_read on public.job_internal_briefs for select to authenticated using(
 private.can_review_job(agency_id,job_id) or (private.has_agency_role(agency_id,array['recruiter']) and exists(select 1 from public.jobs j where j.id=job_id and j.agency_id=job_internal_briefs.agency_id and j.status='draft' and j.published_at is null and j.created_by=auth.uid()))
);

create or replace function private.save_job_content(p_agency_id uuid,p_job_id uuid,p_job jsonb)
returns void language plpgsql set search_path='' as $$
begin
 if not private.can_mutate_job(p_agency_id,p_job_id,true) then raise exception 'permission_denied'; end if;
 insert into public.job_internal_briefs(job_id,agency_id,hiring_reason,target_start_date,sourcing_brief,salary_min,salary_max,currency,salary_period)
 values(p_job_id,p_agency_id,nullif(p_job->>'hiringReason',''),nullif(p_job->>'targetStartDate','')::date,nullif(p_job->>'sourcingBrief',''),nullif(p_job->>'salaryMin','')::numeric,nullif(p_job->>'salaryMax','')::numeric,upper(nullif(p_job->>'currency','')),nullif(p_job->>'salaryPeriod',''))
 on conflict(job_id) do update set hiring_reason=excluded.hiring_reason,target_start_date=excluded.target_start_date,sourcing_brief=excluded.sourcing_brief,salary_min=excluded.salary_min,salary_max=excluded.salary_max,currency=excluded.currency,salary_period=excluded.salary_period;
 update public.jobs set employment_arrangement=nullif(p_job->>'employmentArrangement',''),working_hours=coalesce(nullif(p_job->>'workingHours',''),'not_specified'),
 contract_duration=case when p_job->>'employmentArrangement' in ('fixed_term','temporary') then nullif(p_job->>'contractDuration','') end,
 remote_eligibility=case when p_job->>'workArrangement'='remote' then nullif(p_job->>'remoteEligibility','') end,
 remote_details=case when p_job->>'workArrangement'='remote' then nullif(p_job->>'remoteDetails','') end,
 salary_visibility=coalesce(p_job->>'salaryVisibility','public'),salary_basis=coalesce(p_job->>'salaryBasis','not_specified'),content_version=1,
 salary_min=case when coalesce(p_job->>'salaryVisibility','public')='public' then nullif(p_job->>'salaryMin','')::numeric end,
 salary_max=case when coalesce(p_job->>'salaryVisibility','public')='public' then nullif(p_job->>'salaryMax','')::numeric end
 where agency_id=p_agency_id and id=p_job_id;
end;
$$;
revoke all on function private.save_job_content(uuid,uuid,jsonb) from public,anon,authenticated;

create table public.screening_question_library(
 id uuid primary key, agency_id uuid not null references public.agencies(id),
 label text not null check(char_length(trim(label)) between 2 and 240),
 help_text text not null default '' check(char_length(help_text)<=500),
 question_type text not null check(question_type in ('short_text','long_text','yes_no','single_select')),
 options jsonb not null default '[]', is_required boolean not null default false,
 category text not null check(char_length(category) between 1 and 80),
 version integer not null default 1, archived boolean not null default false,
 updated_at timestamptz not null default now(), unique(agency_id,id)
);
alter table public.screening_question_library enable row level security;
revoke all on public.screening_question_library from public,anon,authenticated;
grant select on public.screening_question_library to authenticated;
grant all on public.screening_question_library to service_role;
create policy library_read on public.screening_question_library for select to authenticated using(private.has_agency_role(agency_id,array['owner','administrator','recruitment_manager','recruiter']));
create unique index library_active_label on public.screening_question_library(agency_id,lower(trim(label))) where not archived;
create table private.question_library_receipts(
 agency_id uuid not null references public.agencies(id) on delete cascade, actor_id uuid not null,
 request_key uuid not null, payload jsonb not null, result public.screening_question_library not null,
 primary key(agency_id,actor_id,request_key)
);
alter table private.question_library_receipts enable row level security;
revoke all on private.question_library_receipts from public,anon,authenticated;

create or replace function public.save_library_question(p_agency_id uuid,p_input jsonb,p_request_key uuid)
returns public.screening_question_library language plpgsql security definer set search_path='' as $$
declare v_row public.screening_question_library; v_receipt private.question_library_receipts; v_q jsonb:=p_input->'question'; v_id uuid:=(p_input->>'id')::uuid; v_expected integer:=(p_input->>'expectedVersion')::integer;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 if not private.has_agency_role(p_agency_id,array['owner','administrator','recruitment_manager']) then raise exception 'permission_denied'; end if;
 if p_request_key is null or v_id is null or v_expected is null or v_expected<0 then raise exception 'invalid_library_input'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_agency_id::text||':library',0));
 select * into v_receipt from private.question_library_receipts where agency_id=p_agency_id and actor_id=auth.uid() and request_key=p_request_key;
 if found then
   if v_receipt.payload is distinct from p_input then raise exception 'idempotency_conflict'; end if;
   return v_receipt.result;
 end if;
 perform private.validate_job_aggregate_input('{"title":"Library validation","positionsRequired":1}'::jsonb,'[]',jsonb_build_array(v_q));
 if v_q->>'questionType'='single_select' then
   if jsonb_array_length(v_q->'options')<2 or (select count(distinct lower(trim(value#>>'{}'))) from jsonb_array_elements(v_q->'options'))<>jsonb_array_length(v_q->'options') then raise exception 'invalid_question_options'; end if;
 elsif jsonb_array_length(coalesce(v_q->'options','[]'))<>0 then raise exception 'invalid_question_options'; end if;
 select * into v_row from public.screening_question_library where agency_id=p_agency_id and id=v_id for update;
 if found then
   if v_row.version<>v_expected then raise exception 'stale_library_question'; end if;
   update public.screening_question_library set label=v_q->>'label',help_text=coalesce(v_q->>'helpText',''),question_type=v_q->>'questionType',options=coalesce(v_q->'options','[]'),is_required=coalesce((v_q->>'isRequired')::boolean,false),category=p_input->>'category',archived=coalesce((p_input->>'archived')::boolean,false),version=version+1,updated_at=now() where id=v_id returning * into v_row;
 else
   if v_expected<>0 then raise exception 'stale_library_question'; end if;
   if (select count(*) from public.screening_question_library where agency_id=p_agency_id and not archived)>=500 then raise exception 'library_limit_reached'; end if;
   insert into public.screening_question_library(id,agency_id,label,help_text,question_type,options,is_required,category,archived)
   values(v_id,p_agency_id,v_q->>'label',coalesce(v_q->>'helpText',''),v_q->>'questionType',coalesce(v_q->'options','[]'),coalesce((v_q->>'isRequired')::boolean,false),p_input->>'category',coalesce((p_input->>'archived')::boolean,false)) returning * into v_row;
 end if;
 insert into private.question_library_receipts values(p_agency_id,auth.uid(),p_request_key,p_input,v_row);
 insert into public.activity_events(agency_id,actor_user_id,event_type,entity_type,entity_id,request_id,metadata)
 values(p_agency_id,auth.uid(),'question_library.saved','screening_question',v_id,p_request_key::text,jsonb_build_object('version',v_row.version,'archived',v_row.archived));
 return v_row;
end;
$$;
revoke all on function public.save_library_question(uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.save_library_question(uuid,jsonb,uuid) to authenticated;
create or replace function private.validate_job_publication_input(p_job jsonb,p_requirements jsonb,p_questions jsonb)
returns void language plpgsql set search_path='' as $$
declare v_item jsonb;
begin
  perform private.validate_job_aggregate_input(p_job,p_requirements,p_questions);
  if char_length(trim(coalesce(p_job->>'description',''))) < 20
    or coalesce(p_job->>'workArrangement','') not in ('on_site','hybrid','remote')
  then raise exception 'job_publication_incomplete'; end if;
  if coalesce(p_job->>'employmentArrangement','') not in ('permanent','fixed_term','temporary','freelance','consultancy','internship','apprenticeship','volunteer','other')
    or (p_job->>'workArrangement' in ('on_site','hybrid') and length(trim(coalesce(p_job->>'location','')))=0)
    or (p_job->>'workArrangement'='remote' and coalesce(p_job->>'remoteEligibility','') not in ('anywhere','restricted'))
    or (p_job->>'workArrangement'='remote' and p_job->>'remoteEligibility'='restricted' and length(trim(coalesce(p_job->>'remoteDetails','')))=0)
    or (p_job->>'employmentArrangement' in ('fixed_term','temporary') and length(trim(coalesce(p_job->>'contractDuration','')))=0)
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
  perform private.save_job_content(p_agency_id,v_job_id,p_job);
  if p_publish and not exists(select 1 from public.job_workflow_stages where agency_id=p_agency_id and job_id=v_job_id) then raise exception 'job_publication_incomplete'; end if;
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
    salary_visibility = coalesce(p_job->>'salaryVisibility','public'),
    salary_min = case when coalesce(p_job->>'salaryVisibility','public')='public' then nullif(p_job ->> 'salaryMin', '')::numeric end,
    salary_max = case when coalesce(p_job->>'salaryVisibility','public')='public' then nullif(p_job ->> 'salaryMax', '')::numeric end,
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
  perform private.save_job_content(p_agency_id,p_job_id,p_job);
  select * into v_job from public.jobs where id=p_job_id;
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

  if v_job.status='draft' and v_job.content_version=1 then
    perform private.validate_job_publication_input(jsonb_build_object('title',v_job.title,'description',v_job.description,'workArrangement',v_job.work_arrangement,'employmentArrangement',v_job.employment_arrangement,'location',v_job.location,'remoteEligibility',v_job.remote_eligibility,'remoteDetails',v_job.remote_details,'contractDuration',v_job.contract_duration,'positionsRequired',v_job.positions_required),'[]','[]');
    if v_job.primary_recruiter_id is null or not exists(select 1 from public.agency_memberships where agency_id=v_job.agency_id and user_id=v_job.primary_recruiter_id and status='active' and role in ('owner','administrator','recruitment_manager','recruiter'))
      or not exists(select 1 from public.job_workflow_stages where agency_id=v_job.agency_id and job_id=v_job.id)
    then raise exception 'job_publication_incomplete'; end if;
  end if;
  if v_job.status='draft' then
    select * into v_draft from public.job_draft_content where agency_id=v_job.agency_id and job_id=v_job.id;
    if v_draft.job_id is not null then
      perform private.validate_job_publication_input(
        jsonb_build_object('title',v_job.title,'description',v_job.description,'workArrangement',v_job.work_arrangement,
          'employmentArrangement',v_job.employment_arrangement,'location',v_job.location,'remoteEligibility',v_job.remote_eligibility,'remoteDetails',v_job.remote_details,'contractDuration',v_job.contract_duration,'positionsRequired',v_job.positions_required,'salaryMin',v_job.salary_min,'salaryMax',v_job.salary_max),
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



