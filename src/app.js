import { supabase, auth, profiles, listings, units, bookings, payments, agreements, maintenance, bills, roommates, rentTransfers, ownerRequests, adminQueue, notifications, savedListings, kyc } from './lib/supabase.js';

// =====================================================================
// Global State (mirrors S from original index.html but uses Supabase)
// =====================================================================
const S = {
  role: 'tenant',
  tab: 'home',
  user: null,
  profile: null,
  f: { type: 'all', q: '', area: '', max: 0, sort: 'rec' },
  saved: [],
  bookings: [],
  prefs: { course: 'Computer Science', college: 'COCIS', gender: 'any', budget: 400000, sleep: 'early', clean: 4, study: 'quiet' },
  asked: [],
  transfers: [],
  page: null,
  sent: {},
  owner: { sel: null },
  admin: {},
  matched: false,
  terms: {},
  rq: 0,
  payments: [],
  maint: [],
  bills: [],
  agreements: [],
  kyc: { st: 'none' },
  adm: { sel: 1, open: {}, vf: {}, cred: {}, added: [], fl: {}, u: {}, dv: {}, lay: {}, showpw: {}, hub: 'add', ptab: 'media' },
  board: [],
  wtab: 'room',
  fpg: 0,
  kr: 1,
  lt: 'Amenities',
  kyc: { st: 'none' }
};

// =====================================================================
// Helper Functions (copied from index.html)
// =====================================================================
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = n => 'UGX ' + Math.round(n).toLocaleString('en-US');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const DAY = 864e5;
const fdate = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const iso = d => new Date(d).toISOString().slice(0, 10);
const NOW = Date.now();

const IC = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  swap: 'M17 3l4 4-4 4M21 7H8a4 4 0 0 0-4 4M7 21l-4-4 4-4M3 17h13a4 4 0 0 0 4-4',
  wallet: 'M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2zM16 14.5h.01',
  building: 'M4 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17M15 9h4a1 1 0 0 1 1 1v11M2 21h20M8 7h3M8 11h3M8 15h3',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6L6 18',
  heart: 'M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z',
  pin: 'M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.800 12 21 12 21zM12 12a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5z',
  star: 'M12 3l2.8 5.800 6.200.900-4.500 4.400 1.100 6.200L12 17.300 6.400 20.300l1.100-6.200L3 9.700l6.200-.9z',
  bell: 'M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8zM10 21a2 2 0 0 0 4 0',
  receipt: 'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  tag: 'M3 12V4h8l10 10-8 8zM7.500 7.500h.01',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  key: 'M14 10a5 5 0 1 0-4 4.900L12 17h2v2h2v2h3v-3l-5.300-5.300A5 5 0 0 0 14 10z',
  bed: 'M3 18v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8M3 14h18M3 21v-3M21 21v-3M7 11h4',
  flag: 'M5 21V4M5 4h12l-2 4 2 4H5',
  moon: 'M21 12.800A9 9 0 1 1 11.200 3a7 7 0 0 0 9.800 9.800z',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.900 4.900l1.400 1.400M17.700 17.700l1.400 1.400M2 12h2M20 12h2M4.900 19.100l1.400-1.400M17.700 6.300l1.400-1.400',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  chevron: 'M6 9l6 6 6-6',
  arrowL: 'M19 12H5M11 6l-6 6 6 6',
  drop: 'M12 3s6 6.500 6 11a6 6 0 0 1-12 0c0-4.500 6-11 6-11z',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  tv: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8 21h8M12 18v3',
  broom: 'M14 3l7 7M13 8l3 3-8 8a3 3 0 0 1-4.200 0l-.8-.8a3 3 0 0 1 0-4.200z',
  lock: 'M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5z',
  wifi: 'M2 8.800a15 15 0 0 1 20 0M5 12.500a10 10 0 0 1 14 0M8.500 16a5 5 0 0 1 7 0M12 19.500h.01',
  car: 'M5 17h14M6 17V9l2-4h8l2 4v8M6 13h12M8 17v2M16 17v2',
  book: 'M4 19.500A2.500 2.500 0 0 1 6.500 17H20V3H6.500A2.500 2.500 0 0 0 4 5.500zM4 19.500A2.500 2.500 0 0 0 6.500 22H20v-5',
  snow: 'M12 2v20M3.300 7l17.400 10M3.300 17L20.700 7',
  cup: 'M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zM17 10h2a2 2 0 0 1 0 4h-2M8 3v2M12 3v2',
  tree: 'M12 22v-6M7 16h10l-3-4h2l-4-7-4 7h2z',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  cam: 'M3 8h3l2-3h8l2 3h3v11H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  washer: 'M5 3h14v18H5zM5 8h14M12 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  shower: 'M4 4h6a4 4 0 0 1 4 4v1M14 9h6M6 13v.01M10 13v.01M6 17v.01M10 17v.01M14 13v.01',
  plus: 'M12 5v14M5 12h14',
  brush: 'M5 4h12v5H5zM17 6.500h2v5h-7v3M10 14.500h4v6h-4z',
  window: 'M4 4h16v16H4zM12 4v16M4 12h16',
  bug: 'M12 8a4 4 0 0 1 4 4v3a4 4 0 0 1-8 0v-3a4 4 0 0 1 4-4zM9 5l2 3M15 5l-2 3M4 12h4M16 12h4M5 18l3-2M19 18l-3-2',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.500h.010',
  play: 'M8 5v14l11-7z',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  crosshair: 'M12 3v4M12 17v4M3 12h4M17 12h4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  phone: 'M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6',
  home2: 'M3 11l9-7 9 7v9H3z'
};

const ic = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${IC[n]}"/></svg>`;

// Property art generator
let art = function (l, big) {
  const h = l.hue || 168;
  const r = n => { const x = Math.sin((l.id || 1) * 99.7 + n * 12.9898) * 43758.5453; return x - Math.floor(x) };
  let b = '';
  const n = 5 + Math.floor(r(1) * 3);
  for (let i = 0; i < n; i++) {
    const w = 38 + r(i + 2) * 30, x = 8 + i * (300 / n), ht = 50 + r(i + 9) * 90, y = 170 - ht;
    b += `<rect x="${x}" y="${y}" width="${w}" height="${ht}" rx="3" fill="hsl(${h + i * 8},${28 + r(i) * 20}%,${i % 2 ? 24 : 32}%)"/>`;
    for (let wy = y + 10; wy < 160; wy += 16) for (let wx = x + 8; wx < x + w - 8; wx += 13) b += `<rect x="${wx}" y="${wy}" width="6" height="8" rx="1.500" fill="hsl(${46},90%,${r(wx + wy) > .55 ? 72 : 30}%)" opacity="${r(wx * wy) > .55 ? 1 : .55}"/>`;
  }
  return `<svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustration of ${esc(l.name)}"><defs><linearGradient id="g${l.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${h},55%,${big ? 62 : 58}%)"/><stop offset="1" stop-color="hsl(${h + 30},60%,82%)"/></linearGradient></defs><rect width="320" height="200" fill="url(#g${l.id})"/><circle cx="${250 + r(3) * 40}" cy="${34 + r(4) * 18}" r="16" fill="#FFF3C9" opacity=".9"/>${b}<rect y="168" width="320" height="32" fill="hsl(${h},25%,18%)"/><rect y="168" width="320" height="3" fill="hsl(${h},30%,28%)"/></svg>`;
};

