begin;
select plan(14);
create temp table f as select gen_random_uuid() agency, gen_random_uuid() other_agency,
  gen_random_uuid() manager, gen_random_uuid() outsider, gen_random_uuid() org,
  gen_random_uuid() job, gen_random_uuid() app, gen_random_uuid() cand,
  gen_random_uuid() interview, gen_random_uuid() offer, gen_random_uuid() placement;
grant select on f to authenticated;
insert into auth.users(id,email) select manager, manager::text||'@example.invalid' from f
  union all select outsider, outsider::text||'@example.invalid' from f;
insert into public.agencies(id,name,slug,contact_email,country_code,timezone)
  select agency,'Pipeline test',agency::text,'synthetic@example.invalid','NG','Africa/Lagos' from f
  union all select other_agency,'Other',other_agency::text,'synthetic@example.invalid','NG','Africa/Lagos' from f;
insert into public.agency_memberships(agency_id,user_id,role,status)
  select agency,manager,'recruitment_manager','active' from f
  union all select other_agency,outsider,'owner','active' from f;
insert into public.clients(id,agency_id,name) select org,agency,'Synthetic Org' from f;
insert into public.jobs(id,agency_id,client_id,title,positions_required,status,created_by)
  select job,agency,org,'Analyst',1,'open',manager from f;
insert into public.candidates(id,agency_id,full_name,email) select cand,agency,'Synthetic Person','synthetic@example.invalid' from f;
insert into public.applications(id,agency_id,job_id,candidate_id,status) select app,agency,job,cand,'interview' from f;

select ok(not has_table_privilege('authenticated','public.interviews','INSERT')
  and not has_table_privilege('authenticated','public.offers','UPDATE')
  and not has_table_privilege('authenticated','public.placements','INSERT'),'writes only go through manage_pipeline');

select set_config('request.jwt.claim.sub',(select manager::text from f),true);
set local role authenticated;

select lives_ok($$select public.manage_pipeline((select agency from f),(select app from f),'schedule_interview',
  jsonb_build_object('id',(select interview from f),'title','First interview','startsAt','2026-11-10T09:00:00Z',
  'endsAt','2026-11-10T09:45:00Z','timezone','Africa/Lagos','format','video','interviewerIds',jsonb_build_array((select manager from f))))$$,
  'a reviewer can schedule an interview');
select is((select round from public.interviews where id=(select interview from f)),1,'the first interview is round 1');
select lives_ok($$select public.manage_pipeline((select agency from f),(select app from f),'schedule_interview',
  jsonb_build_object('id',(select interview from f),'title','First interview','startsAt','2026-11-10T09:00:00Z',
  'endsAt','2026-11-10T09:45:00Z','timezone','Africa/Lagos','format','video'))$$,
  'a retried schedule request is a no-op');
select is((select count(*) from public.interviews where application_id=(select app from f)),1::bigint,'retries do not duplicate interviews');

select lives_ok($$select public.manage_pipeline((select agency from f),(select app from f),'save_offer',
  jsonb_build_object('id',(select offer from f),'salaryAmount','5000000','currency','ngn','salaryPeriod','annually'))$$,
  'a reviewer can draft an offer');
select throws_ok($$select public.manage_pipeline((select agency from f),(select app from f),'extend_offer',
  jsonb_build_object('id',(select offer from f)),'2000-01-01T00:00:00Z')$$,'P0001','application_changed',
  'extending an offer checks the application version');
select lives_ok($$select public.manage_pipeline((select agency from f),(select app from f),'extend_offer',
  jsonb_build_object('id',(select offer from f)),(select updated_at from public.applications where id=(select app from f)))$$,
  'an offer can be extended');
select is((select status from public.applications where id=(select app from f)),'offer','extending moves the application to Offer');

select throws_ok($$select public.manage_pipeline((select agency from f),(select app from f),'record_placement',
  jsonb_build_object('id',(select placement from f),'offerId',(select offer from f)),
  (select updated_at from public.applications where id=(select app from f)))$$,'P0001','offer_not_accepted',
  'a placement needs an accepted offer');

select lives_ok($$select public.manage_pipeline((select agency from f),(select app from f),'decide_offer',
  jsonb_build_object('id',(select offer from f),'decision','accepted','startDate','2026-12-01'))$$,
  'an acceptance is recorded with a start date');
select lives_ok($$select public.manage_pipeline((select agency from f),(select app from f),'record_placement',
  jsonb_build_object('id',(select placement from f),'offerId',(select offer from f)),
  (select updated_at from public.applications where id=(select app from f)))$$,
  'a placement is recorded');
select is((select a.status||'/'||j.status from public.applications a join public.jobs j on j.id=a.job_id where a.id=(select app from f)),
  'placed/filled','the application is placed and the single-opening job is filled');
reset role;

select set_config('request.jwt.claim.sub',(select outsider::text from f),true);
set local role authenticated;
select is((select count(*) from public.interviews where application_id=(select app from f))
  +(select count(*) from public.offers where application_id=(select app from f))
  +(select count(*) from public.placements where application_id=(select app from f)),0::bigint,
  'other agencies cannot read interviews, offers or placements');
reset role;
select * from finish();
rollback;
