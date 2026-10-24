create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  contact_email text not null,
  country_code char(2) not null,
  timezone text not null,
  primary_specialization text,
  status text not null default 'active' check (status in ('active','suspended','archived')),
  logo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agency_memberships (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('owner','administrator','recruitment_manager','recruiter')),
  status text not null default 'active' check (status in ('active','suspended','revoked')),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (agency_id, user_id),
  unique (agency_id, id)
);

create table public.agency_invitations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  email text not null,
  role text not null check (role in ('administrator','recruitment_manager','recruiter')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  invited_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 160),
  industry text,
  website text,
  country_code char(2),
  location text,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  account_manager_id uuid references auth.users(id) on delete set null,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, id)
);

create table public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  client_id uuid not null,
  full_name text not null,
  email text not null,
  phone text,
  job_title text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (agency_id, client_id) references public.clients(agency_id, id) on delete cascade
);

create table public.client_memberships (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  client_id uuid not null,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('client_administrator','hiring_manager','reviewer')),
  status text not null default 'active' check (status in ('active','suspended','revoked')),
  created_at timestamptz not null default now(),
  foreign key (agency_id, client_id) references public.clients(agency_id, id) on delete cascade,
  unique (client_id, user_id),
  unique (agency_id, client_id, user_id)
);

create table public.client_invitations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  client_id uuid not null,
  email text not null,
  role text not null check (role in ('client_administrator','hiring_manager','reviewer')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  invited_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (agency_id, client_id) references public.clients(agency_id, id) on delete cascade
);

create table public.hiring_requests (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  client_id uuid not null,
  submitted_by uuid references auth.users(id) on delete set null,
  title text not null,
  description text not null default '',
  department text,
  positions_required integer not null default 1 check (positions_required > 0 and positions_required <= 1000),
  location text,
  employment_type text,
  work_arrangement text check (work_arrangement in ('on_site','hybrid','remote')),
  salary_min numeric(14,2) check (salary_min is null or salary_min >= 0),
  salary_max numeric(14,2) check (salary_max is null or salary_max >= salary_min),
  currency char(3),
  target_hire_date date,
  additional_instructions text,
  status text not null default 'draft' check (status in ('draft','submitted','under_review','clarification_requested','approved','declined','cancelled')),
  assigned_manager_id uuid references auth.users(id) on delete set null,
  approved_revision_id uuid,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, client_id) references public.clients(agency_id, id) on delete restrict,
  unique (agency_id, id),
  unique (client_id, id)
);

create table public.hiring_request_requirements (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  hiring_request_id uuid not null,
  requirement_type text not null check (requirement_type in ('required','preferred')),
  label text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (agency_id, hiring_request_id) references public.hiring_requests(agency_id, id) on delete cascade
);

create table public.hiring_request_revisions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  hiring_request_id uuid not null,
  revision_number integer not null check (revision_number > 0),
  snapshot jsonb not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (agency_id, hiring_request_id) references public.hiring_requests(agency_id, id) on delete cascade,
  unique (hiring_request_id, revision_number),
  unique (hiring_request_id, id)
);

alter table public.hiring_requests
  add constraint hiring_requests_approved_revision_fk
  foreign key (id, approved_revision_id)
  references public.hiring_request_revisions(hiring_request_id, id)
  deferrable initially deferred;

create table public.hiring_request_messages (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  hiring_request_id uuid not null,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  visibility text not null check (visibility in ('client_visible','agency_private')),
  message text not null check (char_length(message) between 1 and 5000),
  created_at timestamptz not null default now(),
  foreign key (agency_id, hiring_request_id) references public.hiring_requests(agency_id, id) on delete cascade
);

