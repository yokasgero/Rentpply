-- =====================================================================
-- Seed data for Rentpply
-- 20 random profiles: 1 admin, rest random (tenant, owner, student)
-- =====================================================================

-- First, create auth users (these would normally be created via Supabase Auth)
-- We'll insert profiles directly with known UUIDs for consistent seeding

-- =====================================================================
-- 0. AUTH USERS (must exist before profiles due to FK constraint)
-- =====================================================================
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, role, aud)
values
  ('a0000000-0000-0000-0000-000000000001', 'admin@rentpply.com', '$2a$10$dummyhash', now(), now(), now(), 'authenticated', 'authenticated'),
  ('b0000000-0000-0000-0000-000000000001', 'owner1@rentpply.com', '$2a$10$dummyhash', now(), now(), now(), 'authenticated', 'authenticated'),
  ('b0000000-0000-0000-0000-000000000002', 'owner2@rentpply.com', '$2a$10$dummyhash', now(), now(), now(), 'authenticated', 'authenticated'),
  ('b0000000-0000-0000-0000-000000000003', 'owner3@rentpply.com', '$2a$10$dummyhash', now(), now(), now(), 'authenticated', 'authenticated'),
  ('b0000000-0000-0000-0000-000000000004', 'owner4@rentpply.com', '$2a$10$dummyhash', now(), now(), now(), 'authenticated', 'authenticated'),
  ('c0000000-0000-0000-0000-000000000001', 'yokas@rentpply.com', '$2a$10$dummyhash', now(), now(), now(), 'authenticated', 'authenticated'),
  ('c0000000-0000-0000-0000-000000000002', 'nakato@rentpply.com', '$2a$10$dummyhash', now(), now(), now(), 'authenticated', 'authenticated'),
  ('c0000000-0000-0000-0000-000000000003', 'okello@rentpply.com', '$2a$10$dummyhash', now(), now(), now(), 'authenticated', 'authenticated'),
  ('c0000000-0000-0000-0000-000000000004', 'namutebi@rentpply.com', '$2a$10$dummyhash', now(), now(), now(), 'authenticated', 'authenticated'),
  ('c0000000-0000-0000-0000-000000000005', 'mugisha@rentpply.com', '$2a$10$dummyhash', now(), now(), now(), 'authenticated', 'authenticated'),
  ('c0000000-0000-0000-0000-000000000006', 'achieng@rentpply.com', '$2a$10$dummyhash', now(), now(), now(), 'authenticated', 'authenticated'),
  ('c0000000-0000-0000-0000-000000000007', 'kato@rentpply.com', '$2a$10$dummyhash', now(), now(), now(), 'authenticated', 'authenticated'),
  ('c0000000-0000-0000-0000-000000000008', 'nansubuga@rentpply.com', '$2a$10$dummyhash', now(), now(), now(), 'authenticated', 'authenticated'),
  ('c0000000-0000-0000-0000-000000000009', 'brian@rentpply.com', '$2a$10$dummyhash', now(), now(), now(), 'authenticated', 'authenticated'),
  ('d0000000-0000-0000-0000-000000000001', 'aisha@rentpply.com', '$2a$10$dummyhash', now(), now(), now(), 'authenticated', 'authenticated'),
  ('d0000000-0000-0000-0000-000000000002', 'brian.kaweesi@rentpply.com', '$2a$10$dummyhash', now(), now(), now(), 'authenticated', 'authenticated'),
  ('d0000000-0000-0000-0000-000000000003', 'doreen@rentpply.com', '$2a$10$dummyhash', now(), now(), now(), 'authenticated', 'authenticated'),
  ('d0000000-0000-0000-0000-000000000004', 'collins@rentpply.com', '$2a$10$dummyhash', now(), now(), now(), 'authenticated', 'authenticated'),
  ('d0000000-0000-0000-0000-000000000005', 'prossy@rentpply.com', '$2a$10$dummyhash', now(), now(), now(), 'authenticated', 'authenticated'),
  ('d0000000-0000-0000-0000-000000000006', 'esther@rentpply.com', '$2a$10$dummyhash', now(), now(), now(), 'authenticated', 'authenticated'),
  ('d0000000-0000-0000-0000-000000000007', 'samuel@rentpply.com', '$2a$10$dummyhash', now(), now(), now(), 'authenticated', 'authenticated')
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  updated_at = excluded.updated_at;

-- =====================================================================
-- 1. ADMIN PROFILE
-- =====================================================================
insert into profiles (id, full_name, role, phone, kyc_status, is_student, prefs_done, created_at)
values
  ('a0000000-0000-0000-0000-000000000001', 'Admin User', 'admin', '+256700000001', 'verified', false, true, now() - interval '30 days')
on conflict (id) do update set
  full_name = excluded.full_name,
  role = excluded.role,
  phone = excluded.phone,
  kyc_status = excluded.kyc_status,
  is_student = excluded.is_student,
  prefs_done = excluded.prefs_done;

-- =====================================================================
-- 2. OWNER PROFILES (4 owners)
-- =====================================================================
insert into profiles (id, full_name, role, phone, kyc_status, is_student, prefs_done, created_at)
values
  ('b0000000-0000-0000-0000-000000000001', 'Ssemakula Properties', 'owner', '+256701111111', 'verified', false, true, now() - interval '60 days'),
  ('b0000000-0000-0000-0000-000000000002', 'Court Estates Ltd', 'owner', '+256701222222', 'verified', false, true, now() - interval '55 days'),
  ('b0000000-0000-0000-0000-000000000003', 'Heights Hospitality', 'owner', '+256701333333', 'verified', false, true, now() - interval '50 days'),
  ('b0000000-0000-0000-0000-000000000004', 'Garden Estates', 'owner', '+256701444444', 'verified', false, true, now() - interval '45 days')
on conflict (id) do update set
  full_name = excluded.full_name,
  role = excluded.role,
  phone = excluded.phone,
  kyc_status = excluded.kyc_status,
  is_student = excluded.is_student,
  prefs_done = excluded.prefs_done;

