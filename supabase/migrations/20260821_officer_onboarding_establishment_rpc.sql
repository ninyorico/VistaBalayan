-- Allows authenticated municipal officers to create the establishment part of
-- the combined staff + establishment onboarding flow without being blocked by
-- table RLS. The role check still happens inside the SECURITY DEFINER function.

create or replace function public.create_officer_onboarding_establishment(
  p_name text,
  p_type text,
  p_address text,
  p_contact_number text,
  p_total_rooms integer default 0,
  p_amenities text default '',
  p_status text default 'active'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_establishment_id uuid;
begin
  if not public.is_municipal_officer() then
    raise exception 'Only municipal officers can create establishments during onboarding';
  end if;

  if nullif(trim(p_name), '') is null
    or nullif(trim(p_address), '') is null
    or nullif(trim(p_contact_number), '') is null then
    raise exception 'Establishment name, address, and contact number are required';
  end if;

  insert into public.establishments (
    name,
    type,
    address,
    contact_number,
    total_rooms,
    amenities,
    status
  ) values (
    trim(p_name),
    coalesce(nullif(trim(p_type), ''), 'Hotel'),
    trim(p_address),
    trim(p_contact_number),
    greatest(coalesce(p_total_rooms, 0), 0),
    coalesce(p_amenities, ''),
    coalesce(nullif(trim(p_status), ''), 'active')
  )
  returning id into v_establishment_id;

  return v_establishment_id;
end;
$$;

grant execute on function public.create_officer_onboarding_establishment(text, text, text, text, integer, text, text) to authenticated;
