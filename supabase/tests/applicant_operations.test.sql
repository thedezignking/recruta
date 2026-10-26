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

select ok(not has_table_privilege('authenticated','public.applications','UPDATE'),'application direct updates are revoked');
select ok(not has_table_privilege('authenticated','public.application_notes','INSERT'),'notes can only be written transactionally');
select ok(not has_function_privilege('anon','public.review_application(uuid,uuid,text,jsonb,timestamptz,text)','EXECUTE'),'anonymous mutations denied');
select set_config('request.jwt.claim.sub',(select recruiter::text from applicant_fixture),true);
set local role authenticated;
select is((select count(*) from public.applications where agency_id=(select agency from applicant_fixture)),1::bigint,'recruiter sees only assigned-job applications');
select is((public.application_inbox((select agency from applicant_fixture),'{}')->>'total')::int,1,'inbox RLS matches table RLS');
select is((public.application_inbox((select agency from applicant_fixture),'{"q":"O''Brien"}')->>'total')::int,1,'quoted search is literal and safe');
select is((public.application_inbox((select agency from applicant_fixture),'{"q":"%"}')->>'total')::int,0,'wildcard text does not broaden search');
select throws_ok($$select public.review_application((select agency from applicant_fixture),(select other_application from applicant_fixture),'note',jsonb_build_object('noteId',gen_random_uuid(),'body','Not allowed'),null,'denied')$$,'P0001','application_not_found','unassigned-job note denied');
select throws_ok($$select public.review_application((select agency from applicant_fixture),(select application from applicant_fixture),'transition','{"status":"shortlisted"}',(select updated_at from public.applications where id=(select application from applicant_fixture)),'invalid')$$,'P0001','invalid_application_transition','cannot skip initial review');
select throws_ok($$select public.review_application((select agency from applicant_fixture),(select application from applicant_fixture),'transition','{"status":"rejected"}',(select updated_at from public.applications where id=(select application from applicant_fixture)),'reason')$$,'P0001','transition_reason_required','rejection requires a reason');
select lives_ok($$select public.review_application((select agency from applicant_fixture),(select application from applicant_fixture),'transition','{"status":"in_review"}',(select updated_at from public.applications where id=(select application from applicant_fixture)),'review-test')$$,'review transition succeeds');
select is((select status from public.applications where id=(select application from applicant_fixture)),'in_review','stage persisted');
select throws_ok($$select public.review_application((select agency from applicant_fixture),(select application from applicant_fixture),'transition','{"status":"shortlisted"}',now(),'stale')$$,'P0001','application_changed','stale edits fail rather than overwrite');
select lives_ok($$select public.review_application((select agency from applicant_fixture),(select application from applicant_fixture),'note',jsonb_build_object('noteId',(select note from applicant_fixture),'body','Relevant portfolio evidence'),null,'note-test')$$,'internal note succeeds');
select lives_ok($$select public.review_application((select agency from applicant_fixture),(select application from applicant_fixture),'note',jsonb_build_object('noteId',(select note from applicant_fixture),'body','Relevant portfolio evidence'),null,'note-retry')$$,'note retry is idempotent');
select is((select count(*) from public.application_notes where id=(select note from applicant_fixture)),1::bigint,'one note after retry');
select is((select count(*) from public.activity_events where request_id='note-test'),1::bigint,'note and audit commit together');
select throws_ok($$select public.review_application((select agency from applicant_fixture),(select application from applicant_fixture),'note',jsonb_build_object('noteId',(select note from applicant_fixture),'body','Different retry body'),null,'conflict')$$,'P0001','idempotency_conflict','note UUID cannot be reused for different content');
select lives_ok($$select public.review_application((select agency from applicant_fixture),(select application from applicant_fixture),'assign',jsonb_build_object('ownerUserId',(select recruiter from applicant_fixture)),(select updated_at from public.applications where id=(select application from applicant_fixture)),'claim')$$,'recruiter can claim an unassigned application');
select throws_ok($$select public.review_application((select agency from applicant_fixture),(select application from applicant_fixture),'assign',jsonb_build_object('ownerUserId',(select manager from applicant_fixture)),(select updated_at from public.applications where id=(select application from applicant_fixture)),'reassign')$$,'P0001','permission_denied','recruiter cannot delegate to someone else');
select throws_ok($$update public.applications set status='placed' where id=(select application from applicant_fixture)$$,'42501','permission denied for table applications','raw update cannot bypass lifecycle or audit');
select throws_ok($$insert into public.job_assignments(agency_id,job_id,user_id,assignment_role) select agency,other_job,recruiter,'supporting' from applicant_fixture$$,'42501',null,'recruiter cannot self-grant job access');
reset role;
select set_config('request.jwt.claim.sub',(select outsider::text from applicant_fixture),true);
set local role authenticated;
select is((public.application_inbox((select agency from applicant_fixture),'{}')->>'total')::int,0,'other tenant gets no applicants');
select is((select count(*) from public.application_notes where agency_id=(select agency from applicant_fixture)),0::bigint,'other tenant cannot read notes');
reset role;
select set_config('request.jwt.claim.sub',(select manager::text from applicant_fixture),true);
set local role authenticated;
select is((public.application_inbox((select agency from applicant_fixture),'{}')->>'total')::int,2,'manager can review agency-wide');
select throws_ok($$select public.review_application((select agency from applicant_fixture),(select application from applicant_fixture),'assign',jsonb_build_object('ownerUserId',(select outsider from applicant_fixture)),(select updated_at from public.applications where id=(select application from applicant_fixture)),'wrong-owner')$$,'P0001','invalid_application_owner','cross-tenant owner is denied');
select throws_ok($$select public.review_application((select agency from applicant_fixture),(select application from applicant_fixture),'transition','{"status":"placed"}',(select updated_at from public.applications where id=(select application from applicant_fixture)),'placement')$$,'P0001','invalid_application_transition','placement cannot be faked through review');
reset role;