-- =====================================================================
-- 3. TENANT PROFILES (9 tenants)
-- =====================================================================
insert into profiles (id, full_name, role, phone, kyc_status, is_student, course, college, gender, budget, sleep, clean_level, study, prefs_done, created_at)
values
  ('c0000000-0000-0000-0000-000000000001', 'Yokas Gero', 'tenant', '+256702111111', 'verified', true, 'Computer Science', 'COCIS', 'any', 400000, 'early', 4, 'quiet', true, now() - interval '40 days'),
  ('c0000000-0000-0000-0000-000000000002', 'Nakato Sarah', 'tenant', '+256702222222', 'verified', true, 'Law', 'School of Law', 'f', 450000, 'early', 5, 'quiet', true, now() - interval '38 days'),
  ('c0000000-0000-0000-0000-000000000003', 'Okello Brian', 'tenant', '+256702333333', 'verified', true, 'Computer Science', 'COCIS', 'm', 420000, 'late', 3, 'group', true, now() - interval '35 days'),
  ('c0000000-0000-0000-0000-000000000004', 'Namutebi Joy', 'tenant', '+256702444444', 'verified', true, 'Economics', 'CoBAMS', 'f', 380000, 'early', 4, 'quiet', true, now() - interval '32 days'),
  ('c0000000-0000-0000-0000-000000000005', 'Mugisha Allan', 'tenant', '+256702555555', 'review', false, 'Banking', 'CoBAMS', 'm', 600000, 'early', 4, 'quiet', true, now() - interval '30 days'),
  ('c0000000-0000-0000-0000-000000000006', 'Achieng Ruth', 'tenant', '+256702666666', 'verified', true, 'Medicine', 'CHS', 'f', 520000, 'late', 5, 'group', true, now() - interval '28 days'),
  ('c0000000-0000-0000-0000-000000000007', 'Kato Daniel', 'tenant', '+256702777777', 'verified', false, 'Software Dev', 'Private', 'm', 700000, 'early', 3, 'quiet', true, now() - interval '25 days'),
  ('c0000000-0000-0000-0000-000000000008', 'Nansubuga Pearl', 'tenant', '+256702888888', 'verified', true, 'Architecture', 'CEDAT', 'f', 480000, 'early', 4, 'quiet', true, now() - interval '22 days'),
  ('c0000000-0000-0000-0000-000000000009', 'Brian Kigozi', 'tenant', '+256702999999', 'verified', true, 'Computer Science', 'COCIS', 'm', 400000, 'early', 4, 'quiet', true, now() - interval '20 days')
on conflict (id) do update set
  full_name = excluded.full_name,
  role = excluded.role,
  phone = excluded.phone,
  kyc_status = excluded.kyc_status,
  is_student = excluded.is_student,
  course = excluded.course,
  college = excluded.college,
  gender = excluded.gender,
  budget = excluded.budget,
  sleep = excluded.sleep,
  clean_level = excluded.clean_level,
  study = excluded.study,
  prefs_done = excluded.prefs_done;

-- =====================================================================
-- 4. STUDENT PROFILES (7 students - same as tenant but role='student')
-- Student platform = tenant platform with all features
-- =====================================================================
insert into profiles (id, full_name, role, phone, kyc_status, is_student, course, college, gender, budget, sleep, clean_level, study, prefs_done, created_at)
values
  ('d0000000-0000-0000-0000-000000000001', 'Aisha Nakamya', 'student', '+256703111111', 'verified', true, 'Computer Science', 'COCIS', 'f', 380000, 'early', 5, 'quiet', true, now() - interval '20 days'),
  ('d0000000-0000-0000-0000-000000000002', 'Brian Kaweesi', 'student', '+256703222222', 'verified', true, 'Computer Science', 'COCIS', 'm', 420000, 'late', 3, 'group', true, now() - interval '18 days'),
  ('d0000000-0000-0000-0000-000000000003', 'Doreen Atim', 'student', '+256703333333', 'verified', true, 'Software Engineering', 'COCIS', 'f', 350000, 'early', 4, 'quiet', true, now() - interval '16 days'),
  ('d0000000-0000-0000-0000-000000000004', 'Collins Wanyama', 'student', '+256703444444', 'review', true, 'Law', 'School of Law', 'm', 450000, 'early', 4, 'quiet', true, now() - interval '14 days'),
  ('d0000000-0000-0000-0000-000000000005', 'Prossy Namusoke', 'student', '+256703555555', 'verified', true, 'Medicine', 'CHS', 'f', 500000, 'late', 5, 'group', true, now() - interval '12 days'),
  ('d0000000-0000-0000-0000-000000000006', 'Esther Kyomuhendo', 'student', '+256703666666', 'verified', true, 'Economics', 'CoBAMS', 'f', 400000, 'early', 4, 'quiet', true, now() - interval '10 days'),
  ('d0000000-0000-0000-0000-000000000007', 'Samuel Opio', 'student', '+256703777777', 'verified', true, 'Statistics', 'CoBAMS', 'm', 380000, 'early', 3, 'quiet', true, now() - interval '8 days')
on conflict (id) do update set
  full_name = excluded.full_name,
  role = excluded.role,
  phone = excluded.phone,
  kyc_status = excluded.kyc_status,
  is_student = excluded.is_student,
  course = excluded.course,
  college = excluded.college,
  gender = excluded.gender,
  budget = excluded.budget,
  sleep = excluded.sleep,
  clean_level = excluded.clean_level,
  study = excluded.study,
  prefs_done = excluded.prefs_done;

