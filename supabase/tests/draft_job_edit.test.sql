begin;
select plan(12);

create temp table draft_edit_fixture(actor uuid, agency uuid, other_agency uuid, client uuid, job uuid);
insert into draft_edit_fixture(actor, agency, other_agency, client, job)
values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid());
insert into auth.users(id,email)
select actor, actor::text || '@example.invalid' from draft_edit_fixture;
insert into public.agencies(id,name,slug,contact_email,country_code,timezone)
select agency,'Draft edit agency',agency::text,'test@example.invalid','NG','Africa/Lagos' from draft_edit_fixture
union all select other_agency,'Other agency',other_agency::text,'test@example.invalid','NG','Africa/Lagos' from draft_edit_fixture;
insert into public.agency_memberships(agency_id,user_id,role,status)
select agency,actor,'recruiter','active' from draft_edit_fixture;
insert into public.clients(id,agency_id,name)
select client,agency,'Draft client' from draft_edit_fixture;
select set_config('request.jwt.claim.sub',(select actor::text from draft_edit_fixture),true);
insert into public.jobs(id,agency_id,client_id,title,description,positions_required,status,created_by,source,primary_recruiter_id)
select job,agency,client,'Original role','A detailed original role description.',1,'draft',actor,'manual',actor
from draft_edit_fixture;

select ok(not has_function_privilege('anon','public.update_draft_job(uuid,uuid,timestamptz,uuid,jsonb,jsonb,jsonb,jsonb,text)','EXECUTE'), 'anonymous callers cannot edit drafts');
select lives_ok($$select public.update_draft_job(
  (select agency from draft_edit_fixture),(select job from draft_edit_fixture),
  (select updated_at from public.jobs where id=(select job from draft_edit_fixture)),
  (select client from draft_edit_fixture),null,
  '{"title":"Updated role","description":"A detailed updated role description.","positionsRequired":2,"workArrangement":"remote","experienceMinYears":3,"seniorityLevel":"mid"}',
  '[{"label":"Portfolio","type":"required"}]','[]','edit-once'
)$$, 'assigned recruiter edits a draft');
select is((select title from public.jobs where id=(select job from draft_edit_fixture)),'Updated role','title was updated');
select is((select positions_required from public.jobs where id=(select job from draft_edit_fixture)),2,'multiple openings stay on one job');
select is((select experience_min_years from public.jobs where id=(select job from draft_edit_fixture)),3,'minimum experience is saved');
select is((select seniority_level from public.jobs where id=(select job from draft_edit_fixture)),'mid','seniority level is saved');
select is((select jsonb_array_length(requirements)::bigint from public.job_draft_content where job_id=(select job from draft_edit_fixture)),1::bigint,'draft requirements are saved privately until publication');
select lives_ok($$select public.update_draft_job(
  (select agency from draft_edit_fixture),(select job from draft_edit_fixture),'2020-01-01',
  (select client from draft_edit_fixture),null,'{}','[]','[]','edit-once'
)$$,'retry key returns the prior edit before stale check');
select is((select count(*) from public.activity_events where entity_id=(select job from draft_edit_fixture) and event_type='job.draft_updated'),1::bigint,'retry creates no extra audit event');
select throws_ok($$select public.update_draft_job(
  (select agency from draft_edit_fixture),(select job from draft_edit_fixture),'2020-01-01',
  (select client from draft_edit_fixture),null,'{}','[]','[]','stale-edit'
)$$,'P0001','stale_job','stale edits are rejected');
select throws_ok($$select public.update_draft_job(
  (select other_agency from draft_edit_fixture),(select job from draft_edit_fixture),now(),
  (select client from draft_edit_fixture),null,'{}','[]','[]','cross-agency'
)$$,'P0001','job_not_found','a different agency cannot edit the job');
update public.jobs set status='open',published_at=now(),public_slug='updated-role',accepting_applications=true
where id=(select job from draft_edit_fixture);
select throws_ok($$select public.update_draft_job(
  (select agency from draft_edit_fixture),(select job from draft_edit_fixture),
  (select updated_at from public.jobs where id=(select job from draft_edit_fixture)),
  (select client from draft_edit_fixture),null,'{}','[]','[]','edit-published'
)$$,'P0001','job_not_draft','published jobs cannot use draft edit');

select * from finish();
rollback;
