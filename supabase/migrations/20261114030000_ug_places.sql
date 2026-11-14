-- Every place in Uganda from the 2024 National Population and Housing Census (UBOS, sub-county profiles, Table 1):
-- district (or city) > county (or division) > sub-county (or town council) > parish (or ward), with population.
-- The rows are loaded from supabase/seeds/ug_places.tsv by supabase/seeds/load_ug_places.sql.
create extension if not exists pg_trgm with schema extensions;

create table if not exists public.places (
  id integer primary key,
  level smallint not null check (level between 0 and 3),
  kind text not null check (kind in ('district', 'county', 'subcounty', 'parish')),
  parent_id integer references public.places (id),
  district_id integer references public.places (id),
  county_id integer references public.places (id),
  subcounty_id integer references public.places (id),
  region text check (region in ('Central', 'Eastern', 'Northern', 'Western')),
  name text not null,
  census_name text not null,
  population_male integer,
  population_female integer,
  population integer,
  source text not null default 'UBOS NPHC 2024'
);
create index if not exists places_parent_idx on public.places (parent_id);
create index if not exists places_district_idx on public.places (district_id);
create index if not exists places_name_trgm_idx on public.places using gin (lower(name) extensions.gin_trgm_ops);

-- Public reference data: anyone may read it, only the database (service role, migrations) may change it.
alter table public.places enable row level security;
drop policy if exists places_read on public.places;
create policy places_read on public.places for select to anon, authenticated using (true);
revoke insert, update, delete on public.places from anon, authenticated;

-- Search by name. Exact names first, then names that start with the text, then bigger areas, then bigger populations.
create or replace function public.search_places(q text, max_results integer default 8)
returns table (id integer, level smallint, kind text, name text, region text, district text, county text, subcounty text, population integer)
language sql stable set search_path = public, extensions as $$
  with s as (select lower(btrim(q)) as t)
  select p.id, p.level, p.kind, p.name, p.region, d.name, c.name, sc.name, p.population
  from s cross join public.places p
  left join public.places d on d.id = p.district_id
  left join public.places c on c.id = p.county_id
  left join public.places sc on sc.id = p.subcounty_id
  where length(s.t) >= 2
    and lower(p.name) like '%' || replace(replace(replace(s.t, '\', '\\'), '%', '\%'), '_', '\_') || '%'
  order by lower(p.name) = s.t desc,
           lower(p.name) like replace(replace(replace(s.t, '\', '\\'), '%', '\%'), '_', '\_') || '%' desc,
           p.level, p.population desc nulls last
  limit least(greatest(coalesce(max_results, 8), 1), 25);
$$;
revoke all on function public.search_places(text, integer) from public;
grant execute on function public.search_places(text, integer) to anon, authenticated;
