-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =====================================================================
-- Custom types
-- =====================================================================
create type user_role as enum ('tenant', 'owner', 'admin', 'student');
create type listing_type as enum ('hostel', 'rental', 'airbnb');
create type unit_status as enum ('vacant', 'occupied', 'reserved', 'maint');
create type payment_status as enum ('pending', 'confirmed', 'rejected');
create type agreement_status as enum ('draft', 'sent', 'accepted');
create type maintenance_status as enum ('open', 'work', 'done');
create type bill_status as enum ('due', 'paid', 'overdue');
create type kyc_status as enum ('none', 'review', 'verified');
create type bill_category as enum ('water', 'power', 'tv', 'staff');
create type gender_pref as enum ('any', 'f', 'm');
create type sleep_pref as enum ('early', 'late');
create type study_pref as enum ('quiet', 'group');

-- =====================================================================
-- Profiles (extends auth.users)
-- =====================================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'tenant',
  phone text,
  avatar_url text,
  -- KYC fields
  kyc_status kyc_status not null default 'none',
  id_type text,
  id_number_masked text,
  id_document_url text,
  selfie_url text,
  student_proof_url text,
  next_of_kin_name text,
  next_of_kin_phone text,
  is_student boolean default false,
  -- Preferences (for roommate matching)
  course text,
  college text,
  gender gender_pref default 'any',
  budget integer default 400000,
  sleep sleep_pref default 'early',
  clean_level integer default 4 check (clean_level between 1 and 5),
  study study_pref default 'quiet',
  prefs_done boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- Properties / Listings
-- =====================================================================
create table listings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type listing_type not null,
  area text not null,
  price integer not null, -- in UGX
  per text not null default 'month', -- 'month' or 'night'
  unit_type text not null, -- e.g., 'Single room', '2-bedroom apartment'
  distance_km numeric(4,1) default 0,
  total_units integer not null default 1,
  available_units integer not null default 1,
  owner_id uuid not null references profiles(id),
  owner_name text not null, -- denormalized for display
  amenities text[] not null default '{}',
  description text,
  hue integer not null default 168,
  verified boolean not null default false,
  verification_docs jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- Units (rooms within a property)
-- =====================================================================
create table units (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  unit_code text not null, -- e.g., 'A-01', 'G-05', '101'
  floor integer not null default 0,
  rent integer not null, -- monthly rent in UGX
  status unit_status not null default 'vacant',
  -- Tenant info (when occupied)
  tenant_id uuid references profiles(id),
  tenant_name text,
  payment_status text default 'paid', -- 'paid', 'due', 'overdue'
  balance integer default 0,
  paid_through timestamptz,
  credit_rating text default 'Good',
  months_paid_ytd integer default 0,
  efris_receipts_count integer default 0,
  is_corporate boolean default false,
  roommate_id uuid references profiles(id),
  roommate_name text,
  -- For restoring previous tenant
  kept_tenant_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, unit_code)
);

-- =====================================================================
-- Bookings (confirmed stays)
-- =====================================================================
create table bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique, -- e.g., 'RP-2026-0412'
  listing_id uuid not null references listings(id),
  unit_id uuid not null references units(id),
  tenant_id uuid not null references profiles(id),
  tenant_name text not null,
  room_code text not null,
  start_date date not null,
  months integer not null default 0,
  nights integer not null default 0,
  amount integer not null, -- rent amount
  fee integer not null, -- 3% service fee
  deposit integer not null default 0,
  payment_method text not null,
  paid_by text not null default 'Self',
  purpose text not null, -- 'Rent, 6 months' or 'Stay, 2 nights'
  created_at timestamptz not null default now(),
  listed_for_transfer boolean not null default false,
  transfer_price integer,
  transfer_reason text,
  transfer_from_date date,
  efris_document_no text,
  verification_code text
);

-- =====================================================================
-- Agreements
-- =====================================================================
create table agreements (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique, -- e.g., 'AG-2026-3001'
  listing_id uuid not null references listings(id),
  unit_id uuid references units(id),
  room_code text not null,
  tenant_id uuid not null references profiles(id),
  tenant_name text not null,
  quantity integer not null, -- months or nights
  start_date date not null,
  status agreement_status not null default 'draft',
  terms jsonb not null default '{}'::jsonb,
  issued_at timestamptz,
  accepted_at timestamptz,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Payments
-- =====================================================================
create table payments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique, -- e.g., 'RP-2026-0412'
  listing_id uuid not null references listings(id),
  unit_id uuid references units(id),
  room_code text not null,
  tenant_id uuid not null references profiles(id),
  tenant_name text not null,
  start_date date not null,
  months integer not null default 0,
  nights integer not null default 0,
  amount integer not null,
  fee integer not null,
  deposit integer not null default 0,
  payment_method text not null,
  paid_by text not null default 'Self',
  purpose text not null,
  status payment_status not null default 'pending',
  agreement_id uuid references agreements(id),
  from_source text, -- mobile number or card info
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  efris_document_no text,
  verification_code text
);

