-- Reserve a room for a named person, from the Units page.
-- Before this, a room could only show who it was held for if it went through the Board with a payment, and the plain
-- "Reserved" status recorded nobody. Switching a reserved room back to vacant also left the old name on it.

-- 1. Who a room is held for: their name stays in tenant_name (as the Board already does); these hold the rest.
alter table public.units
  add column if not exists reserved_phone text,
  add column if not exists reserved_move_in date,
  add column if not exists reserved_at timestamptz; -- set only for a reservation made on the Units page

-- Is the room held by an open entry on the Board (someone onboarded who has not paid in full)?
create or replace function public.unit_on_board(unit_uuid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.board_entries where unit_id = unit_uuid and status in ('unpaid', 'booked'));
$$;
revoke all on function public.unit_on_board(uuid) from public, anon, authenticated;

-- 2. Reserve (or change the reservation of) a room for a person. The owner of the property or an admin only.
create or replace function public.reserve_unit(unit_uuid uuid, holder_name text, holder_phone text default null, move_in date default null)
returns public.units language plpgsql security definer set search_path = public as $$
declare unit_row public.units%rowtype;
begin
  select * into unit_row from public.units where id = unit_uuid for update;
  if not found then raise exception 'Room not found'; end if;
  if not public.is_admin() and not public.is_listing_owner(unit_row.listing_id) then
    raise exception 'Only the property owner or an administrator can reserve this room';
  end if;
  if unit_row.status = 'occupied' then raise exception 'Room % has a tenant. Mark it vacant first.', unit_row.unit_code; end if;
  if public.unit_on_board(unit_uuid) then raise exception 'Room % is held on the Board. Change it there.', unit_row.unit_code; end if;
  if length(trim(coalesce(holder_name, ''))) < 2 then raise exception 'Enter the name of the person the room is reserved for'; end if;
  if nullif(trim(coalesce(holder_phone, '')), '') is not null and length(regexp_replace(holder_phone, '\D', '', 'g')) < 9 then
    raise exception 'Enter a full phone number, or leave it empty';
  end if;

  update public.units set
    status = 'reserved', tenant_id = null, tenant_name = trim(holder_name), roommate_id = null, roommate_name = null,
    reserved_phone = nullif(trim(coalesce(holder_phone, '')), ''), reserved_move_in = move_in, reserved_at = now(),
    payment_status = 'paid', balance = 0, paid_through = null, updated_at = now()
  where id = unit_uuid returning * into unit_row;

  update public.listings set available_units = (select count(*) from public.units where listing_id = unit_row.listing_id and status = 'vacant'), updated_at = now()
  where id = unit_row.listing_id;
  return unit_row;
end; $$;
revoke all on function public.reserve_unit(uuid, text, text, date) from public, anon;
grant execute on function public.reserve_unit(uuid, text, text, date) to authenticated;

-- 3. Changing a room's status. A reserved room going back to vacant (or to repairs) lets go of the person it was held
--    for; moving in keeps their name as the tenant. A room held on the Board is changed on the Board, so the Board and
--    the room never disagree.
create or replace function public.set_unit_status(unit_uuid uuid, desired_status public.unit_status)
returns public.units language plpgsql security definer set search_path = public as $$
declare unit_row public.units%rowtype;
begin
  select * into unit_row from public.units where id = unit_uuid for update;
  if not found then raise exception 'Room not found'; end if;
  if not public.is_admin() and not public.is_listing_owner(unit_row.listing_id) then
    raise exception 'Only the property owner or an administrator can update this room';
  end if;
  if desired_status is distinct from unit_row.status and public.unit_on_board(unit_uuid) then
    raise exception 'Room % is held on the Board. Change it there.', unit_row.unit_code;
  end if;

  if unit_row.status = 'reserved' and desired_status in ('vacant', 'maint') then
    update public.units set status = desired_status, tenant_id = null, tenant_name = null, roommate_id = null, roommate_name = null,
      reserved_phone = null, reserved_move_in = null, reserved_at = null, payment_status = 'paid', balance = 0, paid_through = null, updated_at = now()
    where id = unit_uuid returning * into unit_row;
  elsif desired_status <> 'reserved' then
    update public.units set status = desired_status, reserved_phone = null, reserved_move_in = null, reserved_at = null, updated_at = now()
    where id = unit_uuid returning * into unit_row;
  else
    update public.units set status = desired_status, updated_at = now() where id = unit_uuid returning * into unit_row;
  end if;

  update public.listings set
    total_units = (select count(*) from public.units where listing_id = unit_row.listing_id),
    available_units = (select count(*) from public.units where listing_id = unit_row.listing_id and status = 'vacant'),
    updated_at = now()
  where id = unit_row.listing_id;
  return unit_row;
end; $$;
revoke all on function public.set_unit_status(uuid, public.unit_status) from public, anon;
grant execute on function public.set_unit_status(uuid, public.unit_status) to authenticated;

