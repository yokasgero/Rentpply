-- Everything a screen needs, in one trip to the server.
-- Phones in Uganda reach the database in Ireland in about 0.3 to 0.6 s per trip, so the app asking 38 questions in
-- 6 rounds took 2 to 4 s before a screen could show. These two functions answer all of them at once.
-- Both run as the person asking (security invoker), so the same row level security rules decide what each person sees.

-- The places on the front page and in Explore, plus the signed-in person's own records.
create or replace function public.app_start()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ids uuid[];
  me profiles;
  out jsonb;
begin
  select coalesce(array_agg(id), '{}') into ids from listings where verified;
  out := jsonb_build_object(
    'listings', (select coalesce(jsonb_agg(to_jsonb(l) order by l.created_at desc), '[]') from listings l where l.verified),
    'templates', (select coalesce(jsonb_agg(jsonb_build_object('listing_id', t.listing_id, 'deposit_months', t.deposit_months, 'late_fee_percent', t.late_fee_percent, 'notice_days', t.notice_days, 'house_rules', t.house_rules)), '[]')
                  from agreement_templates t where t.listing_id = any(ids)),
    'locations', (select coalesce(jsonb_agg(jsonb_build_object('listing_id', x.listing_id, 'lat', x.lat, 'lng', x.lng, 'address', x.address)), '[]')
                  from listing_locations x where x.listing_id = any(ids)),
    'media', (select coalesce(jsonb_agg(jsonb_build_object('listing_id', m.listing_id, 'type', m.type, 'url', m.url, 'sort_order', m.sort_order) order by m.sort_order), '[]')
              from listing_media m where m.listing_id = any(ids))
  );
  if uid is null then return out; end if;

  select * into me from profiles where id = uid;
  out := out || jsonb_build_object('profile', to_jsonb(me));
  if me.id is null or me.role not in ('tenant', 'student') then return out; end if;

  return out || jsonb_build_object(
    'saved', (select coalesce(jsonb_agg(jsonb_build_object('listing_id', s.listing_id)), '[]') from saved_listings s where s.user_id = uid),
    'bookings', (select coalesce(jsonb_agg(to_jsonb(b) order by b.created_at desc), '[]') from bookings b where b.tenant_id = uid),
    'payments', (select coalesce(jsonb_agg(to_jsonb(p) order by p.created_at desc), '[]') from payments p where p.tenant_id = uid),
    'agreements', (select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]') from agreements a where a.tenant_id = uid),
    'maintenance', (select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]') from maintenance_requests r where r.tenant_id = uid),
    'roommates', (select coalesce(jsonb_agg(to_jsonb(r)), '[]') from roommate_profiles r where r.is_verified and r.user_id <> uid),
    'roommates_asked', (select coalesce(jsonb_agg(jsonb_build_object('to_user_id', r.to_user_id)), '[]') from roommate_requests r where r.from_user_id = uid),
    'roommate_requests', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'status', r.status, 'created_at', r.created_at,
                            'from_user', (select jsonb_build_object('id', f.id, 'full_name', f.full_name) from profiles f where f.id = r.from_user_id))
                          order by r.created_at desc), '[]')
                          from roommate_requests r where r.to_user_id = uid),
    'own_transfers', (select coalesce(jsonb_agg(to_jsonb(t) || jsonb_build_object('bookings', jsonb_build_object('reference', b.reference, 'tenant_id', b.tenant_id)) order by t.created_at desc), '[]')
                      from rent_transfers t join bookings b on b.id = t.booking_id where b.tenant_id = uid),
    'open_transfers', (select coalesce(jsonb_agg(to_jsonb(t) || jsonb_build_object('bookings', jsonb_build_object('tenant_id', b.tenant_id, 'tenant_name', b.tenant_name)) order by t.created_at desc), '[]')
                       from rent_transfers t join bookings b on b.id = t.booking_id where t.status = 'listed' and b.tenant_id <> uid),
    'transfer_requests', (select coalesce(jsonb_agg(jsonb_build_object('transfer_id', r.transfer_id, 'status', r.status)), '[]') from rent_transfer_requests r where r.requester_id = uid),
    'notifications', (select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc), '[]')
                      from (select * from notifications where user_id = uid order by created_at desc limit 50) n)
  );
