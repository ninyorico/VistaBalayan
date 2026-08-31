-- Backfill exact public listing map pins for VistaBalayan establishments.
-- Uses the compatibility marker stored in establishments.amenities because the live
-- VistaBalayan Supabase schema does not currently expose latitude/longitude columns.
-- Marker format consumed by the public site: [LOCATION_PIN:<latitude>,<longitude>]

begin;

with pin_updates(name, latitude, longitude) as (
  values
    ('Altina Beach House Resort', 13.9345996::numeric, 120.7362971::numeric),
    ('Aurora Resort', 13.9455882::numeric, 120.711106::numeric),
    ('Espineli Inn and Pavilion', 13.9407521::numeric, 120.7280871::numeric),
    ('Henaida', 13.9282729::numeric, 120.716604::numeric),
    ('Hotel Casa Ilustre', 13.9504005::numeric, 120.7299843::numeric),
    ('Kalika Balayan', 13.9511297::numeric, 120.6834398::numeric),
    ('King & Queen Resorts', 13.9475094::numeric, 120.7091793::numeric),
    ('La Georgina Resorts', 13.9444017::numeric, 120.7599171::numeric),
    ('La Jamayca Resort', 13.9231998::numeric, 120.7076709::numeric),
    ('La Piscina Resort', 13.9421314::numeric, 120.7397857::numeric),
    ('Magsino Chokdee Farm', 13.9648288::numeric, 120.7624942::numeric),
    ('Malabanan Swimming Pool', 13.9425817::numeric, 120.7362508::numeric),
    ('My Place Resort', 13.9465681::numeric, 120.7501423::numeric),
    ('Palayan Inn', 13.94481::numeric, 120.7105529::numeric),
    ('Soggiorno Lorenzana', 13.9517933::numeric, 120.6822078::numeric),
    ('Soler Sea Resort', 13.9299726::numeric, 120.7625559::numeric),
    ('Souq Salamanca', 13.9454597::numeric, 120.6665522::numeric),
    ('Summer8 Resort', 13.9447157::numeric, 120.7397152::numeric),
    ('Valentino''s Hotel', 13.9607313::numeric, 120.726657::numeric),
    ('Viktoria Garden Resort', 13.9330076::numeric, 120.7221941::numeric),
    ('Villa Beadoy Resorts and Pavilion', 13.9441293::numeric, 120.7403224::numeric),
    ('Villa Casa Mia', 13.974437::numeric, 120.7632905::numeric),
    ('Villa Scarlet Garden Resort', 13.94959::numeric, 120.6992248::numeric)
), prepared as (
  select
    e.id,
    e.name,
    case
      when coalesce(e.amenities, '') ~ '\[LOCATION_PIN:-?\d+(\.\d+)?,-?\d+(\.\d+)?\]'
        then regexp_replace(
          coalesce(e.amenities, ''),
          '\[LOCATION_PIN:-?\d+(\.\d+)?,-?\d+(\.\d+)?\]',
          '[LOCATION_PIN:' || p.latitude::text || ',' || p.longitude::text || ']'
        )
      when nullif(trim(coalesce(e.amenities, '')), '') is null
        then '[LOCATION_PIN:' || p.latitude::text || ',' || p.longitude::text || ']'
      else trim(e.amenities) || E'\n[LOCATION_PIN:' || p.latitude::text || ',' || p.longitude::text || ']'
    end as new_amenities
  from establishments e
  join pin_updates p on p.name = e.name
  where e.status = 'active'
)
update establishments e
set amenities = prepared.new_amenities,
    updated_at = now()
from prepared
where e.id = prepared.id
returning e.id, e.name, e.amenities;

-- Readback check for the rows this script changes:
select e.id, e.name, e.amenities
from establishments e
join pin_updates p on p.name = e.name
where e.status = 'active'
order by e.name;

commit;

-- Not included because no exact Google Maps place coordinates could be verified:
-- Bertusort, Chrisova Resort, Meraviglia Lodge.