const verifiedPill = l => l.v || l.verified ? `<span class="pill ok">${ic('shield')}Verified</span>` : `<span class="pill warn">Pending check</span>`;
const unitLabel = l => l.per === 'night' ? '/ night' : '/ month';
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const endOf = (l, start, qty) => new Date(new Date(start).getTime() + (l.per === 'night' ? qty * DAY : qty * 30.4 * DAY));
const ago = ts => { const m = Math.round((Date.now() - ts) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago'; };
const fdt = d => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const efrisNo = id => String(1000000000 + (hash(id) % 8000000000));
const vcode = id => { const t = ((hash(id) * 2654435761) >>> 0).toString(36).toUpperCase().padStart(8, '0').slice(-8); return t.slice(0, 4) + '-' + t.slice(4) };
const hash = str => { let h = 7; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h };

// Store for localStorage persistence (for non-Supabase data like UI preferences)
const store = {
  get(k, d) { try { const v = localStorage.getItem('rp_' + k); return v ? JSON.parse(v) : d } catch (e) { return d } },
  set(k, v) { try { localStorage.setItem('rp_' + k, JSON.stringify(v)) } catch (e) {} }
};

const save = () => {
  store.set('terms', S.terms);
  store.set('payments2', S.payments);
  store.set('agreements2', S.agreements);
  store.set('maint2', S.maint);
  store.set('bills2', S.bills);
  store.set('saved', S.saved);
  store.set('bookings2', S.bookings);
  store.set('prefs', S.prefs);
  store.set('asked', S.asked);
  store.set('transfers', S.transfers);
  store.set('units4', UNITS.map(u => ({ id: u.id, st: u.st, keep: u.keep || null, roommate: u.roommate || null })));
  store.set('adm1', S.adm);
  store.set('board1', S.board);
  store.set('kyc1', S.kyc);
};

// =====================================================================
// Sample Data (fallback when Supabase not configured)
// =====================================================================
const L = [
  { id: 1, name: 'Kikoni Scholars Hostel', type: 'hostel', area: 'Kikoni', price: 380000, per: 'month', unit: 'Single room', dist: 0.6, avail: 6, total: 48, v: 1, rating: 4.6, n: 128, hue: 168, owner: 'Ssemakula Properties', am: ['Wi-Fi', '24h security', 'Water tank', 'Study room', 'Backup power'], desc: 'Purpose-built student hostel with a guarded gate, a quiet study room on every floor and a ten-minute walk to the main gate of Makerere University.' },
  { id: 2, name: 'Wandegeya Court Hostel', type: 'hostel', area: 'Wandegeya', price: 320000, per: 'month', unit: 'Double room (shared)', dist: 0.9, avail: 11, total: 60, v: 1, rating: 4.2, n: 84, hue: 205, owner: 'Court Estates Ltd', am: ['Wi-Fi', 'CCTV', 'Laundry area', 'Kitchenette'], desc: 'Shared double rooms with a kitchenette per floor. Close to the Wandegeya market and boda stage. Rent is paid per semester block or monthly.' },
  { id: 3, name: 'Makerere Heights Residence', type: 'hostel', area: 'Makerere', price: 520000, per: 'month', unit: 'En-suite single', dist: 0.3, avail: 3, total: 30, v: 1, rating: 4.8, n: 203, hue: 28, owner: 'Heights Hospitality', am: ['En-suite bathroom', 'Wi-Fi', 'Generator', '24h security', 'Cafeteria'], desc: 'Premium en-suite singles within walking distance of the lecture blocks. Backup generator keeps lights and Wi-Fi on during load shedding.' },
  { id: 4, name: 'Ntinda Garden Apartments', type: 'rental', area: 'Ntinda', price: 1200000, per: 'month', unit: '2-bedroom apartment', dist: 6.2, avail: 2, total: 16, v: 1, rating: 4.5, n: 41, hue: 140, owner: 'Garden Estates', am: ['Parking', 'Garden', 'Water tank', 'Security guard'], desc: 'Two-bedroom apartments in a gated compound with a shared garden. Twelve-month agreements with a two-month deposit.' },
  { id: 5, name: 'Muyenga Hill Studio', type: 'rental', area: 'Muyenga', price: 750000, per: 'month', unit: 'Studio', dist: 8.4, avail: 1, total: 6, v: 1, rating: 4.4, n: 19, hue: 300, owner: 'Kisakye Holdings', am: ['Hill view', 'Parking', 'Wi-Fi ready'], desc: 'A bright studio on Tank Hill road with a balcony view across the city. Quiet street and a short ride from Ggaba Road.' },
  { id: 6, name: 'Kololo Serviced Suites', type: 'airbnb', area: 'Kololo', price: 260000, per: 'night', unit: 'One-bedroom suite', dist: 3.1, avail: 5, total: 12, v: 1, rating: 4.9, n: 312, hue: 18, owner: 'Kololo Stays', am: ['Daily cleaning', 'Wi-Fi', 'Air conditioning', 'Breakfast'], desc: 'Serviced suites for visitors and business travellers. Self check-in with a code sent after payment is confirmed.' },
  { id: 7, name: 'Munyonyo Lakeside Stay', type: 'airbnb', area: 'Munyonyo', price: 210000, per: 'night', unit: 'Lake-view room', dist: 11, avail: 4, total: 8, v: 1, rating: 4.7, n: 156, hue: 195, owner: 'Lakeside Hosts', am: ['Lake view', 'Pool', 'Breakfast', 'Parking'], desc: 'Quiet rooms facing Lake Victoria. Popular with families and weekend guests.' },
  { id: 8, name: 'Bukoto Family Flat', type: 'rental', area: 'Bukoto', price: 900000, per: 'month', unit: '2-bedroom flat', dist: 5.0, avail: 2, total: 10, v: 1, rating: 4.3, n: 27, hue: 85, owner: 'Bukoto Rentals', am: ['Security guard', 'Water tank', 'Parking'], desc: 'Family flat close to schools and Bukoto market. Landlord on the premises.' },
  { id: 9, name: 'Najjera Budget Rooms', type: 'rental', area: 'Najjera', price: 280000, per: 'month', unit: 'Single room', dist: 12, avail: 8, total: 20, v: 0, rating: 0, n: 0, hue: 50, owner: 'R. Wasswa', am: ['Water', 'Shared compound'], desc: 'Listing submitted and waiting for document and site checks. It cannot be booked until an administrator verifies the owner and the property.' },
  { id: 10, name: 'Nakasero Business Stay', type: 'airbnb', area: 'Nakasero', price: 340000, per: 'night', unit: 'Executive room', dist: 2.4, avail: 3, total: 9, v: 1, rating: 4.7, n: 98, hue: 250, owner: 'Nakasero Hosts', am: ['Desk', 'Wi-Fi', 'Air conditioning', 'Airport pickup'], desc: 'Executive rooms with a work desk, close to government offices and banks.' },
  { id: 11, name: 'Kansanga Student Lodge', type: 'hostel', area: 'Kansanga', price: 290000, per: 'month', unit: 'Single room', dist: 1.4, avail: 9, total: 36, v: 1, rating: 4.0, n: 52, hue: 330, owner: 'Lodge Care', am: ['Wi-Fi', 'Water tank', 'Security guard'], desc: 'Budget single rooms for students at Makerere Business School and nearby colleges.' }
];

const byId = id => L.find(x => x.id === id);
const AREAS = [...new Set(L.map(l => l.area))].sort();
const BUDGETS = [[0, 'Any price'], [350000, 'Up to 350k'], [600000, 'Up to 600k'], [1000000, 'Up to 1M']];
const SORTS = [['rec', 'Recommended'], ['lo', 'Price: low to high'], ['hi', 'Price: high to low'], ['near', 'Closest first'], ['top', 'Top rated']];

// Sample units for Kikoni (fallback)
const NAMES = ['Nakato Sarah', 'Okello Brian', 'Namutebi Joy', 'Mugisha Allan', 'Achieng Ruth', 'Kato Daniel', 'Nansubuga Pearl', 'Tumusiime Ivan', 'Auma Esther', 'Ssebunya Peter', 'Kyomuhendo Lilian', 'Opio Samuel', 'Nabirye Hellen', 'Mwesigwa Joel', 'Akello Faith', 'Byaruhanga Tom', 'Nalubega Grace', 'Ochieng Mark', 'Birungi Alice', 'Lubega Henry'];
const PLAN = 'ooopooooovvv'+'vvovovvmvvvv';
const UNITS = (() => {
  const u = []; let k = 0;
  for (const blk of ['A', 'B']) for (let i = 1; i <= 12; i++) {
    const code = PLAN[(blk === 'A' ? 0 : 12) + i - 1] || 'o', id = blk + '-' + String(i).padStart(2, '0');
    if (code === 'v') { u.push({ id, st: 'vacant' }); continue; }
    if (code === 'm') { u.push({ id, st: 'maint' }); continue; }
    if (id === 'B-05') { u.push({ id, st: 'reserved', tenant: 'Brian Kigozi', rent: 380000 }); continue; }
    const pay = code === 'p' ? (k % 2 ? 'overdue' : 'due') : 'paid', n = NAMES[k++ % NAMES.length];
    u.push({ id, st: 'occupied', tenant: n, rent: 380000, pay, bal: pay === 'overdue' ? 380000 : pay === 'due' ? 190000 : 0, thru: iso(NOW + (pay === 'overdue' ? -9 : pay === 'due' ? 4 : 18 + k * 3) * DAY), credit: pay === 'overdue' ? 'Watch' : k % 4 ? 'Good' : 'Excellent' });
  }
  return u;
})();
const occ = UNITS.filter(u => u.st === 'occupied');

// Sample roommate profiles
const PEOPLE = [
  { n: 'Aisha N.', course: 'Computer Science', college: 'COCIS', g: 'f', yr: 2, budget: 380000, sleep: 'early', clean: 5, study: 'quiet', loc: 'Kikoni' },
  { n: 'Brian M.', course: 'Computer Science', college: 'COCIS', g: 'm', yr: 3, budget: 420000, sleep: 'late', clean: 3, study: 'group', loc: 'Wandegeya' },
  { n: 'Daniel O.', course: 'Software Engineering', college: 'COCIS', g: 'm', yr: 2, budget: 350000, sleep: 'early', clean: 4, study: 'quiet', loc: 'Kikoni' },
  { n: 'Esther K.', course: 'Law', college: 'School of Law', g: 'f', yr: 1, budget: 450000, sleep: 'early', clean: 4, study: 'quiet', loc: 'Makerere' },
  { n: 'Moses T.', course: 'Computer Science', college: 'COCIS', g: 'm', yr: 2, budget: 300000, sleep: 'early', clean: 4, study: 'quiet', loc: 'Kansanga' },
  { n: 'Grace A.', course: 'Medicine', college: 'CHS', g: 'f', yr: 4, budget: 520000, sleep: 'late', clean: 5, study: 'group', loc: 'Makerere' }
];

// Sample rent transfers
const OPEN = [
  { id: 't1', lid: 1, room: 'C-07', left: 3, price: 380000, from: iso(NOW + 9 * DAY), why: 'Changing university' },
  { id: 't2', lid: 3, room: 'A-21', left: 2, price: 500000, from: iso(NOW + 14 * DAY), why: 'Internship in Mbarara' },
  { id: 't3', lid: 4, room: 'Flat 3B', left: 5, price: 1150000, from: iso(NOW + 20 * DAY), why: 'Job transfer to Gulu' },
  { id: 't4', lid: 11, room: 'D-12', left: 4, price: 280000, from: iso(NOW + 7 * DAY), why: 'Moving abroad' }
];

// =====================================================================
// Authentication & Profile Management
// =====================================================================

async function initAuth() {
  // Listen for auth state changes
  auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state changed:', event, session?.user?.id);
    if (session?.user) {
      S.user = session.user;
      await loadProfile();
      // Determine role from profile
      S.role = S.profile?.role === 'student' ? 'tenant' : (S.profile?.role || 'tenant');
      // Admin role stays admin
      if (S.profile?.role === 'admin') S.role = 'admin';
      // Owner role
      if (S.profile?.role === 'owner') S.role = 'owner';
      // Tenant and student both use tenant view
      if (S.profile?.role === 'tenant' || S.profile?.role === 'student') S.role = 'tenant';
      S.tab = FIRST[S.role];
      render(true);
    } else {
      // Signed out
      S.user = null;
      S.profile = null;
      S.role = 'tenant';
      S.tab = 'home';
      // Clear all cached data
      S.saved = [];
      S.bookings = [];
      S.payments = [];
      S.agreements = [];
      S.maint = [];
      S.bills = [];
      render(true);
    }
  });

  // Check for existing session
  const session = await auth.getSession();
  if (session?.user) {
    S.user = session.user;
    await loadProfile();
    S.role = S.profile?.role === 'student' ? 'tenant' : (S.profile?.role || 'tenant');
    if (S.profile?.role === 'admin') S.role = 'admin';
    if (S.profile?.role === 'owner') S.role = 'owner';
    if (S.profile?.role === 'tenant' || S.profile?.role === 'student') S.role = 'tenant';
    S.tab = FIRST[S.role];
  }
}

