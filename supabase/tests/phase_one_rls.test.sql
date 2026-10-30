begin;
select plan(19);

select has_table('public', 'agencies', 'agencies exists');
select has_table('public', 'hiring_requests', 'hiring requests exists');
select has_table('public', 'jobs', 'jobs exists');
select has_table('public', 'activity_events', 'activity events exists');
select has_table('public', 'candidates', 'candidates exists');
select has_table('public', 'applications', 'applications exists');
select has_table('public', 'candidate_documents', 'candidate documents exists');
select has_table('public', 'job_application_questions', 'job application questions exist');
select col_is_pk('public', 'agencies', 'id', 'agencies use UUID primary keys');
select col_is_unique('public', 'jobs', 'hiring_request_id', 'one job per hiring request');
select policies_are('public', 'agencies', array['agencies_read_member','agencies_update_admin','agencies_public_active_read'], 'agency policies are explicit');
select policies_are('public', 'jobs', array['jobs_read_authorized','jobs_public_published_read'], 'jobs are read-only outside authorized mutation functions');
select policies_are('public', 'applications', array['applications_read_reviewers'], 'applications are read-only outside audited review functions');
select has_function('public', 'onboard_agency', 'atomic onboarding exists');
select has_function('public', 'accept_agency_invitation', 'atomic agency invitation acceptance exists');
select has_function('public', 'accept_client_invitation', 'atomic client invitation acceptance exists');
select has_function('public', 'convert_hiring_request_to_job', 'atomic request conversion exists');
select has_function('public', 'create_manual_job', 'atomic manual job creation exists');
select has_function('public', 'submit_public_application', 'atomic public application creation exists');

select * from finish();
rollback;
