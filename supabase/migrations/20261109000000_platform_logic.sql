-- Implements "Rentpply: Platform Logic" (Nov 2026).
-- 1. The admin owns all property content; owners cannot add, edit or delete it.
drop policy if exists listings_insert_owner on public.listings;
drop policy if exists listings_update_owner on public.listings;
drop policy if exists listings_delete_owner on public.listings;
drop policy if exists listing_media_insert_owner on public.listing_media;
drop policy if exists listing_media_delete_owner on public.listing_media;
drop policy if exists listing_locations_modify_owner on public.listing_locations;
drop policy if exists property_layouts_modify_owner on public.property_layouts;
drop policy if exists listing_amenities_modify_owner on public.listing_amenities;
drop policy if exists agreement_templates_modify_owner on public.agreement_templates;

-- Tenants read the agreement terms of verified properties (shown as the listing rules).
drop policy if exists agreement_templates_select_verified on public.agreement_templates;
create policy agreement_templates_select_verified on public.agreement_templates
  for select using (exists (select 1 from public.listings l where l.id = agreement_templates.listing_id and l.verified));

-- 2. Photos and videos for listing galleries: public to read, only the admin uploads or deletes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-media', 'listing-media', true, 52428800, array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists listing_media_files_read on storage.objects;
drop policy if exists listing_media_files_admin_insert on storage.objects;
drop policy if exists listing_media_files_admin_delete on storage.objects;
create policy listing_media_files_read on storage.objects for select using (bucket_id = 'listing-media');
create policy listing_media_files_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'listing-media' and public.is_admin());
create policy listing_media_files_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'listing-media' and public.is_admin());

-- 3. Owner requests carry structured data so approving one can act on it.
alter table public.owner_requests add column if not exists data jsonb not null default '{}'::jsonb;

-- 4. Viewing requests remember who asked, so the answer can reach them.
create or replace function public.request_viewing(listing_uuid uuid, preferred_day date, preferred_time text)
returns public.owner_requests language plpgsql security definer set search_path = public as $$
declare
  requester public.profiles%rowtype; listing_row public.listings%rowtype; request_row public.owner_requests%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  select * into requester from public.profiles where id = auth.uid();
  if requester.role not in ('tenant', 'student') then raise exception 'Only tenants and students can request a viewing'; end if;
  select * into listing_row from public.listings where id = listing_uuid and verified = true;
  if not found then raise exception 'This property is not available for viewing'; end if;
  if preferred_day < current_date or preferred_day > current_date + 60 then raise exception 'Choose a day within the next 60 days'; end if;
  if coalesce(trim(preferred_time), '') = '' or length(preferred_time) > 20 then raise exception 'Choose a time'; end if;
  if exists (select 1 from public.owner_requests where listing_id = listing_uuid and kind = 'Viewing request' and data ->> 'requester_id' = auth.uid()::text and status = 'open' and created_at > now() - interval '1 day')
  then raise exception 'You already asked to view this property today'; end if;
  insert into public.owner_requests (listing_id, kind, requester_name, details, status, data)
  values (listing_uuid, 'Viewing request', requester.full_name, 'Would like to view on ' || to_char(preferred_day, 'DD Mon YYYY') || ' at ' || trim(preferred_time), 'open',
    jsonb_build_object('requester_id', auth.uid(), 'day', preferred_day, 'time', trim(preferred_time)))
  returning * into request_row;
  insert into public.notifications (user_id, type, title, message, data)
  values (listing_row.owner_id, 'viewing_requested', 'Viewing request', requester.full_name || ' would like to view ' || listing_row.name || ' on ' || to_char(preferred_day, 'DD Mon YYYY') || ' at ' || trim(preferred_time) || '.',
    jsonb_build_object('request_id', request_row.id, 'listing_id', listing_uuid));
  return request_row;
end; $$;

