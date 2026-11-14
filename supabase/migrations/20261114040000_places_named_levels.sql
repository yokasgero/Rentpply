-- Each place row also carries the names of its district, county, sub-county and parish,
-- so the table reads like the census spreadsheet (district > county > sub-county > parish).
alter table public.places
  add column if not exists district text,
  add column if not exists county text,
  add column if not exists subcounty text,
  add column if not exists parish text;

update public.places p set
  district  = case when p.level = 0 then p.name else d.name end,
  county    = case when p.level = 1 then p.name else c.name end,
  subcounty = case when p.level = 2 then p.name else s.name end,
  parish    = case when p.level = 3 then p.name end
from public.places x
left join public.places d on d.id = x.district_id
left join public.places c on c.id = x.county_id
left join public.places s on s.id = x.subcounty_id
where x.id = p.id;

comment on table public.places is 'Every place in Uganda from the 2024 census (UBOS NPHC 2024, sub-county profiles, Table 1), in the same order as the spreadsheet: district > county > sub-county > parish, with population.';
