create or replace function public.resolve_payment(payment_uuid uuid, confirm_payment boolean)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_row public.payments%rowtype;
  unit_row public.units%rowtype;
  booking_reference text;
begin
  select * into payment_row
  from public.payments
  where id = payment_uuid
  for update;

  if not found then
    raise exception 'Payment not found';
  end if;
  if not public.is_admin() and not public.is_listing_owner(payment_row.listing_id) then
    raise exception 'Only the listing owner or an administrator can resolve this payment';
  end if;
  if payment_row.status <> 'pending' then
    raise exception 'Only pending payments can be resolved';
  end if;

  if not confirm_payment then
    update public.payments set status = 'rejected' where id = payment_row.id returning * into payment_row;
    insert into public.notifications (user_id, type, title, message, data)
    values (payment_row.tenant_id, 'payment_rejected', 'Payment not confirmed', 'The owner could not confirm the reported payment. Contact them before resubmitting.', jsonb_build_object('payment_id', payment_row.id));
    return payment_row;
  end if;

  select * into unit_row
  from public.units
  where listing_id = payment_row.listing_id and status = 'vacant'
  order by floor, unit_code
  limit 1
  for update;

  if not found then
    raise exception 'No vacant room is available for this property';
  end if;

  update public.units
  set status = 'occupied', tenant_id = payment_row.tenant_id,
      tenant_name = payment_row.tenant_name, payment_status = 'paid', balance = 0,
      paid_through = payment_row.start_date + make_interval(months => greatest(payment_row.months, 0), days => greatest(payment_row.nights, 0)),
      updated_at = now()
  where id = unit_row.id;

  update public.payments
  set status = 'confirmed', unit_id = unit_row.id, room_code = unit_row.unit_code,
      confirmed_at = now()
  where id = payment_row.id
  returning * into payment_row;

  booking_reference := payment_row.reference;
  insert into public.bookings (
    reference, listing_id, unit_id, tenant_id, tenant_name, room_code,
    start_date, months, nights, amount, fee, deposit, payment_method,
    paid_by, purpose, efris_document_no, verification_code
  ) values (
    booking_reference, payment_row.listing_id, unit_row.id, payment_row.tenant_id,
    payment_row.tenant_name, unit_row.unit_code, payment_row.start_date,
    payment_row.months, payment_row.nights, payment_row.amount, payment_row.fee,
    payment_row.deposit, payment_row.payment_method, payment_row.paid_by,
    payment_row.purpose, payment_row.efris_document_no, payment_row.verification_code
  ) on conflict (reference) do nothing;

  update public.listings
  set available_units = greatest(available_units - 1, 0), updated_at = now()
  where id = payment_row.listing_id;

  if payment_row.agreement_id is not null then
    update public.agreements
    set unit_id = unit_row.id, room_code = unit_row.unit_code,
        status = 'accepted', paid = true, accepted_at = coalesce(accepted_at, now())
    where id = payment_row.agreement_id;
  end if;

  insert into public.notifications (user_id, type, title, message, data)
  values (payment_row.tenant_id, 'payment_confirmed', 'Payment confirmed', 'Your room has been assigned and your stay is confirmed.', jsonb_build_object('payment_id', payment_row.id, 'booking_reference', booking_reference));

  return payment_row;
end;
$$;

grant execute on function public.resolve_payment(uuid, boolean) to authenticated;