-- 5. A roommate choice reaches the owner of the room as a request to approve.
create or replace function public.respond_roommate_request(request_uuid uuid, accept_request boolean)
returns public.roommate_requests language plpgsql security definer set search_path = public as $$
declare
  request_row public.roommate_requests%rowtype; responder public.profiles%rowtype; sender public.profiles%rowtype;
  unit_row public.units%rowtype; listing_row public.listings%rowtype; next_status text; holder uuid; mate uuid; mate_name text; holder_name text;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  select * into request_row from public.roommate_requests where id = request_uuid and to_user_id = auth.uid() for update;
  if not found or request_row.status <> 'pending' then raise exception 'This roommate request is no longer pending'; end if;
  select * into responder from public.profiles where id = auth.uid();
  select * into sender from public.profiles where id = request_row.from_user_id;
  next_status := case when accept_request then 'accepted' else 'declined' end;
  update public.roommate_requests set status = next_status where id = request_uuid returning * into request_row;

  insert into public.notifications (user_id, type, title, message, data)
  values (request_row.from_user_id, 'roommate_' || next_status,
    case when accept_request then 'Roommate request accepted' else 'Roommate request declined' end,
    case when accept_request then responder.full_name || ' accepted your roommate request. The owner of the room approves the change.' else responder.full_name || ' declined your roommate request.' end,
    jsonb_build_object('request_id', request_row.id, 'to_user_id', auth.uid()));

  if accept_request then
    -- The person who already has a room takes the other in; the sender's room is used first.
    select * into unit_row from public.units where tenant_id = sender.id and status = 'occupied' order by updated_at desc limit 1;
    if found then holder := sender.id; holder_name := sender.full_name; mate := responder.id; mate_name := responder.full_name;
    else
      select * into unit_row from public.units where tenant_id = responder.id and status = 'occupied' order by updated_at desc limit 1;
      if found then holder := responder.id; holder_name := responder.full_name; mate := sender.id; mate_name := sender.full_name; end if;
    end if;
    if holder is not null then
      select * into listing_row from public.listings where id = unit_row.listing_id;
      insert into public.owner_requests (listing_id, kind, requester_name, details, status, data)
      values (unit_row.listing_id, 'Roommate request', holder_name, holder_name || ' and ' || mate_name || ' want to share room ' || unit_row.unit_code || '.', 'open',
        jsonb_build_object('roommate_request_id', request_row.id, 'unit_id', unit_row.id, 'tenant_id', holder, 'roommate_id', mate, 'roommate_name', mate_name));
      insert into public.notifications (user_id, type, title, message, data)
      values (listing_row.owner_id, 'roommate_change', 'Roommate change to approve', holder_name || ' and ' || mate_name || ' want to share room ' || unit_row.unit_code || ' at ' || listing_row.name || '.',
        jsonb_build_object('listing_id', listing_row.id, 'unit_id', unit_row.id));
    end if;
  end if;
  return request_row;
end; $$;

-- 6. The owner (or admin) answers a request; approving a roommate change records the roommate on the room.
create or replace function public.resolve_owner_request(request_uuid uuid, approve boolean)
returns public.owner_requests language plpgsql security definer set search_path = public as $$
declare req public.owner_requests%rowtype; listing_row public.listings%rowtype; who uuid;
begin
  select * into req from public.owner_requests where id = request_uuid for update;
  if not found then raise exception 'Request not found'; end if;
  if not public.is_admin() and not public.is_listing_owner(req.listing_id) then raise exception 'Only the property owner or an administrator can answer this request'; end if;
  if req.status <> 'open' then raise exception 'This request has already been answered'; end if;
  if req.kind = 'Rent transfer' then raise exception 'Answer transfer requests from the transfer card'; end if;
  select * into listing_row from public.listings where id = req.listing_id;
  update public.owner_requests set status = case when approve then 'approved' else 'declined' end, resolved_at = now() where id = req.id returning * into req;
  if approve and req.kind = 'Roommate request' then
    update public.units set roommate_id = (req.data ->> 'roommate_id')::uuid, roommate_name = req.data ->> 'roommate_name', updated_at = now()
    where id = (req.data ->> 'unit_id')::uuid and listing_id = req.listing_id and status = 'occupied';
  end if;
  foreach who in array array[nullif(req.data ->> 'requester_id', '')::uuid, nullif(req.data ->> 'tenant_id', '')::uuid, nullif(req.data ->> 'roommate_id', '')::uuid] loop
    if who is not null then
      insert into public.notifications (user_id, type, title, message, data)
      values (who, 'request_' || req.status, req.kind || case when approve then ' approved' else ' declined' end,
        listing_row.name || ': your ' || lower(req.kind) || ' was ' || case when approve then 'approved' else 'declined' end || '.', jsonb_build_object('request_id', req.id));
    end if;
  end loop;
  return req;
