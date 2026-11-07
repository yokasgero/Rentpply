-- =====================================================================
-- Row Level Security Policies
-- =====================================================================
-- Admin can see everything, others see only their own data
-- Student has same access as tenant (student platform = tenant platform)

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table listings enable row level security;
alter table units enable row level security;
alter table bookings enable row level security;
alter table payments enable row level security;
alter table agreements enable row level security;
alter table maintenance_requests enable row level security;
alter table bills enable row level security;
alter table roommate_profiles enable row level security;
alter table roommate_requests enable row level security;
alter table rent_transfers enable row level security;
alter table rent_transfer_requests enable row level security;
alter table owner_requests enable row level security;
alter table admin_queue enable row level security;
alter table listing_media enable row level security;
alter table listing_amenities enable row level security;
alter table listing_locations enable row level security;
alter table agreement_templates enable row level security;
alter table saved_listings enable row level security;
alter table property_layouts enable row level security;
alter table notifications enable row level security;

-- =====================================================================
-- Helper functions for RLS
-- =====================================================================

-- Check if current user is admin
create or replace function is_admin() returns boolean
language sql security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

-- Check if current user is owner of a listing
create or replace function is_listing_owner(listing_uuid uuid) returns boolean
language sql security definer set search_path = public as $$
  select exists (
    select 1 from listings
    where id = listing_uuid
    and owner_id = auth.uid()
  );
$$;

-- Check if current user is tenant of a unit/booking
create or replace function is_tenant_of(unit_uuid uuid) returns boolean
language sql security definer set search_path = public as $$
  select exists (
    select 1 from units
    where id = unit_uuid
    and tenant_id = auth.uid()
  );
$$;

create or replace function is_booking_tenant(booking_uuid uuid) returns boolean
language sql security definer set search_path = public as $$
  select exists (
    select 1 from bookings
    where id = booking_uuid
    and tenant_id = auth.uid()
  );
$$;

-- Get current user's role
create or replace function current_user_role() returns user_role
language sql security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

-- =====================================================================
-- Profiles policies
-- =====================================================================
-- Users can read their own profile
create policy "profiles_select_own" on profiles
for select using (id = auth.uid());

-- Admin can read all profiles
create policy "profiles_select_admin" on profiles
for select using (is_admin());

-- Users can update their own profile
create policy "profiles_update_own" on profiles
for update using (id = auth.uid()) with check (id = auth.uid());

-- Admin can update any profile
create policy "profiles_update_admin" on profiles
for update using (is_admin()) with check (is_admin());

-- Insert handled by auth trigger

-- =====================================================================
-- Listings policies
-- =====================================================================
-- Anyone can view verified listings (for search/explore)
create policy "listings_select_verified" on listings
for select using (verified = true);

-- Owners can view their own listings (including unverified)
create policy "listings_select_owner" on listings
for select using (owner_id = auth.uid());

-- Admin can view all listings
create policy "listings_select_admin" on listings
for select using (is_admin());

-- Owners can insert their own listings
create policy "listings_insert_owner" on listings
for insert with check (owner_id = auth.uid());

-- Admin can insert any listing
create policy "listings_insert_admin" on listings
for insert with check (is_admin());

-- Owners can update their own listings
create policy "listings_update_owner" on listings
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Admin can update any listing
create policy "listings_update_admin" on listings
for update using (is_admin()) with check (is_admin());

-- Owners can delete their own listings
create policy "listings_delete_owner" on listings
for delete using (owner_id = auth.uid());

-- Admin can delete any listing
create policy "listings_delete_admin" on listings
for delete using (is_admin());

-- =====================================================================
-- Units policies
-- =====================================================================
-- Anyone can view units of verified listings (for availability)
create policy "units_select_verified_listing" on units
for select using (
  exists (select 1 from listings where id = listing_id and verified = true)
);

-- Owners can view units of their listings
create policy "units_select_owner" on units
for select using (is_listing_owner(listing_id));