create table public.hiring_request_attachments (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  hiring_request_id uuid not null,
  file_name text not null,
  storage_path text not null unique,
  content_type text not null check (content_type in ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (agency_id, hiring_request_id) references public.hiring_requests(agency_id, id) on delete cascade
);

create table public.workflow_templates (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete cascade,
  name text not null,
  description text,
  template_key text,
  is_system_template boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique nulls not distinct (agency_id, template_key),
  unique (agency_id, id)
);

create table public.workflow_stages (
  id uuid primary key default gen_random_uuid(),
  workflow_template_id uuid not null references public.workflow_templates(id) on delete cascade,
  name text not null,
  stage_type text not null,
  sort_order integer not null,
  requires_approval boolean not null default false,
  created_at timestamptz not null default now(),
  unique (workflow_template_id, sort_order)
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  client_id uuid not null,
  hiring_request_id uuid,
  source_revision_id uuid,
  workflow_template_id uuid,
  title text not null,
  description text not null default '',
  department text,
  location text,
  employment_type text,
  work_arrangement text check (work_arrangement in ('on_site','hybrid','remote')),
  salary_min numeric(14,2),
  salary_max numeric(14,2),
  currency char(3),
  positions_required integer not null check (positions_required > 0),
  status text not null default 'draft' check (status in ('draft','open','on_hold','filled','cancelled','closed_unfilled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  primary_recruiter_id uuid references auth.users(id) on delete set null,
  deadline_at timestamptz,
  accepting_applications boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, client_id) references public.clients(agency_id, id) on delete restrict,
  foreign key (agency_id, hiring_request_id) references public.hiring_requests(agency_id, id) on delete restrict,
  foreign key (hiring_request_id, source_revision_id) references public.hiring_request_revisions(hiring_request_id, id) on delete restrict,
  foreign key (agency_id, workflow_template_id) references public.workflow_templates(agency_id, id) on delete restrict,
  unique (hiring_request_id),
  unique (agency_id, id),
  unique (client_id, id)
);

create table public.job_requirements (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  job_id uuid not null,
  label text not null,
  description text,
  requirement_type text not null check (requirement_type in ('required','preferred')),
  is_required boolean not null,
  sort_order integer not null default 0,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  foreign key (agency_id, job_id) references public.jobs(agency_id, id) on delete cascade
);

create table public.job_assignments (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  job_id uuid not null,
  user_id uuid not null references auth.users(id) on delete restrict,
  assignment_role text not null check (assignment_role in ('primary','collaborator','manager')),
  created_at timestamptz not null default now(),
  foreign key (agency_id, job_id) references public.jobs(agency_id, id) on delete cascade,
  unique (job_id, user_id)
);

create table public.job_workflow_stages (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  job_id uuid not null,
  name text not null,
  stage_type text not null,
  sort_order integer not null,
  requires_approval boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (agency_id, job_id) references public.jobs(agency_id, id) on delete cascade,
  unique (job_id, sort_order)
);

create table public.client_job_access (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  client_id uuid not null,
  job_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  access_role text not null check (access_role in ('administrator','hiring_manager','reviewer')),
  created_at timestamptz not null default now(),
  foreign key (agency_id, client_id, user_id) references public.client_memberships(agency_id, client_id, user_id) on delete cascade,
  foreign key (client_id, job_id) references public.jobs(client_id, id) on delete cascade,
  unique (job_id, user_id)
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid not null,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.communications (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  recipient_email text not null,
  message_type text not null,
  related_entity_type text,
  related_entity_id uuid,
  status text not null default 'pending' check (status in ('pending','sent','delivered','failed','permanent_failure')),
  provider_message_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  idempotency_key text not null,
  last_error text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (agency_id, idempotency_key)
);

create index agency_memberships_active_user_idx on public.agency_memberships(user_id, agency_id) where status = 'active';
create index client_memberships_active_user_idx on public.client_memberships(user_id, client_id) where status = 'active';
create index clients_agency_status_idx on public.clients(agency_id, status, created_at desc);
create index hiring_requests_agency_status_idx on public.hiring_requests(agency_id, status, created_at desc);
create index hiring_requests_client_status_idx on public.hiring_requests(client_id, status, created_at desc);
create index jobs_agency_status_idx on public.jobs(agency_id, status, created_at desc);
create index jobs_client_status_idx on public.jobs(client_id, status, created_at desc);
create index activity_events_entity_idx on public.activity_events(agency_id, entity_type, entity_id, created_at desc);

create or replace function private.is_active_agency_member(target_agency_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.agency_memberships m
    where m.agency_id = target_agency_id and m.user_id = (select auth.uid()) and m.status = 'active'
  );
$$;

create or replace function private.has_agency_role(target_agency_id uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.agency_memberships m
    where m.agency_id = target_agency_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role = any(allowed_roles)
  );
$$;

create or replace function private.is_active_client_member(target_client_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.client_memberships m
    where m.client_id = target_client_id and m.user_id = (select auth.uid()) and m.status = 'active'
  );
$$;

revoke all on function private.is_active_agency_member(uuid) from public, anon;
revoke all on function private.has_agency_role(uuid, text[]) from public, anon;
revoke all on function private.is_active_client_member(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_active_agency_member(uuid) to authenticated;
grant execute on function private.has_agency_role(uuid, text[]) to authenticated;
grant execute on function private.is_active_client_member(uuid) to authenticated;

create or replace function public.onboard_agency(
  p_name text,
  p_slug text,
  p_contact_email text,
  p_country_code char(2),
  p_timezone text,
  p_full_name text,
  p_primary_specialization text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := (select auth.uid());
  new_agency_id uuid;
  standard_template_id uuid;
  volume_template_id uuid;
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  if exists (select 1 from public.agency_memberships where user_id = current_user_id and status = 'active') then
    raise exception 'active_agency_membership_exists';
  end if;

  insert into public.user_profiles(id, full_name) values (current_user_id, trim(p_full_name))
  on conflict (id) do update set full_name = excluded.full_name, updated_at = now();

  insert into public.agencies(name, slug, contact_email, country_code, timezone, primary_specialization)
  values (trim(p_name), lower(trim(p_slug)), lower(trim(p_contact_email)), upper(p_country_code), p_timezone, nullif(trim(p_primary_specialization), ''))
  returning id into new_agency_id;

  insert into public.agency_memberships(agency_id, user_id, role, status, joined_at)
  values (new_agency_id, current_user_id, 'owner', 'active', now());

  insert into public.workflow_templates(agency_id, name, description, template_key, is_system_template)
  values (new_agency_id, 'Standard recruitment', 'Sourcing through confirmed placement.', 'standard', true)
  returning id into standard_template_id;

  insert into public.workflow_stages(workflow_template_id, name, stage_type, sort_order, requires_approval) values
    (standard_template_id, 'Sourcing', 'sourcing', 10, false),
    (standard_template_id, 'Screening', 'screening', 20, false),
    (standard_template_id, 'Shortlist', 'shortlist', 30, true),
    (standard_template_id, 'Client review', 'client_review', 40, false),
    (standard_template_id, 'Interview', 'interview', 50, false),
    (standard_template_id, 'Offer', 'offer', 60, true),
    (standard_template_id, 'Placement', 'placement', 70, false);

  insert into public.workflow_templates(agency_id, name, description, template_key, is_system_template)
  values (new_agency_id, 'High-volume recruitment', 'Batch processing and structured review for higher application volume.', 'high_volume', true)
  returning id into volume_template_id;

  insert into public.workflow_stages(workflow_template_id, name, stage_type, sort_order, requires_approval) values
    (volume_template_id, 'Application collection', 'application_collection', 10, false),
    (volume_template_id, 'Automatic processing', 'automatic_processing', 20, false),
    (volume_template_id, 'Screening', 'screening', 30, false),
    (volume_template_id, 'Review', 'review', 40, false),
    (volume_template_id, 'Shortlist', 'shortlist', 50, true),
    (volume_template_id, 'Client review', 'client_review', 60, false),
    (volume_template_id, 'Interview', 'interview', 70, false),
    (volume_template_id, 'Placement', 'placement', 80, false);

  insert into public.activity_events(agency_id, actor_user_id, event_type, entity_type, entity_id)
  values (new_agency_id, current_user_id, 'agency.created', 'agency', new_agency_id);

  return new_agency_id;
end;
$$;

revoke all on function public.onboard_agency(text,text,text,char,text,text,text) from public, anon;
grant execute on function public.onboard_agency(text,text,text,char,text,text,text) to authenticated;

create or replace function public.submit_hiring_request(p_request_id uuid, p_request_id_header text default null)
returns public.hiring_requests
language plpgsql security definer set search_path = '' as $$
declare
  request_row public.hiring_requests;
  next_revision integer;
  revision_snapshot jsonb;
begin
  select * into request_row from public.hiring_requests where id = p_request_id for update;
  if request_row.id is null then raise exception 'request_not_found'; end if;
  if not (private.is_active_agency_member(request_row.agency_id) or private.is_active_client_member(request_row.client_id)) then
    raise exception 'permission_denied';
  end if;
  if request_row.status not in ('draft','clarification_requested') then raise exception 'invalid_request_status'; end if;

  select coalesce(max(revision_number), 0) + 1 into next_revision
  from public.hiring_request_revisions where hiring_request_id = p_request_id;

  revision_snapshot := to_jsonb(request_row) || jsonb_build_object(
    'requirements', coalesce((
      select jsonb_agg(to_jsonb(req) order by req.sort_order)
      from public.hiring_request_requirements req where req.hiring_request_id = p_request_id
    ), '[]'::jsonb)
  );

  insert into public.hiring_request_revisions(agency_id, hiring_request_id, revision_number, snapshot, created_by)
  values (request_row.agency_id, request_row.id, next_revision, revision_snapshot, auth.uid());

  update public.hiring_requests
  set status = 'submitted', submitted_at = coalesce(submitted_at, now()), updated_at = now()
  where id = p_request_id returning * into request_row;

  insert into public.activity_events(agency_id, actor_user_id, event_type, entity_type, entity_id, request_id, metadata)
  values (request_row.agency_id, auth.uid(), 'hiring_request.submitted', 'hiring_request', request_row.id, p_request_id_header, jsonb_build_object('revision_number', next_revision));
  return request_row;
end;
$$;

revoke all on function public.submit_hiring_request(uuid,text) from public, anon;
grant execute on function public.submit_hiring_request(uuid,text) to authenticated;

create or replace function public.request_hiring_request_clarification(
  p_request_id uuid,
  p_message text,
  p_request_id_header text default null
) returns public.hiring_requests
language plpgsql security definer set search_path = '' as $$
declare
  request_row public.hiring_requests;
begin
  select * into request_row from public.hiring_requests where id = p_request_id for update;
  if request_row.id is null then raise exception 'request_not_found'; end if;
  if not private.has_agency_role(request_row.agency_id, array['owner','administrator','recruitment_manager','recruiter']) then
    raise exception 'permission_denied';
  end if;
  if request_row.status not in ('submitted','under_review') then raise exception 'invalid_request_status'; end if;
  if char_length(trim(p_message)) < 3 then raise exception 'clarification_message_required'; end if;

  insert into public.hiring_request_messages(agency_id, hiring_request_id, author_user_id, visibility, message)
  values (request_row.agency_id, request_row.id, auth.uid(), 'client_visible', trim(p_message));

  update public.hiring_requests set status = 'clarification_requested', updated_at = now()
  where id = p_request_id returning * into request_row;

  insert into public.activity_events(agency_id, actor_user_id, event_type, entity_type, entity_id, request_id)
  values (request_row.agency_id, auth.uid(), 'hiring_request.clarification_requested', 'hiring_request', request_row.id, p_request_id_header);
  return request_row;
end;
$$;

revoke all on function public.request_hiring_request_clarification(uuid,text,text) from public, anon;
grant execute on function public.request_hiring_request_clarification(uuid,text,text) to authenticated;

create or replace function public.approve_hiring_request(p_request_id uuid, p_request_id_header text default null)
returns public.hiring_requests
language plpgsql security definer set search_path = '' as $$
declare
  request_row public.hiring_requests;
  latest_revision_id uuid;
begin
  select * into request_row from public.hiring_requests where id = p_request_id for update;
  if request_row.id is null then raise exception 'request_not_found'; end if;
  if not private.has_agency_role(request_row.agency_id, array['owner','administrator','recruitment_manager']) then
    raise exception 'permission_denied';
  end if;
  if request_row.status <> 'under_review' then raise exception 'invalid_request_status'; end if;

  select id into latest_revision_id from public.hiring_request_revisions
  where hiring_request_id = p_request_id order by revision_number desc limit 1;
  if latest_revision_id is null then raise exception 'request_revision_required'; end if;

  update public.hiring_requests set status = 'approved', approved_revision_id = latest_revision_id, reviewed_at = now(), updated_at = now()
  where id = p_request_id returning * into request_row;

  insert into public.activity_events(agency_id, actor_user_id, event_type, entity_type, entity_id, request_id)
  values (request_row.agency_id, auth.uid(), 'hiring_request.approved', 'hiring_request', request_row.id, p_request_id_header);
  return request_row;
end;
$$;

revoke all on function public.approve_hiring_request(uuid,text) from public, anon;
grant execute on function public.approve_hiring_request(uuid,text) to authenticated;

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
  select id into existing_job_id from public.jobs where hiring_request_id = p_request_id;
  if existing_job_id is not null then return existing_job_id; end if;

  select * into request_row from public.hiring_requests where id = p_request_id for update;
  if request_row.id is null then raise exception 'request_not_found'; end if;
  if not private.has_agency_role(request_row.agency_id, array['owner','administrator','recruitment_manager']) then
    raise exception 'permission_denied';
  end if;
  if request_row.status <> 'approved' or request_row.approved_revision_id is null then raise exception 'approved_revision_required'; end if;
  if not exists (select 1 from public.workflow_templates where id = p_workflow_template_id and agency_id = request_row.agency_id and is_active) then
    raise exception 'invalid_workflow_template';
  end if;
  if not exists (select 1 from public.agency_memberships where agency_id = request_row.agency_id and user_id = p_primary_recruiter_id and status = 'active') then
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

  insert into public.client_job_access(agency_id, client_id, job_id, user_id, access_role)
  select request_row.agency_id, request_row.client_id, new_job_id, m.user_id,
    case m.role when 'client_administrator' then 'administrator' else m.role end
  from public.client_memberships m
  where m.client_id = request_row.client_id and m.status = 'active';

  insert into public.activity_events(agency_id, actor_user_id, event_type, entity_type, entity_id, request_id, metadata)
  values (request_row.agency_id, auth.uid(), 'job.created_from_request', 'job', new_job_id, p_idempotency_key, jsonb_build_object('hiring_request_id', p_request_id));
  return new_job_id;
end;
$$;

revoke all on function public.convert_hiring_request_to_job(uuid,uuid,timestamptz,text,uuid,text) from public, anon;
grant execute on function public.convert_hiring_request_to_job(uuid,uuid,timestamptz,text,uuid,text) to authenticated;

do $$ declare table_name text; begin
  foreach table_name in array array[
    'user_profiles','agencies','agency_memberships','agency_invitations','clients','client_contacts','client_memberships',
    'client_invitations','client_job_access','hiring_requests','hiring_request_requirements','hiring_request_messages',
    'hiring_request_attachments','hiring_request_revisions','jobs','job_requirements','job_assignments','workflow_templates',
    'workflow_stages','job_workflow_stages','activity_events','communications'
  ] loop execute format('alter table public.%I enable row level security', table_name); end loop;
end $$;

create policy "profiles_read_self" on public.user_profiles for select to authenticated using (id = (select auth.uid()));
create policy "profiles_update_self" on public.user_profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "agencies_read_member" on public.agencies for select to authenticated using (private.is_active_agency_member(id));
create policy "agencies_update_admin" on public.agencies for update to authenticated using (private.has_agency_role(id, array['owner','administrator'])) with check (private.has_agency_role(id, array['owner','administrator']));
create policy "agency_memberships_read_member" on public.agency_memberships for select to authenticated using (private.is_active_agency_member(agency_id));
create policy "agency_memberships_manage_admin" on public.agency_memberships for all to authenticated using (private.has_agency_role(agency_id, array['owner','administrator'])) with check (private.has_agency_role(agency_id, array['owner','administrator']));
create policy "agency_invitations_manage_admin" on public.agency_invitations for all to authenticated using (private.has_agency_role(agency_id, array['owner','administrator'])) with check (private.has_agency_role(agency_id, array['owner','administrator']));

create policy "clients_read_authorized" on public.clients for select to authenticated using (private.is_active_agency_member(agency_id) or private.is_active_client_member(id));
create policy "clients_manage_agency" on public.clients for all to authenticated using (private.is_active_agency_member(agency_id)) with check (private.is_active_agency_member(agency_id));
create policy "client_contacts_read_authorized" on public.client_contacts for select to authenticated using (private.is_active_agency_member(agency_id) or private.is_active_client_member(client_id));
create policy "client_contacts_manage_agency" on public.client_contacts for all to authenticated using (private.is_active_agency_member(agency_id)) with check (private.is_active_agency_member(agency_id));
create policy "client_memberships_read_authorized" on public.client_memberships for select to authenticated using (private.is_active_agency_member(agency_id) or private.is_active_client_member(client_id));
create policy "client_memberships_manage" on public.client_memberships for all to authenticated using (private.is_active_agency_member(agency_id) or (private.is_active_client_member(client_id) and role = 'client_administrator')) with check (private.is_active_agency_member(agency_id));
create policy "client_invitations_manage" on public.client_invitations for all to authenticated using (private.is_active_agency_member(agency_id) or private.is_active_client_member(client_id)) with check (private.is_active_agency_member(agency_id) or private.is_active_client_member(client_id));

create policy "hiring_requests_read_authorized" on public.hiring_requests for select to authenticated using (private.is_active_agency_member(agency_id) or private.is_active_client_member(client_id));
create policy "hiring_requests_insert_client" on public.hiring_requests for insert to authenticated with check (private.is_active_client_member(client_id) or private.is_active_agency_member(agency_id));
create policy "hiring_requests_update_authorized" on public.hiring_requests for update to authenticated using (private.is_active_agency_member(agency_id) or private.is_active_client_member(client_id)) with check (private.is_active_agency_member(agency_id) or private.is_active_client_member(client_id));

do $$ declare table_name text; begin
  foreach table_name in array array['hiring_request_requirements','hiring_request_messages','hiring_request_attachments','hiring_request_revisions'] loop
    execute format('create policy %I on public.%I for select to authenticated using (private.is_active_agency_member(agency_id) or exists (select 1 from public.hiring_requests r where r.id = hiring_request_id and private.is_active_client_member(r.client_id)))', table_name || '_read', table_name);
    execute format('create policy %I on public.%I for all to authenticated using (private.is_active_agency_member(agency_id) or exists (select 1 from public.hiring_requests r where r.id = hiring_request_id and private.is_active_client_member(r.client_id))) with check (private.is_active_agency_member(agency_id) or exists (select 1 from public.hiring_requests r where r.id = hiring_request_id and private.is_active_client_member(r.client_id)))', table_name || '_manage', table_name);
  end loop;
end $$;

create policy "jobs_read_authorized" on public.jobs for select to authenticated using (
  private.is_active_agency_member(agency_id) or exists (select 1 from public.client_job_access a where a.job_id = id and a.user_id = auth.uid())
);
create policy "jobs_manage_agency" on public.jobs for all to authenticated using (private.is_active_agency_member(agency_id)) with check (private.is_active_agency_member(agency_id));

do $$ declare table_name text; begin
  foreach table_name in array array['job_requirements','job_assignments','job_workflow_stages'] loop
    execute format('create policy %I on public.%I for select to authenticated using (private.is_active_agency_member(agency_id) or exists (select 1 from public.client_job_access a where a.job_id = %I.job_id and a.user_id = auth.uid()))', table_name || '_read', table_name, table_name);
    execute format('create policy %I on public.%I for all to authenticated using (private.is_active_agency_member(agency_id)) with check (private.is_active_agency_member(agency_id))', table_name || '_manage', table_name);
  end loop;
end $$;

create policy "client_job_access_read" on public.client_job_access for select to authenticated using (private.is_active_agency_member(agency_id) or user_id = (select auth.uid()));
create policy "client_job_access_manage" on public.client_job_access for all to authenticated using (private.is_active_agency_member(agency_id)) with check (private.is_active_agency_member(agency_id));
create policy "workflow_templates_read" on public.workflow_templates for select to authenticated using (agency_id is null or private.is_active_agency_member(agency_id));
create policy "workflow_templates_manage" on public.workflow_templates for all to authenticated using (private.has_agency_role(agency_id, array['owner','administrator'])) with check (private.has_agency_role(agency_id, array['owner','administrator']));
create policy "workflow_stages_read" on public.workflow_stages for select to authenticated using (exists (select 1 from public.workflow_templates t where t.id = workflow_template_id and (t.agency_id is null or private.is_active_agency_member(t.agency_id))));
create policy "activity_events_read" on public.activity_events for select to authenticated using (private.is_active_agency_member(agency_id));
create policy "communications_read" on public.communications for select to authenticated using (private.is_active_agency_member(agency_id));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types) values
  ('agency-logos', 'agency-logos', true, 2097152, array['image/png','image/jpeg','image/webp','image/svg+xml']),
  ('hiring-request-attachments', 'hiring-request-attachments', false, 10485760, array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

create policy "agency_logo_write" on storage.objects for all to authenticated
using (bucket_id = 'agency-logos' and private.has_agency_role((storage.foldername(name))[1]::uuid, array['owner','administrator']))
with check (bucket_id = 'agency-logos' and private.has_agency_role((storage.foldername(name))[1]::uuid, array['owner','administrator']));

create policy "request_attachment_read" on storage.objects for select to authenticated using (
  bucket_id = 'hiring-request-attachments' and (
    private.is_active_agency_member((storage.foldername(name))[1]::uuid)
    or exists (
      select 1 from public.hiring_requests r
      where r.id = (storage.foldername(name))[2]::uuid and private.is_active_client_member(r.client_id)
    )
  )
);

create policy "request_attachment_write" on storage.objects for insert to authenticated with check (
  bucket_id = 'hiring-request-attachments' and (
    private.is_active_agency_member((storage.foldername(name))[1]::uuid)
    or exists (
      select 1 from public.hiring_requests r
      where r.id = (storage.foldername(name))[2]::uuid and private.is_active_client_member(r.client_id)
    )
  )
);

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

create or replace function public.transition_hiring_request(
  p_request_id uuid,
  p_action text,
  p_request_id_header text default null
) returns public.hiring_requests
language plpgsql security definer set search_path = '' as $$
declare
  v_request public.hiring_requests;
  v_next text;
begin
  select * into v_request from public.hiring_requests where id = p_request_id for update;
  if v_request.id is null then raise exception 'Request not found'; end if;
  if not private.is_active_agency_member(v_request.agency_id) then raise exception 'Access denied'; end if;
  if p_action = 'start_review' and not private.has_agency_role(v_request.agency_id, array['owner','administrator','recruitment_manager','recruiter']) then raise exception 'Access denied'; end if;
  if p_action = 'decline' and not private.has_agency_role(v_request.agency_id, array['owner','administrator','recruitment_manager']) then raise exception 'Access denied'; end if;

  v_next := case
    when v_request.status = 'submitted' and p_action = 'start_review' then 'under_review'
    when v_request.status = 'under_review' and p_action = 'decline' then 'declined'
    when v_request.status in ('draft','submitted','under_review','clarification_requested') and p_action = 'cancel' then 'cancelled'
    else null
  end;
  if v_next is null then raise exception 'Invalid request transition'; end if;

  update public.hiring_requests set status = v_next where id = p_request_id returning * into v_request;
  insert into public.activity_events(agency_id, actor_user_id, resource_type, resource_id, event_type, request_id, changes)
  values (v_request.agency_id, (select auth.uid()), 'hiring_request', v_request.id, 'hiring_request.' || p_action, p_request_id_header, jsonb_build_object('to', v_next));
  return v_request;
end;
$$;

revoke all on function public.transition_hiring_request(uuid,text,text) from public, anon;
grant execute on function public.transition_hiring_request(uuid,text,text) to authenticated;
