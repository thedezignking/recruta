begin;
select no_plan();
create temp table f as select
  gen_random_uuid() actor,gen_random_uuid() manager,gen_random_uuid() other_actor,
  gen_random_uuid() revoked,gen_random_uuid() employer,
  gen_random_uuid() agency,gen_random_uuid() other_agency,gen_random_uuid() client,
  gen_random_uuid() job,gen_random_uuid() hidden,gen_random_uuid() live,
  gen_random_uuid() request,gen_random_uuid() revision,gen_random_uuid() workflow;
grant select on f to authenticated,anon;
insert into auth.users(id,email) select id,id::text||'@example.invalid' from f cross join lateral
  (values(actor),(manager),(other_actor),(revoked),(employer)) u(id);
insert into public.agencies(id,name,slug,contact_email,country_code,timezone)
select id,'Synthetic boundary',id::text,'boundary@example.invalid','NG','Africa/Lagos'
from f cross join lateral(values(agency),(other_agency)) a(id);
insert into public.agency_memberships(agency_id,user_id,role,status)
select agency,id,role,status from f cross join lateral
  (values(actor,'recruiter','active'),(manager,'owner','active'),(other_actor,'recruiter','active'),(revoked,'recruiter','revoked')) u(id,role,status);
insert into public.clients(id,agency_id,name) select client,agency,'Synthetic employer' from f;
insert into public.client_memberships(agency_id,client_id,user_id,role,status)
select agency,client,employer,'hiring_manager','active' from f;
insert into public.jobs(id,agency_id,client_id,title,description,positions_required,status,created_by,source,primary_recruiter_id,work_arrangement)
select id,agency,client,'Synthetic role','A detailed synthetic role description.',2,'draft',creator,'manual',lead,'remote'
from f cross join lateral(values(job,actor,actor),(hidden,manager,other_actor),(live,actor,actor)) j(id,creator,lead);
update public.jobs set status='open',public_slug='p1-live',published_at=now(),accepting_applications=true where id=(select live from f);
insert into public.job_assignments(agency_id,job_id,user_id,assignment_role)
select agency,id,lead,'primary' from f cross join lateral(values(job,actor),(hidden,other_actor),(live,actor)) j(id,lead);
insert into public.job_assignments(agency_id,job_id,user_id,assignment_role) select agency,live,revoked,'collaborator' from f;
insert into public.workflow_templates(id,agency_id,name) select workflow,agency,'Synthetic workflow' from f;
insert into public.workflow_stages(workflow_template_id,name,stage_type,sort_order) select workflow,'Received','received',1 from f;
insert into public.hiring_requests(id,agency_id,client_id,title,description,status)
select request,agency,client,'Synthetic request','A detailed approved synthetic request.','approved' from f;
insert into public.hiring_request_revisions(id,agency_id,hiring_request_id,revision_number,snapshot,created_by)
select revision,agency,request,1,'{}',manager from f;
update public.hiring_requests set approved_revision_id=(select revision from f) where id=(select request from f);

select ok(not has_table_privilege('authenticated','public.jobs','INSERT,UPDATE,DELETE,TRUNCATE'),'no direct table writes to jobs');
select ok(not has_any_column_privilege('authenticated','public.jobs','INSERT') and not has_any_column_privilege('authenticated','public.jobs','UPDATE'),'no column write bypass on jobs');
select ok(not has_table_privilege('authenticated','public.job_requirements','INSERT,UPDATE,DELETE,TRUNCATE'),'no direct table writes to job_requirements');
select ok(not has_any_column_privilege('authenticated','public.job_requirements','INSERT') and not has_any_column_privilege('authenticated','public.job_requirements','UPDATE'),'no column write bypass on job_requirements');
select ok(not has_table_privilege('authenticated','public.job_application_questions','INSERT,UPDATE,DELETE,TRUNCATE'),'no direct table writes to job_application_questions');
select ok(not has_any_column_privilege('authenticated','public.job_application_questions','INSERT') and not has_any_column_privilege('authenticated','public.job_application_questions','UPDATE'),'no column write bypass on job_application_questions');
select ok(not has_table_privilege('authenticated','public.job_workflow_stages','INSERT,UPDATE,DELETE,TRUNCATE'),'no direct table writes to job_workflow_stages');
select ok(not has_any_column_privilege('authenticated','public.job_workflow_stages','INSERT') and not has_any_column_privilege('authenticated','public.job_workflow_stages','UPDATE'),'no column write bypass on job_workflow_stages');
select ok(not has_table_privilege('authenticated','public.job_assignments','INSERT,UPDATE,DELETE,TRUNCATE'),'no direct table writes to job_assignments');
select ok(not has_any_column_privilege('authenticated','public.job_assignments','INSERT') and not has_any_column_privilege('authenticated','public.job_assignments','UPDATE'),'no column write bypass on job_assignments');

