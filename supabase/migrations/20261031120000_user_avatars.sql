-- Personal profile photos. Objects live under the owner's user id with
-- immutable random names, mirroring the agency logo pattern.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types) values
  ('user-avatars', 'user-avatars', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create policy "user_avatar_insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "user_avatar_delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- A profile may only point at an object inside its own folder.
alter table public.user_profiles
  add constraint user_profiles_avatar_path_owned check (
    avatar_path is null
    or avatar_path ~ ('^' || id::text || '/[0-9a-f-]{36}\.(png|jpg|webp)$')
  ) not valid;

create function public.update_user_avatar(
  p_avatar_path text, p_expected_avatar_path text
) returns void language plpgsql security definer set search_path = '' as $$
declare v_previous text;
begin
  if auth.uid() is null then
    raise exception 'Avatar access denied' using errcode = '42501';
  end if;
  select avatar_path into v_previous from public.user_profiles
  where id = auth.uid() for update;
  if not found then raise exception 'Profile not found' using errcode = 'P0002'; end if;
  if v_previous is distinct from p_expected_avatar_path then
    raise exception 'Avatar changed; refresh and try again' using errcode = '40001';
  end if;
  if p_avatar_path is not null and (
    p_avatar_path !~ ('^' || auth.uid()::text || '/[0-9a-f-]{36}\.(png|jpg|webp)$')
    or not exists(
      select 1 from storage.objects
      where bucket_id = 'user-avatars' and name = p_avatar_path
    )
  ) then raise exception 'Invalid avatar' using errcode = '22023'; end if;
  if v_previous is not distinct from p_avatar_path then return; end if;
  update public.user_profiles
  set avatar_path = p_avatar_path, updated_at = now()
  where id = auth.uid();
end;
$$;
revoke all on function public.update_user_avatar(text,text) from public, anon;
grant execute on function public.update_user_avatar(text,text) to authenticated;
