#!/usr/bin/env node
// Setup auth users and profiles on live Supabase project

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://uacsoexkrvvdgdqotimg.supabase.co';
// We need the service role key - it should be in the environment or we'll need to pass it
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found in environment');
  console.error('Please set it in .env.local or export it');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const users = [
  { id: 'a0000000-0000-0000-0000-000000000001', email: 'admin@rentpply.com', password: 'password123', role: 'admin', full_name: 'Admin User', phone: '+256700000001' },
  { id: 'b0000000-0000-0000-0000-000000000001', email: 'owner1@rentpply.com', password: 'password123', role: 'owner', full_name: 'Ssemakula Properties', phone: '+256701111111' },
  { id: 'b0000000-0000-0000-0000-000000000002', email: 'owner2@rentpply.com', password: 'password123', role: 'owner', full_name: 'Court Estates Ltd', phone: '+256701222222' },
  { id: 'b0000000-0000-0000-0000-000000000003', email: 'owner3@rentpply.com', password: 'password123', role: 'owner', full_name: 'Heights Hospitality', phone: '+256701333333' },
  { id: 'b0000000-0000-0000-0000-000000000004', email: 'owner4@rentpply.com', password: 'password123', role: 'owner', full_name: 'Garden Estates', phone: '+256701444444' },
  { id: 'c0000000-0000-0000-0000-000000000001', email: 'yokas@rentpply.com', password: 'password123', role: 'tenant', full_name: 'Yokas Gero', phone: '+256702111111', is_student: true, course: 'Computer Science', college: 'COCIS', gender: 'any', budget: 400000, sleep: 'early', clean_level: 4, study: 'quiet' },
  { id: 'c0000000-0000-0000-0000-000000000002', email: 'nakato@rentpply.com', password: 'password123', role: 'tenant', full_name: 'Nakato Sarah', phone: '+256702222222', is_student: true, course: 'Law', college: 'School of Law', gender: 'f', budget: 450000, sleep: 'early', clean_level: 5, study: 'quiet' },
  { id: 'c0000000-0000-0000-0000-000000000003', email: 'okello@rentpply.com', password: 'password123', role: 'tenant', full_name: 'Okello Brian', phone: '+256702333333', is_student: true, course: 'Computer Science', college: 'COCIS', gender: 'm', budget: 420000, sleep: 'late', clean_level: 3, study: 'group' },
  { id: 'c0000000-0000-0000-0000-000000000004', email: 'namutebi@rentpply.com', password: 'password123', role: 'tenant', full_name: 'Namutebi Joy', phone: '+256702444444', is_student: true, course: 'Economics', college: 'CoBAMS', gender: 'f', budget: 380000, sleep: 'early', clean_level: 4, study: 'quiet' },
  { id: 'c0000000-0000-0000-0000-000000000005', email: 'mugisha@rentpply.com', password: 'password123', role: 'tenant', full_name: 'Mugisha Allan', phone: '+256702555555', is_student: false, course: 'Banking', college: 'CoBAMS', gender: 'm', budget: 600000, sleep: 'early', clean_level: 4, study: 'quiet' },
  { id: 'c0000000-0000-0000-0000-000000000006', email: 'achieng@rentpply.com', password: 'password123', role: 'tenant', full_name: 'Achieng Ruth', phone: '+256702666666', is_student: true, course: 'Medicine', college: 'CHS', gender: 'f', budget: 520000, sleep: 'late', clean_level: 5, study: 'group' },
  { id: 'c0000000-0000-0000-0000-000000000007', email: 'kato@rentpply.com', password: 'password123', role: 'tenant', full_name: 'Kato Daniel', phone: '+256702777777', is_student: false, course: 'Software Dev', college: 'Private', gender: 'm', budget: 700000, sleep: 'early', clean_level: 3, study: 'quiet' },
  { id: 'c0000000-0000-0000-0000-000000000008', email: 'nansubuga@rentpply.com', password: 'password123', role: 'tenant', full_name: 'Nansubuga Pearl', phone: '+256702888888', is_student: true, course: 'Architecture', college: 'CEDAT', gender: 'f', budget: 480000, sleep: 'early', clean_level: 4, study: 'quiet' },
  { id: 'c0000000-0000-0000-0000-000000000009', email: 'brian@rentpply.com', password: 'password123', role: 'tenant', full_name: 'Brian Kigozi', phone: '+256702999999', is_student: true, course: 'Computer Science', college: 'COCIS', gender: 'm', budget: 400000, sleep: 'early', clean_level: 4, study: 'quiet' },
  { id: 'd0000000-0000-0000-0000-000000000001', email: 'aisha@rentpply.com', password: 'password123', role: 'student', full_name: 'Aisha Nakamya', phone: '+256703111111', is_student: true, course: 'Computer Science', college: 'COCIS', gender: 'f', budget: 400000, sleep: 'early', clean_level: 4, study: 'quiet' },
  { id: 'd0000000-0000-0000-0000-000000000002', email: 'brian.kaweesi@rentpply.com', password: 'password123', role: 'student', full_name: 'Brian Kaweesi', phone: '+256703222222', is_student: true, course: 'Computer Science', college: 'COCIS', gender: 'm', budget: 420000, sleep: 'early', clean_level: 4, study: 'quiet' },
  { id: 'd0000000-0000-0000-0000-000000000003', email: 'doreen@rentpply.com', password: 'password123', role: 'student', full_name: 'Doreen Atim', phone: '+256703333333', is_student: true, course: 'Law', college: 'School of Law', gender: 'f', budget: 450000, sleep: 'early', clean_level: 4, study: 'quiet' },
  { id: 'd0000000-0000-0000-0000-000000000004', email: 'collins@rentpply.com', password: 'password123', role: 'student', full_name: 'Collins Wanyama', phone: '+256703444444', is_student: true, course: 'Engineering', college: 'CEDAT', gender: 'm', budget: 380000, sleep: 'late', clean_level: 3, study: 'group' },
  { id: 'd0000000-0000-0000-0000-000000000005', email: 'prossy@rentpply.com', password: 'password123', role: 'student', full_name: 'Prossy Namusoke', phone: '+256703555555', is_student: true, course: 'Medicine', college: 'CHS', gender: 'f', budget: 420000, sleep: 'early', clean_level: 5, study: 'quiet' },
  { id: 'd0000000-0000-0000-0000-000000000006', email: 'esther@rentpply.com', password: 'password123', role: 'student', full_name: 'Esther Kyomuhendo', phone: '+256703666666', is_student: true, course: 'Economics', college: 'CoBAMS', gender: 'f', budget: 520000, sleep: 'late', clean_level: 4, study: 'group' },
  { id: 'd0000000-0000-0000-0000-000000000007', email: 'samuel@rentpply.com', password: 'password123', role: 'student', full_name: 'Samuel Opio', phone: '+256703777777', is_student: true, course: 'Architecture', college: 'CEDAT', gender: 'm', budget: 480000, sleep: 'early', clean_level: 4, study: 'quiet' },
];