-- Equal timestamps must not skip rows across page boundaries.
insert into public.candidates(agency_id,full_name,email)
select f.agency,'Pagination Candidate '||n,n::text||'-'||f.agency::text||'@example.invalid'
from applicant_fixture f cross join generate_series(1,27) n;
insert into public.applications(agency_id,job_id,candidate_id,submitted_at)
select f.agency,f.job,c.id,'2026-10-24T10:00:00Z' from applicant_fixture f
join public.candidates c on c.agency_id=f.agency and c.full_name like 'Pagination Candidate%';
create temp table inbox_page as select public.application_inbox(agency,'{"q":"Pagination Candidate"}') data from applicant_fixture;
grant select on inbox_page to authenticated;
set local role authenticated;
select is(jsonb_array_length((select data->'items' from inbox_page)),25,'first page is bounded at 25');
select is(jsonb_array_length(public.application_inbox((select agency from applicant_fixture),jsonb_build_object('q','Pagination Candidate','cursorAt',(select data->'nextCursor'->>'at' from inbox_page),'cursorId',(select data->'nextCursor'->>'id' from inbox_page)))->'items'),2,'tie-breaker preserves remaining equal-timestamp rows');
select is((public.application_inbox((select agency from applicant_fixture),'{"owner":"mine"}')->>'total')::int,0,'mine is evaluated against authenticated actor');
reset role;
update public.agency_memberships set status='revoked' where user_id=(select recruiter from applicant_fixture);
select set_config('request.jwt.claim.sub',(select recruiter::text from applicant_fixture),true);
set local role authenticated;
select is((public.application_inbox((select agency from applicant_fixture),'{}')->>'total')::int,0,'revoked membership immediately removes inbox access');
select is((select count(*) from public.application_notes where agency_id=(select agency from applicant_fixture)),0::bigint,'revoked membership immediately removes note access');
select throws_ok($$select public.review_application((select agency from applicant_fixture),(select application from applicant_fixture),'note',jsonb_build_object('noteId',gen_random_uuid(),'body','After revocation'),null,'revoked')$$,'P0001','application_not_found','revoked actor cannot mutate');
reset role;
select * from finish();
rollback;
