begin;
select plan(19);

create temp table organization_fixture(actor uuid, agency uuid, other_agency uuid);
insert into organization_fixture values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
grant select on organization_fixture to authenticated;
insert into auth.users(id,email) select actor,actor::text || '@example.invalid' from organization_fixture;
insert into public.agencies(id,name,slug,contact_email,country_code,timezone)
select agency,'Organization test agency',agency::text,'test@example.invalid','NG','Africa/Lagos' from organization_fixture
union all select other_agency,'Other test agency',other_agency::text,'test@example.invalid','NG','Africa/Lagos' from organization_fixture;
insert into public.agency_memberships(agency_id,user_id,role,status)
select agency,actor,'recruiter','active' from organization_fixture;
insert into public.clients(agency_id,name) select other_agency,'Other tenant organization' from organization_fixture;
select set_config('request.jwt.claim.sub',(select actor::text from organization_fixture),true);

select has_column('public','clients','company_profile','company profiles are persisted');
select ok(not has_column_privilege('anon','public.clients','company_profile','SELECT'),'anonymous visitors cannot read enrichment');
select ok(not has_function_privilege('anon','public.create_organization(uuid,jsonb,jsonb,text)','EXECUTE'),'anonymous callers cannot create organizations');
select lives_ok($$select public.create_organization((select agency from organization_fixture),' {"name":"Manual Studio","companyProfile":{"address":"Lagos","provider":"manual"}}',null,'org-manual')$$,'contact-free organization creation works');
select lives_ok($$select public.create_organization((select agency from organization_fixture),'{"name":"Contact Studio"}','{"fullName":"Ada Okafor","email":"ADA@example.invalid"}','org-contact')$$,'organization and contact commit together');
select is((select count(*) from public.client_contacts where agency_id=(select agency from organization_fixture) and email='ada@example.invalid'),1::bigint,'contact is normalized and saved once');
select is(public.create_organization((select agency from organization_fixture),'{"name":" manual studio "}',null,'another-key'),(select id from public.clients where creation_request_id='org-manual' and agency_id=(select agency from organization_fixture)),'case-insensitive duplicates reuse the existing organization');
select is(public.create_organization((select agency from organization_fixture),'{"name":"Changed on retry"}',null,'org-manual'),(select id from public.clients where creation_request_id='org-manual' and agency_id=(select agency from organization_fixture)),'retry key returns its original organization');
select throws_ok($$select public.create_organization((select agency from organization_fixture),'{"name":"Invalid contact org"}','{"fullName":"A","email":"invalid"}','bad-contact')$$,'P0001','invalid_contact','incomplete contacts fail atomically');
select lives_ok($$select public.create_manual_job((select agency from organization_fixture),null,'{"name":"Inline Studio","companyProfile":{"address":"Abuja"}}','{"title":"Designer","description":"A detailed design role.","positionsRequired":2}', '[]','[]',false,'inline-job')$$,'inline job creation stores company profile atomically');
select lives_ok($$select public.create_manual_job((select agency from organization_fixture),null,'{"name":"Inline Studio"}','{"title":"Designer","positionsRequired":2}', '[]','[]',false,'inline-job')$$,'job retry is idempotent');
select is((select count(*) from public.jobs where agency_id=(select agency from organization_fixture) and creation_request_id='inline-job' and positions_required=2),1::bigint,'two openings and retries still create one job');
select is((select company_profile ->> 'address' from public.clients where agency_id=(select agency from organization_fixture) and name='Inline Studio'),'Abuja','inline company details survive job creation');
select throws_ok($$select public.create_manual_job((select agency from organization_fixture),null,'{"name":"Rollback Studio"}','{"title":"Invalid job","positionsRequired":0}', '[]','[]',false,'invalid-job')$$,'23514',null,'invalid jobs roll back inline organization creation');
select is((select count(*) from public.clients where agency_id=(select agency from organization_fixture) and name='Rollback Studio'),0::bigint,'no orphan organization remains after a job failure');
select throws_ok($$select public.create_organization((select other_agency from organization_fixture),'{"name":"Cross tenant"}',null,'cross-tenant')$$,'P0001','permission_denied','cross-tenant creation is denied');
set local role authenticated;
select is((select count(*) from public.clients where agency_id=(select other_agency from organization_fixture)),0::bigint,'RLS hides other agencies from organization searches');
reset role;
update public.agency_memberships set status='revoked' where agency_id=(select agency from organization_fixture);
select throws_ok($$select public.create_organization((select agency from organization_fixture),'{"name":"After revocation"}',null,'revoked')$$,'P0001','permission_denied','revoked memberships lose access immediately');
set local role authenticated;
select is((select count(*) from public.clients where agency_id=(select agency from organization_fixture)),0::bigint,'RLS removes read access after revocation');
reset role;

select * from finish();
rollback;
