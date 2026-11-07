revoke all on function public.resolve_payment(uuid, boolean) from public, anon;
grant execute on function public.resolve_payment(uuid, boolean) to authenticated;

revoke all on function public.accept_listing_agreement(uuid, date, integer) from public, anon;
grant execute on function public.accept_listing_agreement(uuid, date, integer) to authenticated;