-- =====================================================================
-- LISTINGS (11 properties matching the frontend sample data)
-- Using proper UUIDs for listing IDs
-- =====================================================================
insert into listings (id, name, type, area, price, per, unit_type, distance_km, total_units, available_units, owner_id, owner_name, amenities, description, hue, verified, created_at)
values
  -- Hostels near Makerere
  ('10000001-0000-0000-0000-000000000001', 'Kikoni Scholars Hostel', 'hostel', 'Kikoni', 380000, 'month', 'Single room', 0.6, 48, 6, 'b0000000-0000-0000-0000-000000000001', 'Ssemakula Properties', ARRAY['Wi-Fi', '24h security', 'Water tank', 'Study room', 'Backup power'], 'Purpose-built student hostel with a guarded gate, a quiet study room on every floor and a ten-minute walk to the main gate of Makerere University.', 168, true, now() - interval '60 days'),
  ('10000002-0000-0000-0000-000000000002', 'Wandegeya Court Hostel', 'hostel', 'Wandegeya', 320000, 'month', 'Double room (shared)', 0.9, 60, 11, 'b0000000-0000-0000-0000-000000000002', 'Court Estates Ltd', ARRAY['Wi-Fi', 'CCTV', 'Laundry area', 'Kitchenette'], 'Shared double rooms with a kitchenette per floor. Close to the Wandegeya market and boda stage. Rent is paid per semester block or monthly.', 205, true, now() - interval '55 days'),
  ('10000003-0000-0000-0000-000000000003', 'Makerere Heights Residence', 'hostel', 'Makerere', 520000, 'month', 'En-suite single', 0.3, 30, 3, 'b0000000-0000-0000-0000-000000000003', 'Heights Hospitality', ARRAY['En-suite bathroom', 'Wi-Fi', 'Generator', '24h security', 'Cafeteria'], 'Premium en-suite singles within walking distance of the lecture blocks. Backup generator keeps lights and Wi-Fi on during load shedding.', 28, true, now() - interval '50 days'),
  ('10000011-0000-0000-0000-000000000011', 'Kansanga Student Lodge', 'hostel', 'Kansanga', 290000, 'month', 'Single room', 1.4, 36, 9, 'b0000000-0000-0000-0000-000000000004', 'Garden Estates', ARRAY['Wi-Fi', 'Water tank', 'Security guard'], 'Budget single rooms for students at Makerere Business School and nearby colleges.', 330, true, now() - interval '40 days'),
  -- Rentals
  ('10000004-0000-0000-0000-000000000004', 'Ntinda Garden Apartments', 'rental', 'Ntinda', 1200000, 'month', '2-bedroom apartment', 6.2, 16, 2, 'b0000000-0000-0000-0000-000000000004', 'Garden Estates', ARRAY['Parking', 'Garden', 'Water tank', 'Security guard'], 'Two-bedroom apartments in a gated compound with a shared garden. Twelve-month agreements with a two-month deposit.', 140, true, now() - interval '45 days'),
  ('10000005-0000-0000-0000-000000000005', 'Muyenga Hill Studio', 'rental', 'Muyenga', 750000, 'month', 'Studio', 8.4, 6, 1, 'b0000000-0000-0000-0000-000000000004', 'Garden Estates', ARRAY['Hill view', 'Parking', 'Wi-Fi ready'], 'A bright studio on Tank Hill road with a balcony view across the city. Quiet street and a short ride from Ggaba Road.', 300, true, now() - interval '42 days'),
  ('10000008-0000-0000-0000-000000000008', 'Bukoto Family Flat', 'rental', 'Bukoto', 900000, 'month', '2-bedroom flat', 5.0, 10, 2, 'b0000000-0000-0000-0000-000000000001', 'Ssemakula Properties', ARRAY['Security guard', 'Water tank', 'Parking'], 'Family flat close to schools and Bukoto market. Landlord on the premises.', 85, true, now() - interval '38 days'),
  ('10000009-0000-0000-0000-000000000009', 'Najjera Budget Rooms', 'rental', 'Najjera', 280000, 'month', 'Single room', 12.0, 20, 8, 'b0000000-0000-0000-0000-000000000002', 'Court Estates Ltd', ARRAY['Water', 'Shared compound'], 'Listing submitted and waiting for document and site checks. It cannot be booked until an administrator verifies the owner and the property.', 50, false, now() - interval '10 days'),
  -- Airbnbs
  ('10000006-0000-0000-0000-000000000006', 'Kololo Serviced Suites', 'airbnb', 'Kololo', 260000, 'night', 'One-bedroom suite', 3.1, 12, 5, 'b0000000-0000-0000-0000-000000000003', 'Heights Hospitality', ARRAY['Daily cleaning', 'Wi-Fi', 'Air conditioning', 'Breakfast'], 'Serviced suites for visitors and business travellers. Self check-in with a code sent after payment is confirmed.', 18, true, now() - interval '35 days'),
  ('10000007-0000-0000-0000-000000000007', 'Munyonyo Lakeside Stay', 'airbnb', 'Munyonyo', 210000, 'night', 'Lake-view room', 11.0, 8, 4, 'b0000000-0000-0000-0000-000000000001', 'Ssemakula Properties', ARRAY['Lake view', 'Pool', 'Breakfast', 'Parking'], 'Quiet rooms facing Lake Victoria. Popular with families and weekend guests.', 195, true, now() - interval '30 days'),
  ('10000010-0000-0000-0000-000000000010', 'Nakasero Business Stay', 'airbnb', 'Nakasero', 340000, 'night', 'Executive room', 2.4, 9, 3, 'b0000000-0000-0000-0000-000000000002', 'Court Estates Ltd', ARRAY['Desk', 'Wi-Fi', 'Air conditioning', 'Airport pickup'], 'Executive rooms with a work desk, close to government offices and banks.', 250, true, now() - interval '28 days')
on conflict (id) do update set
  name = excluded.name,
  type = excluded.type,
  area = excluded.area,
  price = excluded.price,
  per = excluded.per,
  unit_type = excluded.unit_type,
  distance_km = excluded.distance_km,
  total_units = excluded.total_units,
  available_units = excluded.available_units,
  owner_id = excluded.owner_id,
  owner_name = excluded.owner_name,
  amenities = excluded.amenities,
  description = excluded.description,
  hue = excluded.hue,
  verified = excluded.verified;