end; $$;

-- 7. Confirming a payment: the owner may pick the room from the vacant ones.
drop function if exists public.resolve_payment(uuid, boolean);
create or replace function public.resolve_payment(payment_uuid uuid, confirm_payment boolean, chosen_unit uuid default null)
returns public.payments language plpgsql security definer set search_path = public as $$
declare payment_row public.payments%rowtype; unit_row public.units%rowtype; booking_reference text;
begin
  select * into payment_row from public.payments where id = payment_uuid for update;
  if not found then raise exception 'Payment not found'; end if;
  if not public.is_admin() and not public.is_listing_owner(payment_row.listing_id) then raise exception 'Only the listing owner or an administrator can resolve this payment'; end if;
  if payment_row.status <> 'pending' then raise exception 'Only pending payments can be resolved'; end if;

  if not confirm_payment then
    update public.payments set status = 'rejected' where id = payment_row.id returning * into payment_row;
    insert into public.notifications (user_id, type, title, message, data)
    values (payment_row.tenant_id, 'payment_rejected', 'Payment not received', 'The owner could not find your payment ' || payment_row.reference || '. Contact them before you pay again.', jsonb_build_object('payment_id', payment_row.id));
    return payment_row;
  end if;

  if chosen_unit is not null then
    select * into unit_row from public.units where id = chosen_unit and listing_id = payment_row.listing_id and status = 'vacant' for update;
    if not found then raise exception 'That room is no longer vacant. Choose another one.'; end if;
  else
    select * into unit_row from public.units where listing_id = payment_row.listing_id and status = 'vacant' order by floor, unit_code limit 1 for update;
    if not found then raise exception 'No vacant room is available for this property'; end if;
  end if;

  update public.units set status = 'occupied', tenant_id = payment_row.tenant_id, tenant_name = payment_row.tenant_name, payment_status = 'paid', balance = 0,
    paid_through = payment_row.start_date + make_interval(months => greatest(payment_row.months, 0), days => greatest(payment_row.nights, 0)), updated_at = now()
  where id = unit_row.id;
  update public.payments set status = 'confirmed', unit_id = unit_row.id, room_code = unit_row.unit_code, confirmed_at = now() where id = payment_row.id returning * into payment_row;

  booking_reference := payment_row.reference;
  insert into public.bookings (reference, listing_id, unit_id, tenant_id, tenant_name, room_code, start_date, months, nights, amount, fee, deposit, payment_method, paid_by, purpose, efris_document_no, verification_code)
  values (booking_reference, payment_row.listing_id, unit_row.id, payment_row.tenant_id, payment_row.tenant_name, unit_row.unit_code, payment_row.start_date, payment_row.months, payment_row.nights,
    payment_row.amount, payment_row.fee, payment_row.deposit, payment_row.payment_method, payment_row.paid_by, payment_row.purpose, payment_row.efris_document_no, payment_row.verification_code)
  on conflict (reference) do nothing;
  update public.listings set available_units = (select count(*) from public.units where listing_id = payment_row.listing_id and status = 'vacant'), updated_at = now() where id = payment_row.listing_id;
  if payment_row.agreement_id is not null then
    update public.agreements set unit_id = unit_row.id, room_code = unit_row.unit_code, status = 'accepted', paid = true, accepted_at = coalesce(accepted_at, now()) where id = payment_row.agreement_id;
  end if;
  insert into public.notifications (user_id, type, title, message, data)
  values (payment_row.tenant_id, 'payment_confirmed', 'Payment confirmed', 'Your payment ' || payment_row.reference || ' is confirmed. Your room is ' || unit_row.unit_code || '.',
    jsonb_build_object('payment_id', payment_row.id, 'booking_reference', booking_reference));
  return payment_row;
