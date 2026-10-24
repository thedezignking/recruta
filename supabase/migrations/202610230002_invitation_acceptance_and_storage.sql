create unique index if not exists agency_invitations_active_email_idx
  on public.agency_invitations (agency_id, lower(email))
  where accepted_at is null and revoked_at is null;

create unique index if not exists client_invitations_active_email_idx
  on public.client_invitations (client_id, lower(email))
  where accepted_at is null and revoked_at is null;

create or replace function private.has_client_role(p_client_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.client_memberships m
    where m.client_id = p_client_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any(p_roles)
  );
$$;

revoke all on function private.has_client_role(uuid,text[]) from public, anon;
grant execute on function private.has_client_role(uuid,text[]) to authenticated;

create or replace function private.can_view_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id = auth.uid() or exists (
    select 1
    from public.agency_memberships target
    join public.agency_memberships actor on actor.agency_id = target.agency_id
    where target.user_id = p_user_id
      and target.status = 'active'
      and actor.user_id = auth.uid()
      and actor.status = 'active'
  ) or exists (
    select 1
    from public.client_memberships target
    join public.client_memberships actor on actor.client_id = target.client_id
    where target.user_id = p_user_id
      and target.status = 'active'
      and actor.user_id = auth.uid()
      and actor.status = 'active'
  );
$$;

revoke all on function private.can_view_profile(uuid) from public, anon;
grant execute on function private.can_view_profile(uuid) to authenticated;
create policy "profiles_read_colleague" on public.user_profiles for select to authenticated
using (private.can_view_profile(id));

drop policy if exists "client_memberships_manage" on public.client_memberships;
create policy "client_memberships_update" on public.client_memberships for update to authenticated
using (
  private.has_agency_role(agency_id, array['owner','administrator'])
  or private.has_client_role(client_id, array['client_administrator'])
)
with check (
  private.has_agency_role(agency_id, array['owner','administrator'])
  or private.has_client_role(client_id, array['client_administrator'])
);

create policy "client_memberships_delete" on public.client_memberships for delete to authenticated
using (
  private.has_agency_role(agency_id, array['owner','administrator'])
  or private.has_client_role(client_id, array['client_administrator'])
);

drop policy if exists "agency_memberships_manage_admin" on public.agency_memberships;
create policy "agency_memberships_update_admin" on public.agency_memberships for update to authenticated
using (private.has_agency_role(agency_id, array['owner','administrator']))
with check (private.has_agency_role(agency_id, array['owner','administrator']));
create policy "agency_memberships_delete_admin" on public.agency_memberships for delete to authenticated
using (private.has_agency_role(agency_id, array['owner','administrator']));

drop policy if exists "client_invitations_manage" on public.client_invitations;
create policy "client_invitations_manage" on public.client_invitations for all to authenticated
using (
  private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager'])
  or private.has_client_role(client_id, array['client_administrator'])
)
with check (
  private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager'])
  or private.has_client_role(client_id, array['client_administrator'])
);

drop policy if exists "hiring_requests_insert_client" on public.hiring_requests;
create policy "hiring_requests_insert_authorized" on public.hiring_requests for insert to authenticated
with check (
  private.is_active_agency_member(agency_id)
  or private.has_client_role(client_id, array['client_administrator','hiring_manager'])
);

drop policy if exists "hiring_requests_update_authorized" on public.hiring_requests;
create policy "hiring_requests_update_authorized" on public.hiring_requests for update to authenticated
using (
  private.is_active_agency_member(agency_id)
  or private.has_client_role(client_id, array['client_administrator','hiring_manager'])
)
with check (
  private.is_active_agency_member(agency_id)
  or private.has_client_role(client_id, array['client_administrator','hiring_manager'])
);

drop policy if exists "hiring_request_attachments_manage" on public.hiring_request_attachments;
create policy "hiring_request_attachments_manage" on public.hiring_request_attachments for all to authenticated
using (
  private.is_active_agency_member(agency_id)
  or exists (
    select 1 from public.hiring_requests r
    where r.id = hiring_request_id
      and private.has_client_role(r.client_id, array['client_administrator','hiring_manager'])
  )
)
with check (
  private.is_active_agency_member(agency_id)
  or exists (
    select 1 from public.hiring_requests r
    where r.id = hiring_request_id
      and private.has_client_role(r.client_id, array['client_administrator','hiring_manager'])
  )
);

drop policy if exists "hiring_request_requirements_manage" on public.hiring_request_requirements;
create policy "hiring_request_requirements_manage" on public.hiring_request_requirements for all to authenticated
using (
  private.is_active_agency_member(agency_id)
  or exists (
    select 1 from public.hiring_requests r
    where r.id = hiring_request_id
      and private.has_client_role(r.client_id, array['client_administrator','hiring_manager'])
  )
)
with check (
  private.is_active_agency_member(agency_id)
  or exists (
    select 1 from public.hiring_requests r
    where r.id = hiring_request_id
      and private.has_client_role(r.client_id, array['client_administrator','hiring_manager'])
  )
);