-- =====================================================================
-- UNITS for Kikoni Scholars Hostel (listing 1) - 24 units (A-01 to B-12)
-- =====================================================================
insert into units (id, listing_id, unit_code, floor, rent, status, tenant_id, tenant_name, payment_status, balance, paid_through, credit_rating, months_paid_ytd, efris_receipts_count, is_corporate, roommate_id, roommate_name, created_at)
values
  -- Floor 0 (Ground floor - Block A)
  (gen_random_uuid(), '10000001-0000-0000-0000-000000000001', 'A-01', 0, 380000, 'occupied', 'c0000000-0000-0000-0000-000000000002', 'Nakato Sarah', 'paid', 0, now() + interval '6 months', 'Excellent', 4, 4, false, null, null, now() - interval '50 days'),
  (gen_random_uuid(), '10000001-0000-0000-0000-000000000001', 'A-02', 0, 380000, 'occupied', 'c0000000-0000-0000-0000-000000000003', 'Okello Brian', 'paid', 0, now() + interval '6 months', 'Good', 4, 4, false, 'd0000000-0000-0000-0000-000000000003', 'Doreen Atim', now() - interval '50 days'),
  (gen_random_uuid(), '10000001-0000-0000-0000-000000000001', 'A-03', 0, 380000, 'occupied', 'c0000000-0000-0000-0000-000000000008', 'Nansubuga Pearl', 'paid', 0, now() + interval '5 months', 'Good', 3, 3, false, null, null, now() - interval '45 days'),
  (gen_random_uuid(), '10000001-0000-0000-0000-000000000001', 'A-04', 0, 380000, 'occupied', null, 'Nile Logistics Ltd', 'paid', 0, now() + interval '4 months', 'Excellent', 4, 4, true, null, null, now() - interval '40 days'),
  (gen_random_uuid(), '10000001-0000-0000-0000-000000000001', 'A-05', 0, 380000, 'occupied', 'd0000000-0000-0000-0000-000000000001', 'Aisha Nakamya', 'paid', 0, now() + interval '4 months', 'Good', 3, 3, false, null, null, now() - interval '35 days'),
  (gen_random_uuid(), '10000001-0000-0000-0000-000000000001', 'A-06', 0, 380000, 'occupied', 'c0000000-0000-0000-0000-000000000004', 'Namutebi Joy', 'paid', 0, now() + interval '3 months', 'Good', 3, 3, false, null, null, now() - interval '30 days'),
  (gen_random_uuid(), '10000001-0000-0000-0000-000000000001', 'A-07', 0, 380000, 'occupied', 'd0000000-0000-0000-0000-000000000004', 'Collins Wanyama', 'paid', 0, now() + interval '3 months', 'Good', 2, 2, false, null, null, now() - interval '25 days'),
  (gen_random_uuid(), '10000001-0000-0000-0000-000000000001', 'A-08', 0, 380000, 'occupied', 'd0000000-0000-0000-0000-000000000005', 'Prossy Namusoke', 'paid', 0, now() + interval '2 months', 'Good', 2, 2, false, null, null, now() - interval '20 days'),
  (gen_random_uuid(), '10000001-0000-0000-0000-000000000001', 'A-09', 0, 380000, 'occupied', 'c0000000-0000-0000-0000-000000000001', 'Yokas Gero', 'paid', 0, now() + interval '6 months', 'Excellent', 4, 4, false, null, null, now() - interval '52 days'),
  (gen_random_uuid(), '10000001-0000-0000-0000-000000000001', 'A-10', 0, 380000, 'vacant', null, null, null, 0, null, null, 0, 0, false, null, null, now() - interval '10 days'),
  (gen_random_uuid(), '10000001-0000-0000-0000-000000000001', 'A-11', 0, 380000, 'vacant', null, null, null, 0, null, null, 0, 0, false, null, null, now() - interval '10 days'),
  (gen_random_uuid(), '10000001-0000-0000-0000-000000000001', 'A-12', 0, 380000, 'vacant', null, null, null, 0, null, null, 0, 0, false, null, null, now() - interval '10 days'),
  -- Floor 1 (Block B)
  (gen_random_uuid(), '10000001-0000-0000-0000-000000000001', 'B-01', 1, 380000, 'occupied', 'd0000000-0000-0000-0000-000000000006', 'Esther Kyomuhendo', 'paid', 0, now() + interval '3 months', 'Good', 3, 3, false, null, null, now() - interval '30 days'),
  (gen_random_uuid(), '10000001-0000-0000-0000-000000000001', 'B-02', 1, 380000, 'occupied', 'd0000000-0000-0000-0000-000000000007', 'Samuel Opio', 'paid', 0, now() + interval '2 months', 'Good', 2, 2, false, null, null, now() - interval '20 days'),
  (gen_random_uuid(), '10000001-0000-0000-0000-000000000001', 'B-03', 1, 380000, 'occupied', null, 'Lake Basin Traders', 'paid', 0, now() + interval '4 months', 'Excellent', 4, 4, true, null, null, now() - interval '40 days'),
  (gen_random_uuid(), '10000001-0000-0000-0000-000000000001', 'B-04', 1, 380000, 'occupied', 'c0000000-0000-0000-0000-000000000006', 'Achieng Ruth', 'paid', 0, now() + interval '5 months', 'Good', 3, 3, false, null, null, now() - interval '28 days'),
  (gen_random_uuid(), '10000001-0000-0000-0000-000000000001', 'B-05', 1, 380000, 'reserved', null, 'Brian Kigozi', null, 0, null, null, 0, 0, false, null, null, now() - interval '15 days'),
  (gen_random_uuid(), '10000001-0000-0000-0000-000000000001', 'B-06', 1, 380000, 'occupied', 'c0000000-0000-0000-0000-000000000007', 'Kato Daniel', 'overdue', 380000, now() - interval '9 days', 'Watch', 3, 3, false, null, null, now() - interval '25 days'),
  (gen_random_uuid(), '10000001-0000-0000-0000-000000000001', 'B-07', 1, 380000, 'occupied', 'c0000000-0000-0000-0000-000000000005', 'Mugisha Allan', 'due', 190000, now() + interval '4 days', 'Good', 4, 4, false, null, null, now() - interval '30 days'),
  (gen_random_uuid(), '10000001-0000-0000-0000-000000000001', 'B-08', 1, 380000, 'vacant', null, null, null, 0, null, null, 0, 0, false, null, null, now() - interval '10 days'),
  (gen_random_uuid(), '10000001-0000-0000-0000-000000000001', 'B-09', 1, 380000, 'vacant', null, null, null, 0, null, null, 0, 0, false, null, null, now() - interval '10 days'),
  (gen_random_uuid(), '10000001-0000-0000-0000-000000000001', 'B-10', 1, 380000, 'vacant', null, null, null, 0, null, null, 0, 0, false, null, null, now() - interval '10 days'),
  (gen_random_uuid(), '10000001-0000-0000-0000-000000000001', 'B-11', 1, 380000, 'maint', null, null, null, 0, null, null, 0, 0, false, null, null, now() - interval '10 days'),
  (gen_random_uuid(), '10000001-0000-0000-0000-000000000001', 'B-12', 1, 380000, 'vacant', null, null, null, 0, null, null, 0, 0, false, null, null, now() - interval '10 days')
on conflict (listing_id, unit_code) do update set
  floor = excluded.floor,
  rent = excluded.rent,
  status = excluded.status,
  tenant_id = excluded.tenant_id,
  tenant_name = excluded.tenant_name,
  payment_status = excluded.payment_status,
  balance = excluded.balance,
  paid_through = excluded.paid_through,
  credit_rating = excluded.credit_rating,
  months_paid_ytd = excluded.months_paid_ytd,
  efris_receipts_count = excluded.efris_receipts_count,
  is_corporate = excluded.is_corporate,
  roommate_id = excluded.roommate_id,
  roommate_name = excluded.roommate_name;

-- =====================================================================
-- UNITS for other listings (simplified - just a few units each)
-- =====================================================================
-- Wandegeya Court Hostel (listing 2)
insert into units (listing_id, unit_code, floor, rent, status, created_at)
select '10000002-0000-0000-0000-000000000002', 'W-' || lpad(g::text, 2, '0'), 0, 320000, 'vacant', now() - interval '10 days'
from generate_series(1, 60) g
on conflict (listing_id, unit_code) do nothing;

