// Setup auth users and profiles on live Supabase project

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SEED_PASSWORD = process.env.SEED_USER_PASSWORD;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !SEED_PASSWORD || SEED_PASSWORD.length < 12) {
  console.error('Set VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SEED_USER_PASSWORD (12+ chars) in .env or the environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const users = [
  { id: 'a0000000-0000-0000-0000-000000000001', email: 'admin@rentpply.com', password: SEED_PASSWORD, role: 'admin', full_name: 'Admin User', phone: '+256700000001' },
  { id: 'b0000000-0000-0000-0000-000000000001', email: 'owner1@rentpply.com', password: SEED_PASSWORD, role: 'owner', full_name: 'Ssemakula Properties', phone: '+256701111111' },
  { id: 'b0000000-0000-0000-0000-000000000002', email: 'owner2@rentpply.com', password: SEED_PASSWORD, role: 'owner', full_name: 'Court Estates Ltd', phone: '+256701222222' },
  { id: 'b0000000-0000-0000-0000-000000000003', email: 'owner3@rentpply.com', password: SEED_PASSWORD, role: 'owner', full_name: 'Heights Hospitality', phone: '+256701333333' },
  { id: 'b0000000-0000-0000-0000-000000000004', email: 'owner4@rentpply.com', password: SEED_PASSWORD, role: 'owner', full_name: 'Garden Estates', phone: '+256701444444' },
  { id: 'c0000000-0000-0000-0000-000000000001', email: 'yokas@rentpply.com', password: SEED_PASSWORD, role: 'tenant', full_name: 'Yokas Gero', phone: '+256702111111', is_student: true, course: 'Computer Science', college: 'COCIS', gender: 'any', budget: 400000, sleep: 'early', clean_level: 4, study: 'quiet' },
  { id: 'c0000000-0000-0000-0000-000000000002', email: 'nakato@rentpply.com', password: SEED_PASSWORD, role: 'tenant', full_name: 'Nakato Sarah', phone: '+256702222222', is_student: true, course: 'Law', college: 'School of Law', gender: 'f', budget: 450000, sleep: 'early', clean_level: 5, study: 'quiet' },
  { id: 'c0000000-0000-0000-0000-000000000003', email: 'okello@rentpply.com', password: SEED_PASSWORD, role: 'tenant', full_name: 'Okello Brian', phone: '+256702333333', is_student: true, course: 'Computer Science', college: 'COCIS', gender: 'm', budget: 420000, sleep: 'late', clean_level: 3, study: 'group' },
  { id: 'c0000000-0000-0000-0000-000000000004', email: 'namutebi@rentpply.com', password: SEED_PASSWORD, role: 'tenant', full_name: 'Namutebi Joy', phone: '+256702444444', is_student: true, course: 'Economics', college: 'CoBAMS', gender: 'f', budget: 380000, sleep: 'early', clean_level: 4, study: 'quiet' },
  { id: 'c0000000-0000-0000-0000-000000000005', email: 'mugisha@rentpply.com', password: SEED_PASSWORD, role: 'tenant', full_name: 'Mugisha Allan', phone: '+256702555555', is_student: false, course: 'Banking', college: 'CoBAMS', gender: 'm', budget: 600000, sleep: 'early', clean_level: 4, study: 'quiet' },
  { id: 'c0000000-0000-0000-0000-000000000006', email: 'achieng@rentpply.com', password: SEED_PASSWORD, role: 'tenant', full_name: 'Achieng Ruth', phone: '+256702666666', is_student: true, course: 'Medicine', college: 'CHS', gender: 'f', budget: 520000, sleep: 'late', clean_level: 5, study: 'group' },
  { id: 'c0000000-0000-0000-0000-000000000007', email: 'kato@rentpply.com', password: SEED_PASSWORD, role: 'tenant', full_name: 'Kato Daniel', phone: '+256702777777', is_student: false, course: 'Software Dev', college: 'Private', gender: 'm', budget: 700000, sleep: 'early', clean_level: 3, study: 'quiet' },
  { id: 'c0000000-0000-0000-0000-000000000008', email: 'nansubuga@rentpply.com', password: SEED_PASSWORD, role: 'tenant', full_name: 'Nansubuga Pearl', phone: '+256702888888', is_student: true, course: 'Architecture', college: 'CEDAT', gender: 'f', budget: 480000, sleep: 'early', clean_level: 4, study: 'quiet' },
  { id: 'c0000000-0000-0000-0000-000000000009', email: 'brian@rentpply.com', password: SEED_PASSWORD, role: 'tenant', full_name: 'Brian Kigozi', phone: '+256702999999', is_student: true, course: 'Computer Science', college: 'COCIS', gender: 'm', budget: 400000, sleep: 'early', clean_level: 4, study: 'quiet' },
  { id: 'd0000000-0000-0000-0000-000000000001', email: 'aisha@rentpply.com', password: SEED_PASSWORD, role: 'student', full_name: 'Aisha Nakamya', phone: '+256703111111', is_student: true, course: 'Computer Science', college: 'COCIS', gender: 'f', budget: 400000, sleep: 'early', clean_level: 4, study: 'quiet' },
  { id: 'd0000000-0000-0000-0000-000000000002', email: 'brian.kaweesi@rentpply.com', password: SEED_PASSWORD, role: 'student', full_name: 'Brian Kaweesi', phone: '+256703222222', is_student: true, course: 'Computer Science', college: 'COCIS', gender: 'm', budget: 420000, sleep: 'early', clean_level: 4, study: 'quiet' },
  { id: 'd0000000-0000-0000-0000-000000000003', email: 'doreen@rentpply.com', password: SEED_PASSWORD, role: 'student', full_name: 'Doreen Atim', phone: '+256703333333', is_student: true, course: 'Law', college: 'School of Law', gender: 'f', budget: 450000, sleep: 'early', clean_level: 4, study: 'quiet' },
  { id: 'd0000000-0000-0000-0000-000000000004', email: 'collins@rentpply.com', password: SEED_PASSWORD, role: 'student', full_name: 'Collins Wanyama', phone: '+256703444444', is_student: true, course: 'Engineering', college: 'CEDAT', gender: 'm', budget: 380000, sleep: 'late', clean_level: 3, study: 'group' },
  { id: 'd0000000-0000-0000-0000-000000000005', email: 'prossy@rentpply.com', password: SEED_PASSWORD, role: 'student', full_name: 'Prossy Namusoke', phone: '+256703555555', is_student: true, course: 'Medicine', college: 'CHS', gender: 'f', budget: 420000, sleep: 'early', clean_level: 5, study: 'quiet' },
  { id: 'd0000000-0000-0000-0000-000000000006', email: 'esther@rentpply.com', password: SEED_PASSWORD, role: 'student', full_name: 'Esther Kyomuhendo', phone: '+256703666666', is_student: true, course: 'Economics', college: 'CoBAMS', gender: 'f', budget: 520000, sleep: 'late', clean_level: 4, study: 'group' },
  { id: 'd0000000-0000-0000-0000-000000000007', email: 'samuel@rentpply.com', password: SEED_PASSWORD, role: 'student', full_name: 'Samuel Opio', phone: '+256703777777', is_student: true, course: 'Architecture', college: 'CEDAT', gender: 'm', budget: 480000, sleep: 'early', clean_level: 4, study: 'quiet' },
];

async function findUserId(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data.users.length) return null;
    const match = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match.id;
  }
}

async function setup() {
  console.log('Setting up auth users and profiles on live Supabase...\n');

  for (const user of users) {
    try {
      // Create auth user
      let userId;
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.full_name,
          role: user.role
        }
      });

      if (authError) {
        if (!/already (been )?registered|already exists/i.test(authError.message)) {
          console.error(`Error creating auth user ${user.email}:`, authError.message);
          continue;
        }
        // Existing account: look up its real id instead of dereferencing a null result.
        userId = await findUserId(user.email);
        if (!userId) {
          console.error(`Could not find existing auth user ${user.email}`);
          continue;
        }
      } else {
        userId = authData.user.id;
      }
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
  }

setup().catch(err => { console.error(err); process.exit(1); });