async function loadProfile() {
  if (!S.user) return;
  try {
    S.profile = await profiles.getCurrent();
    // Load user-specific data based on role
    await loadUserData();
  } catch (e) {
    console.error('Failed to load profile:', e);
  }
}

async function loadUserData() {
  if (!S.user || !S.profile) return;

  try {
    // Load data in parallel based on role
    if (S.role === 'tenant' || S.role === 'student') {
      const [saved, bookingsData, paymentsData, agreementsData, maintData, prefsData, kycData, askedData] = await Promise.all([
        savedListings.getMySaved(),
        bookings.getMyBookings(),
        payments.getMyPayments(),
        agreements.getMyAgreements(),
        maintenance.getMyRequests(),
        profiles.getCurrent(), // This includes preferences
        kyc.getMyKyc(),
        // Note: roommate requests would be loaded here too
      ]);
      S.saved = saved.map(s => s.listing_id);
      S.bookings = bookingsData || [];
      S.payments = paymentsData || [];
      S.agreements = agreementsData || [];
      S.maint = maintData || [];
      S.prefs = {
        course: S.profile.course || 'Computer Science',
        college: S.profile.college || 'COCIS',
        gender: S.profile.gender || 'any',
        budget: S.profile.budget || 400000,
        sleep: S.profile.sleep || 'early',
        clean: S.profile.clean_level || 4,
        study: S.profile.study || 'quiet',
        done: S.profile.prefs_done || false
      };
      S.kyc = {
        st: kycData?.kyc_status || 'none',
        type: kycData?.id_type,
        mask: kycData?.id_number_masked,
        name: kycData?.full_name,
        student: kycData?.is_student,
        kin: kycData?.next_of_kin_name ? `${kycData.next_of_kin_name}, ${kycData.next_of_kin_phone}` : ''
      };
    } else if (S.role === 'owner') {
      // Load owner's listings
      const ownerListings = await listings.getAll({ ownerId: S.user.id });
      // Load units, payments, agreements, maintenance, bills for each listing
      // This would be expanded based on which listing is selected
    } else if (S.role === 'admin') {
      // Admin can see everything - loaded on demand per tab
    }
  } catch (e) {
    console.error('Failed to load user data:', e);
  }
}

