-- Real photos of Kampala buildings (Wikimedia Commons, freely licensed; credits are on the landing page footer)
-- for the demo listings. Admins and owners replace them from their dashboards.
insert into public.listing_media (listing_id, type, url, sort_order)
select l.id, 'photo', v.url, 0 from (values
  ('Bukoto Family Flat', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/Apartment_block_in_kololo_Kampala.jpg/1280px-Apartment_block_in_kololo_Kampala.jpg'),
  ('Kansanga Student Lodge', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/49/Students_hostels_in_Katanga.JPG/1280px-Students_hostels_in_Katanga.JPG'),
  ('Kikoni Scholars Hostel', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/74/Makerere%2C_Kikoni.jpg/1280px-Makerere%2C_Kikoni.jpg'),
  ('Kololo Serviced Suites', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dc/Apartments_Found_In_Kololo.jpg/1280px-Apartments_Found_In_Kololo.jpg'),
  ('Makerere Heights Residence', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5e/Shopping_Arcade%2C_Apartments%2C_KAMPALA%2C_Uganda.jpg/1280px-Shopping_Arcade%2C_Apartments%2C_KAMPALA%2C_Uganda.jpg'),
  ('Munyonyo Lakeside Stay', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/68/A_mansion_in_Uganda.jpg/1280px-A_mansion_in_Uganda.jpg'),
  ('Muyenga Hill Studio', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/27/Apartments_in_Kampala_City%2C_Uganda.jpg/1280px-Apartments_in_Kampala_City%2C_Uganda.jpg'),
  ('Nakasero Business Stay', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/25/Uganda-Development.JPG/1280px-Uganda-Development.JPG'),
  ('Ntinda Garden Apartments', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/09/Good_Looking_Homeland.jpg/1280px-Good_Looking_Homeland.jpg'),
  ('Wandegeya Court Hostel', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8b/Residence_in_Lower_Naguru.jpg/1280px-Residence_in_Lower_Naguru.jpg'),
  ('Najjera Budget Rooms', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b7/Over_the_roofs_of_Kamokya%2C_Kampala_%284331540123%29.jpg/1280px-Over_the_roofs_of_Kamokya%2C_Kampala_%284331540123%29.jpg')
) as v(name, url) join public.listings l on l.name = v.name
where not exists (select 1 from public.listing_media x where x.listing_id = l.id);