select set_config('request.jwt.claim.sub',(select actor::text from f),true);
set local role authenticated;
select throws_ok($q$insert into public.jobs default values$q$,'42501',null,'authenticated insert on jobs is refused');
select throws_ok($q$update public.jobs set agency_id=agency_id$q$,'42501',null,'authenticated update on jobs is refused');
select throws_ok($q$delete from public.jobs$q$,'42501',null,'authenticated delete on jobs is refused');
select throws_ok($q$insert into public.job_requirements default values$q$,'42501',null,'authenticated insert on job_requirements is refused');
select throws_ok($q$update public.job_requirements set agency_id=agency_id$q$,'42501',null,'authenticated update on job_requirements is refused');
select throws_ok($q$delete from public.job_requirements$q$,'42501',null,'authenticated delete on job_requirements is refused');
select throws_ok($q$insert into public.job_application_questions default values$q$,'42501',null,'authenticated insert on job_application_questions is refused');
select throws_ok($q$update public.job_application_questions set agency_id=agency_id$q$,'42501',null,'authenticated update on job_application_questions is refused');
select throws_ok($q$delete from public.job_application_questions$q$,'42501',null,'authenticated delete on job_application_questions is refused');
select throws_ok($q$insert into public.job_workflow_stages default values$q$,'42501',null,'authenticated insert on job_workflow_stages is refused');
select throws_ok($q$update public.job_workflow_stages set agency_id=agency_id$q$,'42501',null,'authenticated update on job_workflow_stages is refused');
select throws_ok($q$delete from public.job_workflow_stages$q$,'42501',null,'authenticated delete on job_workflow_stages is refused');
select throws_ok($q$insert into public.job_assignments default values$q$,'42501',null,'authenticated insert on job_assignments is refused');
select throws_ok($q$update public.job_assignments set agency_id=agency_id$q$,'42501',null,'authenticated update on job_assignments is refused');
select throws_ok($q$delete from public.job_assignments$q$,'42501',null,'authenticated delete on job_assignments is refused');

select throws_ok($q$select public.publish_job((select hidden from f),'hidden',null)$q$,'P0001','permission_denied','unassigned recruiter cannot publish another draft');
select throws_ok($q$select public.create_manual_job((select agency from f),(select client from f),null,jsonb_build_object('title','Wrong lead','primaryRecruiterId',(select other_actor from f)))$q$,'P0001','permission_denied','creation cannot bypass manager reassignment');
select throws_ok($q$select public.assign_job((select job from f),(select other_actor from f),'primary',null)$q$,'P0001','permission_denied','recruiter cannot use assignment API');
select throws_ok($q$select public.update_draft_job((select agency from f),(select job from f),
  (select updated_at from public.jobs where id=(select job from f)),(select client from f),null,
  jsonb_build_object('title','Changed role','description','A detailed new role description.','positionsRequired',2,'primaryRecruiterId',(select other_actor from f)),'[]','[]',null)$q$,
  'P0001','permission_denied','draft editing cannot bypass manager reassignment');

select lives_ok($q$select public.create_manual_job((select agency from f),(select client from f),null,
  '{"title":"Unfinished role","positionsRequired":3}','[{"type":"required","label":""}]',
  '[{"label":"","questionType":"single_select","options":[""],"isRequired":true}]',false,'draft-capture')$q$,'organization and title save a real unfinished draft');
select is((select positions_required from public.jobs where creation_request_id='draft-capture'),3,'one draft retains three openings');
select is((select questions->0->>'label' from public.job_draft_content where job_id=(select id from public.jobs where creation_request_id='draft-capture')),'','unfinished question is preserved');
select is((select count(*) from public.job_application_questions where job_id=(select id from public.jobs where creation_request_id='draft-capture')),0::bigint,'unfinished questions never enter public intake configuration');
select throws_ok($q$select public.publish_job((select id from public.jobs where creation_request_id='draft-capture'),'unfinished',null)$q$,'P0001','job_publication_incomplete','unfinished role cannot be published');

select set_config('request.jwt.claim.sub',(select other_actor::text from f),true);
select is((select count(*) from public.job_draft_content),0::bigint,'unassigned recruiters cannot read private unfinished answers');
select throws_ok($q$select public.delete_empty_manual_job((select job from f),null)$q$,'P0001','permission_denied','unassigned recruiter cannot delete another draft');