async function signUp(email, password, role, metadata = {}) {
  try {
    const { data, error } = await auth.signUp(email, password, { ...metadata, role });
    if (error) throw error;
    toast('Account created! Please check your email to confirm.');
    return data;
  } catch (e) {
    toast(e.message || 'Sign up failed');
    throw e;
  }
}

async function signIn(email, password) {
  try {
    const { data, error } = await auth.signIn(email, password);
    if (error) throw error;
    toast('Welcome back!');
    return data;
  } catch (e) {
    toast(e.message || 'Sign in failed');
    throw e;
  }
}

async function signOut() {
  try {
    await auth.signOut();
    toast('Signed out');
  } catch (e) {
    toast('Sign out failed');
  }
}

// =====================================================================
// Data Fetching Functions (Supabase-first with fallback)
// =====================================================================

async function fetchListings(filters = {}) {
  if (!supabase) return exploreList();
  try {
    if (S.role === 'admin') {
      return await listings.getAll({ verified: filters.verified });
    } else if (S.role === 'owner') {
      return await listings.getAll({ ownerId: S.user?.id, verified: filters.verified });
    } else {
      return await listings.getVerified(filters);
    }
  } catch (e) {
    console.error('Failed to fetch listings:', e);
    return exploreList();
  }
}

async function fetchListingById(id) {
  if (!supabase) return byId(id);
  try {
    return await listings.getWithMedia(id);
  } catch (e) {
    console.error('Failed to fetch listing:', e);
    return byId(id);
  }
}

async function fetchUnits(listingId) {
  if (!supabase) {
    // Fallback to sample data for listing 1
    if (listingId === 1) return UNITS;
    return [];
  }
  try {
    return await units.getByListing(listingId);
  } catch (e) {
    console.error('Failed to fetch units:', e);
    return [];
  }
}

async function fetchPayments(listingId) {
  if (!supabase) return S.payments;
  try {
    if (S.role === 'owner') {
      return await payments.getByListing(listingId);
    } else {
      return await payments.getMyPayments();
    }
  } catch (e) {
    console.error('Failed to fetch payments:', e);
    return S.payments;
  }
}

async function fetchAgreements(listingId) {
  if (!supabase) return S.agreements;
  try {
    if (S.role === 'owner') {
      return await agreements.getByListing(listingId);
    } else {
      return await agreements.getMyAgreements();
    }
  } catch (e) {
    console.error('Failed to fetch agreements:', e);
    return S.agreements;
  }
}

async function fetchMaintenance(listingId) {
  if (!supabase) return S.maint;
  try {
    if (S.role === 'owner') {
      return await maintenance.getByListing(listingId);
    } else {
      return await maintenance.getMyRequests();
    }
  } catch (e) {
    console.error('Failed to fetch maintenance:', e);
    return S.maint;
  }
}

async function fetchBills(listingId) {
  if (!supabase) return S.bills;
  try {
    return await bills.getByListing(listingId);
  } catch (e) {
    console.error('Failed to fetch bills:', e);
    return S.bills;
  }
}

// =====================================================================
// Toast & Theme
// =====================================================================

function toast(msg) {
  const h = $('#toast-host'); h.innerHTML = `<div class="toast">${esc(msg)}</div>`;
  clearTimeout(toast.t); toast.t = setTimeout(() => h.innerHTML = '', 2800);
}

function applyTheme(t) {
  if (t) document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
}
applyTheme(store.get('theme', null));

// =====================================================================
// Navigation & Render
// =====================================================================

const NAV = {
  tenant: [['home', 'Home', 'home', vHome], ['explore', 'Explore', 'search', vExplore], ['roommates', 'Roommates', 'users', vRoommates], ['wallet', 'My stay', 'key', vWallet]],
  owner: [['overview', 'Overview', 'chart', vOverview], ['units', 'Units', 'building', vUnits], ['payments', 'Payments', 'receipt', vPayments], ['terms', 'Board', 'key', vBoard], ['requests', 'Requests', 'list', vRequests]],
  admin: [['queue', 'Onboard', 'shield', vQueue], ['units', 'Units', 'key', vAdmUnits], ['prop', 'Property', 'home', vAdmProp], ['listings', 'Listings', 'building', vListings], ['kpis', 'KPIs', 'chart', vKpis]]
};
const FIRST = { tenant: 'home', owner: 'overview', admin: 'queue' };

let BK = null; // Booking draft
let MT = { type: 'plumbing', urgent: false, bid: null };

function render(top) {
  const nav = NAV[S.role], cur = nav.find(n => n[0] === S.tab) || nav[0];
  S.tab = cur[0];
  const pg = S.role === 'tenant' && S.page;
  if (pg && pg.name === 'listing' && !BK) initBK(pg.lid);
  const ownerOut = S.role === 'owner' && !ownerLid();
  document.body.classList.toggle('flow', !!pg || ownerOut);
  const draw = () => pg ? ({ listing: pgListing, agreement: pgAgreement, payment: pgPayment, status: pgStatus })[pg.name]() : ownerOut ? vOwnerLogin() : S.role === 'owner' ? ownerBar() + (ownerLid() === 1 ? cur[3]() : ownerLite(cur[0])) : cur[3]();
  try { $('#main').innerHTML = draw(); } catch (err) {
    console.error(err);
    ['units4', 'adm1', 'board1'].forEach(k => { try { localStorage.removeItem('rp_' + k); } catch (_) {} });
    $('#main').innerHTML = '<section class="sec"><div class="card stack"><b>This page hit a problem</b><p class="muted">We cleared the saved unit and board data. Tap below to reload.</p><button class="btn" style="background:#FF5A36;color:#fff;border:0" onclick="location.reload()">Reload</button></div></section>';
  }
  if (pg && pg.name === 'agreement') { agrFill(); accSync(); }
  const badge = n => (S.role === 'owner' && ownerLid() !== 1) ? '' : (n[0] === 'units' && S.maint.some(m => m.st === 'open')) || (n[0] === 'requests' && S.owner.req.some(r => r.st === 'open')) || (n[0] === 'wallet' && S.role === 'tenant' && S.payments.some(p => p.st === 'pending')) ? '<i class="dot"></i>' : '';
  $('#dock').innerHTML = nav.map(n => `<button data-tab="${n[0]}" ${n[0] === S.tab ? 'aria-current="page"' : ''}>${ic(n[2])}<span>${n[1]}</span>${badge(n)}</button>`).join('');
  syncGate(); if (typeof fpRestore === 'function') fpRestore();
  updateUserInfo();
  if (top) window.scrollTo({ top: 0 });
}

