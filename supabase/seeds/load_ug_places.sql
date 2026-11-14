-- Loads supabase/seeds/ug_places.tsv (2024 census, UBOS) into public.places, straight from the GitHub repository.
-- Run step 1, wait a few seconds, then run step 2 with the request id step 1 returned. Safe to run again.

-- Step 1: download the file.
select net.http_get(
  url := 'https://raw.githubusercontent.com/yokasgero/Rentpply/main/supabase/seeds/ug_places.tsv',
  timeout_milliseconds := 60000
) as request_id;

-- Step 2: put the request id from step 1 in place of 0 below, then run everything under this line.
with f as (select content from net._http_response where id = 0 and status_code = 200),
lines as (
  select string_to_array(t.l, E'\t') as c
  from f, unnest(string_to_array(f.content, E'\n')) with ordinality as t(l, n)
  where t.n > 1 and t.l <> ''
)
insert into public.places (id, level, kind, parent_id, region, name, census_name, population_male, population_female, population)
select c[1]::int, c[2]::smallint, (array['district', 'county', 'subcounty', 'parish'])[c[2]::int + 1], nullif(c[3], '')::int,
       nullif(c[4], ''), c[5], c[6], c[7]::int, c[8]::int, c[9]::int
from lines
order by c[2]::int, c[1]::int
on conflict (id) do update set level = excluded.level, kind = excluded.kind, parent_id = excluded.parent_id, region = excluded.region,
  name = excluded.name, census_name = excluded.census_name, population_male = excluded.population_male,
  population_female = excluded.population_female, population = excluded.population;

-- Shortcuts from each place to its district, county and sub-county.
update public.places set district_id = parent_id, county_id = null, subcounty_id = null where level = 1;
update public.places p set district_id = c.parent_id, county_id = p.parent_id, subcounty_id = null
  from public.places c where p.level = 2 and c.id = p.parent_id;
update public.places p set district_id = s.district_id, county_id = s.parent_id, subcounty_id = p.parent_id
  from public.places s where p.level = 3 and s.id = p.parent_id;