end;
$$;

-- The owner and admin dashboard: the same records the dashboard used to fetch in 3 rounds of 20 questions.
create or replace function public.portal_start()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  role_name text;
  admin boolean;
  ids uuid[];
  transfer_ids uuid[];
  entry_ids uuid[];
begin
  if uid is null then return null; end if;
  select role::text into role_name from profiles where id = uid;
  admin := role_name in ('admin', 'super');
  select coalesce(array_agg(id), '{}') into ids from listings where admin or owner_id = uid;
  select coalesce(array_agg(id), '{}') into transfer_ids from rent_transfers where listing_id = any(ids);
  select coalesce(array_agg(id), '{}') into entry_ids from board_entries where listing_id = any(ids);
  return jsonb_build_object(
    'listings', (select coalesce(jsonb_agg(to_jsonb(l) order by l.created_at desc), '[]') from listings l where l.id = any(ids)),
    'units', (select coalesce(jsonb_agg(to_jsonb(x) order by x.unit_code), '[]') from units x where x.listing_id = any(ids)),
    'payments', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]') from payments x where x.listing_id = any(ids)),
    'agreements', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]') from agreements x where x.listing_id = any(ids)),
    'maintenance', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]') from maintenance_requests x where x.listing_id = any(ids)),
    'bills', (select coalesce(jsonb_agg(to_jsonb(x) order by x.due_date), '[]') from bills x where x.listing_id = any(ids)),
    'transfers', (select coalesce(jsonb_agg(to_jsonb(t) || jsonb_build_object('bookings',
                    (select jsonb_build_object('reference', b.reference, 'tenant_name', b.tenant_name, 'tenant_id', b.tenant_id) from bookings b where b.id = t.booking_id))
                  order by t.created_at desc), '[]') from rent_transfers t where t.listing_id = any(ids)),
    'owner_requests', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]') from owner_requests x where x.listing_id = any(ids)),
    'board', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]') from board_entries x where x.listing_id = any(ids)),
    'layouts', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from property_layouts x where x.listing_id = any(ids)),
    'media', (select coalesce(jsonb_agg(to_jsonb(x) order by x.sort_order), '[]') from listing_media x where x.listing_id = any(ids)),
    'locations', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from listing_locations x where x.listing_id = any(ids)),
    'templates', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from agreement_templates x where x.listing_id = any(ids)),
    'kyc', (select coalesce(jsonb_agg(to_jsonb(k)), '[]') from payment_tenant_checks(ids) k),
    'profiles', case when admin then (select coalesce(jsonb_agg(to_jsonb(p) order by p.created_at desc), '[]') from profiles p) else '[]'::jsonb end,
    'queue', case when admin then (select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc), '[]') from admin_queue q) else '[]'::jsonb end,
    'logins', case when admin then (select coalesce(jsonb_agg(to_jsonb(o)), '[]') from owner_logins o) else '[]'::jsonb end,
    'notifications', (select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc), '[]')
                      from (select * from notifications where user_id = uid order by created_at desc limit 50) n),
    'transfer_requests', (select coalesce(jsonb_agg(to_jsonb(r) || jsonb_build_object('requester', (select jsonb_build_object('full_name', p.full_name) from profiles p where p.id = r.requester_id))
                          order by r.created_at desc), '[]') from rent_transfer_requests r where r.transfer_id = any(transfer_ids)),
    'board_payments', (select coalesce(jsonb_agg(to_jsonb(x) order by x.paid_at), '[]') from board_payments x where x.entry_id = any(entry_ids))
  );
end;
$$;

revoke all on function public.app_start() from public;
revoke all on function public.portal_start() from public;
grant execute on function public.app_start() to anon, authenticated;
grant execute on function public.portal_start() to authenticated;
