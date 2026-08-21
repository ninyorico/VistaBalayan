-- Removes an establishment staff profile through a verified security-definer RPC.
-- This avoids client-side RLS/update-returning edge cases where PostgREST can
-- return an empty updated row set even though the officer clicked a visible user.

create or replace function public.remove_officer_user(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_profiles_removed integer := 0;
  v_auth_users_deleted integer := 0;
begin
  if not public.is_municipal_officer() then
    raise exception 'Only municipal officers can remove users';
  end if;

  if p_user_id is null then
    raise exception 'User id is required';
  end if;

  select *
    into v_profile
    from public.profiles
   where id = p_user_id;

  if not found then
    raise exception 'User profile was not found';
  end if;

  if v_profile.role = 'municipal_officer' then
    raise exception 'Municipal officer accounts cannot be removed from this screen';
  end if;

  update public.profiles
     set status = 'inactive',
         establishment_id = null
   where id = p_user_id
     and role = 'establishment_staff';
  get diagnostics v_profiles_removed = row_count;

  if v_profiles_removed <> 1 then
    raise exception 'Failed to remove user profile';
  end if;

  if to_regclass('auth.users') is not null then
    delete from auth.users where id = p_user_id;
    get diagnostics v_auth_users_deleted = row_count;
  end if;

  return jsonb_build_object(
    'profiles_removed', v_profiles_removed,
    'auth_users_deleted', v_auth_users_deleted
  );
end;
$$;

grant execute on function public.remove_officer_user(uuid) to authenticated;
