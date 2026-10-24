-- The platform event-trigger function does not need to be callable through the
-- Data API. The event trigger continues to invoke it internally.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- Keep read policies distinct while ensuring write policies do not also run
-- for SELECT. This removes duplicate permissive-policy evaluation.
drop policy if exists "job_application_questions_manage_agency" on public.job_application_questions;
create policy "job_application_questions_insert_agency" on public.job_application_questions for insert to authenticated
with check (private.is_active_agency_member(agency_id));
create policy "job_application_questions_update_agency" on public.job_application_questions for update to authenticated
using (private.is_active_agency_member(agency_id))
with check (private.is_active_agency_member(agency_id));
create policy "job_application_questions_delete_agency" on public.job_application_questions for delete to authenticated
using (private.is_active_agency_member(agency_id));

drop policy if exists "candidates_manage_agency" on public.candidates;
create policy "candidates_insert_agency" on public.candidates for insert to authenticated
with check (private.is_active_agency_member(agency_id));
create policy "candidates_update_agency" on public.candidates for update to authenticated
using (private.is_active_agency_member(agency_id))
with check (private.is_active_agency_member(agency_id));
create policy "candidates_delete_agency" on public.candidates for delete to authenticated
using (private.is_active_agency_member(agency_id));

drop policy if exists "applications_manage_agency" on public.applications;
create policy "applications_insert_agency" on public.applications for insert to authenticated
with check (private.is_active_agency_member(agency_id));
create policy "applications_update_agency" on public.applications for update to authenticated
using (private.is_active_agency_member(agency_id))
with check (private.is_active_agency_member(agency_id));
create policy "applications_delete_agency" on public.applications for delete to authenticated
using (private.is_active_agency_member(agency_id));

drop policy if exists "application_answers_manage_agency" on public.application_answers;
create policy "application_answers_insert_agency" on public.application_answers for insert to authenticated
with check (private.is_active_agency_member(agency_id));
create policy "application_answers_update_agency" on public.application_answers for update to authenticated
using (private.is_active_agency_member(agency_id))
with check (private.is_active_agency_member(agency_id));
create policy "application_answers_delete_agency" on public.application_answers for delete to authenticated
using (private.is_active_agency_member(agency_id));

drop policy if exists "candidate_documents_manage_agency" on public.candidate_documents;
create policy "candidate_documents_insert_agency" on public.candidate_documents for insert to authenticated
with check (private.is_active_agency_member(agency_id));
create policy "candidate_documents_update_agency" on public.candidate_documents for update to authenticated
using (private.is_active_agency_member(agency_id))
with check (private.is_active_agency_member(agency_id));
create policy "candidate_documents_delete_agency" on public.candidate_documents for delete to authenticated
using (private.is_active_agency_member(agency_id));

