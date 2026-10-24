alter table public.jobs
  add column source text not null default 'hiring_request'
    check (source in ('manual','hiring_request','public_request','portal_request','imported')),
  add column public_slug text,
  add column published_at timestamptz,
  add column application_form_intro text;

create unique index jobs_agency_public_slug_idx
  on public.jobs (agency_id, public_slug)
  where public_slug is not null;

alter table public.jobs
  add constraint jobs_publication_state_check check (
    not accepting_applications
    or (status = 'open' and public_slug is not null and published_at is not null)
  );

create table public.job_application_questions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  job_id uuid not null,
  label text not null check (char_length(label) between 2 and 240),
  help_text text check (help_text is null or char_length(help_text) <= 500),
  question_type text not null default 'textarea'
    check (question_type in ('short_text','long_text','yes_no','single_select')),
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  is_required boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (agency_id, job_id) references public.jobs(agency_id, id) on delete cascade,
  unique (job_id, sort_order),
  unique (job_id, id),
  unique (agency_id, job_id, id)
);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  full_name text not null check (char_length(full_name) between 2 and 160),
  email text not null check (char_length(email) between 3 and 320),
  email_normalized text generated always as (lower(trim(email))) stored,
  phone text check (phone is null or char_length(phone) <= 40),
  linkedin_url text check (linkedin_url is null or char_length(linkedin_url) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, email_normalized),
  unique (agency_id, id)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  job_id uuid not null,
  candidate_id uuid not null,
  status text not null default 'received'
    check (status in ('received','in_review','shortlisted','client_review','interview','offer','placed','rejected','withdrawn')),
  processing_status text not null default 'pending'
    check (processing_status in ('pending','extracting','ready','needs_information','failed')),
  source text not null default 'public_form'
    check (source in ('public_form','manual','imported')),
  cover_note text check (cover_note is null or char_length(cover_note) <= 5000),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, job_id) references public.jobs(agency_id, id) on delete restrict,
  foreign key (agency_id, candidate_id) references public.candidates(agency_id, id) on delete restrict,
  unique (job_id, candidate_id),
  unique (agency_id, id),
  unique (agency_id, job_id, id)
);

create table public.application_answers (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  job_id uuid not null,
  application_id uuid not null,
  question_id uuid not null,
  answer jsonb not null,
  created_at timestamptz not null default now(),
  foreign key (agency_id, job_id, application_id) references public.applications(agency_id, job_id, id) on delete cascade,
  foreign key (agency_id, job_id, question_id) references public.job_application_questions(agency_id, job_id, id) on delete restrict,
  unique (application_id, question_id)
);