-- Tenants can view their own unit
create policy "units_select_tenant" on units
for select using (tenant_id = auth.uid());

-- Admin can view all units
create policy "units_select_admin" on units
for select using (is_admin());

-- Owners can insert units for their listings
create policy "units_insert_owner" on units
for insert with check (is_listing_owner(listing_id));

-- Admin can insert any unit
create policy "units_insert_admin" on units
for insert with check (is_admin());

-- Owners can update units for their listings
create policy "units_update_owner" on units
for update using (is_listing_owner(listing_id)) with check (is_listing_owner(listing_id));

-- Admin can update any unit
create policy "units_update_admin" on units
for update using (is_admin()) with check (is_admin());

-- Owners can delete units for their listings
create policy "units_delete_owner" on units
for delete using (is_listing_owner(listing_id));

-- Admin can delete any unit
create policy "units_delete_admin" on units
for delete using (is_admin());

-- =====================================================================
-- Bookings policies
-- =====================================================================
-- Tenants can view their own bookings
create policy "bookings_select_tenant" on bookings
for select using (tenant_id = auth.uid());

-- Owners can view bookings for their listings
create policy "bookings_select_owner" on bookings
for select using (is_listing_owner(listing_id));

-- Admin can view all bookings
create policy "bookings_select_admin" on bookings
for select using (is_admin());

-- System/owners can insert bookings (when payment confirmed)
create policy "bookings_insert_owner" on bookings
for insert with check (is_listing_owner(listing_id));

create policy "bookings_insert_admin" on bookings
for insert with check (is_admin());

-- Owners can update bookings for their listings (e.g., for transfers)
create policy "bookings_update_owner" on bookings
for update using (is_listing_owner(listing_id)) with check (is_listing_owner(listing_id));

create policy "bookings_update_admin" on bookings
for update using (is_admin()) with check (is_admin());

-- =====================================================================
-- Payments policies
-- =====================================================================
-- Tenants can view their own payments
create policy "payments_select_tenant" on payments
for select using (tenant_id = auth.uid());

-- Owners can view payments for their listings
create policy "payments_select_owner" on payments
for select using (is_listing_owner(listing_id));

-- Admin can view all payments
create policy "payments_select_admin" on payments
for select using (is_admin());

-- Tenants can insert their own payments (when initiating payment)
create policy "payments_insert_tenant" on payments
for insert with check (tenant_id = auth.uid());

-- Owners/Admin can insert payments (when confirming)
create policy "payments_insert_owner" on payments
for insert with check (is_listing_owner(listing_id));

create policy "payments_insert_admin" on payments
for insert with check (is_admin());

-- Owners/Admin can update payment status (confirm/reject)
create policy "payments_update_owner" on payments
for update using (is_listing_owner(listing_id)) with check (is_listing_owner(listing_id));

create policy "payments_update_admin" on payments
for update using (is_admin()) with check (is_admin());

-- =====================================================================
-- Agreements policies
-- =====================================================================
-- Tenants can view their own agreements
create policy "agreements_select_tenant" on agreements
for select using (tenant_id = auth.uid());

-- Owners can view agreements for their listings
create policy "agreements_select_owner" on agreements
for select using (is_listing_owner(listing_id));

-- Admin can view all agreements
create policy "agreements_select_admin" on agreements
for select using (is_admin());

-- Owners can insert agreements for their listings
create policy "agreements_insert_owner" on agreements
for insert with check (is_listing_owner(listing_id));

create policy "agreements_insert_admin" on agreements
for insert with check (is_admin());

-- Owners can update agreements for their listings
create policy "agreements_update_owner" on agreements
for update using (is_listing_owner(listing_id)) with check (is_listing_owner(listing_id));

create policy "agreements_update_admin" on agreements
for update using (is_admin()) with check (is_admin());

-- Tenants can accept agreements (update status to accepted)
create policy "agreements_update_tenant_accept" on agreements
for update using (
  tenant_id = auth.uid()
  and status = 'sent'
) with check (
  tenant_id = auth.uid()
  and status = 'accepted'
);

