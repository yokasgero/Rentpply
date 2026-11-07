-- Create a profile for each new auth user. Public signup can request tenant,
-- student, or owner access, but admin access must be granted by an existing admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data ->> 'role', 'tenant');
begin
  if requested_role not in ('tenant', 'student', 'owner') then
    requested_role := 'tenant';
  end if;

  insert into public.profiles (id, full_name, phone, role, is_student)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    requested_role::public.user_role,
    requested_role = 'student' or new.raw_user_meta_data ->> 'is_student' = 'true'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Prevent a user from changing their own role through the profile update policy.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
    and coalesce(auth.role(), '') <> 'service_role'
     and not public.is_admin() then
    raise exception 'Only an administrator can change account roles';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_change on public.profiles;
create trigger protect_profile_role_change
before update of role on public.profiles
for each row execute function public.protect_profile_role();

-- Replace the broad verified-listing unit policy; tenant and payment details
-- remain visible only to the listing owner, the assigned tenant, and admins.
drop policy if exists "units_select_verified_listing" on public.units;

create or replace function public.get_listing_availability(listing_uuid uuid)
returns table (unit_code text, floor integer, rent integer, status public.unit_status)
language sql
stable
security definer
set search_path = public
as $$
  select u.unit_code, u.floor, u.rent, u.status
  from public.units u
  join public.listings l on l.id = u.listing_id
  where u.listing_id = listing_uuid
    and l.verified = true
    and u.status = 'vacant';
$$;

grant execute on function public.get_listing_availability(uuid) to anon, authenticated;

-- Admins can manage every application record from the admin workspace.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'listings', 'units', 'bookings', 'payments', 'agreements',
    'maintenance_requests', 'bills', 'roommate_profiles', 'roommate_requests',
    'rent_transfers', 'rent_transfer_requests', 'owner_requests', 'admin_queue',
    'listing_media', 'listing_amenities', 'listing_locations',
    'agreement_templates', 'saved_listings', 'property_layouts', 'notifications'
  ] loop
    execute format('drop policy if exists admin_manage_all on public.%I', table_name);
    execute format(
      'create policy admin_manage_all on public.%I for all using (public.is_admin()) with check (public.is_admin())',
      table_name
    );
  end loop;
end;
$$;
