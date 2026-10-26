begin;
select no_plan();
create temp table applicant_fixture as select gen_random_uuid() agency,gen_random_uuid() other_agency,
  gen_random_uuid() manager,gen_random_uuid() recruiter,gen_random_uuid() outsider,
  gen_random_uuid() organization,gen_random_uuid() job,gen_random_uuid() other_job,
  gen_random_uuid() application,gen_random_uuid() other_application,gen_random_uuid() candidate,
  gen_random_uuid() note;
grant select on applicant_fixture to authenticated;
insert into auth.users(id,email)
select manager,manager::text||'@example.invalid' from applicant_fixture
union all select recruiter,recruiter::text||'@example.invalid' from applicant_fixture
union all select outsider,outsider::text||'@example.invalid' from applicant_fixture;
insert into public.user_profiles(id,full_name)
select manager,'Test Manager' from applicant_fixture union all select recruiter,'Test Recruiter' from applicant_fixture;
insert into public.agencies(id,name,slug,contact_email,country_code,timezone)
select agency,'Applicant test',agency::text,'synthetic@example.invalid','NG','Africa/Lagos' from applicant_fixture
union all select other_agency,'Other applicant test',other_agency::text,'synthetic@example.invalid','NG','Africa/Lagos' from applicant_fixture;
insert into public.agency_memberships(agency_id,user_id,role,status)
select agency,manager,'recruitment_manager','active' from applicant_fixture
union all select agency,recruiter,'recruiter','active' from applicant_fixture
union all select other_agency,outsider,'owner','active' from applicant_fixture;
insert into public.clients(id,agency_id,name) select organization,agency,'Synthetic Organization' from applicant_fixture;
insert into public.jobs(id,agency_id,client_id,title,positions_required,created_by)
select job,agency,organization,'Designer',2,manager from applicant_fixture
union all select other_job,agency,organization,'Private role',1,manager from applicant_fixture;
insert into public.job_assignments(agency_id,job_id,user_id,assignment_role)
select agency,job,recruiter,'primary' from applicant_fixture;
insert into public.candidates(id,agency_id,full_name,email)
select candidate,agency,'Ada O''Brien','synthetic@example.invalid' from applicant_fixture;
insert into public.applications(id,agency_id,job_id,candidate_id)
select application,agency,job,candidate from applicant_fixture
union all select other_application,agency,other_job,candidate from applicant_fixture;