-- =====================================================================
-- Maintenance requests
-- =====================================================================
create table maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id),
  unit_id uuid not null references units(id),
  room_code text not null,
  tenant_id uuid not null references profiles(id),
  tenant_name text not null,
  type text not null, -- 'plumbing', 'electricity', etc.
  urgent boolean not null default false,
  note text not null,
  status maintenance_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- Bills (owner-entered)
-- =====================================================================
create table bills (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id),
  category bill_category not null,
  name text not null, -- provider or worker name
  reference text, -- meter number, account number, etc.
  note text,
  amount integer not null,
  due_date date not null,
  status bill_status not null default 'due',
  role text, -- for staff: 'Cleaner', 'Security guard', etc.
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- Roommate matching profiles
-- =====================================================================
create table roommate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  full_name text not null,
  course text,
  college text,
  gender text not null, -- 'f' or 'm'
  year integer,
  budget integer not null,
  sleep sleep_pref not null,
  clean_level integer not null check (clean_level between 1 and 5),
  study study_pref not null,
  location text,
  is_verified boolean not null default true, -- sample profiles are verified
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Roommate requests
-- =====================================================================
create table roommate_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references profiles(id),
  to_user_id uuid not null references profiles(id),
  status text not null default 'pending', -- 'pending', 'accepted', 'declined'
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Rent transfers (sell space)
-- =====================================================================
create table rent_transfers (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id),
  listing_id uuid not null references listings(id),
  unit_id uuid not null references units(id),
  room_code text not null,
  months_left integer not null,
  price_per_month integer not null,
  available_from date not null,
  reason text not null,
  status text not null default 'listed', -- 'listed', 'requested', 'approved', 'completed'
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Rent transfer requests
-- =====================================================================
create table rent_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references rent_transfers(id),
  requester_id uuid not null references profiles(id),
  status text not null default 'pending', -- 'pending', 'approved', 'declined'
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Owner requests (for admin/owner approval)
-- =====================================================================
create table owner_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id),
  kind text not null, -- 'New tenant', 'Rent transfer', 'Roommate request'
  requester_name text not null,
  details text not null,
  status text not null default 'open', -- 'open', 'approved', 'declined'
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- =====================================================================
-- Admin queue items (verification, fraud, etc.)
-- =====================================================================
create table admin_queue (
  id uuid primary key default gen_random_uuid(),
  kind text not null, -- 'Student', 'New block', 'Tenant', 'Fraud'
  subject_name text not null,
  details text not null,
  documents jsonb default '[]'::jsonb, -- array of [doc_name, status]
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- =====================================================================
-- Listing media (photos, videos)
-- =====================================================================
create table listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  type text not null check (type in ('photo', 'video')),
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Listing amenities (custom per listing)
-- =====================================================================
create table listing_amenities (
  listing_id uuid not null references listings(id) on delete cascade,
  amenity text not null,
  primary key (listing_id, amenity)
);

-- =====================================================================
-- Listing location (GPS pin)
-- =====================================================================
create table listing_locations (
  listing_id uuid primary key references listings(id) on delete cascade,
  lat numeric(10, 7) not null,
  lng numeric(10, 7) not null,
  address text,
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- Agreement templates (custom terms per listing)
-- =====================================================================
create table agreement_templates (
  listing_id uuid primary key references listings(id) on delete cascade,
  deposit_months integer not null default 0,
  late_fee_percent integer not null default 5,
  notice_days integer not null default 30,
  house_rules text not null,
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- Saved/favorite listings
-- =====================================================================
create table saved_listings (
  user_id uuid not null references profiles(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- =====================================================================
-- Property layouts (admin floor plans)
-- =====================================================================
create table property_layouts (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  floor integer not null,
  columns integer not null default 3,
  rows integer not null default 1,
  unique (listing_id, floor)
);

-- =====================================================================
-- Notifications
-- =====================================================================
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  data jsonb default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Indexes for performance
-- =====================================================================
create index idx_listings_owner on listings(owner_id);
create index idx_listings_area on listings(area);
create index idx_listings_type on listings(type);
create index idx_listings_verified on listings(verified);
create index idx_units_listing on units(listing_id);
create index idx_units_status on units(status);
create index idx_units_tenant on units(tenant_id);
create index idx_bookings_tenant on bookings(tenant_id);
create index idx_bookings_listing on bookings(listing_id);
create index idx_payments_tenant on payments(tenant_id);
create index idx_payments_status on payments(status);
create index idx_payments_listing on payments(listing_id);
create index idx_agreements_tenant on agreements(tenant_id);
create index idx_agreements_listing on agreements(listing_id);
create index idx_maintenance_unit on maintenance_requests(unit_id);
create index idx_maintenance_status on maintenance_requests(status);
create index idx_bills_listing on bills(listing_id);
create index idx_bills_status on bills(status);
create index idx_notifications_user on notifications(user_id);
create index idx_notifications_read on notifications(read);
create index idx_roommate_requests_from on roommate_requests(from_user_id);
create index idx_roommate_requests_to on roommate_requests(to_user_id);
create index idx_rent_transfers_listing on rent_transfers(listing_id);