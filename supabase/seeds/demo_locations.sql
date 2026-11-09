-- Approximate map pins for the demo listings: the centre of each neighbourhood, labelled as approximate.
-- Admins replace them with the exact pin from Property > Location pin.
insert into public.listing_locations (listing_id, lat, lng, address, updated_at)
select l.id, v.lat, v.lng, v.area || ', Kampala (approximate pin for the area)', now() from (values
  ('Bukoto Family Flat', 'Bukoto', 0.3497, 32.5957),
  ('Kansanga Student Lodge', 'Kansanga', 0.2903, 32.6058),
  ('Kikoni Scholars Hostel', 'Kikoni', 0.3365, 32.5635),
  ('Kololo Serviced Suites', 'Kololo', 0.3330, 32.5930),
  ('Makerere Heights Residence', 'Makerere', 0.3358, 32.5683),
  ('Munyonyo Lakeside Stay', 'Munyonyo', 0.2502, 32.6236),
  ('Muyenga Hill Studio', 'Muyenga', 0.2965, 32.6145),
  ('Najjera Budget Rooms', 'Najjera', 0.3800, 32.6370),
  ('Nakasero Business Stay', 'Nakasero', 0.3240, 32.5800),
  ('Ntinda Garden Apartments', 'Ntinda', 0.3540, 32.6150),
  ('Wandegeya Court Hostel', 'Wandegeya', 0.3310, 32.5720)
) as v(name, area, lat, lng) join public.listings l on l.name = v.name
on conflict (listing_id) do nothing;
