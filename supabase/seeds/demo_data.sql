-- Demo data so the dashboards look like a live site.
-- Everything it creates is tagged so it can be removed with demo_cleanup.sql:
--   * accounts use the email domain  @seed.rentpply.test  (they cannot sign in)
--   * payment / booking / agreement references contain "SD" or "SB"
--   * seeded bills have note = 'seed'
-- Safe to run once; it does nothing if the seed accounts already exist.
do $seed$
declare
  fn text[] := array['Ritah','Moses','Grace','Peter','Juliet','David','Faith','Joseph','Mercy','Isaac','Sandra','Emmanuel','Patience','Ronald','Lillian','Arthur','Winnie','Denis','Stella','Henry'];
  ln text[] := array['Mukasa','Namugga','Ssekandi','Auma','Kirabo','Tendo','Baguma','Nabukenya','Okwir','Kemigisha','Lutalo','Apio','Bwambale','Nakirya','Mwesigwa','Akol','Sserwadda','Atwine','Nalubega','Kisakye','Muhwezi','Ocen','Birungi','Tusiime','Wanyama'];
  courses text[] := array['Computer Science','Law','Medicine','Economics','Architecture','Engineering','Education','Nursing','Social Sciences','Business Administration'];
  colleges text[] := array['COCIS','School of Law','CHS','CoBAMS','CEDAT','CEES','CHUSS','CoNAS','MUBS','Kyambogo'];
  methods text[] := array['MTN MoMo','Airtel Money','Card','Bank transfer'];
  mtypes text[] := array['plumbing','electricity','door','window','wifi','pests','painting'];
  mnotes text[] := array['The bathroom tap keeps leaking and the floor stays wet.','Sockets by the desk keep tripping the power.','The door lock is stiff and sometimes will not open.','A window pane is cracked and will not close fully.','Wi-Fi drops every evening around 8pm.','Cockroaches in the corridor kitchen.','Paint is peeling off the ceiling above the bed.'];
  n_users int := 120;
  ids uuid[] := array[]::uuid[];
  nm text[] := array[]::text[];
  i int; ptr int := 0; seq int := 0; bseq int := 0;
  lst record; un record; rq record;
  total_u int; used_u int; need int; ratio numeric;
  uid uuid; fname text; meth text; mail text; r text;
  m_ago int; st int; skipn int; paid_n int; k int; nights int;
  start_d date; paid_thru date; pay_d date; amt int; dep int; pstat text; bal int;
  bk int; extra_ids uuid[]; j int := 0;