-- Makerere Heights Residence (listing 3)
insert into units (listing_id, unit_code, floor, rent, status, created_at)
select '10000003-0000-0000-0000-000000000003', 'M-' || lpad(g::text, 2, '0'), (g-1)/10, 520000, 'vacant', now() - interval '10 days'
from generate_series(1, 30) g
on conflict (listing_id, unit_code) do nothing;

-- Ntinda Garden Apartments (listing 4)
insert into units (listing_id, unit_code, floor, rent, status, created_at)
select '10000004-0000-0000-0000-000000000004', 'N-' || lpad(g::text, 2, '0'), (g-1)/4, 1200000, 'vacant', now() - interval '10 days'
from generate_series(1, 16) g
on conflict (listing_id, unit_code) do nothing;

-- Other listings - minimal units
insert into units (listing_id, unit_code, floor, rent, status, created_at)
select '10000005-0000-0000-0000-000000000005', 'MU-' || lpad(g::text, 2, '0'), 0, 750000, 'vacant', now() - interval '10 days'
from generate_series(1, 6) g
on conflict (listing_id, unit_code) do nothing;

insert into units (listing_id, unit_code, floor, rent, status, created_at)
select '10000006-0000-0000-0000-000000000006', 'K-' || lpad(g::text, 2, '0'), 0, 260000, 'vacant', now() - interval '10 days'
from generate_series(1, 12) g
on conflict (listing_id, unit_code) do nothing;

insert into units (listing_id, unit_code, floor, rent, status, created_at)
select '10000007-0000-0000-0000-000000000007', 'ML-' || lpad(g::text, 2, '0'), 0, 210000, 'vacant', now() - interval '10 days'
from generate_series(1, 8) g
on conflict (listing_id, unit_code) do nothing;

insert into units (listing_id, unit_code, floor, rent, status, created_at)
select '10000008-0000-0000-0000-000000000008', 'BK-' || lpad(g::text, 2, '0'), 0, 900000, 'vacant', now() - interval '10 days'
from generate_series(1, 10) g
on conflict (listing_id, unit_code) do nothing;

insert into units (listing_id, unit_code, floor, rent, status, created_at)
select '10000009-0000-0000-0000-000000000009', 'NJ-' || lpad(g::text, 2, '0'), 0, 280000, 'vacant', now() - interval '10 days'
from generate_series(1, 20) g
on conflict (listing_id, unit_code) do nothing;

insert into units (listing_id, unit_code, floor, rent, status, created_at)
select '10000010-0000-0000-0000-000000000010', 'NB-' || lpad(g::text, 2, '0'), 0, 340000, 'vacant', now() - interval '10 days'
from generate_series(1, 9) g
on conflict (listing_id, unit_code) do nothing;

insert into units (listing_id, unit_code, floor, rent, status, created_at)
select '10000011-0000-0000-0000-000000000011', 'KS-' || lpad(g::text, 2, '0'), 0, 290000, 'vacant', now() - interval '10 days'
from generate_series(1, 36) g
on conflict (listing_id, unit_code) do nothing;

-- =====================================================================
-- BOOKINGS (sample confirmed bookings)
-- =====================================================================
insert into bookings (id, reference, listing_id, unit_id, tenant_id, tenant_name, room_code, start_date, months, nights, amount, fee, deposit, payment_method, paid_by, purpose, efris_document_no, verification_code, created_at)
values
  -- Yokas Gero in A-09
  (gen_random_uuid(), 'RP-2026-0412', '10000001-0000-0000-0000-000000000001',
   (select id from units where listing_id = '10000001-0000-0000-0000-000000000001' and unit_code = 'A-09'),
   'c0000000-0000-0000-0000-000000000001', 'Yokas Gero', 'A-09',
   (now() - interval '52 days')::date, 6, 0, 2280000, 68400, 0, 'MTN MoMo', 'Self', 'Rent, 6 months',
   '1000000412', 'A1B2-C3D4', now() - interval '53 days'),
  -- Brian Kigozi reserved B-05
  (gen_random_uuid(), 'RP-2026-0233', '10000001-0000-0000-0000-000000000001',
   (select id from units where listing_id = '10000001-0000-0000-0000-000000000001' and unit_code = 'B-05'),
   'c0000000-0000-0000-0000-000000000009', 'Brian Kigozi', 'B-05',
   (now() + interval '8 days')::date, 5, 0, 1900000, 57000, 0, 'Airtel Money', 'Self', 'Rent, 5 months',
   '1000000233', 'E5F6-G7H8', now() - interval '15 days'),
  -- Short stay booking
  (gen_random_uuid(), 'RP-2026-0121', '10000006-0000-0000-0000-000000000006',
   (select id from units where listing_id = '10000006-0000-0000-0000-000000000006' limit 1),
   'c0000000-0000-0000-0000-000000000001', 'Yokas Gero', 'K-01',
   (now() - interval '122 days')::date, 0, 2, 520000, 15600, 0, 'Card', 'Self', 'Stay, 2 nights',
   '1000000121', 'I9J0-K1L2', now() - interval '123 days'),
  -- Rent transfer listing from Nakato Sarah (A-01)
  (gen_random_uuid(), 'RP-2026-0555', '10000001-0000-0000-0000-000000000001',
   (select id from units where listing_id = '10000001-0000-0000-0000-000000000001' and unit_code = 'A-01'),
   'c0000000-0000-0000-0000-000000000002', 'Nakato Sarah', 'A-01',
   (now() - interval '40 days')::date, 3, 0, 1140000, 34200, 0, 'MTN MoMo', 'Self', 'Rent, 3 months',
   '1000000555', 'M3N4-O5P6', now() - interval '45 days')
on conflict (reference) do update set
  listing_id = excluded.listing_id,
  unit_id = excluded.unit_id,
  tenant_id = excluded.tenant_id,
  tenant_name = excluded.tenant_name,
  room_code = excluded.room_code,
  start_date = excluded.start_date,
  months = excluded.months,
  nights = excluded.nights,
  amount = excluded.amount,
  fee = excluded.fee,
  deposit = excluded.deposit,
  payment_method = excluded.payment_method,
  paid_by = excluded.paid_by,
  purpose = excluded.purpose,
  efris_document_no = excluded.efris_document_no,
  verification_code = excluded.verification_code;

