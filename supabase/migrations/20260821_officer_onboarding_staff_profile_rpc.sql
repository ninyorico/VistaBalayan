-- Allows municipal officers to link a newly signed-up auth user to the
-- establishment created during the Add User onboarding flow. This supports
-- Supabase projects whose signup email template sends a confirmation link
-- instead of a visible OTP code.

create or replace function public.complete_officer_onboarding_staff_profile(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_establishment_id uuid,
  p_status text default 'active'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_municipal_officer() then
    raise exception 'Only municipal officers can complete staff onboarding';
  end if;

  if p_user_id is null
    or nullif(trim(p_email), '') is null
    or nullif(trim(p_full_name), '') is null
    or p_establishment_id is null then
    raise exception 'Staff user id, email, full name, and establishment are required';
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    establishment_id,
    status
  ) values (
    p_user_id,
    lower(trim(p_email)),
    trim(p_full_name),
    'establishment_staff',
    p_establishment_id,
    coalesce(nullif(trim(p_status), ''), 'active')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    establishment_id = excluded.establishment_id,
    status = excluded.status;
end;
$$;

grant execute on function public.complete_officer_onboarding_staff_profile(uuid, text, text, uuid, text) to authenticated;