update public.jobs set status='open' where agency_id=(select agency from applicant_fixture);
create temp table screening_fixture as select gen_random_uuid() key1,gen_random_uuid() key2,gen_random_uuid() doc2;
grant select on screening_fixture to authenticated;
insert into public.candidate_documents(id,agency_id,candidate_id,application_id,file_name,storage_path,content_type,size_bytes)
select note,agency,candidate,application,'synthetic.pdf',agency::text||'/synthetic.pdf','application/pdf',8 from applicant_fixture
union all select s.doc2,f.agency,f.candidate,f.application,'second.pdf',f.agency::text||'/second.pdf','application/pdf',8
from applicant_fixture f cross join screening_fixture s;
select ok(not has_table_privilege('authenticated','public.screening_runs','INSERT'),'direct queue inserts denied');
select ok(not has_column_privilege('authenticated','public.screening_runs','lease_token','SELECT'),'lease tokens are not exposed to reviewers');
select ok(not has_function_privilege('authenticated','public.claim_screening_run()','EXECUTE'),'only worker can claim');
select ok(not has_function_privilege('anon','public.request_application_screening(uuid,uuid,uuid,uuid,text,text)','EXECUTE'),'anonymous enqueue denied');
select set_config('request.jwt.claim.sub',(select recruiter::text from applicant_fixture),true);
set local role authenticated;
select lives_ok($$select public.request_application_screening((select agency from applicant_fixture),(select application from applicant_fixture),(select note from applicant_fixture),(select key1 from screening_fixture),'synthetic-model','screening-test')$$,'assigned recruiter can request screening');
select lives_ok($$select public.request_application_screening((select agency from applicant_fixture),(select application from applicant_fixture),(select note from applicant_fixture),(select key1 from screening_fixture),'synthetic-model','retry')$$,'same key returns original run');
select lives_ok($$select public.request_application_screening((select agency from applicant_fixture),(select application from applicant_fixture),(select note from applicant_fixture),(select key2 from screening_fixture),'synthetic-model','new-key')$$,'new key joins active run');
select is((select count(*) from public.screening_runs where agency_id=(select agency from applicant_fixture)),1::bigint,'one active run despite repeated requests');
select throws_ok($$select public.request_application_screening((select agency from applicant_fixture),(select application from applicant_fixture),(select doc2 from screening_fixture),(select key2 from screening_fixture),'synthetic-model','key-conflict')$$,'P0001','idempotency_conflict','coalesced key stays bound to document');
select throws_ok($$select public.request_application_screening((select agency from applicant_fixture),(select application from applicant_fixture),(select doc2 from screening_fixture),gen_random_uuid(),'synthetic-model','active-conflict')$$,'P0001','screening_already_running','different document cannot replace active work');
select throws_ok($$select public.request_application_screening((select agency from applicant_fixture),(select other_application from applicant_fixture),(select note from applicant_fixture),gen_random_uuid(),'synthetic-model','denied')$$,'P0001','application_not_found','unassigned job cannot enqueue');
select throws_ok($$select lease_token from public.screening_runs$$,'42501','permission denied for table screening_runs','lease remains server-only');
select throws_ok($$select public.claim_screening_run()$$,'42501','permission denied for function claim_screening_run','reviewer cannot become worker');
reset role;
update public.jobs set title='Changed after queueing' where id=(select job from applicant_fixture);
select is((select input_snapshot->'job'->>'title' from public.screening_runs where agency_id=(select agency from applicant_fixture)),'Designer','job source snapshot is immutable');
create temp table first_claim as select * from public.claim_screening_run();
select is((select count(*) from first_claim),1::bigint,'worker claims due work');
select is((select count(*) from public.claim_screening_run()),0::bigint,'concurrent invocation cannot claim leased work');
select is((select processing_status from public.applications where id=(select application from applicant_fixture)),'extracting','application tracks processing separately');
select is((select status from public.applications where id=(select application from applicant_fixture)),'received','processing never changes lifecycle');
select is(public.finish_screening_run((select id from first_claim),gen_random_uuid(),null,'provider_unavailable',true),false,'wrong lease cannot finish');
select is(public.finish_screening_run((select id from first_claim),(select lease_token from first_claim),null,'provider_unavailable',true),true,'transient provider failure is recorded');
select is((select status from public.screening_runs where id=(select id from first_claim)),'queued','transient failure schedules retry');
select ok((select available_at>now() from public.screening_runs where id=(select id from first_claim)),'retry uses backoff');
select is((select count(*) from public.claim_screening_run()),0::bigint,'retry not claimed before backoff');
update public.screening_runs set available_at=now()-interval '1 second' where id=(select id from first_claim);
create temp table second_claim as select * from public.claim_screening_run();
select is((select attempts from second_claim),2,'attempt count persists across retries');
select is(public.finish_screening_run((select id from first_claim),(select lease_token from first_claim),null,'stale',false),false,'previous worker cannot overwrite retry');
select is(public.finish_screening_run((select id from second_claim),(select lease_token from second_claim),'{"extraction":{"readable":true,"sections":[]},"assessment":{"summary":"Synthetic fixture","criteria":[{"verdict":"not_found"}]},"provider":{"name":"synthetic"}}',null,false),true,'trusted worker stores a successful result');
select is((select processing_status from public.applications where id=(select application from applicant_fixture)),'needs_information','missing evidence becomes a follow-up flag');
select is((select status from public.applications where id=(select application from applicant_fixture)),'received','assessment cannot reject application');
select set_config('request.jwt.claim.sub',(select outsider::text from applicant_fixture),true);
set local role authenticated;
select is((select count(*) from public.screening_runs where agency_id=(select agency from applicant_fixture)),0::bigint,'cross-tenant results are denied');
reset role;
update public.agency_memberships set status='revoked' where user_id=(select recruiter from applicant_fixture);
select set_config('request.jwt.claim.sub',(select recruiter::text from applicant_fixture),true);
set local role authenticated;
select is((select count(*) from public.screening_runs where agency_id=(select agency from applicant_fixture)),0::bigint,'revocation immediately hides screening results');
reset role;
-- A revoked requester must not cause any new provider work.
update public.screening_runs set status='queued',attempts=0,available_at=now() where id=(select id from first_claim);
select is((select count(*) from public.claim_screening_run()),0::bigint,'revoked requester is never claimed');
select is((select status from public.screening_runs where id=(select id from first_claim)),'cancelled','revoked pending work is cancelled');
update public.agency_memberships set status='active' where user_id=(select recruiter from applicant_fixture);
update public.screening_runs set status='queued',attempts=2,available_at=now() where id=(select id from first_claim);
create temp table final_claim as select * from public.claim_screening_run();
select is((select attempts from final_claim),3,'last allowed attempt is claimable');
select is(public.finish_screening_run((select id from final_claim),(select lease_token from final_claim),null,'provider_unavailable',true),true,'final failure is recorded');
select is((select status from public.screening_runs where id=(select id from first_claim)),'failed','third failure is permanent despite retryable provider error');
select is((select count(*) from public.claim_screening_run()),0::bigint,'attempt budget cannot be exceeded');
update public.screening_runs set status='queued',attempts=0,available_at=now() where id=(select id from first_claim);
create temp table expired_claim as select * from public.claim_screening_run();
update public.screening_runs set lease_until=now()-interval '1 minute' where id=(select id from first_claim);
select is(public.finish_screening_run((select id from expired_claim),(select lease_token from expired_claim),null,'late',false),false,'expired lease cannot commit');
create temp table recovered_claim as select * from public.claim_screening_run();
select isnt((select lease_token from recovered_claim),(select lease_token from expired_claim),'interrupted work receives a fresh lease');
update public.agency_memberships set status='revoked' where user_id=(select recruiter from applicant_fixture);
select is(public.finish_screening_run((select id from recovered_claim),(select lease_token from recovered_claim),'{"extraction":{},"assessment":{}}',null,false),true,'completion rechecks access even after successful provider work');
select is((select status from public.screening_runs where id=(select id from first_claim)),'cancelled','revoked mid-run result is discarded');
select ok((select assessment is null from public.screening_runs where id=(select id from first_claim)),'cancelled output is not persisted');
select * from finish();
rollback;
