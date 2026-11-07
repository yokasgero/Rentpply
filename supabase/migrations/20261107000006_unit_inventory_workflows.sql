create or replace function public.set_unit_status(unit_uuid uuid, desired_status public.unit_status)
returns public.units
language plpgsql
security definer
set search_path = public
as $$
declare
  unit_row public.units%rowtype;
begin
  select * into unit_row from public.units where id = unit_uuid for update;
  if not found then
    raise exception 'Room not found';
  end if;
  if not public.is_admin() and not public.is_listing_owner(unit_row.listing_id) then
    raise exception 'Only the property owner or an administrator can update this room';
  end if;

  update public.units
  set status = desired_status, updated_at = now()
  where id = unit_uuid
  returning * into unit_row;

  update public.listings
  set total_units = (select count(*) from public.units where listing_id = unit_row.listing_id),
      available_units = (select count(*) from public.units where listing_id = unit_row.listing_id and status = 'vacant'),
      updated_at = now()
  where id = unit_row.listing_id;

  return unit_row;
end;
$$;

create or replace function public.create_listing_unit(
  listing_uuid uuid,
  requested_code text,
  requested_floor integer,
  requested_rent integer
)
returns public.units
language plpgsql
security definer
set search_path = public
as $$
declare
  unit_row public.units%rowtype;
begin
  if requested_code is null or length(trim(requested_code)) = 0 or requested_rent <= 0 then
    raise exception 'Room code and a positive rent are required';
  end if;
  if not public.is_admin() and not public.is_listing_owner(listing_uuid) then
    raise exception 'Only the property owner or an administrator can add a room';
  end if;

  insert into public.units (listing_id, unit_code, floor, rent, status)
  values (listing_uuid, trim(requested_code), coalesce(requested_floor, 0), requested_rent, 'vacant')
  returning * into unit_row;

  update public.listings
  set total_units = (select count(*) from public.units where listing_id = listing_uuid),
      available_units = (select count(*) from public.units where listing_id = listing_uuid and status = 'vacant'),
      updated_at = now()
  where id = listing_uuid;

  return unit_row;
end;
$$;

revoke all on function public.set_unit_status(uuid, public.unit_status) from public, anon;
grant execute on function public.set_unit_status(uuid, public.unit_status) to authenticated;
revoke all on function public.create_listing_unit(uuid, text, integer, integer) from public, anon;
grant execute on function public.create_listing_unit(uuid, text, integer, integer) to authenticated;