-- =====================================================================
-- Maintenance requests policies
-- =====================================================================
-- Tenants can view their own maintenance requests
create policy "maintenance_select_tenant" on maintenance_requests
for select using (tenant_id = auth.uid());

-- Owners can view maintenance for their listings
create policy "maintenance_select_owner" on maintenance_requests
for select using (is_listing_owner(listing_id));

-- Admin can view all maintenance
create policy "maintenance_select_admin" on maintenance_requests
for select using (is_admin());

-- Tenants can insert maintenance requests
create policy "maintenance_insert_tenant" on maintenance_requests
for insert with check (tenant_id = auth.uid());

-- Owners/Admin can update maintenance status
create policy "maintenance_update_owner" on maintenance_requests
for update using (is_listing_owner(listing_id)) with check (is_listing_owner(listing_id));

create policy "maintenance_update_admin" on maintenance_requests
for update using (is_admin()) with check (is_admin());

-- =====================================================================
-- Bills policies
-- =====================================================================
-- Owners can view bills for their listings
create policy "bills_select_owner" on bills
for select using (is_listing_owner(listing_id));

-- Admin can view all bills
create policy "bills_select_admin" on bills
for select using (is_admin());

-- Owners can insert bills for their listings
create policy "bills_insert_owner" on bills
for insert with check (is_listing_owner(listing_id));

create policy "bills_insert_admin" on bills
for insert with check (is_admin());

-- Owners can update bills for their listings
create policy "bills_update_owner" on bills
for update using (is_listing_owner(listing_id)) with check (is_listing_owner(listing_id));

create policy "bills_update_admin" on bills
for update using (is_admin()) with check (is_admin());

-- Owners can delete bills for their listings
create policy "bills_delete_owner" on bills
for delete using (is_listing_owner(listing_id));

create policy "bills_delete_admin" on bills
for delete using (is_admin());

-- =====================================================================
-- Roommate profiles policies
-- =====================================================================
-- Verified profiles can be viewed by anyone looking for roommates
create policy "roommate_profiles_select_verified" on roommate_profiles
for select using (is_verified = true);

-- Users can view their own profile
create policy "roommate_profiles_select_own" on roommate_profiles
for select using (user_id = auth.uid());

-- Admin can view all
create policy "roommate_profiles_select_admin" on roommate_profiles
for select using (is_admin());

-- Users can insert/update their own roommate profile
create policy "roommate_profiles_insert_own" on roommate_profiles
for insert with check (user_id = auth.uid());

create policy "roommate_profiles_update_own" on roommate_profiles
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Admin can manage all
create policy "roommate_profiles_admin" on roommate_profiles
for all using (is_admin()) with check (is_admin());

-- =====================================================================
-- Roommate requests policies
-- =====================================================================
-- Users can view requests they sent or received
create policy "roommate_requests_select_involved" on roommate_requests
for select using (from_user_id = auth.uid() or to_user_id = auth.uid());

create policy "roommate_requests_select_admin" on roommate_requests
for select using (is_admin());

-- Users can send requests
create policy "roommate_requests_insert_from" on roommate_requests
for insert with check (from_user_id = auth.uid());

-- Recipients can update status (accept/decline)
create policy "roommate_requests_update_to" on roommate_requests
for update using (to_user_id = auth.uid()) with check (to_user_id = auth.uid());

create policy "roommate_requests_update_admin" on roommate_requests
for update using (is_admin()) with check (is_admin());

-- =====================================================================
-- Rent transfers policies
-- =====================================================================
-- Anyone can view listed transfers (for "Sell space" browse)
create policy "rent_transfers_select_listed" on rent_transfers
for select using (status = 'listed');

-- Owner of the listing can view all transfers for their listing
create policy "rent_transfers_select_owner" on rent_transfers
for select using (is_listing_owner(listing_id));

