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
select agency,manager,'owner','active' from applicant_fixture
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
insert into public.candidate_documents(id,agency_id,candidate_id,application_id,file_name,storage_path,content_type,size_bytes)
select note,agency,candidate,application,'synthetic.pdf',agency::text||'/synthetic.pdf','application/pdf',8 from applicant_fixture;
create temp table processing_fixture as select gen_random_uuid() message_key, gen_random_uuid() correction, gen_random_uuid() requirement, null::uuid message_id;
grant select,update on processing_fixture to authenticated;
select ok(not has_function_privilege('anon','public.queue_candidate_message(uuid,uuid,uuid,jsonb,text)','execute'),'anonymous messages denied');
select ok(not has_function_privilege('authenticated','public.claim_candidate_message()','execute'),'browser cannot become email worker');
select ok(not has_column_privilege('authenticated','public.communications','lease_token','select'),'delivery leases private');
select ok(not has_table_privilege('authenticated','public.screening_corrections','insert'),'corrections cannot be directly rewritten');
select is((select count(*) from public.application_intake_tasks where agency_id=(select agency from applicant_fixture)),2::bigint,'intake is durably enqueued with each application');
select set_config('request.jwt.claim.sub',(select recruiter::text from applicant_fixture),true);
set local role authenticated;
select throws_ok($$select public.save_processing_settings((select agency from applicant_fixture),'{}','settings-denied')$$,'42501','permission_denied','recruiter cannot activate agency processing');
update processing_fixture set message_id=public.queue_candidate_message((select agency from applicant_fixture),(select application from applicant_fixture),message_key,'{"kind":"custom","subject":"Application update","body":"Synthetic message","confirmed":false}','message-test');
select is(public.queue_candidate_message((select agency from applicant_fixture),(select application from applicant_fixture),(select message_key from processing_fixture),'{"kind":"custom","subject":"Application update","body":"Synthetic message","confirmed":false}','message-retry'),(select message_id from processing_fixture),'repeat request returns same logical message');
select throws_ok($$select public.queue_candidate_message((select agency from applicant_fixture),(select application from applicant_fixture),(select message_key from processing_fixture),'{"kind":"custom","subject":"Changed","body":"Changed"}','conflict')$$,'P0001','idempotency_conflict','key cannot be reused for different message');
select throws_ok($$select public.queue_candidate_message((select agency from applicant_fixture),(select other_application from applicant_fixture),gen_random_uuid(),'{"kind":"custom","subject":"Private","body":"No access"}','scope')$$,'42501','permission_denied','unassigned job messages denied');
select throws_ok($$select public.queue_candidate_message((select other_agency from applicant_fixture),(select application from applicant_fixture),gen_random_uuid(),'{"kind":"custom","subject":"Other tenant","body":"No access"}','tenant')$$,'42501','permission_denied','cross tenant messages denied');
select throws_ok($$select public.queue_candidate_message((select agency from applicant_fixture),(select application from applicant_fixture),gen_random_uuid(),'{"kind":"rejection","subject":"Decision","body":"Reviewed","confirmed":true}','rejection')$$,'P0001','rejection_requires_review','no rejection email before a human rejection decision');
select throws_ok($$select public.queue_candidate_message((select agency from applicant_fixture),(select application from applicant_fixture),gen_random_uuid(),'{"kind":"custom"}','invalid')$$,'P0001','invalid_message','RPC rejects missing message fields');
select is((select count(*) from public.communications where related_entity_id=(select application from applicant_fixture)),1::bigint,'retry cannot duplicate a message');
select is((select status from public.applications where id=(select application from applicant_fixture)),'received','queueing email never changes application lifecycle');
reset role;
create temp table message_claim as select * from public.claim_candidate_message();
select is((select count(*) from message_claim),1::bigint,'one worker claims the message');
select is((select count(*) from public.claim_candidate_message()),0::bigint,'another worker cannot claim an active lease');
select is(public.finish_candidate_message((select id from message_claim),gen_random_uuid(),'provider-test',null,false),false,'stale email worker cannot finish');
select is(public.finish_candidate_message((select id from message_claim),(select lease_token from message_claim),'provider-test',null,false),true,'leased delivery result saved');
select is((select status from public.communications where id=(select id from message_claim)),'sent','provider acceptance tracked as sent');
select is(public.record_email_event('synthetic-delivered','provider-test','delivered',now()),true,'delivery callback recorded');
select is(public.record_email_event('synthetic-delivered','provider-test','delivered',now()),true,'duplicate callback harmless');
select is(public.record_email_event('synthetic-old-sent','provider-test','sent',now()-interval '1 minute'),true,'old callback accepted without rollback');
select is((select status from public.communications where id=(select id from message_claim)),'delivered','sent callback cannot undo delivered');
select set_config('request.jwt.claim.sub',(select manager::text from applicant_fixture),true);
set local role authenticated;
select lives_ok($$select public.save_processing_settings((select agency from applicant_fixture),'{"screeningEnabled":true,"automaticScreening":true,"acknowledgeApplications":true,"reviewReminderHours":24}','settings')$$,'owner can opt in agency processing');
select lives_ok($$select public.request_application_screening((select agency from applicant_fixture),(select application from applicant_fixture),(select note from applicant_fixture),gen_random_uuid(),'synthetic-model','manual-test')$$,'authorized screening request');
reset role;
create temp table run_claim as select * from public.claim_screening_run();
select is(public.checkpoint_screening_extraction((select id from run_claim),(select lease_token from run_claim),'{"readable":true,"sections":[{"label":"Experience","text":"Synthetic evidence"}],"warnings":[]}','{}'),true,'validated extraction checkpoint retained');
select is(public.finish_screening_run((select id from run_claim),(select lease_token from run_claim),null,'provider_unavailable',true),true,'assessment failure schedules retry');
select ok((select extraction is not null from public.screening_runs where id=(select id from run_claim)),'transient assessment failure does not discard extraction');
update public.screening_runs set status='succeeded',assessment=jsonb_build_object('summary','Synthetic', 'criteria',jsonb_build_array(jsonb_build_object('requirementId',(select requirement from processing_fixture),'verdict','not_found','explanation','Not found in supplied material','evidence','[]'::jsonb,'followUp',null)),'facts','[]'::jsonb,'warnings','[]'::jsonb) where id=(select id from run_claim);
select set_config('request.jwt.claim.sub',(select recruiter::text from applicant_fixture),true);
set local role authenticated;
select lives_ok($$select public.correct_screening((select agency from applicant_fixture),(select application from applicant_fixture),jsonb_build_object('id',(select correction from processing_fixture),'runId',(select id from public.screening_runs limit 1),'requirementId',(select requirement from processing_fixture),'verdict','supported','explanation','Recruiter checked synthetic supporting evidence'),'correction')$$,'assigned reviewer can append correction');
select is((select count(*) from public.screening_corrections),1::bigint,'correction retained separately');
select is((select assessment->'criteria'->0->>'verdict' from public.screening_runs limit 1),'not_found','original AI result remains intact');
reset role;
update public.application_intake_tasks set status='cancelled' where application_id=(select other_application from applicant_fixture);
create temp table intake_claim as select * from public.claim_application_intake();
grant select on intake_claim,applicant_fixture to service_role;
set local role service_role;
select is(public.prepare_application_intake((select id from intake_claim),(select lease_token from intake_claim),null)->>'failed','true','missing AI configuration records a recoverable intake failure');
reset role;
select is((select count(*) from public.communications where application_id=(select application from applicant_fixture) and message_type='application_received'),1::bigint,'AI configuration failure preserves queued acknowledgement');
select is((select status from public.application_intake_tasks where id=(select id from intake_claim)),'pending','unfinished screening remains retryable');
select is(current_setting('request.jwt.claim.sub',true),(select recruiter::text from applicant_fixture),'failed screening preparation preserves caller identity');
update public.application_intake_tasks set available_at=now() where id=(select id from intake_claim);
update intake_claim set lease_token=(select lease_token from public.claim_application_intake() limit 1);
set local role service_role;
select lives_ok($$select public.prepare_application_intake((select id from intake_claim),(select lease_token from intake_claim),'synthetic-model')$$,'real service role can prepare opted-in intake');
reset role;
select is((select status from public.application_intake_tasks where id=(select id from intake_claim)),'done','intake completes durably');
select is((select count(*) from public.communications where application_id=(select application from applicant_fixture) and message_type='application_received'),1::bigint,'intake queues one acknowledgement');
update public.application_intake_tasks set status='running',lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes' where id=(select id from intake_claim);
select lives_ok($$select public.prepare_application_intake(id,lease_token,'synthetic-model') from public.application_intake_tasks where id=(select id from intake_claim)$$,'replaying intake is harmless');
select is((select count(*) from public.communications where application_id=(select application from applicant_fixture) and message_type='application_received'),1::bigint,'replayed intake cannot duplicate acknowledgement');
set local role service_role;
select lives_ok($$select * from public.claim_candidate_message()$$,'service role can claim email work without schema permission failure');
reset role;
update public.agency_memberships set status='revoked' where agency_id=(select agency from applicant_fixture) and user_id=(select recruiter from applicant_fixture);
set local role authenticated;
select is((select count(*) from public.communications),0::bigint,'revoked user loses candidate message access');
select is((select count(*) from public.screening_corrections),0::bigint,'revoked user loses correction access');
reset role;
select is(public.record_email_event('synthetic-bounce','provider-test','permanent_failure',now()+interval '1 minute',true),true,'bounce recorded');
select ok((select email_suppressed from public.candidates where id=(select candidate from applicant_fixture)),'bounce suppresses future candidate email');
select * from finish();
rollback;