end; $$;
revoke all on function public.resolve_payment(uuid, boolean, uuid) from public, anon;
grant execute on function public.resolve_payment(uuid, boolean, uuid) to authenticated;

-- 8. Hostels are booked per semester; the agreement records the stay unit.
create or replace function public.accept_listing_agreement(listing_uuid uuid, desired_start date, stay_quantity integer)
returns public.agreements language plpgsql security definer set search_path = public as $$
declare listing_row public.listings%rowtype; template_row public.agreement_templates%rowtype; tenant_row public.profiles%rowtype; agreement_row public.agreements%rowtype; agreement_reference text; stay_unit text; max_quantity integer;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  select * into listing_row from public.listings where id = listing_uuid and verified = true and available_units > 0;
  if not found then raise exception 'This listing has no available rooms'; end if;
  stay_unit := case listing_row.type when 'hostel' then 'semester' when 'airbnb' then 'night' else 'month' end;
  max_quantity := case stay_unit when 'semester' then 6 when 'night' then 30 else 24 end;
  if stay_quantity < 1 or stay_quantity > max_quantity then raise exception 'Stay length is outside the allowed range'; end if;
  select * into tenant_row from public.profiles where id = auth.uid();
  if tenant_row.role not in ('tenant', 'student') then raise exception 'Only tenants and students can accept a rental agreement'; end if;
  select * into template_row from public.agreement_templates where listing_id = listing_uuid;
  agreement_reference := 'AG-' || extract(year from now())::text || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.agreements (reference, listing_id, room_code, tenant_id, tenant_name, quantity, start_date, status, terms, issued_at, accepted_at, paid)
  values (agreement_reference, listing_row.id, 'Unassigned', tenant_row.id, tenant_row.full_name, stay_quantity, desired_start, 'accepted',
    jsonb_build_object('listing_name', listing_row.name, 'property_type', listing_row.type, 'unit_type', listing_row.unit_type, 'price', listing_row.price, 'period', listing_row.per,
      'stay_unit', stay_unit, 'months_per_semester', 4,
      'deposit_months', coalesce(template_row.deposit_months, 0), 'late_fee_percent', coalesce(template_row.late_fee_percent, 5),
      'notice_days', coalesce(template_row.notice_days, 30), 'house_rules', coalesce(template_row.house_rules, '')),
    now(), now(), false) returning * into agreement_row;
  return agreement_row;
end; $$;

