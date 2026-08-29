-- Add exact Google Maps pin coordinates for public establishment listings.
-- Staff can publish latitude/longitude from Manage Public Listing, and visitors
-- can open the exact pinned location from the public website.

alter table public.establishments
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

comment on column public.establishments.latitude is 'Exact public listing map pin latitude for visitor Google Maps links.';
comment on column public.establishments.longitude is 'Exact public listing map pin longitude for visitor Google Maps links.';
