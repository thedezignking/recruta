-- P0 catalog inspection only. Execute against the disposable LOCAL database.
-- This is not a migration, fixture, privilege repair, or hosted-data audit.
-- It reads catalogs only: no candidate/contact rows, keys, or provider settings.
begin transaction read only;
set local statement_timeout = '15s';

select current_database() as database_name,
       current_setting('server_version') as postgres_version,
       current_setting('transaction_read_only') as read_only;

-- Installed migration versions must match the source order in the P0 report.
select version, name
from supabase_migrations.schema_migrations
order by version;

-- Effective inherited table AND column privileges, not only explicit ACL text.
select r.rolname as role_name, n.nspname as schema_name, c.relname as relation_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as force_rls,
       has_table_privilege(r.oid, c.oid, 'SELECT') as table_select,
       has_any_column_privilege(r.oid, c.oid, 'SELECT') as any_column_select,
       has_table_privilege(r.oid, c.oid, 'INSERT') as table_insert,
       has_any_column_privilege(r.oid, c.oid, 'INSERT') as any_column_insert,
       has_table_privilege(r.oid, c.oid, 'UPDATE') as table_update,
       has_any_column_privilege(r.oid, c.oid, 'UPDATE') as any_column_update,
       has_table_privilege(r.oid, c.oid, 'DELETE') as table_delete
from pg_roles r
cross join pg_class c
join pg_namespace n on n.oid = c.relnamespace
where r.rolname in ('anon', 'authenticated', 'service_role')
  and n.nspname = 'public'
  and c.relkind in ('r', 'p', 'v')
  and c.relname in (
    'jobs', 'job_requirements', 'job_application_questions',
    'job_workflow_stages', 'job_assignments',
    'workflow_templates', 'workflow_stages'
  )
order by c.relname, r.rolname;

-- Per-column anonymous exposure catches added columns without read grants,
-- and private data accidentally covered by table-wide/inherited grants.
select c.relname as relation_name, a.attname as column_name,
       has_column_privilege('anon', c.oid, a.attnum, 'SELECT') as anon_select,
       has_column_privilege('authenticated', c.oid, a.attnum, 'INSERT') as authenticated_insert,
       has_column_privilege('authenticated', c.oid, a.attnum, 'UPDATE') as authenticated_update
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
where n.nspname = 'public'
  and c.relname in (
    'jobs', 'job_requirements', 'job_application_questions',
    'job_workflow_stages', 'job_assignments'
  )
order by c.relname, a.attnum;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'jobs', 'job_requirements', 'job_application_questions',
    'job_workflow_stages', 'job_assignments',
    'workflow_templates', 'workflow_stages'
  )
order by tablename, policyname;

-- Inspect all overloads and inherited/PUBLIC execute through has_function_privilege.
select n.nspname as schema_name, p.oid::regprocedure::text as signature,
       pg_get_userbyid(p.proowner) as owner_name,
       p.prosecdef as security_definer, p.proconfig as function_settings,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_execute,
       md5(pg_get_functiondef(p.oid)) as definition_md5
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private')
  and p.proname in (
    'create_manual_job', 'update_draft_job', 'publish_job', 'assign_job',
    'transition_job', 'delete_empty_manual_job', 'convert_hiring_request_to_job',
    'create_organization', 'is_active_agency_member', 'has_agency_role',
    'can_review_job', 'can_access_client_job', 'submit_public_application'
  )
  and p.prokind = 'f'
order by n.nspname, p.oid::regprocedure::text;

select c.relname as relation_name, t.tgname as trigger_name,
       pg_get_triggerdef(t.oid) as definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and not t.tgisinternal
  and c.relname in (
    'jobs', 'job_requirements', 'job_application_questions',
    'job_workflow_stages', 'job_assignments'
  )
order by c.relname, t.tgname;

-- Unexpected default ACLs can reintroduce write/execute exposure later.
select pg_get_userbyid(d.defaclrole) as owner_name,
       n.nspname as schema_name, d.defaclobjtype, d.defaclacl
from pg_default_acl d
left join pg_namespace n on n.oid = d.defaclnamespace
where n.nspname in ('public', 'private') or d.defaclnamespace = 0
order by owner_name, schema_name, defaclobjtype;

rollback;