-- 4. The Board: a room reserved on the Units page can be onboarded when the person pays (it is no longer only vacant
--    rooms). Once the Board takes over, the Units-page reservation details are cleared.
create or replace function public.board_apply(entry_uuid uuid)
returns public.board_entries language plpgsql security definer set search_path = public as $$
declare e public.board_entries%rowtype; total_paid integer; next_status text;
begin
  select * into e from public.board_entries where id = entry_uuid for update;
  select coalesce(sum(amount), 0) into total_paid from public.board_payments where entry_id = e.id;
  next_status := case when e.status = 'cancelled' then 'cancelled' when total_paid <= 0 then 'unpaid' when total_paid < e.total then 'booked' else 'full' end;
  update public.board_entries set paid = total_paid, status = next_status, updated_at = now() where id = e.id returning * into e;
  if next_status = 'booked' then
    update public.units set status = 'reserved', tenant_id = null, tenant_name = e.tenant_name, roommate_id = null,
      roommate_name = case when e.has_roommate then 'Roommate' else null end, payment_status = 'due', balance = e.total - e.paid, paid_through = null,
      reserved_phone = null, reserved_move_in = null, reserved_at = null, updated_at = now()
    where id = e.unit_id;
  elsif next_status = 'full' then
    update public.units set status = 'occupied', tenant_id = null, tenant_name = e.tenant_name, roommate_id = null,
      roommate_name = case when e.has_roommate then 'Roommate' else null end, payment_status = 'paid', balance = 0,
      paid_through = e.start_date + make_interval(months => e.months), months_paid_ytd = e.months,
      reserved_phone = null, reserved_move_in = null, reserved_at = null, updated_at = now()
    where id = e.unit_id;
  end if;
  update public.listings set available_units = (select count(*) from public.units where listing_id = e.listing_id and status = 'vacant'), updated_at = now() where id = e.listing_id;
  return e;
end; $$;
revoke all on function public.board_apply(uuid) from public, anon, authenticated;

create or replace function public.board_onboard(listing_uuid uuid, unit_uuid uuid, tenant_name text, tenant_phone text, has_roommate boolean, stay_months integer, start_on date, first_amount integer, first_method text, booking_fee boolean)
returns public.board_entries language plpgsql security definer set search_path = public as $$
declare listing_row public.listings%rowtype; unit_row public.units%rowtype; e public.board_entries%rowtype;
begin
  if not public.is_admin() and not public.is_listing_owner(listing_uuid) then raise exception 'Only the property owner can onboard tenants'; end if;
  select * into listing_row from public.listings where id = listing_uuid;
  if listing_row.per <> 'month' then raise exception 'The board is for monthly stays'; end if;
  select * into unit_row from public.units where id = unit_uuid and listing_id = listing_uuid for update;
  if not found then raise exception 'Room not found'; end if;
  -- vacant rooms, and rooms reserved for someone on the Units page
  if not (unit_row.status = 'vacant' or (unit_row.status = 'reserved' and unit_row.reserved_at is not null)) then raise exception 'Room % is not vacant', unit_row.unit_code; end if;
  if exists (select 1 from public.board_entries where unit_id = unit_uuid and status in ('unpaid', 'booked')) then raise exception 'Room % already has someone on the board', unit_row.unit_code; end if;
  if length(trim(coalesce(tenant_name, ''))) < 2 then raise exception 'Enter the tenant name'; end if;
  if length(regexp_replace(coalesce(tenant_phone, ''), '\D', '', 'g')) < 9 then raise exception 'Enter a phone number'; end if;
  if stay_months is null or stay_months < 1 or stay_months > 24 then raise exception 'Months must be between 1 and 24'; end if;
  if start_on is null then raise exception 'Choose a start date'; end if;
  if coalesce(first_amount, 0) < 0 then raise exception 'The amount cannot be negative'; end if;
  if coalesce(first_amount, 0) > listing_row.price * stay_months then raise exception 'That is more than the total rent'; end if;
  insert into public.board_entries (listing_id, unit_id, unit_code, tenant_name, phone, has_roommate, months, start_date, rent, total, created_by)
  values (listing_uuid, unit_uuid, unit_row.unit_code, trim(tenant_name), trim(tenant_phone), coalesce(has_roommate, false), stay_months, start_on, listing_row.price, listing_row.price * stay_months, auth.uid())
  returning * into e;
  if coalesce(first_amount, 0) > 0 then
    insert into public.board_payments (entry_id, amount, method, is_booking_fee, recorded_by) values (e.id, first_amount, coalesce(nullif(trim(first_method), ''), 'Cash'), coalesce(booking_fee, false), auth.uid());
  end if;
  return public.board_apply(e.id);
end; $$;
revoke all on function public.board_onboard(uuid, uuid, text, text, boolean, integer, date, integer, text, boolean) from public, anon;
grant execute on function public.board_onboard(uuid, uuid, text, text, boolean, integer, date, integer, text, boolean) to authenticated;
