-- Details a tenant gives during the ID check, and what a room's owner may see about the people in it.
alter table public.profiles add column if not exists university text;
alter table public.profiles add column if not exists study_year integer check (study_year between 1 and 8);
alter table public.profiles add column if not exists home_district text;

-- The tenant and roommate of one room, for the owner of that property or an administrator.
-- Leaves out sponsors, next of kin and documents.
create or replace function public.unit_tenant_details(unit_uuid uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  u public.units%rowtype;
  person jsonb;
  result jsonb := '[]'::jsonb;
  who record;
begin
  select * into u from public.units where id = unit_uuid;
  if not found then raise exception 'Room not found.'; end if;
  if not (public.is_admin() or public.is_listing_owner(u.listing_id)) then
    raise exception 'Only the owner of this property can see its tenants.';
  end if;
  for who in select * from (values (u.tenant_id, u.tenant_name, 'Main tenant', 1), (u.roommate_id, u.roommate_name, 'Roommate', 2)) as t(pid, pname, place, ord) order by ord loop
    continue when who.pid is null and coalesce(who.pname, '') = '';
    select jsonb_build_object(
      'place', who.place,
      'name', coalesce(p.full_name, who.pname),
      'student', coalesce(p.is_student, p.role = 'student', false),
      'kyc', coalesce(p.kyc_status, 'none'),
      'course', coalesce(p.course, rp.course),
      'year', coalesce(p.study_year, rp.year),
      'university', coalesce(p.university, p.college, rp.college),
      'home_district', p.home_district,
      'phone', p.phone,
      'on_rentpply', p.id is not null
    ) into person
    from (select 1) one
    left join public.profiles p on p.id = who.pid
    left join public.roommate_profiles rp on rp.user_id = who.pid;
    result := result || jsonb_build_array(person);
  end loop;
  return result;
end;
$$;
revoke all on function public.unit_tenant_details(uuid) from public, anon;
grant execute on function public.unit_tenant_details(uuid) to authenticated;