-- 9. Only a tenant whose rent is paid up can pass the room on.
create or replace function public.create_rent_transfer(booking_uuid uuid, requested_price integer, available_from date, transfer_reason text)
returns public.rent_transfers language plpgsql security definer set search_path = public as $$
declare booking_row public.bookings%rowtype; listing_row public.listings%rowtype; transfer_row public.rent_transfers%rowtype; remaining_months integer;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  if requested_price <= 0 or length(trim(coalesce(transfer_reason, ''))) < 3 then raise exception 'Enter a positive price and a short reason'; end if;
  select * into booking_row from public.bookings where id = booking_uuid and tenant_id = auth.uid() for update;
  if not found then raise exception 'This booking does not belong to your account'; end if;
  if booking_row.months <= 0 then raise exception 'Only monthly bookings can be transferred'; end if;
  if not exists (select 1 from public.payments p where p.reference = booking_row.reference and p.status = 'confirmed') then raise exception 'Only a confirmed, paid booking can be transferred'; end if;
  if exists (select 1 from public.units u where u.id = booking_row.unit_id and (coalesce(u.balance, 0) > 0 or coalesce(u.payment_status, 'paid') <> 'paid')) then
    raise exception 'Clear your rent balance before you pass your room on';
  end if;
  if exists (select 1 from public.rent_transfers rt where rt.booking_id = booking_row.id and rt.status in ('listed', 'requested', 'approved')) then raise exception 'This booking already has an active transfer request'; end if;
  remaining_months := greatest(0, ceil(((booking_row.start_date + make_interval(months => booking_row.months))::date - current_date)::numeric / 30.4)::integer);
  if remaining_months < 1 then raise exception 'This booking has no paid months remaining'; end if;
  if available_from < current_date then raise exception 'The available date must be today or later'; end if;
  select * into listing_row from public.listings where id = booking_row.listing_id;
  insert into public.rent_transfers (booking_id, listing_id, unit_id, room_code, months_left, price_per_month, available_from, reason, status)
  values (booking_row.id, booking_row.listing_id, booking_row.unit_id, booking_row.room_code, remaining_months, requested_price, available_from, trim(transfer_reason), 'listed')
  returning * into transfer_row;
  update public.bookings set listed_for_transfer = true, transfer_price = requested_price, transfer_reason = trim(transfer_reason), transfer_from_date = available_from where id = booking_row.id;
  insert into public.notifications (user_id, type, title, message, data)
  values (listing_row.owner_id, 'rent_transfer_listed', 'Rent transfer listed', booking_row.tenant_name || ' listed room ' || booking_row.room_code || ' for transfer.', jsonb_build_object('transfer_id', transfer_row.id, 'listing_id', listing_row.id));
  return transfer_row;
end; $$;

-- 10. The owner's Board: walk-in tenants, booking fees and part payments.
create table if not exists public.board_entries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  unit_code text not null,
  tenant_name text not null,
  phone text not null,
  has_roommate boolean not null default false,
  months integer not null check (months between 1 and 24),
  start_date date not null,
  rent integer not null,
  total integer not null,
  paid integer not null default 0,
  status text not null default 'unpaid' check (status in ('unpaid', 'booked', 'full', 'cancelled')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.board_payments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.board_entries(id) on delete cascade,
  amount integer not null check (amount > 0),
  method text not null,
  is_booking_fee boolean not null default false,
  recorded_by uuid references public.profiles(id),
  paid_at timestamptz not null default now()
);
alter table public.board_entries enable row level security;
alter table public.board_payments enable row level security;
drop policy if exists board_entries_select on public.board_entries;
drop policy if exists board_payments_select on public.board_payments;
create policy board_entries_select on public.board_entries for select using (public.is_admin() or public.is_listing_owner(listing_id));
create policy board_payments_select on public.board_payments for select using (exists (select 1 from public.board_entries e where e.id = board_payments.entry_id and (public.is_admin() or public.is_listing_owner(e.listing_id))));

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
      roommate_name = case when e.has_roommate then 'Roommate' else null end, payment_status = 'due', balance = e.total - e.paid, paid_through = null, updated_at = now()
    where id = e.unit_id;
  elsif next_status = 'full' then
    update public.units set status = 'occupied', tenant_id = null, tenant_name = e.tenant_name, roommate_id = null,
      roommate_name = case when e.has_roommate then 'Roommate' else null end, payment_status = 'paid', balance = 0,
      paid_through = e.start_date + make_interval(months => e.months), months_paid_ytd = e.months, updated_at = now()
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
  if unit_row.status <> 'vacant' then raise exception 'Room % is not vacant', unit_row.unit_code; end if;
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