-- Tenant who created the transfer can view it
create policy "rent_transfers_select_creator" on rent_transfers
for select using (
  exists (select 1 from bookings where id = booking_id and tenant_id = auth.uid())
);

-- Admin can view all
create policy "rent_transfers_select_admin" on rent_transfers
for select using (is_admin());

-- Tenants can create transfers for their bookings
create policy "rent_transfers_insert_tenant" on rent_transfers
for insert with check (
  exists (select 1 from bookings where id = booking_id and tenant_id = auth.uid())
);

create policy "rent_transfers_insert_admin" on rent_transfers
for insert with check (is_admin());

-- Owners/Admin can update transfer status
create policy "rent_transfers_update_owner" on rent_transfers
for update using (is_listing_owner(listing_id)) with check (is_listing_owner(listing_id));

create policy "rent_transfers_update_admin" on rent_transfers
for update using (is_admin()) with check (is_admin());

-- =====================================================================
-- Rent transfer requests policies
-- =====================================================================
-- Transfer creator and requester can view
create policy "rent_transfer_requests_select_involved" on rent_transfer_requests
for select using (
  exists (
    select 1 from rent_transfers rt
    join bookings b on b.id = rt.booking_id
    where rt.id = rent_transfer_requests.transfer_id
    and (b.tenant_id = auth.uid() or rent_transfer_requests.requester_id = auth.uid())
  )
);

create policy "rent_transfer_requests_select_admin" on rent_transfer_requests
for select using (is_admin());

-- Users can request a transfer
create policy "rent_transfer_requests_insert_requester" on rent_transfer_requests
for insert with check (requester_id = auth.uid());

-- Owner can approve/decline
create policy "rent_transfer_requests_update_owner" on rent_transfer_requests
for update using (
  exists (
    select 1 from rent_transfers rt
    where rt.id = rent_transfer_requests.transfer_id
    and is_listing_owner(rt.listing_id)
  )
) with check (
  exists (
    select 1 from rent_transfers rt
    where rt.id = rent_transfer_requests.transfer_id
    and is_listing_owner(rt.listing_id)
  )
);

create policy "rent_transfer_requests_update_admin" on rent_transfer_requests
for update using (is_admin()) with check (is_admin());

-- =====================================================================
-- Owner requests policies
-- =====================================================================
-- Owners can view requests for their listings
create policy "owner_requests_select_owner" on owner_requests
for select using (is_listing_owner(listing_id));

-- Admin can view all
create policy "owner_requests_select_admin" on owner_requests
for select using (is_admin());

-- System creates requests (when tenant applies, etc.)
create policy "owner_requests_insert_admin" on owner_requests
for insert with check (is_admin());

-- Owners/Admin can update request status
create policy "owner_requests_update_owner" on owner_requests
for update using (is_listing_owner(listing_id)) with check (is_listing_owner(listing_id));

create policy "owner_requests_update_admin" on owner_requests
for update using (is_admin()) with check (is_admin());

-- =====================================================================
-- Admin queue policies
-- =====================================================================
-- Only admin can view/manage admin queue
create policy "admin_queue_admin" on admin_queue
for all using (is_admin()) with check (is_admin());

-- =====================================================================
-- Listing media policies
-- =====================================================================
-- Anyone can view media of verified listings
create policy "listing_media_select_verified" on listing_media
for select using (
  exists (select 1 from listings where id = listing_id and verified = true)
);

-- Owners can view media of their listings
create policy "listing_media_select_owner" on listing_media
for select using (is_listing_owner(listing_id));

-- Admin can view all
create policy "listing_media_select_admin" on listing_media
for select using (is_admin());

-- Owners can insert media for their listings
create policy "listing_media_insert_owner" on listing_media
for insert with check (is_listing_owner(listing_id));

create policy "listing_media_insert_admin" on listing_media
for insert with check (is_admin());

-- Owners can delete media for their listings
create policy "listing_media_delete_owner" on listing_media
for delete using (is_listing_owner(listing_id));

