-- People can reach each other, and tenants know where to pay.
-- 1. Payment details for each property (MTN, Airtel, bank): the payment step said "send money directly to the owner"
--    but never said where. Kept in their own table so they are not in the public listing data; only signed-in people
--    see them, at the moment they pay.
-- 2. The owner's phone and email for a tenant who has applied, paid or asked for a viewing at that property
--    (the listing promises "Phone and email are shared once you apply").
-- 3. An in-app rent reminder an owner can send to a tenant (it also reaches their phone through the push trigger).
-- 4. The phone of a person who asked the owner for a viewing.

-- 1. Payment details
create table if not exists public.listing_pay_details (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  mtn_number text, mtn_name text,
  airtel_number text, airtel_name text,
  bank_name text, bank_account text, bank_account_name text,
  note text,
  updated_at timestamptz not null default now()
);
alter table public.listing_pay_details enable row level security;
drop policy if exists listing_pay_details_admin on public.listing_pay_details;
create policy listing_pay_details_admin on public.listing_pay_details for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists listing_pay_details_owner_read on public.listing_pay_details;
create policy listing_pay_details_owner_read on public.listing_pay_details for select using (public.is_listing_owner(listing_id));

create or replace function public.listing_pay_details(listing_uuid uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null else (
    select jsonb_build_object('mtn_number', d.mtn_number, 'mtn_name', d.mtn_name, 'airtel_number', d.airtel_number, 'airtel_name', d.airtel_name,
      'bank_name', d.bank_name, 'bank_account', d.bank_account, 'bank_account_name', d.bank_account_name, 'note', d.note)
    from public.listing_pay_details d where d.listing_id = listing_uuid) end;
$$;
revoke all on function public.listing_pay_details(uuid) from public, anon;
grant execute on function public.listing_pay_details(uuid) to authenticated;

-- 2. Owner contacts for the signed-in tenant's places
create or replace function public.my_place_contacts()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('listing_id', l.id, 'owner_name', coalesce(p.full_name, l.owner_name), 'phone', p.phone, 'email', u.email)), '[]'::jsonb)
  from public.listings l
  left join public.profiles p on p.id = l.owner_id
  left join auth.users u on u.id = l.owner_id
  where auth.uid() is not null and (
    exists (select 1 from public.agreements a where a.listing_id = l.id and a.tenant_id = auth.uid())
    or exists (select 1 from public.payments x where x.listing_id = l.id and x.tenant_id = auth.uid())
    or exists (select 1 from public.bookings b where b.listing_id = l.id and b.tenant_id = auth.uid())
    or exists (select 1 from public.owner_requests r where r.listing_id = l.id and r.data ->> 'requester_id' = auth.uid()::text)
  );
$$;
revoke all on function public.my_place_contacts() from public, anon;
grant execute on function public.my_place_contacts() to authenticated;

-- 3. Rent reminder from the owner (at most one per room every 12 hours)
create or replace function public.remind_tenant(unit_uuid uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u public.units%rowtype; l public.listings%rowtype; msg text;
begin
  select * into u from public.units where id = unit_uuid;
  if not found then raise exception 'Room not found'; end if;
  if not public.is_admin() and not public.is_listing_owner(u.listing_id) then raise exception 'Only the owner of this property can send a reminder'; end if;
  if u.tenant_id is null then raise exception 'This tenant is not on Rentpply. Call or message them instead.'; end if;
  if exists (select 1 from public.notifications n where n.user_id = u.tenant_id and n.type = 'rent_reminder' and n.data ->> 'unit_id' = u.id::text and n.created_at > now() - interval '12 hours') then
    raise exception 'A reminder was already sent for this room in the last 12 hours';
  end if;
  select * into l from public.listings where id = u.listing_id;
  msg := 'Rent of UGX ' || to_char(coalesce(u.balance, 0), 'FM999,999,999') || ' for room ' || u.unit_code || ' at ' || l.name
    || case when u.paid_through is not null then ' has been due since ' || to_char(u.paid_through, 'DD Mon YYYY') else ' is due' end
    || '. Please pay the owner and record it in Rentpply.';
  insert into public.notifications (user_id, type, title, message, data)
  values (u.tenant_id, 'rent_reminder', 'Rent reminder', msg, jsonb_build_object('unit_id', u.id, 'listing_id', u.listing_id));
  return jsonb_build_object('sent', true);
end; $$;
revoke all on function public.remind_tenant(uuid) from public, anon;
grant execute on function public.remind_tenant(uuid) to authenticated;

-- 4. Who asked for a viewing, and how to reach them (the owner of that property or an admin only)
create or replace function public.request_contact(request_uuid uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r public.owner_requests%rowtype; who public.profiles%rowtype;
begin
  select * into r from public.owner_requests where id = request_uuid;
  if not found then raise exception 'Request not found'; end if;
  if not public.is_admin() and not public.is_listing_owner(r.listing_id) then raise exception 'Only the owner of this property can see this'; end if;
  select * into who from public.profiles where id::text = r.data ->> 'requester_id';
  return jsonb_build_object('name', coalesce(who.full_name, r.requester_name), 'phone', who.phone);
end; $$;
revoke all on function public.request_contact(uuid) from public, anon;
grant execute on function public.request_contact(uuid) to authenticated;

-- The dashboard's one-trip answer also brings the payment details the admin (or the property's owner) may see.
-- portal_start is security invoker, so the policies above decide which rows come back.
create or replace function public.portal_pay_details()
returns jsonb language sql stable security invoker set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb) from public.listing_pay_details d;
$$;
revoke all on function public.portal_pay_details() from public, anon;
grant execute on function public.portal_pay_details() to authenticated;