-- =====================================================================
-- PAYMENTS (sample payments)
-- =====================================================================
insert into payments (reference, listing_id, unit_id, room_code, tenant_id, tenant_name, start_date, months, nights, amount, fee, deposit, payment_method, paid_by, purpose, status, agreement_id, from_source, efris_document_no, verification_code, created_at, confirmed_at)
values
  ('RP-2026-0412', '10000001-0000-0000-0000-000000000001',
   (select id from units where listing_id = '10000001-0000-0000-0000-000000000001' and unit_code = 'A-09'),
   'A-09', 'c0000000-0000-0000-0000-000000000001', 'Yokas Gero',
   (now() - interval '52 days')::date, 6, 0, 2280000, 68400, 0, 'MTN MoMo', 'Self', 'Rent, 6 months',
   'confirmed', null, '07XX XXX 111', '1000000412', 'A1B2-C3D4', now() - interval '53 days', now() - interval '52 days'),
  ('RP-2026-0233', '10000001-0000-0000-0000-000000000001',
   (select id from units where listing_id = '10000001-0000-0000-0000-000000000001' and unit_code = 'B-05'),
   'B-05', 'c0000000-0000-0000-0000-000000000009', 'Brian Kigozi',
   (now() + interval '8 days')::date, 5, 0, 1900000, 57000, 0, 'Airtel Money', 'Self', 'Rent, 5 months',
   'confirmed', null, '07XX XXX 999', '1000000233', 'E5F6-G7H8', now() - interval '15 days', now() - interval '14 days'),
  ('RP-2026-0121', '10000006-0000-0000-0000-000000000006',
   (select id from units where listing_id = '10000006-0000-0000-0000-000000000006' limit 1),
   'K-01', 'c0000000-0000-0000-0000-000000000001', 'Yokas Gero',
   (now() - interval '122 days')::date, 0, 2, 520000, 15600, 0, 'Card', 'Self', 'Stay, 2 nights',
   'confirmed', null, 'Card, John Doe', '1000000121', 'I9J0-K1L2', now() - interval '123 days', now() - interval '122 days'),
  -- Pending payment for demo
  ('RP-2026-0999', '10000002-0000-0000-0000-000000000002',
   (select id from units where listing_id = '10000002-0000-0000-0000-000000000002' limit 1),
   'W-01', 'd0000000-0000-0000-0000-000000000001', 'Aisha Nakamya',
   (now() + interval '5 days')::date, 3, 0, 960000, 28800, 0, 'MTN MoMo', 'Mother, United Kingdom', 'Rent, 3 months',
   'pending', null, '07XX XXX 111', null, null, now() - interval '1 hour', null)
on conflict (reference) do update set
  listing_id = excluded.listing_id,
  unit_id = excluded.unit_id,
  room_code = excluded.room_code,
  tenant_id = excluded.tenant_id,
  tenant_name = excluded.tenant_name,
  start_date = excluded.start_date,
  months = excluded.months,
  nights = excluded.nights,
  amount = excluded.amount,
  fee = excluded.fee,
  deposit = excluded.deposit,
  payment_method = excluded.payment_method,
  paid_by = excluded.paid_by,
  purpose = excluded.purpose,
  status = excluded.status,
  agreement_id = excluded.agreement_id,
  from_source = excluded.from_source,
  efris_document_no = excluded.efris_document_no,
  verification_code = excluded.verification_code,
  created_at = excluded.created_at,
  confirmed_at = excluded.confirmed_at;

-- =====================================================================
-- AGREEMENTS
-- =====================================================================
insert into agreements (reference, listing_id, unit_id, room_code, tenant_id, tenant_name, quantity, start_date, status, terms, issued_at, accepted_at, paid, created_at)
values
  ('AG-2026-3001', '10000001-0000-0000-0000-000000000001',
   (select id from units where listing_id = '10000001-0000-0000-0000-000000000001' and unit_code = 'A-01'),
   'A-01', 'c0000000-0000-0000-0000-000000000002', 'Nakato Sarah', 12,
   (now() - interval '40 days')::date, 'accepted',
   '{"deposit": 2, "late": 5, "notice": 30, "rules": "Visitors leave by 10 pm. No cooking in rooms. Quiet hours are 10 pm to 6 am."}'::jsonb,
   now() - interval '46 days', now() - interval '45 days', true, now() - interval '46 days'),
  ('AG-2026-3002', '10000001-0000-0000-0000-000000000001',
   (select id from units where listing_id = '10000001-0000-0000-0000-000000000001' and unit_code = 'A-02'),
   'A-02', 'c0000000-0000-0000-0000-000000000003', 'Okello Brian', 12,
   (now() - interval '38 days')::date, 'accepted',
   '{"deposit": 2, "late": 5, "notice": 30, "rules": "Visitors leave by 10 pm. No cooking in rooms. Quiet hours are 10 pm to 6 am."}'::jsonb,
   now() - interval '44 days', now() - interval '43 days', true, now() - interval '44 days'),
  ('AG-2026-3003', '10000001-0000-0000-0000-000000000001',
   (select id from units where listing_id = '10000001-0000-0000-0000-000000000001' and unit_code = 'A-09'),
   'A-09', 'c0000000-0000-0000-0000-000000000001', 'Yokas Gero', 6,
   (now() - interval '52 days')::date, 'accepted',
   '{"deposit": 2, "late": 5, "notice": 30, "rules": "Visitors leave by 10 pm. No cooking in rooms. Quiet hours are 10 pm to 6 am."}'::jsonb,
   now() - interval '54 days', now() - interval '53 days', true, now() - interval '54 days'),
  ('AG-2026-3004', '10000001-0000-0000-0000-000000000001',
   (select id from units where listing_id = '10000001-0000-0000-0000-000000000001' and unit_code = 'B-05'),
   'B-05', 'c0000000-0000-0000-0000-000000000009', 'Brian Kigozi', 5,
   (now() + interval '8 days')::date, 'draft',
   '{"deposit": 2, "late": 5, "notice": 30, "rules": "Visitors leave by 10 pm. No cooking in rooms. Quiet hours are 10 pm to 6 am."}'::jsonb,
   null, null, false, now() - interval '15 days'),
  ('AG-2026-3005', '10000002-0000-0000-0000-000000000002',
   (select id from units where listing_id = '10000002-0000-0000-0000-000000000002' limit 1),
   'W-01', 'd0000000-0000-0000-0000-000000000001', 'Aisha Nakamya', 3,
   (now() + interval '5 days')::date, 'sent',
   '{"deposit": 1, "late": 5, "notice": 30, "rules": "Visitors leave by 10 pm. No cooking in rooms. Quiet hours are 10 pm to 6 am."}'::jsonb,
   now() - interval '1 hour', null, false, now() - interval '1 hour')