create table public.candidate_documents (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  candidate_id uuid not null,
  application_id uuid not null,
  document_type text not null default 'resume' check (document_type in ('resume','cover_letter','other')),
  file_name text not null check (char_length(file_name) between 1 and 255),
  storage_path text not null unique,
  content_type text not null check (content_type in (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at timestamptz not null default now(),
  foreign key (agency_id, candidate_id) references public.candidates(agency_id, id) on delete restrict,
  foreign key (agency_id, application_id) references public.applications(agency_id, id) on delete cascade
);

create index job_application_questions_job_idx
  on public.job_application_questions (job_id, sort_order);
create index candidates_agency_created_idx
  on public.candidates (agency_id, created_at desc);
create index applications_agency_status_idx
  on public.applications (agency_id, status, submitted_at desc);
create index applications_job_status_idx
  on public.applications (job_id, status, submitted_at desc);
create index applications_processing_queue_idx
  on public.applications (agency_id, processing_status, submitted_at)
  where processing_status in ('pending','failed','needs_information');

alter table public.job_application_questions enable row level security;
alter table public.candidates enable row level security;
alter table public.applications enable row level security;
alter table public.application_answers enable row level security;
alter table public.candidate_documents enable row level security;

create policy "job_application_questions_read_agency"
  on public.job_application_questions for select to authenticated
  using (private.is_active_agency_member(agency_id));
create policy "job_application_questions_manage_agency"
  on public.job_application_questions for all to authenticated
  using (private.is_active_agency_member(agency_id))
  with check (private.is_active_agency_member(agency_id));

create policy "candidates_read_agency"
  on public.candidates for select to authenticated
  using (private.is_active_agency_member(agency_id));
create policy "candidates_manage_agency"
  on public.candidates for all to authenticated
  using (private.is_active_agency_member(agency_id))
  with check (private.is_active_agency_member(agency_id));

create policy "applications_read_agency"
  on public.applications for select to authenticated
  using (private.is_active_agency_member(agency_id));
create policy "applications_manage_agency"
  on public.applications for all to authenticated
  using (private.is_active_agency_member(agency_id))
  with check (private.is_active_agency_member(agency_id));

create policy "application_answers_read_agency"
  on public.application_answers for select to authenticated
  using (private.is_active_agency_member(agency_id));
create policy "application_answers_manage_agency"
  on public.application_answers for all to authenticated
  using (private.is_active_agency_member(agency_id))
  with check (private.is_active_agency_member(agency_id));

create policy "candidate_documents_read_agency"
  on public.candidate_documents for select to authenticated
  using (private.is_active_agency_member(agency_id));
create policy "candidate_documents_manage_agency"
  on public.candidate_documents for all to authenticated
  using (private.is_active_agency_member(agency_id))
  with check (private.is_active_agency_member(agency_id));

drop policy if exists "clients_manage_authorized_agency" on public.clients;
create policy "clients_manage_authorized_agency"
  on public.clients for all to authenticated
  using (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']))
  with check (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']));

drop policy if exists "client_contacts_manage_authorized_agency" on public.client_contacts;
create policy "client_contacts_manage_authorized_agency"
  on public.client_contacts for all to authenticated
  using (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']))
  with check (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']));

drop policy if exists "jobs_manage_authorized_agency" on public.jobs;
create policy "jobs_manage_authorized_agency"
  on public.jobs for all to authenticated
  using (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']))
  with check (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']));

drop policy if exists "job_requirements_manage_authorized" on public.job_requirements;
create policy "job_requirements_manage_authorized"
  on public.job_requirements for all to authenticated
  using (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']))
  with check (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']));

drop policy if exists "job_workflow_stages_manage_authorized" on public.job_workflow_stages;
create policy "job_workflow_stages_manage_authorized"
  on public.job_workflow_stages for all to authenticated
  using (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']))
  with check (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']));

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
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if not private.has_agency_role(p_agency_id, array['owner','administrator','recruitment_manager','recruiter']) then
    raise exception 'permission_denied';
  end if;

  if v_client_id is null then
    if nullif(trim(p_new_client ->> 'name'), '') is null then raise exception 'organization_required'; end if;
    insert into public.clients (agency_id, name, industry, website, location, country_code, account_manager_id)
    values (
      p_agency_id,
      trim(p_new_client ->> 'name'),
      nullif(trim(p_new_client ->> 'industry'), ''),
      nullif(trim(p_new_client ->> 'website'), ''),
      nullif(trim(p_new_client ->> 'location'), ''),
      upper(nullif(trim(p_new_client ->> 'countryCode'), '')),
      v_user_id
    ) returning id into v_client_id;
  elsif not exists (
    select 1 from public.clients c where c.id = v_client_id and c.agency_id = p_agency_id and c.status <> 'archived'
  ) then
    raise exception 'organization_not_found';
  end if;

  if v_workflow_id is not null and not exists (
    select 1 from public.workflow_templates wt
    where wt.id = v_workflow_id and wt.agency_id = p_agency_id and wt.is_active
  ) then raise exception 'workflow_not_found'; end if;

  if not exists (
    select 1 from public.agency_memberships m
    where m.agency_id = p_agency_id and m.user_id = v_primary_recruiter_id and m.status = 'active'
  ) then raise exception 'recruiter_not_found'; end if;

  insert into public.jobs (
    agency_id, client_id, workflow_template_id, title, description, department, location,
    employment_type, work_arrangement, salary_min, salary_max, currency, positions_required,
    status, priority, primary_recruiter_id, deadline_at, accepting_applications, created_by,
    source, public_slug, published_at, application_form_intro
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
    nullif(trim(p_job ->> 'applicationFormIntro'), '')
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
    insert into public.job_workflow_stages (agency_id, job_id, name, stage_type, sort_order, requires_approval)
    select p_agency_id, v_job_id, name, stage_type, sort_order, requires_approval
    from public.workflow_stages where workflow_template_id = v_workflow_id;
  end if;

  insert into public.job_assignments (agency_id, job_id, user_id, assignment_role)
  values (p_agency_id, v_job_id, v_primary_recruiter_id, 'primary');

  insert into public.activity_events (
    agency_id, actor_user_id, event_type, entity_type, entity_id, request_id, metadata
  ) values (
    p_agency_id, v_user_id, case when p_publish then 'job.published' else 'job.draft_created' end,
    'job', v_job_id, p_request_id_header, jsonb_build_object('source', 'manual', 'client_id', v_client_id)
  );

  return v_job_id;
end;
$$;

revoke all on function public.create_manual_job(uuid,uuid,jsonb,jsonb,jsonb,jsonb,boolean,text) from public, anon;
grant execute on function public.create_manual_job(uuid,uuid,jsonb,jsonb,jsonb,jsonb,boolean,text) to authenticated;

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
  select * into v_job from public.jobs where id = p_job_id for update;
  if v_job.id is null then raise exception 'job_not_found'; end if;
  if not private.has_agency_role(v_job.agency_id, array['owner','administrator','recruitment_manager','recruiter']) then
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

revoke all on function public.publish_job(uuid,text,text) from public, anon;
grant execute on function public.publish_job(uuid,text,text) to authenticated;

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
    set full_name = excluded.full_name,
        phone = coalesce(excluded.phone, public.candidates.phone),
        linkedin_url = coalesce(excluded.linkedin_url, public.candidates.linkedin_url),
        updated_at = now()
  returning id into v_candidate_id;

  insert into public.applications (
    id, agency_id, job_id, candidate_id, status, processing_status, source, cover_note
  ) values (
    p_application_id, p_agency_id, p_job_id, v_candidate_id, 'received', 'pending', 'public_form', nullif(trim(p_cover_note), '')
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

revoke all on function public.submit_public_application(uuid,uuid,uuid,text,text,text,text,text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.submit_public_application(uuid,uuid,uuid,text,text,text,text,text,jsonb,jsonb) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'candidate-documents',
  'candidate-documents',
  false,
  10485760,
  array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

revoke all on table public.job_application_questions from anon;
revoke all on table public.candidates from anon;
revoke all on table public.applications from anon;
revoke all on table public.application_answers from anon;
revoke all on table public.candidate_documents from anon;

grant select, insert, update, delete on table public.job_application_questions to authenticated;
grant select, insert, update, delete on table public.candidates to authenticated;
grant select, insert, update, delete on table public.applications to authenticated;
grant select, insert, update, delete on table public.application_answers to authenticated;
grant select, insert, update, delete on table public.candidate_documents to authenticated;

grant select, insert, update, delete on table public.job_application_questions to service_role;
grant select, insert, update, delete on table public.candidates to service_role;
grant select, insert, update, delete on table public.applications to service_role;
grant select, insert, update, delete on table public.application_answers to service_role;
grant select, insert, update, delete on table public.candidate_documents to service_role;
