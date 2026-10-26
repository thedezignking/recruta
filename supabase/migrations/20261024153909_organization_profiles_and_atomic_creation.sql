-- Applied version matches the connected Recruta project's migration history.
-- Company details remain agency-private. Existing RLS and column-scoped anon grants apply.
alter table public.clients
  add column company_profile jsonb not null default '{}'::jsonb,
  add column creation_request_id text,
  add constraint clients_company_profile_object check (jsonb_typeof(company_profile) = 'object');

create unique index clients_creation_request_unique on public.clients(agency_id, creation_request_id)
  where creation_request_id is not null;
create index clients_agency_normalized_name_idx on public.clients(agency_id, lower(trim(name)))
  where status <> 'archived';

-- Privileged only to append an audit event and commit organization + contact together.
-- Every invocation checks a current active membership; supplied account manager IDs are not accepted.
create or replace function public.create_organization(
  p_agency_id uuid, p_organization jsonb, p_contact jsonb default null, p_request_id_header text default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
  v_name text := nullif(trim(p_organization ->> 'name'), '');
  v_key text := nullif(left(trim(p_request_id_header), 200), '');
  v_website text := nullif(trim(p_organization ->> 'website'), '');
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  if not private.has_agency_role(p_agency_id, array['owner','administrator','recruitment_manager','recruiter']) then
    raise exception 'permission_denied';
  end if;
  if v_name is null or length(v_name) < 2 or length(v_name) > 160 then raise exception 'invalid_organization_name'; end if;
  if v_website is not null and (v_website !~* '^https?://' or length(v_website) > 500) then raise exception 'invalid_website'; end if;
  if p_organization ? 'companyProfile' and (jsonb_typeof(p_organization -> 'companyProfile') <> 'object' or length((p_organization -> 'companyProfile')::text) > 4000) then raise exception 'invalid_company_profile'; end if;
  if nullif(p_organization -> 'companyProfile' ->> 'logoUrl', '') is not null
     and (p_organization -> 'companyProfile' ->> 'logoUrl') !~ '^https://' then raise exception 'invalid_logo_url'; end if;
  if p_contact is not null and (length(trim(coalesce(p_contact ->> 'fullName', ''))) < 2 or coalesce(p_contact ->> 'email', '') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then raise exception 'invalid_contact'; end if;
  if v_key is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_agency_id::text || ':organization:' || v_key, 0));
    select id into v_id from public.clients where agency_id = p_agency_id and creation_request_id = v_key;
    if v_id is not null then return v_id; end if;
  end if;
  -- Same lock namespace as the earlier job-creation function, safe during rolling deploys.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_agency_id::text || ':client:' || lower(v_name), 0));
  select id into v_id from public.clients
    where agency_id = p_agency_id and lower(trim(name)) = lower(v_name) and status <> 'archived'
    order by created_at, id limit 1 for update;
  if v_id is not null then return v_id; end if;
  insert into public.clients(agency_id,name,industry,website,location,country_code,account_manager_id,company_profile,creation_request_id)
  values(p_agency_id,v_name,nullif(trim(p_organization ->> 'industry'),''),v_website,nullif(trim(p_organization ->> 'location'),''),upper(nullif(trim(p_organization ->> 'countryCode'),'')),v_actor,coalesce(p_organization -> 'companyProfile','{}'::jsonb),v_key)
  returning id into v_id;
  if p_contact is not null then
    insert into public.client_contacts(agency_id,client_id,full_name,email,phone,job_title,is_primary)
    values(p_agency_id,v_id,trim(p_contact ->> 'fullName'),lower(trim(p_contact ->> 'email')),nullif(trim(p_contact ->> 'phone'),''),nullif(trim(p_contact ->> 'jobTitle'),''),true);
  end if;
  insert into public.activity_events(agency_id,actor_user_id,event_type,entity_type,entity_id,request_id,metadata)
  values(p_agency_id,v_actor,'organization.created','client',v_id,v_key,jsonb_build_object('has_contact',p_contact is not null,'source',coalesce(p_organization -> 'companyProfile' ->> 'provider','manual')));
  return v_id;
end;
$$;
revoke all on function public.create_organization(uuid,jsonb,jsonb,text) from public, anon;
grant execute on function public.create_organization(uuid,jsonb,jsonb,text) to authenticated;

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
    employment_type, work_arrangement, salary_min, salary_max, currency, positions_required,
    status, priority, primary_recruiter_id, deadline_at, accepting_applications, created_by,
    source, public_slug, published_at, application_form_intro, creation_request_id
  ) values (
    p_agency_id, v_client_id, v_workflow_id, trim(p_job ->> 'title'), coalesce(p_job ->> 'description', ''),
    nullif(trim(p_job ->> 'department'), ''), nullif(trim(p_job ->> 'location'), ''),
    nullif(trim(p_job ->> 'employmentType'), ''), nullif(p_job ->> 'workArrangement', ''),
    nullif(p_job ->> 'salaryMin', '')::numeric, nullif(p_job ->> 'salaryMax', '')::numeric,
    upper(nullif(trim(p_job ->> 'currency'), '')), coalesce((p_job ->> 'positionsRequired')::integer, 1),
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
