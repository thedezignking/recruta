-- Recruiter workflow stabilization:
-- public job reads, idempotent manual job creation, and safe lifecycle actions.

alter table public.jobs
  add column if not exists creation_request_id text;

create unique index if not exists jobs_agency_creation_request_idx
  on public.jobs (agency_id, creation_request_id)
  where creation_request_id is not null;

drop policy if exists "agencies_public_active_read" on public.agencies;
create policy "agencies_public_active_read"
on public.agencies for select to anon
using (status = 'active');

drop policy if exists "clients_public_job_read" on public.clients;
create policy "clients_public_job_read"
on public.clients for select to anon
using (
  status <> 'archived'
  and exists (
    select 1
    from public.jobs j
    where j.client_id = clients.id
      and j.agency_id = clients.agency_id
      and j.status = 'open'
      and j.accepting_applications
      and j.published_at is not null
  )
);

drop policy if exists "jobs_public_published_read" on public.jobs;
create policy "jobs_public_published_read"
on public.jobs for select to anon
using (
  status = 'open'
  and accepting_applications
  and published_at is not null
  and public_slug is not null
);

drop policy if exists "job_requirements_public_published_read" on public.job_requirements;
create policy "job_requirements_public_published_read"
on public.job_requirements for select to anon
using (
  exists (
    select 1
    from public.jobs j
    where j.id = job_requirements.job_id
      and j.agency_id = job_requirements.agency_id
      and j.status = 'open'
      and j.accepting_applications
      and j.published_at is not null
  )
);

drop policy if exists "job_questions_public_published_read" on public.job_application_questions;
create policy "job_questions_public_published_read"
on public.job_application_questions for select to anon
using (
  exists (
    select 1
    from public.jobs j
    where j.id = job_application_questions.job_id
      and j.agency_id = job_application_questions.agency_id
      and j.status = 'open'
      and j.accepting_applications
      and j.published_at is not null
  )
);

grant select (id, name, slug, contact_email, primary_specialization, logo_path, country_code, status)
  on table public.agencies to anon;
grant select (id, agency_id, name, industry, status)
  on table public.clients to anon;
grant select (
  id, agency_id, client_id, title, description, department, location,
  employment_type, work_arrangement, salary_min, salary_max, currency,
  positions_required, deadline_at, accepting_applications, status, public_slug,
  published_at, application_form_intro
) on table public.jobs to anon;
grant select (id, agency_id, job_id, label, description, requirement_type, sort_order)
  on table public.job_requirements to anon;
grant select (id, agency_id, job_id, label, help_text, question_type, options, is_required, sort_order)
  on table public.job_application_questions to anon;

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
    if v_new_client_name is null then raise exception 'organization_required'; end if;
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(p_agency_id::text || ':client:' || lower(v_new_client_name), 0)
    );
    select c.id into v_client_id
    from public.clients c
    where c.agency_id = p_agency_id
      and lower(c.name) = lower(v_new_client_name)
      and c.status <> 'archived'
    order by c.created_at
    limit 1
    for update;

    if v_client_id is null then
      insert into public.clients (
        agency_id, name, industry, website, location, country_code, account_manager_id
      ) values (
        p_agency_id,
        v_new_client_name,
        nullif(trim(p_new_client ->> 'industry'), ''),
        nullif(trim(p_new_client ->> 'website'), ''),
        nullif(trim(p_new_client ->> 'location'), ''),
        upper(nullif(trim(p_new_client ->> 'countryCode'), '')),
        v_user_id
      ) returning id into v_client_id;
    end if;
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

create or replace function public.delete_empty_client(
  p_client_id uuid,
  p_request_id_header text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client public.clients;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into v_client from public.clients where id = p_client_id for update;
  if v_client.id is null then raise exception 'organization_not_found'; end if;
  if not private.has_agency_role(
    v_client.agency_id, array['owner','administrator','recruitment_manager']
  ) then raise exception 'permission_denied'; end if;
  if exists (select 1 from public.jobs j where j.client_id = v_client.id)
    or exists (select 1 from public.hiring_requests r where r.client_id = v_client.id)
  then raise exception 'organization_has_activity'; end if;

  delete from public.clients where id = v_client.id;
  insert into public.activity_events (
    agency_id, actor_user_id, event_type, entity_type, entity_id, request_id, metadata
  ) values (
    v_client.agency_id, auth.uid(), 'organization.deleted', 'client', v_client.id,
    nullif(left(trim(p_request_id_header), 200), ''),
    jsonb_build_object('name', v_client.name)
  );
  return v_client.id;
end;
$$;

revoke all on function public.delete_empty_client(uuid,text) from public, anon;
grant execute on function public.delete_empty_client(uuid,text) to authenticated;