begin
  if exists (select 1 from auth.users where email like '%@seed.rentpply.test') then
    raise notice 'Demo data already present, nothing to do.'; return;
  end if;

  -- 1. residents (accounts) -------------------------------------------------
  for i in 0..n_users - 1 loop
    fname := fn[(i % 20) + 1] || ' ' || ln[((i * 7 + i / 100) % 25) + 1];
    mail := lower(replace(fname, ' ', '.')) || '@seed.rentpply.test';
    r := case when i % 4 = 0 then 'tenant' else 'student' end;
    ids := array_append(ids, gen_random_uuid()); nm := array_append(nm, fname);
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
    values ('00000000-0000-0000-0000-000000000000', ids[i + 1], 'authenticated', 'authenticated', mail, extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', fname, 'role', r, 'is_student', r = 'student'),
      now() - make_interval(days => (i * 53) % 230), now(), '', '', '', '');
    update public.profiles set
      phone = '+2567' || lpad(((i * 7919 + 1234567) % 100000000)::text, 8, '0'),
      kyc_status = case when i % 23 = 5 then 'none' else 'verified' end,
      course = courses[(i % 10) + 1], college = colleges[((i * 3) % 10) + 1],
      gender = case when i % 2 = 0 then 'f' else 'm' end::public.gender_pref,
      budget = 250000 + (i % 8) * 50000,
      sleep = case when i % 3 = 0 then 'late' else 'early' end::public.sleep_pref,
      clean_level = 1 + (i % 5),
      study = case when i % 4 = 0 then 'group' else 'quiet' end::public.study_pref,
      prefs_done = true,
      created_at = now() - make_interval(days => (i * 53) % 230)
    where id = ids[i + 1];
    if i % 7 = 0 then
      insert into public.roommate_profiles (user_id, full_name, course, college, gender, year, budget, sleep, clean_level, study, location, is_verified)
      values (ids[i + 1], fname, courses[(i % 10) + 1], colleges[((i * 3) % 10) + 1], case when i % 2 = 0 then 'f' else 'm' end, 1 + (i % 4),
        250000 + (i % 8) * 50000, case when i % 3 = 0 then 'late' else 'early' end::public.sleep_pref, 1 + (i % 5),
        case when i % 4 = 0 then 'group' else 'quiet' end::public.study_pref, (array['Kikoni','Wandegeya','Makerere','Kansanga','Ntinda','Bukoto'])[(i % 6) + 1], true);
    end if;
  end loop;

  -- 2. rooms: tenants, rent history, bookings, agreements --------------------
  for lst in select * from public.listings where verified order by name loop
    select count(*) into total_u from public.units where listing_id = lst.id;
    select count(*) into used_u from public.units where listing_id = lst.id and status <> 'vacant';
    ratio := case lst.type when 'hostel' then .5 when 'rental' then .5 else .35 end;
    need := greatest(0, round(ratio * total_u)::int - used_u);
    if lst.name = 'Kikoni Scholars Hostel' then need := 3; end if;
    for un in select * from public.units where listing_id = lst.id and status = 'vacant' order by md5(id::text) limit need loop
      exit when ptr >= n_users - 20;
      uid := ids[ptr + 1]; fname := nm[ptr + 1]; meth := methods[(ptr % 4) + 1];
      if lst.type = 'airbnb' then
        nights := 3 + ptr % 4; start_d := current_date - (ptr % 2); paid_thru := start_d + nights;
        update public.units set status = 'occupied', tenant_id = uid, tenant_name = fname, payment_status = 'paid', balance = 0, paid_through = paid_thru::timestamptz, credit_rating = 'Good', months_paid_ytd = 1, efris_receipts_count = 1, updated_at = now() where id = un.id;
        seq := seq + 1; bseq := bseq + 1;
        insert into public.payments (reference, listing_id, unit_id, room_code, tenant_id, tenant_name, start_date, months, nights, amount, fee, deposit, payment_method, paid_by, purpose, status, from_source, created_at, confirmed_at, efris_document_no, verification_code)
        values ('RP-2026-SD' || lpad(seq::text, 4, '0'), lst.id, un.id, un.unit_code, uid, fname, start_d, 0, nights, un.rent * nights, round(un.rent * nights * .03)::int, 0, meth, 'Self', 'Stay, ' || nights || ' nights', 'confirmed', '07' || lpad(((ptr * 7919) % 100000000)::text, 8, '0'), start_d::timestamptz - interval '2 days' + interval '9 hours', start_d::timestamptz - interval '1 day' + interval '9 hours', '10' || lpad(((ptr + 1) * 100003)::text, 8, '0'), upper(substr(md5(seq::text), 1, 8)));
        insert into public.bookings (reference, listing_id, unit_id, tenant_id, tenant_name, room_code, start_date, months, nights, amount, fee, deposit, payment_method, paid_by, purpose, created_at)
        values ('RP-2026-SB' || lpad(bseq::text, 4, '0'), lst.id, un.id, uid, fname, un.unit_code, start_d, 0, nights, un.rent * nights, round(un.rent * nights * .03)::int, 0, meth, 'Self', 'Stay, ' || nights || ' nights', start_d::timestamptz - interval '2 days');
        insert into public.agreements (reference, listing_id, unit_id, room_code, tenant_id, tenant_name, quantity, start_date, status, issued_at, accepted_at, paid, created_at)
        values ('AG-2026-SD' || lpad(bseq::text, 4, '0'), lst.id, un.id, un.unit_code, uid, fname, nights, start_d, 'accepted', start_d::timestamptz - interval '3 days', start_d::timestamptz - interval '2 days', true, start_d::timestamptz - interval '3 days');
      else
        m_ago := 1 + (ptr % 6); st := ptr % 10;
        skipn := case when st = 0 then 2 when st in (1, 2) then 1 else 0 end;
        if m_ago <= skipn then m_ago := skipn + 1; end if;
        start_d := (current_date - make_interval(months => m_ago))::date + (ptr % 20);
        paid_n := m_ago - skipn; paid_thru := (start_d + make_interval(months => paid_n))::date;
        pstat := case when st = 0 then 'overdue' when st in (1, 2) then 'due' else 'paid' end;
        bal := case when st = 0 then un.rent * 2 when st in (1, 2) then un.rent else 0 end;
        update public.units set status = 'occupied', tenant_id = uid, tenant_name = fname, payment_status = pstat, balance = bal, paid_through = paid_thru::timestamptz,
          credit_rating = case when st = 0 then 'Fair' when ptr % 5 = 0 then 'Excellent' else 'Good' end, months_paid_ytd = paid_n, efris_receipts_count = greatest(1, paid_n - 1),
          roommate_name = case when lst.type = 'hostel' and ptr % 6 = 0 then nm[((ptr + 61) % n_users) + 1] else null end, updated_at = now() where id = un.id;
        for k in 0..paid_n - 1 loop
          pay_d := (start_d + make_interval(months => k))::date; seq := seq + 1;
          dep := case when k = 0 and lst.type = 'rental' then un.rent else 0 end;
          insert into public.payments (reference, listing_id, unit_id, room_code, tenant_id, tenant_name, start_date, months, nights, amount, fee, deposit, payment_method, paid_by, purpose, status, from_source, created_at, confirmed_at, efris_document_no, verification_code)
          values ('RP-2026-SD' || lpad(seq::text, 4, '0'), lst.id, un.id, un.unit_code, uid, fname, pay_d, 1, 0, un.rent, round(un.rent * .03)::int, dep, meth, case when ptr % 5 = 0 then 'Parent' else 'Self' end, 'Rent, 1 month', 'confirmed',
            '07' || lpad(((ptr * 7919 + k) % 100000000)::text, 8, '0'), pay_d::timestamptz - interval '2 days' + interval '10 hours' + (ptr % 9) * interval '37 minutes', pay_d::timestamptz - interval '1 day' + interval '10 hours',
            case when (ptr + k) % 4 <> 0 then '10' || lpad(((ptr + 1) * 100003 + k * 7919)::text, 8, '0') else null end, upper(substr(md5(seq::text), 1, 8)));
        end loop;
        bseq := bseq + 1;
        insert into public.bookings (reference, listing_id, unit_id, tenant_id, tenant_name, room_code, start_date, months, nights, amount, fee, deposit, payment_method, paid_by, purpose, created_at)
        values ('RP-2026-SB' || lpad(bseq::text, 4, '0'), lst.id, un.id, uid, fname, un.unit_code, start_d, 6, 0, un.rent * 6, round(un.rent * 6 * .03)::int, case when lst.type = 'rental' then un.rent else 0 end, meth, 'Self', 'Rent, 6 months', start_d::timestamptz - interval '3 days');
        insert into public.agreements (reference, listing_id, unit_id, room_code, tenant_id, tenant_name, quantity, start_date, status, issued_at, accepted_at, paid, created_at)
        values ('AG-2026-SD' || lpad(bseq::text, 4, '0'), lst.id, un.id, un.unit_code, uid, fname, 6, start_d, 'accepted', start_d::timestamptz - interval '4 days', start_d::timestamptz - interval '3 days', true, start_d::timestamptz - interval '4 days');
      end if;
      ptr := ptr + 1;
    end loop;
  end loop;

  -- 3. earlier short stays at the Airbnb-style properties (revenue history) ----
  for lst in select * from public.listings where verified and type = 'airbnb' loop
    for j in 1..10 loop
      select * into un from public.units where listing_id = lst.id order by md5(id::text || j::text) limit 1;
      uid := ids[n_users - 20 + (j % 20) + 1]; fname := nm[n_users - 20 + (j % 20) + 1];
      nights := 2 + (j % 5); start_d := current_date - ((j * 17 + length(lst.name)) % 175) - 6; seq := seq + 1;
      insert into public.payments (reference, listing_id, unit_id, room_code, tenant_id, tenant_name, start_date, months, nights, amount, fee, deposit, payment_method, paid_by, purpose, status, from_source, created_at, confirmed_at, efris_document_no, verification_code)
      values ('RP-2026-SD' || lpad(seq::text, 4, '0'), lst.id, un.id, un.unit_code, uid, fname, start_d, 0, nights, un.rent * nights, round(un.rent * nights * .03)::int, 0, methods[(j % 4) + 1], 'Self', 'Stay, ' || nights || ' nights', 'confirmed',
        '07' || lpad(((j * 31337) % 100000000)::text, 8, '0'), start_d::timestamptz - interval '3 days', start_d::timestamptz - interval '2 days', case when j % 3 <> 0 then '10' || lpad((j * 100003 + seq)::text, 8, '0') else null end, upper(substr(md5(seq::text), 1, 8)));
    end loop;
  end loop;

  -- 4. payments waiting for owners, and two the owners could not find ----------
  j := 0;
  for lst in select * from public.listings where verified and type <> 'airbnb' order by name limit 6 loop
    uid := ids[n_users - 20 + j + 1]; fname := nm[n_users - 20 + j + 1]; seq := seq + 1;
    insert into public.payments (reference, listing_id, unit_id, room_code, tenant_id, tenant_name, start_date, months, nights, amount, fee, deposit, payment_method, paid_by, purpose, status, from_source, created_at, confirmed_at, verification_code)
    values ('RP-2026-SD' || lpad(seq::text, 4, '0'), lst.id, null, 'Unassigned', uid, fname, current_date + 7 + j, 6, 0, lst.price * 6, round(lst.price * 6 * .03)::int, 0, methods[(j % 4) + 1], 'Self', 'Rent, 6 months',
      case when j < 4 then 'pending' else 'rejected' end::public.payment_status, '07' || lpad(((j + 5) * 48271 % 100000000)::text, 8, '0'), now() - make_interval(hours => 5 + j * 11), case when j < 4 then null else now() - make_interval(hours => 3 + j) end, upper(substr(md5(seq::text), 1, 8)));
    j := j + 1;
  end loop;

  -- 5. reserved and under-maintenance rooms ---------------------------------
  j := 0;
  for lst in select * from public.listings where verified order by name loop
    select * into un from public.units where listing_id = lst.id and status = 'vacant' order by md5(id::text) limit 1;
    if found then update public.units set status = 'reserved', tenant_name = nm[n_users - 20 + (j % 20) + 1], updated_at = now() where id = un.id; end if;
    if lst.type <> 'airbnb' then
      select * into un from public.units where listing_id = lst.id and status = 'vacant' order by md5(id::text || 'm') limit 1;
      if found then update public.units set status = 'maint', updated_at = now() where id = un.id; end if;
    end if;
    j := j + 1;
  end loop;

  -- 6. repair requests -------------------------------------------------------
  j := 0;
  for un in select u.* from public.units u where u.tenant_id = any(ids) and u.status = 'occupied' order by md5(u.id::text) limit 16 loop
    insert into public.maintenance_requests (listing_id, unit_id, room_code, tenant_id, tenant_name, type, urgent, note, status, created_at, updated_at)
    values (un.listing_id, un.id, un.unit_code, un.tenant_id, un.tenant_name, mtypes[(j % 7) + 1], j % 5 = 0, mnotes[(j % 7) + 1],
      (array['open','work','done','open'])[(j % 4) + 1]::public.maintenance_status, now() - make_interval(days => 1 + j * 3), now() - make_interval(days => j));
    j := j + 1;
  end loop;

  -- 7. bills -------------------------------------------------------------------
  j := 0;
  for lst in select * from public.listings where verified order by name loop
    select count(*) into total_u from public.units where listing_id = lst.id;
    insert into public.bills (listing_id, category, name, reference, note, amount, due_date, status, role, paid_at) values
      (lst.id, 'water', 'NWSC main meter', 'WM-' || (40000 + j * 137), 'seed', 80000 + total_u * 9000, (date_trunc('month', now()) - interval '1 month' + interval '14 days')::date, 'paid', null, now() - interval '25 days'),
      (lst.id, 'water', 'NWSC main meter', 'WM-' || (40000 + j * 137), 'seed', 85000 + total_u * 9000, (date_trunc('month', now()) + interval '14 days')::date, 'due', null, null),
      (lst.id, 'power', 'UMEME whole building', 'UM-' || (700000 + j * 911), 'seed', 150000 + total_u * 22000, (date_trunc('month', now()) - interval '1 month' + interval '14 days')::date, case when j % 3 = 0 then 'overdue' else 'paid' end::public.bill_status, null, case when j % 3 = 0 then null else now() - interval '24 days' end),
      (lst.id, 'power', 'UMEME whole building', 'UM-' || (700000 + j * 911), 'seed', 160000 + total_u * 22000, (date_trunc('month', now()) + interval '14 days')::date, 'due', null, null),
      (lst.id, 'staff', (array['Okello James','Mukisa Robert','Nakimuli Hellen','Ssentongo Paul'])[(j % 4) + 1], null, 'seed', 260000 + (j % 3) * 40000, (date_trunc('month', now()) + interval '27 days')::date, 'due', 'Security guard', null);
    if lst.type = 'hostel' then
      insert into public.bills (listing_id, category, name, reference, note, amount, due_date, status, role, paid_at)
      values (lst.id, 'tv', 'DStv Compact', 'DS-' || (9000 + j * 53), 'seed', 99000, (date_trunc('month', now()) + interval '19 days')::date, 'due', null, null);
    end if;
    j := j + 1;
  end loop;

  -- 8. requests from people interested, and owner notifications ---------------
  j := 0;
  for lst in select * from public.listings where verified order by name loop
    insert into public.owner_requests (listing_id, kind, requester_name, details, status, created_at, resolved_at) values
      (lst.id, 'Viewing request', nm[n_users - 20 + (j % 20) + 1], 'Would like to view on ' || to_char(current_date + 2 + j, 'DD Mon YYYY') || ' at ' || (array['9:00 am','11:00 am','2:00 pm','4:00 pm'])[(j % 4) + 1],
        (array['open','open','approved','open','declined'])[(j % 5) + 1], now() - make_interval(hours => 6 + j * 9), case when j % 5 in (2, 4) then now() - make_interval(hours => 2 + j) else null end);
    insert into public.notifications (user_id, type, title, message, data, read, created_at) values
      (lst.owner_id, 'payment_confirmed', 'Payment confirmed', nm[(j * 5) % 90 + 1] || ' paid rent for ' || lst.name || '.', '{}'::jsonb, j % 2 = 0, now() - make_interval(hours => 8 + j * 5)),
      (lst.owner_id, 'repair_requested', 'New repair request', 'A tenant at ' || lst.name || ' reported a problem.', '{}'::jsonb, false, now() - make_interval(hours => 20 + j * 7));
    j := j + 1;
  end loop;

  -- 9. keep each property's counters in step with its rooms ---------------------
  update public.listings l set
    total_units = (select count(*) from public.units u where u.listing_id = l.id),
    available_units = (select count(*) from public.units u where u.listing_id = l.id and u.status = 'vacant'),
    updated_at = now();
end
$seed$;
