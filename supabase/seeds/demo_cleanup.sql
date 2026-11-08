-- Removes everything demo_data.sql created. Real accounts and records are not touched.
do $clean$
declare
  seed_ids uuid[];
begin
  select coalesce(array_agg(id), array[]::uuid[]) into seed_ids from auth.users where email like '%@seed.rentpply.test';

  delete from public.notifications where message in (select 'x') or data = '{}'::jsonb and type in ('payment_confirmed', 'repair_requested') and user_id in (select owner_id from public.listings);
  delete from public.owner_requests where requester_name in (select full_name from public.profiles where id = any(seed_ids));
  delete from public.bills where note = 'seed';
  delete from public.maintenance_requests where tenant_id = any(seed_ids);
  delete from public.payments where tenant_id = any(seed_ids);
  delete from public.agreements where tenant_id = any(seed_ids);
  delete from public.bookings where tenant_id = any(seed_ids);

  update public.units set status = 'vacant', tenant_id = null, tenant_name = null, payment_status = 'paid', balance = 0, paid_through = null,
    credit_rating = 'Good', months_paid_ytd = 0, efris_receipts_count = 0, roommate_id = null, roommate_name = null, updated_at = now()
  where tenant_id = any(seed_ids) or tenant_name in (select full_name from public.profiles where id = any(seed_ids));
  update public.units set status = 'vacant' where status = 'maint' and tenant_id is null and tenant_name is null;

  delete from public.roommate_profiles where user_id = any(seed_ids);
  delete from auth.users where id = any(seed_ids);

  update public.listings l set
    available_units = (select count(*) from public.units u where u.listing_id = l.id and u.status = 'vacant'),
    updated_at = now();
end
$clean$;