create or replace function public.board_record_payment(entry_uuid uuid, payment_amount integer, payment_method text)
returns public.board_entries language plpgsql security definer set search_path = public as $$
declare e public.board_entries%rowtype;
begin
  select * into e from public.board_entries where id = entry_uuid for update;
  if not found then raise exception 'Board entry not found'; end if;
  if not public.is_admin() and not public.is_listing_owner(e.listing_id) then raise exception 'Only the property owner can record payments'; end if;
  if e.status in ('full', 'cancelled') then raise exception 'This entry is already closed'; end if;
  if coalesce(payment_amount, 0) <= 0 then raise exception 'Enter an amount'; end if;
  if payment_amount > e.total - e.paid then raise exception 'That is more than the balance of UGX %', to_char(e.total - e.paid, 'FM999,999,999'); end if;
  insert into public.board_payments (entry_id, amount, method, recorded_by) values (e.id, payment_amount, coalesce(nullif(trim(payment_method), ''), 'Cash'), auth.uid());
  return public.board_apply(e.id);
end; $$;

create or replace function public.board_cancel(entry_uuid uuid)
returns public.board_entries language plpgsql security definer set search_path = public as $$
declare e public.board_entries%rowtype;
begin
  select * into e from public.board_entries where id = entry_uuid for update;
  if not found then raise exception 'Board entry not found'; end if;
  if not public.is_admin() and not public.is_listing_owner(e.listing_id) then raise exception 'Only the property owner can change the board'; end if;
  if e.status = 'full' then raise exception 'A fully paid entry cannot be cancelled'; end if;
  update public.board_entries set status = 'cancelled', updated_at = now() where id = e.id returning * into e;
  update public.units set status = 'vacant', tenant_id = null, tenant_name = null, roommate_id = null, roommate_name = null, payment_status = 'paid', balance = 0, paid_through = null, updated_at = now()
  where id = e.unit_id and status = 'reserved' and tenant_id is null and tenant_name = e.tenant_name;
  update public.listings set available_units = (select count(*) from public.units where listing_id = e.listing_id and status = 'vacant'), updated_at = now() where id = e.listing_id;
  return e;
end; $$;
revoke all on function public.board_onboard(uuid, uuid, text, text, boolean, integer, date, integer, text, boolean) from public, anon;
revoke all on function public.board_record_payment(uuid, integer, text) from public, anon;
revoke all on function public.board_cancel(uuid) from public, anon;
grant execute on function public.board_onboard(uuid, uuid, text, text, boolean, integer, date, integer, text, boolean) to authenticated;
grant execute on function public.board_record_payment(uuid, integer, text) to authenticated;
grant execute on function public.board_cancel(uuid) to authenticated;