select set_config('request.jwt.claim.sub',(select revoked::text from f),true);
select throws_ok($q$select public.transition_job((select live from f),'on_hold',null)$q$,'P0001','permission_denied','old assignment does not authorize a revoked member');
select throws_ok($q$select public.publish_job((select live from f),'revoked',null)$q$,'P0001','permission_denied','revoked member cannot publish');

select set_config('request.jwt.claim.sub',(select manager::text from f),true);
select lives_ok($q$select public.assign_job((select live from f),(select other_actor from f),'primary','handoff')$q$,'manager can hand off a role');
select is((select count(*) from public.job_assignments where job_id=(select live from f) and assignment_role='primary'),1::bigint,'one primary assignment remains');
select is((select primary_recruiter_id from public.jobs where id=(select live from f)),(select other_actor from f),'primary pointer follows assignment');
select throws_ok($q$select public.assign_job((select live from f),(select other_actor from f),'collaborator',null)$q$,'P0001','primary_assignment_required','current primary cannot be demoted behind the pointer');
select throws_ok($q$select public.assign_job((select job from f),(select revoked from f),'primary',null)$q$,'P0001','assignee_not_active','inactive leads cannot be assigned');
select lives_ok($q$select public.convert_hiring_request_to_job((select request from f),(select workflow from f),now()+interval '7 days','normal',(select actor from f),'conversion')$q$,'manager converts the approved request');
select is((select count(*) from public.client_job_access where job_id=(select id from public.jobs where hiring_request_id=(select request from f))),0::bigint,'conversion never silently grants employer access');
select lives_ok($q$select public.convert_hiring_request_to_job((select request from f),(select workflow from f),now()+interval '7 days','normal',(select actor from f),'conversion')$q$,'authorized conversion retry succeeds');
select is((select count(*) from public.jobs where hiring_request_id=(select request from f)),1::bigint,'conversion retries retain one job');

select set_config('request.jwt.claim.sub',(select actor::text from f),true);
select throws_ok($q$select public.transition_job((select live from f),'on_hold',null)$q$,'P0001','permission_denied','creator loses published-job mutation after handoff');
select throws_ok($q$select public.convert_hiring_request_to_job((select request from f),null,null,null,null,'conversion')$q$,'P0001','permission_denied','prior conversion receipt is not returned to a recruiter');
select lives_ok($q$select public.update_draft_job((select agency from f),(select id from public.jobs where creation_request_id='draft-capture'),
  (select updated_at from public.jobs where creation_request_id='draft-capture'),(select client from f),null,
  '{"title":"Finished role","description":"A detailed role ready for candidates.","positionsRequired":3,"workArrangement":"remote","employmentArrangement":"permanent","remoteEligibility":"anywhere"}'::jsonb || jsonb_build_object('workflowTemplateId',(select workflow from f)),
  '[{"type":"required","label":"Portfolio","description":"Evidence of prior work"}]',
  '[{"label":"Can you work shifts?","questionType":"single_select","options":["Yes","No"],"isRequired":true}]','finish-draft')$q$,'saved unfinished draft can be completed');
select lives_ok($q$select public.publish_job((select id from public.jobs where creation_request_id='draft-capture'),'finished-role','publish-finished')$q$,'completed draft publishes');
select is((select count(*) from public.job_application_questions where job_id=(select id from public.jobs where creation_request_id='draft-capture')),1::bigint,'publication compiles candidate questions');
select is((select count(*) from public.job_draft_content),0::bigint,'publication consumes private draft configuration');

select set_config('request.jwt.claim.sub',(select employer::text from f),true);
select throws_ok($q$select public.convert_hiring_request_to_job((select request from f),null,null,null,null,'conversion')$q$,'P0001','permission_denied','employer cannot enumerate a conversion receipt');
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select lives_ok($q$select id,title,experience_min_years,seniority_level,salary_period from public.jobs$q$,'public role projection includes added public columns');
select throws_ok($q$select created_by from public.jobs$q$,'42501',null,'public access does not expose internal job columns');
select throws_ok($q$select * from public.job_draft_content$q$,'42501',null,'anonymous callers cannot read draft content');
select throws_ok($q$select public.publish_job((select job from f),'anon',null)$q$,'42501',null,'anonymous callers cannot publish');
reset role;
update public.agencies set status='suspended' where id=(select agency from f);
set local role anon;
select is((select count(*) from public.jobs),0::bigint,'inactive agency listings are not public');
reset role;
select * from finish();
rollback;

