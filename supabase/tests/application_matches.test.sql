begin;
select plan(11);
create temp table f as select gen_random_uuid() agency, gen_random_uuid() other_agency,
  gen_random_uuid() manager, gen_random_uuid() outsider, gen_random_uuid() org,
  gen_random_uuid() job, gen_random_uuid() app, gen_random_uuid() cand, gen_random_uuid() doc,
  gen_random_uuid() run, gen_random_uuid() req_a, gen_random_uuid() req_b, gen_random_uuid() req_c;
grant select on f to authenticated;
insert into auth.users(id,email) select manager, manager::text||'@example.invalid' from f
  union all select outsider, outsider::text||'@example.invalid' from f;
insert into public.user_profiles(id,full_name) select manager,'Match Manager' from f;
insert into public.agencies(id,name,slug,contact_email,country_code,timezone)
  select agency,'Match test',agency::text,'synthetic@example.invalid','NG','Africa/Lagos' from f
  union all select other_agency,'Other',other_agency::text,'synthetic@example.invalid','NG','Africa/Lagos' from f;
insert into public.agency_memberships(agency_id,user_id,role,status)
  select agency,manager,'recruitment_manager','active' from f
  union all select other_agency,outsider,'owner','active' from f;
insert into public.clients(id,agency_id,name) select org,agency,'Synthetic Org' from f;
insert into public.jobs(id,agency_id,client_id,title,positions_required,created_by)
  select job,agency,org,'Sales lead',1,manager from f;
insert into public.candidates(id,agency_id,full_name,email) select cand,agency,'Synthetic Person','synthetic@example.invalid' from f;
insert into public.applications(id,agency_id,job_id,candidate_id) select app,agency,job,cand from f;
insert into public.candidate_documents(id,agency_id,candidate_id,application_id,file_name,storage_path,content_type,size_bytes)
  select doc,agency,cand,app,'cv.pdf',agency::text||'/cv.pdf','application/pdf',8 from f;
create temp table before_app as select updated_at from public.applications where id=(select app from f);

-- A run against two required criteria and one preferred criterion.
insert into public.screening_runs(id,agency_id,application_id,document_id,request_id,idempotency_key,
  input_snapshot,input_fingerprint,model,prompt_version,extractor_version,status,assessment)
select run,agency,app,doc,'match-test',gen_random_uuid(),
  jsonb_build_object('requirements',jsonb_build_array(
    jsonb_build_object('id',req_a,'label','Field sales','requirement_type','required'),
    jsonb_build_object('id',req_b,'label','Driver''s licence','requirement_type','required'),
    jsonb_build_object('id',req_c,'label','FMCG','requirement_type','preferred'))),
  'fp','synthetic-model','screening-v2','extraction-v1','running',
  jsonb_build_object('criteria',jsonb_build_array(
    jsonb_build_object('requirementId',req_a,'verdict','supported'),
    jsonb_build_object('requirementId',req_b,'verdict','not_found','followUp','Do you hold a valid licence?'),
    jsonb_build_object('requirementId',req_c,'verdict','supported')))
from f;
select is((select count(*) from public.application_matches where application_id=(select app from f)),0::bigint,'running work is not graded');

update public.screening_runs set status='succeeded', finished_at=now() where id=(select run from f);
select is((select band from public.application_matches where application_id=(select app from f)),'partial','a missing required item grades partial');
select is((select required_met||'/'||required_total from public.application_matches where application_id=(select app from f)),'1/2','required counts are recorded');
select is((select gaps->0->>'followUp' from public.application_matches where application_id=(select app from f)),'Do you hold a valid licence?','gaps carry the follow-up question');

insert into public.screening_corrections(id,agency_id,application_id,run_id,requirement_id,verdict,explanation,author_user_id)
select gen_random_uuid(),agency,app,run,req_b,'supported','Licence confirmed on a call',manager from f;
select is((select band from public.application_matches where application_id=(select app from f)),'strong','a recruiter correction overrides the model');

insert into public.screening_corrections(id,agency_id,application_id,run_id,requirement_id,verdict,explanation,author_user_id)
select gen_random_uuid(),agency,app,run,req_a,'contradicted','No field sales experience after all',manager from f;
select is((select band from public.application_matches where application_id=(select app from f)),'weak','a contradicted required item grades weak');

select is((select updated_at from public.applications where id=(select app from f)),(select updated_at from before_app),'grading never changes the application version');
select is((select status from public.applications where id=(select app from f)),'received','grading never changes the stage');

select ok(not has_table_privilege('authenticated','public.application_matches','INSERT'),'reviewers cannot write grades');
select set_config('request.jwt.claim.sub',(select manager::text from f),true);
set local role authenticated;
select is((select count(*) from public.application_matches where application_id=(select app from f)),1::bigint,'reviewers can read grades');
reset role;
select set_config('request.jwt.claim.sub',(select outsider::text from f),true);
set local role authenticated;
select is((select count(*) from public.application_matches where application_id=(select app from f)),0::bigint,'other agencies cannot read grades');
reset role;
select * from finish();
rollback;