-- 11. Owner logins issued by the admin (passwords are never stored here).
create table if not exists public.owner_logins (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  username text not null unique,
  issued_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.owner_logins enable row level security;
drop policy if exists owner_logins_admin on public.owner_logins;
create policy owner_logins_admin on public.owner_logins for all using (public.is_admin()) with check (public.is_admin());
insert into public.owner_logins (owner_id, username, issued_at, sent_at)
select p.id, u.email, p.created_at, p.created_at from public.profiles p join auth.users u on u.id = p.id where p.role = 'owner'
on conflict (owner_id) do nothing;

-- 12. Verification needs the LC1 letter and the property data consent agreement.
create or replace function public.set_listing_verification(listing_uuid uuid, lc1_received boolean, consent_received boolean, verification_action text)
returns public.listings language plpgsql security definer set search_path = public as $$
declare listing_row public.listings%rowtype; next_state text;
begin
  if not public.is_admin() then raise exception 'Only an administrator can verify properties'; end if;
  select * into listing_row from public.listings where id = listing_uuid for update;
  if not found then raise exception 'Property not found'; end if;
  if verification_action not in ('save', 'verify', 'reject', 'reopen') then raise exception 'Unknown action'; end if;
  if verification_action = 'verify' and not (coalesce(lc1_received, false) and coalesce(consent_received, false)) then
    raise exception 'Tick the LC1 letter and the consent agreement first';
  end if;
  next_state := case verification_action when 'verify' then 'verified' when 'reject' then 'rejected' when 'reopen' then 'pending'
    else coalesce(case when jsonb_typeof(listing_row.verification_docs) = 'object' then listing_row.verification_docs ->> 'state' end, case when listing_row.verified then 'verified' else 'pending' end) end;
  update public.listings set
    verification_docs = jsonb_build_object('lc1', coalesce(lc1_received, false), 'consent', coalesce(consent_received, false), 'state', next_state, 'updated_at', now()),
    verified = case when verification_action = 'verify' then true when verification_action in ('reject', 'reopen') then false else verified end,
    updated_at = now()
  where id = listing_uuid returning * into listing_row;
  return listing_row;
end; $$;
revoke all on function public.set_listing_verification(uuid, boolean, boolean, text) from public, anon;
grant execute on function public.set_listing_verification(uuid, boolean, boolean, text) to authenticated;

-- 13. Floor grids: the admin sets columns and rows; "fill" adds only the missing rooms.
create or replace function public.fill_floor_layout(listing_uuid uuid, floor_no integer)
returns integer language plpgsql security definer set search_path = public as $$
declare layout_row public.property_layouts%rowtype; listing_row public.listings%rowtype; existing integer; need integer; prefix text; next_no integer; code text; made integer := 0;
begin
  if not public.is_admin() then raise exception 'Only an administrator can change the room layout'; end if;
  select * into listing_row from public.listings where id = listing_uuid;
  if not found then raise exception 'Property not found'; end if;
  select * into layout_row from public.property_layouts where listing_id = listing_uuid and floor = floor_no;
  if not found then raise exception 'Set the columns and rows for this floor first'; end if;
  select count(*) into existing from public.units where listing_id = listing_uuid and floor = floor_no;
  need := layout_row.columns * layout_row.rows - existing;
  if need <= 0 then return 0; end if;
  select split_part(unit_code, '-', 1) into prefix from public.units where listing_id = listing_uuid and floor = floor_no and unit_code like '%-%'
    group by 1 order by count(*) desc limit 1;
  prefix := coalesce(prefix, chr(65 + least(greatest(floor_no, 0), 25)));
  select coalesce(max(nullif(regexp_replace(split_part(unit_code, '-', 2), '\D', '', 'g'), '')::int), 0) + 1 into next_no
    from public.units where listing_id = listing_uuid and split_part(unit_code, '-', 1) = prefix;
  while made < need loop
    code := prefix || '-' || lpad(next_no::text, 2, '0');
    if not exists (select 1 from public.units where listing_id = listing_uuid and unit_code = code) then
      insert into public.units (listing_id, unit_code, floor, rent, status) values (listing_uuid, code, floor_no, listing_row.price, 'vacant');
      made := made + 1;
    end if;
    next_no := next_no + 1;
  end loop;
  update public.listings set total_units = (select count(*) from public.units where listing_id = listing_uuid),
    available_units = (select count(*) from public.units where listing_id = listing_uuid and status = 'vacant'), updated_at = now()
  where id = listing_uuid;
  return made;
end; $$;
revoke all on function public.fill_floor_layout(uuid, integer) from public, anon;
grant execute on function public.fill_floor_layout(uuid, integer) to authenticated;

-- 14. Owners see whether the tenants who paid them have verified their identity.
create or replace function public.payment_tenant_checks(listing_ids uuid[])
returns table (tenant_id uuid, kyc_status public.kyc_status) language sql stable security definer set search_path = public as $$
  select distinct p.tenant_id, pr.kyc_status
  from public.payments p join public.profiles pr on pr.id = p.tenant_id
  where p.listing_id = any(listing_ids) and (public.is_admin() or public.is_listing_owner(p.listing_id));
$$;
revoke all on function public.payment_tenant_checks(uuid[]) from public, anon;
grant execute on function public.payment_tenant_checks(uuid[]) to authenticated;

revoke all on function public.resolve_owner_request(uuid, boolean) from public, anon;
grant execute on function public.resolve_owner_request(uuid, boolean) to authenticated;