drop policy if exists "hiring_request_messages_manage" on public.hiring_request_messages;
create policy "hiring_request_messages_manage" on public.hiring_request_messages for all to authenticated
using (
  private.is_active_agency_member(agency_id)
  or exists (
    select 1 from public.hiring_requests r
    where r.id = hiring_request_id
      and private.has_client_role(r.client_id, array['client_administrator','hiring_manager'])
  ) and visibility = 'client_visible'
)
with check (
  private.is_active_agency_member(agency_id)
  or exists (
    select 1 from public.hiring_requests r
    where r.id = hiring_request_id
      and private.has_client_role(r.client_id, array['client_administrator','hiring_manager'])
  ) and visibility = 'client_visible'
);

drop policy if exists "hiring_request_messages_read" on public.hiring_request_messages;
create policy "hiring_request_messages_read" on public.hiring_request_messages for select to authenticated
using (
  private.is_active_agency_member(agency_id)
  or (
    visibility = 'client_visible'
    and exists (
      select 1 from public.hiring_requests r
      where r.id = hiring_request_id and private.is_active_client_member(r.client_id)
    )
  )
);

drop policy if exists "hiring_request_revisions_manage" on public.hiring_request_revisions;

drop policy if exists "clients_manage_agency" on public.clients;
create policy "clients_manage_authorized_agency" on public.clients for all to authenticated
using (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager']))
with check (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager']));

drop policy if exists "client_contacts_manage_agency" on public.client_contacts;
create policy "client_contacts_manage_authorized_agency" on public.client_contacts for all to authenticated
using (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager']))
with check (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager']));

drop policy if exists "jobs_manage_agency" on public.jobs;
create policy "jobs_manage_authorized_agency" on public.jobs for all to authenticated
using (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager']))
with check (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager']));

drop policy if exists "job_assignments_manage" on public.job_assignments;
create policy "job_assignments_manage_authorized" on public.job_assignments for all to authenticated
using (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager']))
with check (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager']));

drop policy if exists "job_requirements_manage" on public.job_requirements;
create policy "job_requirements_manage_authorized" on public.job_requirements for all to authenticated
using (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager']))
with check (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager']));

drop policy if exists "job_workflow_stages_manage" on public.job_workflow_stages;
create policy "job_workflow_stages_manage_authorized" on public.job_workflow_stages for all to authenticated
using (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager']))
with check (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager']));

create or replace function public.accept_agency_invitation(p_token_hash text)
returns public.agency_memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.agency_invitations;
  v_membership public.agency_memberships;
  v_email text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  select * into v_invitation
  from public.agency_invitations
  where token_hash = p_token_hash
    and accepted_at is null
    and revoked_at is null
    and expires_at > now()
  for update;

  if v_invitation.id is null then raise exception 'Invitation is invalid or expired'; end if;
  if lower(v_invitation.email) <> v_email then raise exception 'Invitation email does not match signed-in user'; end if;

  insert into public.agency_memberships (agency_id, user_id, role, status, joined_at)
  values (v_invitation.agency_id, auth.uid(), v_invitation.role, 'active', now())
  on conflict (agency_id, user_id) do update
    set role = excluded.role, status = 'active', joined_at = coalesce(public.agency_memberships.joined_at, now())
  returning * into v_membership;

  update public.agency_invitations set accepted_at = now() where id = v_invitation.id;
  insert into public.activity_events (agency_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (v_invitation.agency_id, auth.uid(), 'agency_invitation.accepted', 'agency_membership', v_membership.id, jsonb_build_object('invitation_id', v_invitation.id));
  return v_membership;
end;
$$;

create or replace function public.accept_client_invitation(p_token_hash text)
returns public.client_memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.client_invitations;
  v_membership public.client_memberships;
  v_email text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  select * into v_invitation
  from public.client_invitations
  where token_hash = p_token_hash
    and accepted_at is null
    and revoked_at is null
    and expires_at > now()
  for update;

  if v_invitation.id is null then raise exception 'Invitation is invalid or expired'; end if;
  if lower(v_invitation.email) <> v_email then raise exception 'Invitation email does not match signed-in user'; end if;

  insert into public.client_memberships (agency_id, client_id, user_id, role, status)
  values (v_invitation.agency_id, v_invitation.client_id, auth.uid(), v_invitation.role, 'active')
  on conflict (client_id, user_id) do update
    set role = excluded.role, status = 'active'
  returning * into v_membership;

  update public.client_invitations set accepted_at = now() where id = v_invitation.id;
  insert into public.activity_events (agency_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (v_invitation.agency_id, auth.uid(), 'client_invitation.accepted', 'client_membership', v_membership.id, jsonb_build_object('invitation_id', v_invitation.id, 'client_id', v_invitation.client_id));
  return v_membership;
end;
$$;

revoke all on function public.accept_agency_invitation(text) from public, anon;
revoke all on function public.accept_client_invitation(text) from public, anon;
grant execute on function public.accept_agency_invitation(text) to authenticated;
grant execute on function public.accept_client_invitation(text) to authenticated;

create policy "request_attachment_update" on storage.objects for update to authenticated
using (
  bucket_id = 'hiring-request-attachments' and (
    private.is_active_agency_member((storage.foldername(name))[1]::uuid)
    or exists (
      select 1 from public.hiring_requests r
      where r.id = (storage.foldername(name))[2]::uuid and private.is_active_client_member(r.client_id)
    )
  )
)
with check (
  bucket_id = 'hiring-request-attachments' and (
    private.is_active_agency_member((storage.foldername(name))[1]::uuid)
    or exists (
      select 1 from public.hiring_requests r
      where r.id = (storage.foldername(name))[2]::uuid and private.is_active_client_member(r.client_id)
    )
  )
);

create policy "request_attachment_delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'hiring-request-attachments' and (
    private.is_active_agency_member((storage.foldername(name))[1]::uuid)
    or exists (
      select 1 from public.hiring_requests r
      where r.id = (storage.foldername(name))[2]::uuid and private.is_active_client_member(r.client_id)
    )
  )
);

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
  if not (
    private.is_active_agency_member(request_row.agency_id)
    or private.has_client_role(request_row.client_id, array['client_administrator','hiring_manager'])
  ) then raise exception 'permission_denied'; end if;
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
  if v_request.id is null then raise exception 'request_not_found'; end if;

  if p_action = 'start_review' and not private.has_agency_role(v_request.agency_id, array['owner','administrator','recruitment_manager','recruiter']) then
    raise exception 'permission_denied';
  end if;
  if p_action = 'decline' and not private.has_agency_role(v_request.agency_id, array['owner','administrator','recruitment_manager']) then
    raise exception 'permission_denied';
  end if;
  if p_action = 'cancel' and not (
    private.has_agency_role(v_request.agency_id, array['owner','administrator','recruitment_manager'])
    or private.has_client_role(v_request.client_id, array['client_administrator','hiring_manager'])
  ) then raise exception 'permission_denied'; end if;

  v_next := case
    when v_request.status = 'submitted' and p_action = 'start_review' then 'under_review'
    when v_request.status = 'under_review' and p_action = 'decline' then 'declined'
    when v_request.status in ('draft','submitted','under_review','clarification_requested') and p_action = 'cancel' then 'cancelled'
    else null
  end;
  if v_next is null then raise exception 'invalid_request_transition'; end if;

  update public.hiring_requests
  set status = v_next, updated_at = now()
  where id = p_request_id returning * into v_request;

  insert into public.activity_events(agency_id, actor_user_id, event_type, entity_type, entity_id, request_id, metadata)
  values (v_request.agency_id, auth.uid(), 'hiring_request.' || p_action, 'hiring_request', v_request.id, p_request_id_header, jsonb_build_object('to', v_next));
  return v_request;
end;
$$;

create or replace function public.assign_job(
  p_job_id uuid,
  p_user_id uuid,
  p_assignment_role text,
  p_request_id_header text default null
) returns public.job_assignments
language plpgsql security definer set search_path = '' as $$
declare
  v_job public.jobs;
  v_assignment public.job_assignments;
begin
  select * into v_job from public.jobs where id = p_job_id for update;
  if v_job.id is null then raise exception 'job_not_found'; end if;
  if not private.has_agency_role(v_job.agency_id, array['owner','administrator','recruitment_manager']) then
    raise exception 'permission_denied';
  end if;
  if p_assignment_role not in ('primary','collaborator','manager') then raise exception 'invalid_assignment_role'; end if;
  if not exists (
    select 1 from public.agency_memberships m
    where m.agency_id = v_job.agency_id and m.user_id = p_user_id and m.status = 'active'
  ) then raise exception 'assignee_not_active'; end if;

  insert into public.job_assignments(agency_id, job_id, user_id, assignment_role)
  values (v_job.agency_id, v_job.id, p_user_id, p_assignment_role)
  on conflict (job_id, user_id) do update set assignment_role = excluded.assignment_role
  returning * into v_assignment;

  if p_assignment_role = 'primary' then
    update public.jobs set primary_recruiter_id = p_user_id, updated_at = now() where id = v_job.id;
  end if;

  insert into public.activity_events(agency_id, actor_user_id, event_type, entity_type, entity_id, request_id, metadata)
  values (v_job.agency_id, auth.uid(), 'job.assigned', 'job', v_job.id, p_request_id_header, jsonb_build_object('user_id', p_user_id, 'assignment_role', p_assignment_role));
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
  select * into v_job from public.jobs where id = p_job_id for update;
  if v_job.id is null then raise exception 'job_not_found'; end if;
  if not (
    private.has_agency_role(v_job.agency_id, array['owner','administrator','recruitment_manager'])
    or exists (
      select 1 from public.job_assignments a
      where a.job_id = v_job.id and a.user_id = auth.uid()
    )
  ) then raise exception 'permission_denied'; end if;
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

revoke all on function public.assign_job(uuid,uuid,text,text) from public, anon;
revoke all on function public.transition_job(uuid,text,text) from public, anon;
grant execute on function public.assign_job(uuid,uuid,text,text) to authenticated;
grant execute on function public.transition_job(uuid,text,text) to authenticated;
