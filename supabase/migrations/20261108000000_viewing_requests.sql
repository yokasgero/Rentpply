-- Viewing requests: a signed-in tenant or student asks the owner to show them a property.
-- The request appears in the owner's "Other owner requests" list and as a notification.
create or replace function public.request_viewing(
  listing_uuid uuid,
  preferred_day date,
  preferred_time text
)
returns public.owner_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  requester public.profiles%rowtype;
  listing_row public.listings%rowtype;
  request_row public.owner_requests%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  select * into requester from public.profiles where id = auth.uid();
  if requester.role not in ('tenant', 'student') then raise exception 'Only tenants and students can request a viewing'; end if;
  select * into listing_row from public.listings where id = listing_uuid and verified = true;
  if not found then raise exception 'This property is not available for viewing'; end if;
  if preferred_day < current_date or preferred_day > current_date + 60 then raise exception 'Choose a day within the next 60 days'; end if;
  if coalesce(trim(preferred_time), '') = '' or length(preferred_time) > 20 then raise exception 'Choose a time'; end if;
  if exists (
    select 1 from public.owner_requests
    where listing_id = listing_uuid and kind = 'Viewing request' and requester_name = requester.full_name
      and status = 'open' and created_at > now() - interval '1 day'
  ) then raise exception 'You already asked to view this property today'; end if;

  insert into public.owner_requests (listing_id, kind, requester_name, details, status)
  values (listing_uuid, 'Viewing request', requester.full_name,
    'Would like to view on ' || to_char(preferred_day, 'DD Mon YYYY') || ' at ' || trim(preferred_time), 'open')
  returning * into request_row;

  insert into public.notifications (user_id, type, title, message, data)
  values (listing_row.owner_id, 'viewing_requested', 'Viewing request',
    requester.full_name || ' would like to view ' || listing_row.name || ' on ' || to_char(preferred_day, 'DD Mon YYYY') || ' at ' || trim(preferred_time) || '.',
    jsonb_build_object('request_id', request_row.id, 'listing_id', listing_uuid));

  return request_row;
end;
$$;

revoke all on function public.request_viewing(uuid, date, text) from public, anon;
grant execute on function public.request_viewing(uuid, date, text) to authenticated;