drop policy if exists "clients_manage_authorized_agency" on public.clients;
create policy "clients_insert_authorized_agency" on public.clients for insert to authenticated
with check (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']));
create policy "clients_update_authorized_agency" on public.clients for update to authenticated
using (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']))
with check (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']));
create policy "clients_delete_authorized_agency" on public.clients for delete to authenticated
using (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']));

drop policy if exists "client_contacts_manage_authorized_agency" on public.client_contacts;
create policy "client_contacts_insert_authorized_agency" on public.client_contacts for insert to authenticated
with check (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']));
create policy "client_contacts_update_authorized_agency" on public.client_contacts for update to authenticated
using (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']))
with check (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']));
create policy "client_contacts_delete_authorized_agency" on public.client_contacts for delete to authenticated
using (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']));

drop policy if exists "jobs_manage_authorized_agency" on public.jobs;
create policy "jobs_insert_authorized_agency" on public.jobs for insert to authenticated
with check (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']));
create policy "jobs_update_authorized_agency" on public.jobs for update to authenticated
using (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']))
with check (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']));
create policy "jobs_delete_authorized_agency" on public.jobs for delete to authenticated
using (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']));

drop policy if exists "job_requirements_manage_authorized" on public.job_requirements;
create policy "job_requirements_insert_authorized" on public.job_requirements for insert to authenticated
with check (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']));
create policy "job_requirements_update_authorized" on public.job_requirements for update to authenticated
using (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']))
with check (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']));
create policy "job_requirements_delete_authorized" on public.job_requirements for delete to authenticated
using (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']));

drop policy if exists "job_workflow_stages_manage_authorized" on public.job_workflow_stages;
create policy "job_workflow_stages_insert_authorized" on public.job_workflow_stages for insert to authenticated
with check (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']));
create policy "job_workflow_stages_update_authorized" on public.job_workflow_stages for update to authenticated
using (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']))
with check (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']));
create policy "job_workflow_stages_delete_authorized" on public.job_workflow_stages for delete to authenticated
using (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager','recruiter']));

drop policy if exists "job_assignments_manage_authorized" on public.job_assignments;
create policy "job_assignments_insert_authorized" on public.job_assignments for insert to authenticated
with check (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager']));
create policy "job_assignments_update_authorized" on public.job_assignments for update to authenticated
using (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager']))
with check (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager']));
create policy "job_assignments_delete_authorized" on public.job_assignments for delete to authenticated
using (private.has_agency_role(agency_id, array['owner','administrator','recruitment_manager']));

drop policy if exists "client_job_access_manage" on public.client_job_access;
create policy "client_job_access_insert" on public.client_job_access for insert to authenticated
with check (private.is_active_agency_member(agency_id));
create policy "client_job_access_update" on public.client_job_access for update to authenticated
using (private.is_active_agency_member(agency_id))
with check (private.is_active_agency_member(agency_id));
create policy "client_job_access_delete" on public.client_job_access for delete to authenticated
using (private.is_active_agency_member(agency_id));

drop policy if exists "workflow_templates_manage" on public.workflow_templates;
create policy "workflow_templates_insert" on public.workflow_templates for insert to authenticated
with check (private.has_agency_role(agency_id, array['owner','administrator']));
create policy "workflow_templates_update" on public.workflow_templates for update to authenticated
using (private.has_agency_role(agency_id, array['owner','administrator']))
with check (private.has_agency_role(agency_id, array['owner','administrator']));
create policy "workflow_templates_delete" on public.workflow_templates for delete to authenticated
using (private.has_agency_role(agency_id, array['owner','administrator']));

drop policy if exists "hiring_request_attachments_manage" on public.hiring_request_attachments;
create policy "hiring_request_attachments_insert" on public.hiring_request_attachments for insert to authenticated
with check (
  private.is_active_agency_member(agency_id)
  or exists (
    select 1 from public.hiring_requests r
    where r.id = hiring_request_id
      and private.has_client_role(r.client_id, array['client_administrator','hiring_manager'])
  )
);
create policy "hiring_request_attachments_update" on public.hiring_request_attachments for update to authenticated
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
create policy "hiring_request_attachments_delete" on public.hiring_request_attachments for delete to authenticated
using (
  private.is_active_agency_member(agency_id)
  or exists (
    select 1 from public.hiring_requests r
    where r.id = hiring_request_id
      and private.has_client_role(r.client_id, array['client_administrator','hiring_manager'])
  )
);

drop policy if exists "hiring_request_requirements_manage" on public.hiring_request_requirements;
create policy "hiring_request_requirements_insert" on public.hiring_request_requirements for insert to authenticated
with check (
  private.is_active_agency_member(agency_id)
  or exists (
    select 1 from public.hiring_requests r
    where r.id = hiring_request_id
      and private.has_client_role(r.client_id, array['client_administrator','hiring_manager'])
  )
);
create policy "hiring_request_requirements_update" on public.hiring_request_requirements for update to authenticated
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
create policy "hiring_request_requirements_delete" on public.hiring_request_requirements for delete to authenticated
using (
  private.is_active_agency_member(agency_id)
  or exists (
    select 1 from public.hiring_requests r
    where r.id = hiring_request_id
      and private.has_client_role(r.client_id, array['client_administrator','hiring_manager'])
  )
);

drop policy if exists "hiring_request_messages_manage" on public.hiring_request_messages;
create policy "hiring_request_messages_insert" on public.hiring_request_messages for insert to authenticated
with check (
  private.is_active_agency_member(agency_id)
  or (
    visibility = 'client_visible'
    and exists (
      select 1 from public.hiring_requests r
      where r.id = hiring_request_id
        and private.has_client_role(r.client_id, array['client_administrator','hiring_manager'])
    )
  )
);
create policy "hiring_request_messages_update" on public.hiring_request_messages for update to authenticated
using (
  private.is_active_agency_member(agency_id)
  or (
    visibility = 'client_visible'
    and exists (
      select 1 from public.hiring_requests r
      where r.id = hiring_request_id
        and private.has_client_role(r.client_id, array['client_administrator','hiring_manager'])
    )
  )
)
with check (
  private.is_active_agency_member(agency_id)
  or (
    visibility = 'client_visible'
    and exists (
      select 1 from public.hiring_requests r
      where r.id = hiring_request_id
        and private.has_client_role(r.client_id, array['client_administrator','hiring_manager'])
    )
  )
);
create policy "hiring_request_messages_delete" on public.hiring_request_messages for delete to authenticated
using (
  private.is_active_agency_member(agency_id)
  or (
    visibility = 'client_visible'
    and exists (
      select 1 from public.hiring_requests r
      where r.id = hiring_request_id
        and private.has_client_role(r.client_id, array['client_administrator','hiring_manager'])
    )
  )
);

-- Merge the two profile SELECT policies into one equivalent policy.
drop policy if exists "profiles_read_self" on public.user_profiles;
drop policy if exists "profiles_read_colleague" on public.user_profiles;
create policy "profiles_read_authorized" on public.user_profiles for select to authenticated
using (id = (select auth.uid()) or private.can_view_profile(id));

-- Cache auth.uid() once per statement for client job-access lookups.
drop policy if exists "jobs_read_authorized" on public.jobs;
create policy "jobs_read_authorized" on public.jobs for select to authenticated
using (
  private.is_active_agency_member(agency_id)
  or exists (
    select 1 from public.client_job_access a
    where a.job_id = id and a.user_id = (select auth.uid())
  )
);

drop policy if exists "job_requirements_read" on public.job_requirements;
create policy "job_requirements_read" on public.job_requirements for select to authenticated
using (
  private.is_active_agency_member(agency_id)
  or exists (
    select 1 from public.client_job_access a
    where a.job_id = job_requirements.job_id and a.user_id = (select auth.uid())
  )
);

drop policy if exists "job_assignments_read" on public.job_assignments;
create policy "job_assignments_read" on public.job_assignments for select to authenticated
using (
  private.is_active_agency_member(agency_id)
  or exists (
    select 1 from public.client_job_access a
    where a.job_id = job_assignments.job_id and a.user_id = (select auth.uid())
  )
);

drop policy if exists "job_workflow_stages_read" on public.job_workflow_stages;
create policy "job_workflow_stages_read" on public.job_workflow_stages for select to authenticated
using (
  private.is_active_agency_member(agency_id)
  or exists (
    select 1 from public.client_job_access a
    where a.job_id = job_workflow_stages.job_id and a.user_id = (select auth.uid())
  )
);