async function setup() {
  console.log('Setting up auth users and profiles on live Supabase...\n');

  for (const user of users) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.full_name,
          role: user.role
        }
      });

      if (authError && !authError.message.includes('already registered')) {
        console.error(`Error creating auth user ${user.email}:`, authError.message);
        continue;
      }

      const userId = authData.user?.id || user.id;
      console.log(`✓ Auth user: ${user.email} (${userId})`);

      // Create/update profile
      const profileData = {
        id: userId,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone,
        kyc_status: 'verified',
        is_student: user.is_student || false,
        prefs_done: true,
      };

      if (user.course) profileData.course = user.course;
      if (user.college) profileData.college = user.college;
      if (user.gender) profileData.gender = user.gender;
      if (user.budget) profileData.budget = user.budget;
      if (user.sleep) profileData.sleep = user.sleep;
      if (user.clean_level) profileData.clean_level = user.clean_level;
      if (user.study) profileData.study = user.study;

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (profileError) {
        console.error(`Error creating profile for ${user.email}:`, profileError.message);
      } else {
        console.log(`  ✓ Profile created`);
      }
    } catch (err) {
      console.error(`Error processing ${user.email}:`, err.message);
    }
  }

  console.log('\n✓ Setup complete!');
  process.exit(0);
}

setup().catch(console.error);