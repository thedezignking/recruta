-- Serialize logo edits and record branding changes in the audit trail.
create function public.update_agency_logo(
  p_agency_id uuid, p_logo_path text, p_expected_logo_path text, p_request_id text
) returns void language plpgsql security definer set search_path = '' as $$
declare v_previous text;
begin
  if auth.uid() is null or not private.has_agency_role(p_agency_id, array['owner','administrator']) then
    raise exception 'Logo access denied' using errcode = '42501';
  end if;
  select logo_path into v_previous from public.agencies where id = p_agency_id for update;
  if not found then raise exception 'Agency not found' using errcode = 'P0002'; end if;
  if v_previous is distinct from p_expected_logo_path then
    raise exception 'Logo changed; refresh and try again' using errcode = '40001';
  end if;
  if p_logo_path is not null and (
    p_logo_path !~ ('^' || p_agency_id::text || '/[0-9a-f-]{36}\.(png|jpg|webp)$')
    or not exists(select 1 from storage.objects where bucket_id = 'agency-logos' and name = p_logo_path)
  ) then raise exception 'Invalid agency logo' using errcode = '22023'; end if;
  if v_previous is not distinct from p_logo_path then return; end if;
  update public.agencies set logo_path = p_logo_path, updated_at = now() where id = p_agency_id;
  insert into public.activity_events(agency_id,actor_user_id,event_type,entity_type,entity_id,request_id,metadata)
  values(p_agency_id,auth.uid(),'agency.logo_updated','agency',p_agency_id,p_request_id,
    jsonb_build_object('previous_path',v_previous,'logo_path',p_logo_path));
end;
$$;
revoke all on function public.update_agency_logo(uuid,text,text,text) from public, anon;
grant execute on function public.update_agency_logo(uuid,text,text,text) to authenticated;