on conflict (reference) do update set
  listing_id = excluded.listing_id,
  unit_id = excluded.unit_id,
  room_code = excluded.room_code,
  tenant_id = excluded.tenant_id,
  tenant_name = excluded.tenant_name,
  quantity = excluded.quantity,
  start_date = excluded.start_date,
  status = excluded.status,
  terms = excluded.terms,
  issued_at = excluded.issued_at,
  accepted_at = excluded.accepted_at,
  paid = excluded.paid;

-- =====================================================================
-- MAINTENANCE REQUESTS
-- =====================================================================
insert into maintenance_requests (listing_id, unit_id, room_code, tenant_id, tenant_name, type, urgent, note, status, created_at)
values
  ('10000001-0000-0000-0000-000000000001',
   (select id from units where listing_id = '10000001-0000-0000-0000-000000000001' and unit_code = 'A-09'),
   'A-09', 'c0000000-0000-0000-0000-000000000001', 'Yokas Gero',
   'plumbing', false, 'The tap in the bathroom is leaking onto the floor', 'open', now() - interval '2 days'),
  ('10000001-0000-0000-0000-000000000001',
   (select id from units where listing_id = '10000001-0000-0000-0000-000000000001' and unit_code = 'B-06'),
   'B-06', 'c0000000-0000-0000-0000-000000000007', 'Kato Daniel',
   'electricity', true, 'No power in the room since yesterday', 'work', now() - interval '5 days'),
  ('10000001-0000-0000-0000-000000000001',
   (select id from units where listing_id = '10000001-0000-0000-0000-000000000001' and unit_code = 'A-03'),
   'A-03', 'c0000000-0000-0000-0000-000000000008', 'Nansubuga Pearl',
   'wifi', false, 'Wi-Fi very slow in the evenings', 'done', now() - interval '10 days');

-- =====================================================================
-- BILLS (owner-entered bills for Kikoni Scholars Hostel)
-- =====================================================================
insert into bills (listing_id, category, name, reference, note, amount, due_date, status, role, paid_at, created_at)
values
  ('10000001-0000-0000-0000-000000000001', 'water', 'NWSC, main meter', 'Meter 4471-2208', '96 m³ at UGX 6,700', 643200, (now() + interval '9 days')::date, 'due', null, null, now() - interval '5 days'),
  ('10000001-0000-0000-0000-000000000001', 'power', 'UMEME, whole building', 'Account 0443 881 207', '1,150 kWh at UGX 700', 805000, (now() + interval '3 days')::date, 'due', null, null, now() - interval '5 days'),
  ('10000001-0000-0000-0000-000000000001', 'tv', 'DStv, common room', 'Smartcard 7014 2290', 'Monthly subscription', 165000, (now() - interval '4 days')::date, 'paid', null, now() - interval '4 days', now() - interval '10 days'),
  ('10000001-0000-0000-0000-000000000001', 'staff', 'Nakalema Joyce', '07XX 482 117', 'Floors A and B', 280000, (now() + interval '5 days')::date, 'due', 'Cleaner', null, now() - interval '3 days'),
  ('10000001-0000-0000-0000-000000000001', 'staff', 'Mugabi Stephen', '07XX 217 640', 'Keys, gate and night rounds', 450000, (now() + interval '5 days')::date, 'due', 'Custodian', null, now() - interval '3 days');

-- =====================================================================
-- ROOMMATE PROFILES (sample verified profiles for matching)
-- =====================================================================
insert into roommate_profiles (user_id, full_name, course, college, gender, year, budget, sleep, clean_level, study, location, is_verified, created_at)
values
  ('d0000000-0000-0000-0000-000000000001', 'Aisha Nakamya', 'Computer Science', 'COCIS', 'f', 2, 380000, 'early', 5, 'quiet', 'Kikoni', true, now() - interval '20 days'),
  ('d0000000-0000-0000-0000-000000000002', 'Brian Kaweesi', 'Computer Science', 'COCIS', 'm', 3, 420000, 'late', 3, 'group', 'Wandegeya', true, now() - interval '18 days'),
  ('d0000000-0000-0000-0000-000000000003', 'Doreen Atim', 'Software Engineering', 'COCIS', 'f', 2, 350000, 'early', 4, 'quiet', 'Kikoni', true, now() - interval '16 days'),
  ('d0000000-0000-0000-0000-000000000004', 'Collins Wanyama', 'Law', 'School of Law', 'm', 1, 450000, 'early', 4, 'quiet', 'Makerere', true, now() - interval '14 days'),
  ('d0000000-0000-0000-0000-000000000005', 'Prossy Namusoke', 'Medicine', 'CHS', 'f', 4, 500000, 'late', 5, 'group', 'Makerere', true, now() - interval '12 days'),
  ('d0000000-0000-0000-0000-000000000006', 'Esther Kyomuhendo', 'Economics', 'CoBAMS', 'f', 2, 400000, 'early', 4, 'quiet', 'Kansanga', true, now() - interval '10 days'),
  ('d0000000-0000-0000-0000-000000000007', 'Samuel Opio', 'Statistics', 'CoBAMS', 'm', 2, 380000, 'early', 3, 'quiet', 'Kansanga', true, now() - interval '8 days')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  course = excluded.course,
  college = excluded.college,
  gender = excluded.gender,
  year = excluded.year,
  budget = excluded.budget,
  sleep = excluded.sleep,
  clean_level = excluded.clean_level,
  study = excluded.study,
  location = excluded.location,
  is_verified = excluded.is_verified;

-- =====================================================================
-- RENT TRANSFERS (sell space listings)
-- =====================================================================
insert into rent_transfers (booking_id, listing_id, unit_id, room_code, months_left, price_per_month, available_from, reason, status, created_at)
values
  ((select id from bookings where reference = 'RP-2026-0555'),
   '10000001-0000-0000-0000-000000000001',
   (select id from units where listing_id = '10000001-0000-0000-0000-000000000001' and unit_code = 'A-01'),
   'A-01', 3, 380000, (now() + interval '9 days')::date, 'Changing university', 'listed', now() - interval '5 days'),
  ((select id from bookings where reference = 'RP-2026-0412'),
   '10000001-0000-0000-0000-000000000001',
   (select id from units where listing_id = '10000001-0000-0000-0000-000000000001' and unit_code = 'A-09'),
   'A-09', 2, 500000, (now() + interval '14 days')::date, 'Internship in Mbarara', 'listed', now() - interval '3 days');

