-- VistaBalayan: secure Supabase objects flagged as unrestricted.
--
-- Screenshot flagged:
--   - establishment_rating_reviews
--   - establishment_rating_summaries
--   - staff
--
-- Security model:
--   1. Rating summaries/reviews stay readable by the public app, but as
--      SECURITY INVOKER views so they no longer bypass underlying table RLS.
--   2. The raw establishment_ratings table keeps RLS enabled and grants only
--      the safe columns needed by the public views. Visitor token hashes remain
--      non-readable to anon/authenticated roles.
--   3. The legacy public.staff object is locked down. The current frontend does
--      not query public.staff; portal accounts use public.profiles with role =
--      establishment_staff, so public.staff should not remain open.

begin;

-- Keep helper available for rateable-establishment checks.
create extension if not exists pgcrypto;

-- Raw ratings must be protected by RLS. Public writes go through the locked RPC.
alter table if exists public.establishment_ratings enable row level security;

revoke all on table public.establishment_ratings from anon, authenticated;

drop policy if exists "Public can read sanitized active establishment ratings" on public.establishment_ratings;
create policy "Public can read sanitized active establishment ratings"
  on public.establishment_ratings
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.establishments e
      where e.id = establishment_ratings.establishment_id
        and e.status = 'active'
        and (
          lower(e.type) like '%hotel%'
          or lower(e.type) like '%inn%'
          or lower(e.type) like '%lodge%'
          or lower(e.type) like '%resort%'
          or lower(e.type) like '%pool%'
          or lower(e.type) like '%farm%'
        )
    )
  );

-- Column-level grants: enough for the public aggregate/review views, but not
-- visitor_token_hash or other raw visitor-identifying fields.
grant select (establishment_id, rating, reviewer_name, comment, created_at)
  on public.establishment_ratings to anon, authenticated;

-- Recreate public views as security invoker so Supabase does not treat them as
-- unrestricted/security-definer views. They still expose only sanitized fields.
drop view if exists public.establishment_rating_summaries;
create view public.establishment_rating_summaries
with (security_invoker = true)
as
select
  ratings.establishment_id,
  round(avg(ratings.rating)::numeric, 1)::float as average_rating,
  count(*)::integer as rating_count,
  count(*) filter (where ratings.rating = 1)::integer as one_star_count,
  count(*) filter (where ratings.rating = 2)::integer as two_star_count,
  count(*) filter (where ratings.rating = 3)::integer as three_star_count,
  count(*) filter (where ratings.rating = 4)::integer as four_star_count,
  count(*) filter (where ratings.rating = 5)::integer as five_star_count,
  count(nullif(trim(ratings.comment), ''))::integer as comment_count
from public.establishment_ratings ratings
join public.establishments establishments
  on establishments.id = ratings.establishment_id
where establishments.status = 'active'
  and (
    lower(establishments.type) like '%hotel%'
    or lower(establishments.type) like '%inn%'
    or lower(establishments.type) like '%lodge%'
    or lower(establishments.type) like '%resort%'
    or lower(establishments.type) like '%pool%'
    or lower(establishments.type) like '%farm%'
  )
group by ratings.establishment_id;

revoke all on public.establishment_rating_summaries from public;
grant select on public.establishment_rating_summaries to anon, authenticated;

drop view if exists public.establishment_rating_reviews;
create view public.establishment_rating_reviews
with (security_invoker = true)
as
select
  ratings.establishment_id,
  ratings.rating,
  ratings.reviewer_name,
  nullif(trim(ratings.comment), '') as comment,
  ratings.created_at
from public.establishment_ratings ratings
join public.establishments establishments
  on establishments.id = ratings.establishment_id
where establishments.status = 'active'
  and (
    lower(establishments.type) like '%hotel%'
    or lower(establishments.type) like '%inn%'
    or lower(establishments.type) like '%lodge%'
    or lower(establishments.type) like '%resort%'
    or lower(establishments.type) like '%pool%'
    or lower(establishments.type) like '%farm%'
  );

revoke all on public.establishment_rating_reviews from public;
grant select on public.establishment_rating_reviews to anon, authenticated;

-- Make the rating submit RPC remain the only public write path.
revoke all on function public.submit_establishment_rating(uuid, text, integer, text, text) from public;
grant execute on function public.submit_establishment_rating(uuid, text, integer, text, text) to anon, authenticated;

-- Lock down legacy public.staff object if it exists. If it is a table, enable
-- RLS and leave no anon/authenticated direct access. If it is a view, remove
-- direct grants. This is intentionally conservative because the app uses
-- public.profiles.role='establishment_staff', not public.staff.
do $$
begin
  if to_regclass('public.staff') is not null then
    if exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'staff'
        and c.relkind in ('r', 'p')
    ) then
      execute 'alter table public.staff enable row level security';
      execute 'revoke all on table public.staff from anon, authenticated';
    elsif exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'staff'
        and c.relkind in ('v', 'm')
    ) then
      execute 'revoke all on public.staff from anon, authenticated';
    end if;
  end if;
end $$;

commit;
