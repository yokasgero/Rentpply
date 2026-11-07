create or replace function public.create_rent_transfer(
  booking_uuid uuid,
  requested_price integer,
  available_from date,
  transfer_reason text
)
returns public.rent_transfers
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings%rowtype;
  listing_row public.listings%rowtype;
  transfer_row public.rent_transfers%rowtype;
  remaining_months integer;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  if requested_price <= 0 or length(trim(coalesce(transfer_reason, ''))) < 3 then
    raise exception 'Enter a positive price and a short reason';
  end if;

  select * into booking_row from public.bookings
  where id = booking_uuid and tenant_id = auth.uid() for update;
  if not found then raise exception 'This booking does not belong to your account'; end if;
  if booking_row.months <= 0 then raise exception 'Only monthly bookings can be transferred'; end if;
  if not exists (select 1 from public.payments p where p.reference = booking_row.reference and p.status = 'confirmed') then
    raise exception 'Only a confirmed, paid booking can be transferred';
  end if;
  if exists (select 1 from public.rent_transfers rt where rt.booking_id = booking_row.id and rt.status in ('listed', 'requested', 'approved')) then
    raise exception 'This booking already has an active transfer request';
  end if;

  remaining_months := greatest(0, ceil(((booking_row.start_date + make_interval(months => booking_row.months))::date - current_date)::numeric / 30.4)::integer);
  if remaining_months < 1 then raise exception 'This booking has no paid months remaining'; end if;
  if available_from < current_date then raise exception 'The available date must be today or later'; end if;

  select * into listing_row from public.listings where id = booking_row.listing_id;
  insert into public.rent_transfers (
    booking_id, listing_id, unit_id, room_code, months_left,
    price_per_month, available_from, reason, status
  ) values (
    booking_row.id, booking_row.listing_id, booking_row.unit_id, booking_row.room_code,
    remaining_months, requested_price, available_from, trim(transfer_reason), 'listed'
  ) returning * into transfer_row;

  update public.bookings set listed_for_transfer = true, transfer_price = requested_price,
    transfer_reason = trim(transfer_reason), transfer_from_date = available_from
  where id = booking_row.id;

  insert into public.notifications (user_id, type, title, message, data)
  values (listing_row.owner_id, 'rent_transfer_listed', 'Rent transfer listed',
    booking_row.tenant_name || ' listed room ' || booking_row.room_code || ' for transfer.',
    jsonb_build_object('transfer_id', transfer_row.id, 'listing_id', listing_row.id));

  return transfer_row;
end;
$$;

create or replace function public.request_rent_transfer(transfer_uuid uuid)
returns public.rent_transfer_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  transfer_row public.rent_transfers%rowtype;
  booking_row public.bookings%rowtype;
  listing_row public.listings%rowtype;
  requester public.profiles%rowtype;
  request_row public.rent_transfer_requests%rowtype;
  request_details text;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  select * into requester from public.profiles where id = auth.uid();
  if requester.role not in ('tenant', 'student') then raise exception 'Only tenants and students can request a transfer'; end if;

  select * into transfer_row from public.rent_transfers where id = transfer_uuid for update;
  if not found or transfer_row.status <> 'listed' then raise exception 'This transfer is no longer available'; end if;
  select * into booking_row from public.bookings where id = transfer_row.booking_id;
  if booking_row.tenant_id = auth.uid() then raise exception 'You cannot request your own transfer'; end if;
  if exists (select 1 from public.rent_transfer_requests where transfer_id = transfer_uuid and requester_id = auth.uid() and status = 'pending') then
    raise exception 'You already requested this transfer';
  end if;
  select * into listing_row from public.listings where id = transfer_row.listing_id;

  insert into public.rent_transfer_requests (transfer_id, requester_id, status)
  values (transfer_uuid, auth.uid(), 'pending') returning * into request_row;

  request_details := 'rent_transfer_request:' || request_row.id::text;
  insert into public.owner_requests (listing_id, kind, requester_name, details, status)
  values (transfer_row.listing_id, 'Rent transfer', requester.full_name, request_details, 'open');

  insert into public.notifications (user_id, type, title, message, data)
  values (listing_row.owner_id, 'rent_transfer_requested', 'Transfer request received',
    requester.full_name || ' requested room ' || transfer_row.room_code || '.',
    jsonb_build_object('transfer_id', transfer_uuid, 'request_id', request_row.id));

  return request_row;
end;
$$;

create or replace function public.resolve_rent_transfer_request(
  transfer_request_uuid uuid,
  approve_request boolean
)
returns public.rent_transfer_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.rent_transfer_requests%rowtype;
  transfer_row public.rent_transfers%rowtype;
  listing_row public.listings%rowtype;
  next_status text;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  select * into request_row from public.rent_transfer_requests where id = transfer_request_uuid for update;
  if not found then raise exception 'Transfer request not found'; end if;
  select * into transfer_row from public.rent_transfers where id = request_row.transfer_id for update;
  select * into listing_row from public.listings where id = transfer_row.listing_id;
  if not public.is_admin() and listing_row.owner_id <> auth.uid() then
    raise exception 'Only this property owner or an administrator can decide the request';
  end if;
  if request_row.status <> 'pending' or transfer_row.status not in ('listed', 'requested') then
    raise exception 'This transfer request has already been resolved';
  end if;

  next_status := case when approve_request then 'approved' else 'declined' end;
  update public.rent_transfer_requests set status = next_status where id = transfer_request_uuid returning * into request_row;
  if approve_request then
    update public.rent_transfers set status = 'requested' where id = transfer_row.id;
  end if;
  update public.owner_requests set status = next_status, resolved_at = now()
    where listing_id = transfer_row.listing_id and details = 'rent_transfer_request:' || request_row.id::text;

  insert into public.notifications (user_id, type, title, message, data)
  values (request_row.requester_id, 'rent_transfer_' || next_status,
    case when approve_request then 'Owner approved your request' else 'Owner declined your request' end,
    case when approve_request then 'The owner approved your request to continue the transfer. Contact them to complete the arrangement.' else 'The owner declined your request for this transfer.' end,
    jsonb_build_object('transfer_id', transfer_row.id, 'request_id', request_row.id));

  return request_row;
end;
$$;

revoke all on function public.create_rent_transfer(uuid, integer, date, text) from public, anon;
grant execute on function public.create_rent_transfer(uuid, integer, date, text) to authenticated;
revoke all on function public.request_rent_transfer(uuid) from public, anon;
grant execute on function public.request_rent_transfer(uuid) to authenticated;
revoke all on function public.resolve_rent_transfer_request(uuid, boolean) from public, anon;
grant execute on function public.resolve_rent_transfer_request(uuid, boolean) to authenticated;