-- =====================================================================
-- OWNER REQUESTS (for approval queue)
-- =====================================================================
insert into owner_requests (listing_id, kind, requester_name, details, status, created_at)
values
  ('10000001-0000-0000-0000-000000000001', 'New tenant', 'Brian Kigozi', 'Booked unit B-05 from 1 Nov, 5 months paid (UGX 1,900,000). Student ID and admission letter verified.', 'open', now() - interval '2 days'),
  ('10000001-0000-0000-0000-000000000001', 'Rent transfer', 'Nansubuga Pearl to Esther K.', 'Pearl has 3 months left on A-03 and is moving to Mbarara. Esther K. is a verified Law student.', 'open', now() - interval '1 day'),
  ('10000001-0000-0000-0000-000000000001', 'Roommate request', 'Okello Brian', 'Wants to share A-02 with Moses T. (verified, Computer Science). Rent would split 190,000 each.', 'open', now() - interval '3 hours');

-- =====================================================================
-- ADMIN QUEUE (verification, fraud, etc.)
-- =====================================================================
insert into admin_queue (kind, subject_name, details, documents, status, created_at)
values
  ('Student', 'Peter Okot', 'Admission letter, Gulu University transfer to Makerere', '[["National ID", 1], ["Admission letter", 1], ["Student ID", 0]]'::jsonb, 'open', now() - interval '1 day'),
  ('New block', 'Garden Estates', 'Ntinda Garden Apartments · Block C, 8 units', '[["Building permit", 1], ["Photos", 1], ["Fire safety", 0]]'::jsonb, 'open', now() - interval '2 days'),
  ('Tenant', 'Joan Namara', 'Worker relocating from Mbarara, employer letter', '[["National ID", 1], ["Employer letter", 1]]'::jsonb, 'open', now() - interval '3 hours'),
  ('Fraud', 'Cheap 2BR Kanyanya', 'Listing asks for money before any viewing', '[["Reported by users", 3]]'::jsonb, 'open', now() - interval '4 hours'),
  ('Fraud', 'Photo reuse', 'Broker reusing photos from Kikoni Scholars Hostel on another account', '[["Reported by owner", 1]]'::jsonb, 'open', now() - interval '5 hours'),
  ('Fraud', 'Duplicate ID', 'Two accounts registered with the same National ID', '[["Flagged by verification", 1]]'::jsonb, 'open', now() - interval '6 hours');

-- =====================================================================
-- AGREEMENT TEMPLATES (custom terms per listing)
-- =====================================================================
insert into agreement_templates (listing_id, deposit_months, late_fee_percent, notice_days, house_rules, updated_at)
values
  ('10000001-0000-0000-0000-000000000001', 2, 5, 30, 'Visitors leave by 10 pm. No cooking in rooms. Quiet hours are 10 pm to 6 am.', now()),
  ('10000002-0000-0000-0000-000000000002', 1, 5, 30, 'Visitors leave by 10 pm. No cooking in rooms. Quiet hours are 10 pm to 6 am.', now()),
  ('10000003-0000-0000-0000-000000000003', 2, 5, 30, 'Visitors leave by 10 pm. No cooking in rooms. Quiet hours are 10 pm to 6 am.', now()),
  ('10000004-0000-0000-0000-000000000004', 2, 5, 60, 'Keep the compound clean and respect neighbours. No subletting without the landlord.', now()),
  ('10000006-0000-0000-0000-000000000006', 0, 0, 0, 'Daily cleaning included. Check-out by 11 am. No parties.', now())
on conflict (listing_id) do update set
  deposit_months = excluded.deposit_months,
  late_fee_percent = excluded.late_fee_percent,
  notice_days = excluded.notice_days,
  house_rules = excluded.house_rules,
  updated_at = excluded.updated_at;

-- =====================================================================
-- PROPERTY LAYOUTS (floor plans for admin)
-- =====================================================================
insert into property_layouts (listing_id, floor, columns, rows)
values
  ('10000001-0000-0000-0000-000000000001', 0, 4, 3),  -- Ground floor (A block): 4x3 = 12 slots
  ('10000001-0000-0000-0000-000000000001', 1, 4, 3)   -- First floor (B block): 4x3 = 12 slots
on conflict (listing_id, floor) do update set
  columns = excluded.columns,
  rows = excluded.rows;

-- =====================================================================
-- NOTIFICATIONS (sample)
-- =====================================================================
insert into notifications (user_id, type, title, message, data, read, created_at)
values
  ('c0000000-0000-0000-0000-000000000001', 'payment_confirmed', 'Payment Confirmed', 'Your rent payment of UGX 2,280,000 for Kikoni Scholars Hostel has been confirmed.', '{"booking_id": "RP-2026-0412"}'::jsonb, true, now() - interval '52 days'),
  ('c0000000-0000-0000-0000-000000000001', 'agreement_ready', 'Agreement Ready', 'Your tenancy agreement for A-09 is ready to review and accept.', '{"agreement_id": "AG-2026-3003"}'::jsonb, true, now() - interval '53 days'),
  ('d0000000-0000-0000-0000-000000000001', 'agreement_ready', 'Agreement Ready', 'Your tenancy agreement for W-01 is ready to review and accept.', '{"agreement_id": "AG-2026-3005"}'::jsonb, false, now() - interval '1 hour'),
  ('b0000000-0000-0000-0000-000000000001', 'payment_pending', 'Payment Pending', 'Aisha Nakamya has paid UGX 988,800 for W-01. Please confirm receipt.', '{"payment_id": "RP-2026-0999"}'::jsonb, false, now() - interval '1 hour'),
  ('b0000000-0000-0000-0000-000000000001', 'maintenance', 'Maintenance Request', 'New maintenance request for A-09: The tap in the bathroom is leaking onto the floor', '{"request_id": "maintenance-1"}'::jsonb, false, now() - interval '2 days');

-- =====================================================================
-- SAVED LISTINGS (sample favorites)
-- =====================================================================
insert into saved_listings (user_id, listing_id, created_at)
values
  ('c0000000-0000-0000-0000-000000000001', '10000002-0000-0000-0000-000000000002', now() - interval '10 days'),
  ('c0000000-0000-0000-0000-000000000001', '10000006-0000-0000-0000-000000000006', now() - interval '5 days'),
  ('d0000000-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000001', now() - interval '15 days'),
  ('d0000000-0000-0000-0000-000000000001', '10000003-0000-0000-0000-000000000003', now() - interval '8 days')
on conflict (user_id, listing_id) do nothing;