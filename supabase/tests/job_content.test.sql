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


create temp table content_input as select
 jsonb_build_object('title','Private budget role','description','A complete public description for this synthetic role.','positionsRequired',2,'workArrangement','remote','employmentArrangement','fixed_term','workingHours','part_time','contractDuration','Six months','remoteEligibility','restricted','remoteDetails','Nigeria; WAT','salaryMin',123456,'salaryMax',234567,'currency','NGN','salaryPeriod','monthly','salaryVisibility','hidden','salaryBasis','gross','hiringReason','replacement','targetStartDate','2027-01-05','sourcingBrief','Private sourcing context','workflowTemplateId',workflow) job,
 jsonb_build_object('id',request,'expectedVersion',0,'category','Availability','archived',false,'question',jsonb_build_object('label','When can you start?','helpText','An approximate date is fine.','questionType','short_text','options','[]'::jsonb,'isRequired',false)) library
 from f;
grant select on content_input to authenticated,anon;
update content_input set job=job||jsonb_build_object('publicSlug','content-hidden-public');
select set_config('request.jwt.claim.sub',(select manager::text from f),true);
set local role authenticated;
select lives_ok($q$select public.save_library_question((select agency from f),(select library from content_input),(select revision from f))$q$,'manager creates library question');
select lives_ok($q$select public.save_library_question((select agency from f),(select library from content_input),(select revision from f))$q$,'identical library retry returns receipt');
select is((select version from public.screening_question_library),1,'retry does not create another version');
select throws_ok($q$select public.save_library_question((select agency from f),(select library||'{"category":"Changed"}' from content_input),(select revision from f))$q$,'P0001','idempotency_conflict','same key cannot change content');
select throws_ok($q$select public.save_library_question((select other_agency from f),(select library from content_input),gen_random_uuid())$q$,'P0001','permission_denied','library mutation cannot cross tenants');
select throws_ok($q$select public.create_manual_job((select agency from f),(select client from f),null,(select job||'{"workArrangement":"hybrid","location":""}' from content_input),'[]','[]',true,'no-location')$q$,'P0001','job_publication_incomplete','hybrid requires location at RPC boundary');
select throws_ok($q$select public.create_manual_job((select agency from f),(select client from f),null,(select job||'{"employmentArrangement":"permanent","remoteEligibility":""}' from content_input),'[]','[]',true,'no-eligibility')$q$,'P0001','job_publication_incomplete','remote requires eligibility');
select throws_ok($q$select public.create_manual_job((select agency from f),(select client from f),null,(select job||'{"remoteDetails":""}' from content_input),'[]','[]',true,'no-region')$q$,'P0001','job_publication_incomplete','restricted remote requires details');
select throws_ok($q$select public.create_manual_job((select agency from f),(select client from f),null,(select job||'{"contractDuration":""}' from content_input),'[]','[]',true,'no-duration')$q$,'P0001','job_publication_incomplete','fixed-term requires duration');
select throws_ok($q$select public.create_manual_job((select agency from f),(select client from f),null,(select job-'workflowTemplateId' from content_input),'[]','[]',true,'no-workflow')$q$,'P0001','job_publication_incomplete','publication requires usable workflow');
select lives_ok($q$select public.create_manual_job((select agency from f),(select client from f),null,(select job from content_input),'[]',jsonb_build_array((select library->'question' from content_input)),true,'content-hidden')$q$,'complete role publishes with private budget');
select is((select salary_min from public.jobs where creation_request_id='content-hidden'),null::numeric,'hidden salary removed from public jobs relation');
select is((select salary_min from public.job_internal_briefs where job_id=(select id from public.jobs where creation_request_id='content-hidden')),123456::numeric,'internal salary preserved');
select is((select sourcing_brief from public.job_internal_briefs where job_id=(select id from public.jobs where creation_request_id='content-hidden')),'Private sourcing context','private sourcing brief preserved');
select is((select target_start_date::text from public.job_internal_briefs where job_id=(select id from public.jobs where creation_request_id='content-hidden')),'2027-01-05','internal target start is a calendar date');
select is((select working_hours from public.jobs where creation_request_id='content-hidden'),'part_time','hours separate from arrangement');
select is((select employment_arrangement from public.jobs where creation_request_id='content-hidden'),'fixed_term','fixed term is not inferred from hours');
select lives_ok($q$select public.create_manual_job((select agency from f),(select client from f),null,(select job-'publicSlug' from content_input),'[]','[]',false,'content-draft')$q$,'hidden budget draft saves');
select lives_ok($q$select public.update_draft_job((select agency from f),(select id from public.jobs where creation_request_id='content-draft'),(select updated_at from public.jobs where creation_request_id='content-draft'),(select client from f),null,(select job from content_input),'[]','[]','edit-hidden-budget')$q$,'hidden budget draft can be edited without entering public amount columns');
select lives_ok($q$select public.update_draft_job((select agency from f),(select id from public.jobs where creation_request_id='content-draft'),(select updated_at from public.jobs where creation_request_id='content-draft'),(select client from f),null,(select job||'{"salaryVisibility":"public"}' from content_input),'[]','[]','show-budget')$q$,'hidden draft can explicitly disclose salary');
select is((select salary_min from public.jobs where creation_request_id='content-draft'),123456::numeric,'explicit disclosure copies the amount');
select lives_ok($q$select public.update_draft_job((select agency from f),(select id from public.jobs where creation_request_id='content-draft'),(select updated_at from public.jobs where creation_request_id='content-draft'),(select client from f),null,(select job||'{"salaryVisibility":"negotiable"}' from content_input),'[]','[]','negotiable-budget')$q$,'public draft can switch to negotiable');
select is((select salary_min from public.jobs where creation_request_id='content-draft'),null::numeric,'negotiable removes public amount');
select lives_ok($q$select public.save_library_question((select agency from f),(select library||'{"expectedVersion":1,"archived":true}' from content_input),gen_random_uuid())$q$,'manager archives a library item');
select is((select count(*) from public.screening_question_library where not archived),0::bigint,'archived question is unavailable for new selection');
select is((select label from public.job_application_questions where job_id=(select id from public.jobs where creation_request_id='content-hidden')),'When can you start?','library archive leaves job snapshot unchanged');
select throws_ok($q$select public.save_library_question((select agency from f),(select library||'{"expectedVersion":1}' from content_input),gen_random_uuid())$q$,'P0001','stale_library_question','stale library edit conflicts');
select set_config('request.jwt.claim.sub',(select actor::text from f),true);
select throws_ok($q$select public.save_library_question((select agency from f),(select library from content_input),gen_random_uuid())$q$,'P0001','permission_denied','recruiter cannot manage library');
select is((select count(*) from public.job_internal_briefs),0::bigint,'unassigned recruiter cannot read internal brief');
select set_config('request.jwt.claim.sub',(select employer::text from f),true);
select is((select count(*) from public.job_internal_briefs),0::bigint,'employer cannot read internal brief');
select is((select count(*) from public.screening_question_library),0::bigint,'employer cannot read agency library');
reset role;
set local role anon;
select throws_ok('select * from public.job_internal_briefs','42501',null,'anonymous cannot read private budget or brief');
select throws_ok('select * from public.screening_question_library','42501',null,'anonymous cannot read library');
select is((select salary_min from public.jobs where title='Private budget role'),null::numeric,'direct anonymous API cannot recover hidden amount');
select is((select remote_details from public.jobs where title='Private budget role'),'Nigeria; WAT','public projection retains eligibility');
reset role;
select * from finish();
rollback;
