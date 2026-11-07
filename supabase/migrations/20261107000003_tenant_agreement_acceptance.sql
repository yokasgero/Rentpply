create or replace function public.accept_listing_agreement(
  listing_uuid uuid,
  desired_start date,
  stay_quantity integer
)
returns public.agreements
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_row public.listings%rowtype;
  template_row public.agreement_templates%rowtype;
  tenant_row public.profiles%rowtype;
  agreement_row public.agreements%rowtype;
  agreement_reference text;
begin
  if auth.uid() is null then
    raise exception 'Sign in is required';
  end if;
  if stay_quantity < 1 or stay_quantity > 24 then
    raise exception 'Stay quantity is outside the allowed range';
  end if;

  select * into listing_row
  from public.listings
  where id = listing_uuid and verified = true;
  if not found then
    raise exception 'This listing is not available';
  end if;

  select * into tenant_row from public.profiles where id = auth.uid();
  if tenant_row.role not in ('tenant', 'student') then
    raise exception 'Only tenants and students can accept a rental agreement';
  end if;

  select * into template_row from public.agreement_templates where listing_id = listing_uuid;
  agreement_reference := 'AG-' || extract(year from now())::text || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.agreements (
    reference, listing_id, room_code, tenant_id, tenant_name,
    quantity, start_date, status, terms, issued_at, accepted_at, paid
  ) values (
    agreement_reference, listing_row.id, 'Unassigned', tenant_row.id, tenant_row.full_name,
    stay_quantity, desired_start, 'accepted',
    jsonb_build_object(
      'listing_name', listing_row.name,
      'property_type', listing_row.type,
      'unit_type', listing_row.unit_type,
      'price', listing_row.price,
      'period', listing_row.per,
      'deposit_months', coalesce(template_row.deposit_months, 0),
      'late_fee_percent', coalesce(template_row.late_fee_percent, 5),
      'notice_days', coalesce(template_row.notice_days, 30),
      'house_rules', coalesce(template_row.house_rules, '')
    ),
    now(), now(), false
  ) returning * into agreement_row;

  return agreement_row;
end;
$$;

grant execute on function public.accept_listing_agreement(uuid, date, integer) to authenticated;