create policy "listing_media_delete_admin" on listing_media
for delete using (is_admin());

-- =====================================================================
-- Listing amenities policies
-- =====================================================================
-- Anyone can view amenities of verified listings
create policy "listing_amenities_select_verified" on listing_amenities
for select using (
  exists (select 1 from listings where id = listing_id and verified = true)
);

-- Owners can view amenities of their listings
create policy "listing_amenities_select_owner" on listing_amenities
for select using (is_listing_owner(listing_id));

-- Admin can view all
create policy "listing_amenities_select_admin" on listing_amenities
for select using (is_admin());

-- Owners can manage amenities for their listings
create policy "listing_amenities_modify_owner" on listing_amenities
for all using (is_listing_owner(listing_id)) with check (is_listing_owner(listing_id));

create policy "listing_amenities_modify_admin" on listing_amenities
for all using (is_admin()) with check (is_admin());

-- =====================================================================
-- Listing locations policies
-- =====================================================================
-- Anyone can view location of verified listings
create policy "listing_locations_select_verified" on listing_locations
for select using (
  exists (select 1 from listings where id = listing_id and verified = true)
);

-- Owners can view location of their listings
create policy "listing_locations_select_owner" on listing_locations
for select using (is_listing_owner(listing_id));

-- Admin can view all
create policy "listing_locations_select_admin" on listing_locations
for select using (is_admin());

-- Owners can upsert location for their listings
create policy "listing_locations_modify_owner" on listing_locations
for all using (is_listing_owner(listing_id)) with check (is_listing_owner(listing_id));

create policy "listing_locations_modify_admin" on listing_locations
for all using (is_admin()) with check (is_admin());

-- =====================================================================
-- Agreement templates policies
-- =====================================================================
-- Owners can view templates for their listings
create policy "agreement_templates_select_owner" on agreement_templates
for select using (is_listing_owner(listing_id));

-- Admin can view all
create policy "agreement_templates_select_admin" on agreement_templates
for select using (is_admin());

-- Owners can upsert templates for their listings
create policy "agreement_templates_modify_owner" on agreement_templates
for all using (is_listing_owner(listing_id)) with check (is_listing_owner(listing_id));

create policy "agreement_templates_modify_admin" on agreement_templates
for all using (is_admin()) with check (is_admin());

-- =====================================================================
-- Saved listings policies
-- =====================================================================
-- Users can view their own saved listings
create policy "saved_listings_select_own" on saved_listings
for select using (user_id = auth.uid());

-- Admin can view all
create policy "saved_listings_select_admin" on saved_listings
for select using (is_admin());

-- Users can manage their own saved listings
create policy "saved_listings_modify_own" on saved_listings
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "saved_listings_modify_admin" on saved_listings
for all using (is_admin()) with check (is_admin());

-- =====================================================================
-- Property layouts policies
-- =====================================================================
-- Owners can view layouts for their listings
create policy "property_layouts_select_owner" on property_layouts
for select using (is_listing_owner(listing_id));

-- Admin can view all
create policy "property_layouts_select_admin" on property_layouts
for select using (is_admin());

-- Owners can manage layouts for their listings
create policy "property_layouts_modify_owner" on property_layouts
for all using (is_listing_owner(listing_id)) with check (is_listing_owner(listing_id));

create policy "property_layouts_modify_admin" on property_layouts
for all using (is_admin()) with check (is_admin());

-- =====================================================================
-- Notifications policies
-- =====================================================================
-- Users can view their own notifications
create policy "notifications_select_own" on notifications
for select using (user_id = auth.uid());

-- Admin can view all
create policy "notifications_select_admin" on notifications
for select using (is_admin());

-- System can insert notifications
create policy "notifications_insert_admin" on notifications
for insert with check (is_admin());

-- Users can mark their own as read
create policy "notifications_update_own" on notifications
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "notifications_update_admin" on notifications
for update using (is_admin()) with check (is_admin());