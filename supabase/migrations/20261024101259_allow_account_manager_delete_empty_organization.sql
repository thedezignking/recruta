-- Allow a recruiter to clean up an empty organization when they are its
-- assigned account manager. Broader organization deletion remains restricted.
create or replace function public.delete_empty_client(
  p_client_id uuid,
  p_request_id_header text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client public.clients;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into v_client from public.clients where id = p_client_id for update;
  if v_client.id is null then raise exception 'organization_not_found'; end if;
  if not (
    private.has_agency_role(
      v_client.agency_id, array['owner','administrator','recruitment_manager']
    )
    or (
      private.has_agency_role(v_client.agency_id, array['recruiter'])
      and v_client.account_manager_id = auth.uid()
    )
  ) then raise exception 'permission_denied'; end if;
  if exists (select 1 from public.jobs j where j.client_id = v_client.id)
    or exists (select 1 from public.hiring_requests r where r.client_id = v_client.id)
  then raise exception 'organization_has_activity'; end if;

  delete from public.clients where id = v_client.id;
  insert into public.activity_events (
    agency_id, actor_user_id, event_type, entity_type, entity_id, request_id, metadata
  ) values (
    v_client.agency_id, auth.uid(), 'organization.deleted', 'client', v_client.id,
    nullif(left(trim(p_request_id_header), 200), ''),
    jsonb_build_object('name', v_client.name)
  );
  return v_client.id;
end;
$$;

revoke all on function public.delete_empty_client(uuid,text) from public, anon;
grant execute on function public.delete_empty_client(uuid,text) to authenticated;
