-- A signed-in person may own multiple isolated agencies. The unique slug and
-- transaction lock make retries safe without overwriting an existing workspace.
create or replace function public.onboard_agency(
  p_name text, p_slug text, p_contact_email text, p_country_code char(2),
  p_timezone text, p_full_name text, p_primary_specialization text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := (select auth.uid());
  new_agency_id uuid;
  standard_template_id uuid;
  volume_template_id uuid;
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  if p_name is null or length(trim(p_name)) not between 2 and 160
     or p_slug is null or length(trim(p_slug)) not between 2 and 80
     or lower(trim(p_slug)) !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or p_full_name is null or length(trim(p_full_name)) not between 2 and 120
     or p_contact_email is null or trim(p_contact_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or p_country_code is null or p_country_code !~ '^[A-Za-z]{2}$'
     or p_timezone is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone)
  then raise exception 'invalid_workspace_details'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('workspace:' || lower(trim(p_slug)), 0));
  select id into new_agency_id from public.agencies where slug = lower(trim(p_slug));
  if new_agency_id is not null then
    if exists (select 1 from public.agency_memberships
      where agency_id = new_agency_id and user_id = current_user_id and role = 'owner' and status = 'active')
      and exists (select 1 from public.agencies where id = new_agency_id and status = 'active')
    then return new_agency_id; end if;
    raise exception 'workspace_slug_unavailable' using errcode = '23505';
  end if;

  insert into public.user_profiles(id, full_name) values (current_user_id, trim(p_full_name))
  on conflict (id) do nothing;
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
  insert into public.activity_events(agency_id, actor_user_id, event_type, entity_type, entity_id, request_id)
  values (new_agency_id, current_user_id, 'agency.created', 'agency', new_agency_id,
    coalesce(nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-request-id', gen_random_uuid()::text));
  return new_agency_id;
end;
$$;
revoke all on function public.onboard_agency(text,text,text,char,text,text,text) from public, anon;
grant execute on function public.onboard_agency(text,text,text,char,text,text,text) to authenticated;