function updateUserInfo() {
  const el = $('#user-info');
  if (!el) return;
  if (S.user && S.profile) {
    const roleLabels = { tenant: 'Tenant', owner: 'Owner', admin: 'Admin', student: 'Student' };
    const role = S.profile.role || 'tenant';
    el.innerHTML = `<span>${esc(S.profile.full_name)}</span><span class="pill ok">${roleLabels[role] || role}</span><button class="btn ghost sm" data-signout>Sign out</button>`;
  } else {
    el.innerHTML = `<button class="btn sm" data-signin>Sign in</button><button class="btn ghost sm" data-signup>Sign up</button>`;
  }
}

// =====================================================================
// Event Handlers
// =====================================================================

document.addEventListener('click', e => {
  const t = e.target, c = s => t.closest(s);
  let el;

  if (!c('.acwrap')) document.querySelectorAll('.acpop').forEach(x => { x.hidden = true; });
  if ((el = c('[data-budtoggle]'))) { const pop = $('#acBud'); pop.hidden = !pop.hidden; el.setAttribute('aria-expanded', !pop.hidden); return; }
  if (c('#theme')) { const dark = document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme:dark)').matches); const n = dark ? 'light' : 'dark'; applyTheme(n); store.set('theme', n); return; }

  // Auth handlers
  if ((el = c('[data-signin]'))) { openSignIn(); return; }
  if ((el = c('[data-signup]'))) { openSignUp(); return; }
  if ((el = c('[data-signout]'))) { signOut(); return; }

  // Navigation
  if ((el = c('[data-tab]'))) { S.page = null; S.tab = el.dataset.tab; render(true); return; }
  if ((el = c('[data-go]'))) { go(el.dataset.go); return; }
  if (c('.top .logo')) { showLanding(); return; }
  if ((el = c('[data-close]') || (t.matches && t.matches('[data-veil]')))) { closeSheet(); return; }

  // KYC
  if (c('[data-kycsubmit]')) { kycSubmit(); return; }
  if (c('[data-kycverify]')) { S.kyc.st = 'verified'; kycSave(); toast('Verified. Owners now see the badge.'); render(); return; }

  // Roommate preferences
  if ((el = c('[data-rqa]'))) { const [k, v] = el.dataset.rqa.split(':'); S.prefs[k] = (k === 'budget' || k === 'clean') ? +v : v; document.querySelectorAll('[data-rqa]').forEach(b => b.setAttribute('aria-pressed', b === el)); setTimeout(() => { if (S.rq < RQ.length - 1) S.rq++; else S.prefs.done = true; save(); render(); }, 220); return; }
  if ((el = c('[data-rqgo]'))) { S.rq = +el.dataset.rqgo; S.prefs.done = false; save(); render(); return; }

  // Save listing
  if ((el = c('[data-save]'))) { const id = +el.dataset.save; S.saved = S.saved.includes(id) ? S.saved.filter(x => x !== id) : [...S.saved, id]; save(); el.setAttribute('aria-pressed', S.saved.includes(id)); toast(S.saved.includes(id) ? 'Saved to your list' : 'Removed from your list'); return; }

  // Open listing
  if ((el = c('[data-open]'))) { openListing(+el.dataset.open); return; }
  if ((el = c('[data-area]'))) { S.f.q = el.dataset.area; S.f.area = ''; render(); return; }
  if ((el = c('[data-max]'))) { S.f.max = +el.dataset.max; render(); return; }
  if (c('[data-clear]')) { S.f.q = ''; S.f.area = ''; render(); return; }
  if (c('[data-clearall]')) { S.f = { type: 'all', q: '', area: '', max: 0, sort: 'rec' }; render(); return; }
  if ((el = c('[data-type]'))) { S.f.type = el.dataset.type; render(); return; }
  if ((el = c('[data-wtab]'))) { S.wtab = el.dataset.wtab; render(); return; }

  // Payments flow
  if ((el = c('[data-payer]'))) { BK.paidBy = el.dataset.payer; document.querySelectorAll('[data-payer]').forEach(b => b.setAttribute('aria-pressed', b === el)); $('#sp').hidden = BK.paidBy !== 'Sponsor'; return; }
  if ((el = c('[data-method]'))) { BK.method = el.dataset.method; document.querySelectorAll('[data-method]').forEach(b => b.setAttribute('aria-pressed', b === el)); const card = BK.method === 'Card'; $('#ph').placeholder = card ? 'Name on card' : '07XX XXX XXX'; $('#ph').inputMode = card ? 'text' : 'tel'; return; }
  if (c('[data-pay]')) { doPay(); return; }

  // View more/less
  if ((el = c('[data-more]'))) { if (el.dataset.more === 'desc') { const d = $('#descp'); d.classList.toggle('clamp'); el.textContent = d.classList.contains('clamp') ? 'Show more' : 'Show less'; } else { const ul = el.previousElementSibling, h = ul.querySelectorAll('.more'), open = h[0] && h[0].hidden; h.forEach(x => { x.hidden = !open; }); el.textContent = open ? 'Show less' : 'Show more'; } return; }

  // Local tabs
  if ((el = c('[data-ltab]'))) { S.lt = el.dataset.ltab; document.querySelectorAll('[data-ltab]').forEach(b => b.setAttribute('aria-pressed', b === el)); document.querySelectorAll('[data-lbody]').forEach(b => { b.hidden = b.dataset.lbody !== S.lt; }); return; }

  // Viewing
  if ((el = c('[data-view]'))) { openViewing(+el.dataset.view); return; }
  if (c('[data-vsend]')) { closeSheet(); toast('Viewing requested for ' + fdate($('#vw-d') ? $('#vw-d').value : NOW) + '. The owner will confirm.'); return; }
  if (c('[data-apply]')) { S.page = { name: 'agreement', lid: BK.lid }; render(true); return; }
  if (c('[data-continue]')) { goPayment(); return; }
  if (c('[data-back]')) { const n = S.page && S.page.name; if (n === 'payment') S.page = { name: 'agreement', lid: BK.lid }; else if (n === 'agreement') S.page = { name: 'listing', lid: BK.lid }; else { S.page = null; BK = null; } render(true); return; }
  if ((el = c('[data-flowexit]'))) { S.page = null; BK = null; if (el.dataset.flowexit) S.tab = el.dataset.flowexit; render(true); return; }
  if ((el = c('[data-statuspage]'))) { const p = S.payments.find(x => x.id === el.dataset.statuspage); S.page = { name: 'status', lid: p.lid, pid: p.id }; render(true); return; }
  if ((el = c('[data-pconfirm]'))) { resolvePayment(el.dataset.pconfirm, true); return; }
  if ((el = c('[data-preject]'))) { resolvePayment(el.dataset.preject, false); return; }
  if ((el = c('[data-report]'))) { openReport(el.dataset.report); return; }
  if ((el = c('[data-mtype]'))) { MT.type = el.dataset.mtype; document.querySelectorAll('[data-mtype]').forEach(b => b.setAttribute('aria-pressed', b === el)); return; }
  if ((el = c('[data-murg]'))) { MT.urgent = el.dataset.murg === '1'; document.querySelectorAll('[data-murg]').forEach(b => b.setAttribute('aria-pressed', b === el)); return; }
  if (c('[data-msend]')) { sendReport(); return; }
  if ((el = c('[data-mclear]'))) { const n = S.maint.filter(m => m.lid === 1 && m.room === el.dataset.mclear && m.st === 'done').length; S.maint = S.maint.filter(m => !(m.lid === 1 && m.room === el.dataset.mclear && m.st === 'done')); save(); toast(n + (n === 1 ? ' fixed repair cleared' : ' fixed repairs cleared')); render(); return; }
  if ((el = c('[data-mstatus]'))) { const [id, st] = el.dataset.mstatus.split(':'), m = S.maint.find(x => x.id === id); m.st = st; save(); toast(st === 'work' ? 'Marked as being fixed. The tenant is told.' : 'Marked as fixed. The tenant is told.'); render(); return; }
  if ((el = c('[data-receipt]'))) { showReceipt({ id: el.dataset.receipt }); return; }
  if ((el = c('[data-ask]'))) { S.asked.push(el.dataset.ask); save(); toast('Request sent. They will see your verified profile.'); render(); return; }
  if ((el = c('[data-take]'))) { S.asked.push(el.dataset.take); save(); toast('Sent to the owner for approval'); render(); return; }
  if ((el = c('[data-list]'))) { const b = S.bookings.find(x => x.id === el.dataset.list), p = +$('#sp-p-' + b.id).value || byId(b.lid).price; S.transfers.push({ bid: b.id, price: p, from: iso(NOW + 7 * DAY), why: $('#sp-r-' + b.id).value }); save(); toast('Listed. Waiting for owner approval of the new tenant.'); render(); return; }
  if ((el = c('[data-copy]'))) { const v = el.dataset.copy; (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => toast('Link copied')).catch(() => { const r = document.createRange(); const code = el.parentNode.querySelector('code'); r.selectNodeContents(code); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Press and hold to copy'); }); return; }

  // Owner
  if ((el = c('[data-unit]'))) { if (lp.done) { lp.done = false; return; } clearTimeout(lp.t); S.owner.sel = el.dataset.unit; render(); const d = $('#unitDetail'); if (d) { d.scrollIntoView({ block: 'start' }); d.classList.add('flash'); setTimeout(() => d.classList.remove('flash'), 900); } return; }
  if ((el = c('[data-setst]'))) { const [id, st] = el.dataset.setst.split(':'); setUnitStatus(id, st); return; }
  if ((el = c('[data-paytab]'))) { S.owner.pay = el.dataset.paytab; S.tab = 'payments'; render(true); return; }
  if ((el = c('[data-gounit]'))) { S.owner.sel = el.dataset.gounit; S.tab = 'units'; render(); setTimeout(() => { const d = $('#unitDetail'); if (d) d.scrollIntoView({ block: 'start' }); }, 60); return; }
  if (c('[data-addbill]')) { addBill(); return; }
  if ((el = c('[data-delbill]'))) { S.bills = S.bills.filter(b => b.id !== el.dataset.delbill); save(); toast('Removed'); render(); return; }
  if (c('[data-loadbills]')) { S.bills = exampleBills(); save(); toast('Example bills loaded. Remove them any time.'); render(); return; }
  if ((el = c('[data-remind]'))) { S.sent[el.dataset.remind] = 1; toast('Reminder sent by SMS and email'); render(); return; }
  if ((el = c('[data-agree]'))) { const u = UNITS.find(x => x.id === el.dataset.agree); let a = S.agreements.find(x => x.lid === 1 && x.room === u.id); if (!a) { a = { id: 'AG-2026-' + String(4200 + S.agreements.length), lid: 1, room: u.id, tenant: u.tenant || 'Tenant', qty: 12, start: iso(NOW), status: 'draft', issued: null, accepted: null, paid: true }; S.agreements.push(a); } if (a.status === 'accepted') { toast('This tenant has already accepted'); return; } issueAgreement(a.id); return; }

  // Agreements, bills, tax
  if ((el = c('[data-agview]'))) { openAgreement(el.dataset.agview, S.role === 'owner' ? 'owner' : 'tenant'); return; }
  if ((el = c('[data-agaccept]'))) { const a = S.agreements.find(x => x.id === el.dataset.agaccept); a.status = 'accepted'; a.accepted = Date.now(); save(); closeSheet(); toast('Accepted. You can now pay.'); render(); return; }
  if ((el = c('[data-agissue]'))) { issueAgreement(el.dataset.agissue); render(); return; }
  if ((el = c('[data-agresend]'))) { toast('Reminder sent to the tenant'); return; }
  if (c('[data-saveterms]')) { S.terms[1] = formTerms(); save(); toast('Terms saved. New bookings use them.'); render(); return; }
  if (c('[data-issue]')) { const nm = $('#ag-name').value.trim(); if (!nm) { toast('Enter the tenant name'); $('#ag-name').focus(); return; } S.agreements.unshift({ id: 'AG-2026-' + String(4300 + S.agreements.length), lid: 1, room: $('#ag-unit').value, tenant: nm, qty: +$('#ag-q').value, start: $('#ag-s').value || iso(NOW), status: 'sent', issued: Date.now(), accepted: null, paid: false }); save(); toast('Sent to ' + nm + '. They must accept before paying.'); render(); return; }
  if ((el = c('[data-efris]'))) { const u = UNITS.find(x => x.id === el.dataset.efris); u.efris = u.corp ? 1 : u.ytdM; toast('EFRIS receipt submitted for ' + u.tenant); render(); return; }
  if (c('[data-efris-all]')) { occ.forEach(u => { u.efris = u.corp ? 1 : u.ytdM; }); toast('Pending receipts submitted to URA EFRIS (demo)'); render(); return; }
  if ((el = c('[data-paybill]'))) { const b = S.bills.find(x => x.id === el.dataset.paybill); b.st = 'paid'; b.paid = Date.now(); save(); toast(b.cat === 'staff' ? 'Salary sent to ' + b.name + ' by mobile money' : b.name + ' paid'); render(); return; }
  if (c('[data-payall]')) { S.bills.forEach(b => { if (b.st !== 'paid') { b.st = 'paid'; b.paid = Date.now(); } }); save(); toast('All bills and salaries paid'); render(); return; }
  if ((el = c('[data-rcpt]'))) { toast('Receipt emailed to the tenant'); return; }
  if ((el = c('[data-req]'))) { const [id, st] = el.dataset.req.split(':'); S.owner.req.find(r => r.id === id).st = st; if (id === 'q3' && st === 'approved') { const a2 = UNITS.find(x => x.id === 'A-02'); if (a2 && a2.st === 'occupied') { a2.roommate = 'Moses Tumusiime'; persistUnits(); } } toast(st === 'approved' ? 'Approved. Everyone has been notified.' : 'Declined'); render(); return; }

  // Admin
  if ((el = c('[data-adm]'))) { const [id, st] = el.dataset.adm.split(':'), r = S.admin.q.find(x => x.id === id); r.st = st; if (r.lid && st === 'approved') { const l = byId(r.lid); l.v = 1; l.owner = 'Wasswa Rentals'; } toast(st === 'approved' ? 'Verified. The listing can now be booked.' : 'Rejected. The applicant is told what to fix.'); render(); return; }
  if ((el = c('[data-fr]'))) { const [id, st] = el.dataset.fr.split(':'); S.admin.fr.find(x => x.id === id).st = st; toast(st === 'suspended' ? 'Account and listing suspended' : 'Report dismissed'); render(); return; }

  // Admin units
  if ((el = c('[data-admprop]'))) { S.adm.sel = +el.dataset.admprop; S.adm.open[S.tab] = S.adm.sel; S.adm.es = null; admSave(); render(); return; }
  if ((el = c('[data-admfloor]'))) { S.adm.fl[S.adm.sel || 1] = +el.dataset.admfloor; S.adm.es = null; admSave(); render(); return; }
  if ((el = c('[data-admunit]'))) { S.adm.es = el.dataset.admunit && S.adm.es !== el.dataset.admunit ? el.dataset.admunit : null; render(); return; }
  if ((el = c('[data-admlay]'))) { const [d, v] = el.dataset.admlay.split(':'); admSetLay(d, +v); return; }
  if (c('[data-admfill]')) { admFill(); return; }
  if (c('[data-admslot]')) { const dd = document.querySelector('details.fold'); if (dd) { dd.open = true; dd.scrollIntoView({ behavior: 'smooth', block: 'center' }); const n = $('#ad-n'); if (n) n.focus(); } return; }
  if (c('[data-admadd]')) { admAdd(); return; }
  if (c('[data-admsave]')) { admSaveEdit(); return; }
  if (c('[data-admrm]')) { admRemove(); return; }
  if ((el = c('[data-admgo]'))) { S.adm.sel = +el.dataset.admgo; S.adm.open.units = S.adm.sel; S.adm.es = null; S.tab = 'units'; render(true); return; }

  // Onboarding
  if ((el = c('[data-obhub]'))) { S.adm.hub = el.dataset.obhub; admSave(); render(); return; }
  if (q('[data-obadd]')) { obAdd(); return; }
  if ((el = c('[data-obchk]'))) { const [id, k] = el.dataset.obchk.split(':'), v = vfOf(+id); v[k] = !v[k]; admSave(); render(); return; }
  if ((el = c('[data-obverify]'))) { obVerify(+el.dataset.obverify); return; }
  if ((el = c('[data-obreject]'))) { vfOf(+el.dataset.obreject).st = 'rejected'; admSave(); toast('Rejected. The owner is told what to fix.'); render(); return; }
  if ((el = c('[data-obreopen]'))) { vfOf(+el.dataset.obreopen).st = 'pending'; admSave(); render(); return; }
  if ((el = c('[data-obshow]'))) { const k = el.dataset.obshow; S.adm.showpw[k] = !S.adm.showpw[k]; render(); return; }
  if ((el = c('[data-obcopy]'))) { const [id, w] = el.dataset.obcopy.split(':'), l = byId(+id), c = credFor(+id); copyText(w === 'user' ? c.user : w === 'pass' ? c.pass : ownerMsg(l, c)); if (w === 'msg') { c.sent = true; admSave(); setTimeout(() => render(), 400); } return; }
  if ((el = c('[data-obsent]'))) { credFor(+el.dataset.obsent).sent = true; admSave(); render(); return; }
  if ((el = c('[data-obreset]'))) { delete S.adm.cred[+el.dataset.obreset]; credFor(+el.dataset.obreset); toast('New password made. Send it to the owner.'); render(); return; }
  if (q('[data-ologin]')) { ownerLogin(); return; }
  if (q('[data-ofill]')) { const c = credFor(1); $('#ol-user').value = c.user; $('#ol-pass').value = c.pass; return; }
  if (q('[data-opw]')) { const i = $('#ol-pass'); i.type = i.type === 'password' ? 'text' : 'password'; return; }
  if (q('[data-ologout]')) { store.set('oauth1', null); S.ownerLid = null; S.tab = 'overview'; render(true); return; }
  if ((el = c('[data-oltab]'))) { S.tab = el.dataset.oltab; render(true); return; }

  // Admin property
  if ((el = c('[data-pp-tab]'))) { S.adm.ptab = el.dataset.ppTab; render(); return; }
  if ((el = c('[data-pp-rm]'))) { const [id, k] = el.dataset.ppRm.split(':'); removeMedia(id, k); return; }
  if ((el = c('[data-pp-cover]'))) { moveFirst(el.dataset.ppCover); return; }
  if ((el = c('[data-pp-am]'))) { const l = byId(S.adm.sel || 1), a = el.dataset.ppAm, p = pr(l.id), cur = p.am || l.am.slice(); p.am = cur.includes(a) ? cur.filter(x => x !== a) : [...cur, a]; prSave(); applyProps(); render(); return; }
  if (q('[data-pp-amadd]')) { const v = ($('#pp-amnew').value || '').trim(); if (!v) return; const l = byId(S.adm.sel || 1), p = pr(l.id), cur = p.am || l.am.slice(); if (!cur.some(x => x.toLowerCase() === v.toLowerCase())) p.am = [...cur, v]; prSave(); applyProps(); render(); return; }
  if (q('[data-pp-amreset]')) { pr(S.adm.sel || 1).am = null; prSave(); applyProps(); render(); return; }
  if (q('[data-pp-gps]')) { gpsHere(); return; }
  if (q('[data-pp-parse]')) { const r = parseLoc($('#pp-link').value); if (!r) { toast('I could not find coordinates in that. Short links (maps.app.goo.gl) do not contain them. Open the link, then copy the address bar link.'); return; } setLoc(r.lat, r.lng, 'From a Google Maps link'); return; }
  if (q('[data-pp-setll]')) { setLoc(parseFloat($('#pp-lat').value), parseFloat($('#pp-lng').value), 'Typed in by admin'); return; }
  if (q('[data-pp-unpin]')) { pr(S.adm.sel || 1).loc = null; prSave(); applyProps(); render(); return; }
  if (q('[data-pp-cladd]')) { const l = byId(S.adm.sel || 1), p = pr(l.id), cur = agrCollect(); p.agr = [...cur, ['New clause', '']]; prSave(); render(); return; }
  if ((el = c('[data-pp-clrm]'))) { const p = pr(S.adm.sel || 1), cur = agrCollect(); cur.splice(+el.dataset.ppClrm, 1); p.agr = cur; prSave(); render(); return; }
  if (q('[data-pp-clreset]')) { pr(S.adm.sel || 1).agr = null; prSave(); render(); toast('Standard agreement restored'); return; }
  if (q('[data-pp-clsave]')) { const cur = agrCollect(); if (!cur.length) { toast('Add at least one clause'); return; } pr(S.adm.sel || 1).agr = cur; prSave(); render(); toast('Agreement saved. New applications will use it'); return; }

  // Board
  if ((el = c('[data-bdseg] button'))) { bdSeg(el); return; }
  if (q('[data-bdadd]')) { bdAdd(); return; }
  if ((el = q('[data-bdpay]'))) { const id = el.dataset.bdpay; bdPay(id, parseInt(($('#bd-amt-' + id).value || '').replace(/[^0-9]/g, ''), 10)); return; }
  if ((el = q('[data-bdfull]'))) { const e = S.board.find(x => x.id === el.dataset.bdfull); bdPay(e.id, e.total - e.paid); return; }
  if ((el = q('[data-bdrm]'))) { const e = S.board.find(x => x.id === el.dataset.bdrm), u = UNITS.find(x => x.id === e.room); S.board = S.board.filter(x => x !== e); if (u) { u.st = 'vacant'; ['tenant', 'rent', 'bal', 'thru', 'pay', 'credit', 'roommate'].forEach(k => delete u[k]); } bdSave(); syncOcc(); persistUnits(); toast('Booking cancelled. Room ' + e.room + ' is vacant again.'); render(); return; }
});

document.addEventListener('submit', e => {
  if (e.target.id === 'landingSearch') {
    e.preventDefault();
    S.f = { type: $('#landType').value, q: $('#landArea').value, area: '', max: +$('#landBudget').value, sort: 'rec' };
    hideLanding(); S.role = 'tenant'; S.tab = 'explore'; render(true); return;
  }
  if (e.target.id === 'homeSearch') { e.preventDefault(); S.f = { type: $('#ht').value, q: $('#hq').value, area: '', max: 0 }; S.tab = 'explore'; render(true); }
  if (e.target.id === 'signInForm') { e.preventDefault(); signIn($('#si-email').value, $('#si-pass').value); return; }
  if (e.target.id === 'signUpForm') { e.preventDefault(); const role = $('#su-role').value; signUp($('#su-email').value, $('#su-pass').value, role); return; }
});

document.addEventListener('input', e => {
  const id = e.target.id;
  if (id === 'fq') { S.f.q = e.target.value; const l = exploreList(); $('#exList').innerHTML = exploreBody(l); $('#exCount').textContent = l.length + (l.length === 1 ? ' place' : ' places'); areaSuggest(e.target.value); }
  else if (id === 'bs') { BK.start = e.target.value || BK.start; if (!(S.page && S.page.name === 'payment')) agrRefresh(); }
  else if (id === 'bq') { BK.qty = +e.target.value; if (!(S.page && S.page.name === 'payment')) agrRefresh(); }
  else if (id === 'tm-rules') { tmPreview(); }
});

document.addEventListener('change', e => {
  const id = e.target.id, v = e.target.value;
  if (id === 'ky-stu') { $('#ky-stuf').hidden = !e.target.checked; return; }
  if (id === 'bq') { BK.qty = +v; agrRefresh(); return; }
  if (id === 'bs') { BK.start = v || BK.start; if (S.page && S.page.name === 'payment') render(); return; }
  if (id === 'bl-cat') { billFormHints(); return; }
  if (id === 'acc') { BK.acc = e.target.checked; accSync(); return; }
  if (id === 'agacc') { $('#agBtn').disabled = !e.target.checked; return; }
  if (id === 'tm-dep' || id === 'tm-late' || id === 'tm-notice') { tmPreview(); return; }
  if (id === 'fs') { S.f.sort = v; render(); }
  else if (({ rc: 'course', rcol: 'college', rg: 'gender', rs: 'sleep', rst: 'study' })[id]) { S.prefs[({ rc: 'course', rcol: 'college', rg: 'gender', rs: 'sleep', rst: 'study' })[id]] = v; save(); render(); }
  else if (id === 'rb') { S.prefs.budget = +v; save(); render(); } else if (id === 'rcl') { S.prefs.clean = +v; save(); render(); }
});

// Long press on unit
const lp = { t: null, done: false };
document.addEventListener('pointerdown', e => { const el = e.target.closest('[data-unit]'); if (!el) return; lp.done = false; clearTimeout(lp.t); lp.t = setTimeout(() => { lp.done = true; openUnitMenu(el.dataset.unit); try { navigator.vibrate && navigator.vibrate(15); } catch (_) {} }, 520); });
['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => document.addEventListener(ev, () => clearTimeout(lp.t), true));
document.addEventListener('contextmenu', e => { const el = e.target.closest('[data-unit]'); if (el) { e.preventDefault(); lp.done = true; openUnitMenu(el.dataset.unit); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

// =====================================================================
// Auth Modals
// =====================================================================

function openSignIn() {
  sheet(`<div class="stack" style="gap:4px"><h2 style="font-size:26px">Sign in</h2><p class="muted">Use your email and password</p></div>
    <form id="signInForm" class="stack" style="gap:12px">
      <div class="field"><label for="si-email">Email</label><input class="inp" id="si-email" type="email" autocomplete="email" required></div>
      <div class="field"><label for="si-pass">Password</label><input class="inp" id="si-pass" type="password" autocomplete="current-password" required></div>
      <button class="btn" type="submit">Sign in</button>
    </form>
    <p class="muted" style="font-size:13px;text-align:center">Don't have an account? <button class="linkbtn" data-switch="signup">Sign up</button></p>`, 'Sign in');
}

function openSignUp() {
  sheet(`<div class="stack" style="gap:4px"><h2 style="font-size:26px">Create account</h2><p class="muted">Choose your role</p></div>
    <form id="signUpForm" class="stack" style="gap:12px">
      <div class="field"><label for="su-email">Email</label><input class="inp" id="su-email" type="email" autocomplete="email" required></div>
      <div class="field"><label for="su-pass">Password</label><input class="inp" id="su-pass" type="password" autocomplete="new-password" required minlength="6"></div>
      <div class="field"><label for="su-role">I am a</label><select class="inp" id="su-role"><option value="tenant">Tenant / Student</option><option value="owner">Property Owner</option></select></div>
      <button class="btn" type="submit">Create account</button>
    </form>
    <p class="muted" style="font-size:13px;text-align:center">Already have an account? <button class="linkbtn" data-switch="signin">Sign in</button></p>`, 'Sign up');
}

document.addEventListener('click', e => {
  if (e.target.matches('[data-switch="signup"]')) { closeSheet(); openSignUp(); }
  if (e.target.matches('[data-switch="signin"]')) { closeSheet(); openSignIn(); }
});

// =====================================================================
// Initialize
// =====================================================================

initAuth();
render();
showLanding();

// Export for debugging
window.S = S;
window.supabase = supabase;