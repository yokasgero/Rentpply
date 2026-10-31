/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const fmt = n => 'UGX ' + Math.round(n).toLocaleString('en-US');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const DAY = 864e5;
const fdate = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const iso = d => new Date(d).toISOString().slice(0, 10);
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
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.900 4.900l1.400 1.400M17.700 17.700l1.400 1.400M2 12h2M20 12h2M4.900 19.100l1.400-1.400M17.700 6.300l1.400-1.400'
};
const ic = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${IC[n]}"/></svg>`;

/* property art: generated skyline so every listing has a distinct picture until real photos are uploaded */
function art(l, big) {
  const h = l.hue, r = n => { const x = Math.sin(l.id * 99.7 + n * 12.9898) * 43758.5453; return x - Math.floor(x) };
  let b = '';
  const n = 5 + Math.floor(r(1) * 3);
  for (let i = 0; i < n; i++) {
    const w = 38 + r(i + 2) * 30, x = 8 + i * (300 / n), ht = 50 + r(i + 9) * 90, y = 170 - ht;
    b += `<rect x="${x}" y="${y}" width="${w}" height="${ht}" rx="3" fill="hsl(${h + i * 8},${28 + r(i) * 20}%,${i % 2 ? 24 : 32}%)"/>`;
    for (let wy = y + 10; wy < 160; wy += 16) for (let wx = x + 8; wx < x + w - 8; wx += 13) b += `<rect x="${wx}" y="${wy}" width="6" height="8" rx="1.500" fill="hsl(${46},90%,${r(wx + wy) > .55 ? 72 : 30}%)" opacity="${r(wx * wy) > .55 ? 1 : .55}"/>`;
  }
  return `<svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustration of ${esc(l.name)}"><defs><linearGradient id="g${l.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${h},55%,${big ? 62 : 58}%)"/><stop offset="1" stop-color="hsl(${h + 30},60%,82%)"/></linearGradient></defs><rect width="320" height="200" fill="url(#g${l.id})"/><circle cx="${250 + r(3) * 40}" cy="${34 + r(4) * 18}" r="16" fill="#FFF3C9" opacity=".9"/>${b}<rect y="168" width="320" height="32" fill="hsl(${h},25%,18%)"/><rect y="168" width="320" height="3" fill="hsl(${h},30%,28%)"/></svg>`;
}

/* ---------- sample data (clearly marked as examples in the UI) ---------- */
const L = [
  { id: 1, name: 'Kikoni Scholars Hostel', type: 'hostel', area: 'Kikoni', price: 380000, per: 'month', unit: 'Single room', dist: 0.6, avail: 6, total: 48, v: 1, rating: 4.6, n: 128, hue: 168, owner: 'Ssemakula Properties', am: ['Wi-Fi', '24h security', 'Water tank', 'Study room', 'Backup power'], desc: 'Purpose-built student hostel with a guarded gate, a quiet study room on every floor and a ten-minute walk to the main gate of Makerere University.' },
  { id: 2, name: 'Wandegeya Court Hostel', type: 'hostel', area: 'Wandegeya', price: 320000, per: 'month', unit: 'Double room (shared)', dist: 0.9, avail: 11, total: 60, v: 1, rating: 4.2, n: 84, hue: 205, owner: 'Court Estates Ltd', am: ['Wi-Fi', 'CCTV', 'Laundry area', 'Kitchenette'], desc: 'Shared double rooms with a kitchenette per floor. Close to the Wandegeya market and boda stage. Rent is paid per semester block or monthly.' },
  { id: 3, name: 'Makerere Heights Residence', type: 'hostel', area: 'Makerere', price: 520000, per: 'month', unit: 'En-suite single', dist: 0.3, avail: 3, total: 30, v: 1, rating: 4.8, n: 203, hue: 28, owner: 'Heights Hospitality', am: ['En-suite bathroom', 'Wi-Fi', 'Generator', '24h security', 'Cafeteria'], desc: 'Premium en-suite singles within walking distance of the lecture blocks. Backup generator keeps lights and Wi-Fi on during load shedding.' },
  { id: 4, name: 'Ntinda Garden Apartments', type: 'rental', area: 'Ntinda', price: 1200000, per: 'month', unit: '2-bedroom apartment', dist: 6.2, avail: 2, total: 16, v: 1, rating: 4.5, n: 41, hue: 140, owner: 'Garden Estates', am: ['Parking', 'Garden', 'Water tank', 'Security guard'], desc: 'Two-bedroom apartments in a gated compound with a shared garden. Twelve-month agreements with a two-month deposit.' },
  { id: 5, name: 'Muyenga Hill Studio', type: 'rental', area: 'Muyenga', price: 750000, per: 'month', unit: 'Studio', dist: 8.4, avail: 1, total: 6, v: 1, rating: 4.4, n: 19, hue: 300, owner: 'Kisakye Holdings', am: ['Hill view', 'Parking', 'Wi-Fi ready'], desc: 'A bright studio on Tank Hill road with a balcony view across the city. Quiet street and a short ride from Ggaba Road.' },
  { id: 6, name: 'Kololo Serviced Suites', type: 'airbnb', area: 'Kololo', price: 260000, per: 'night', unit: 'One-bedroom suite', dist: 3.1, avail: 5, total: 12, v: 1, rating: 4.9, n: 312, hue: 18, owner: 'Kololo Stays', am: ['Daily cleaning', 'Wi-Fi', 'Air conditioning', 'Breakfast'], desc: 'Serviced suites for visitors and business travellers. Self check-in with a code sent after payment is confirmed.' },
  { id: 7, name: 'Munyonyo Lakeside Stay', type: 'airbnb', area: 'Munyonyo', price: 210000, per: 'night', unit: 'Lake-view room', dist: 11, avail: 4, total: 8, v: 1, rating: 4.7, n: 156, hue: 195, owner: 'Lakeside Hosts', am: ['Lake view', 'Pool', 'Breakfast', 'Parking'], desc: 'Quiet rooms facing Lake Victoria. Popular with families and weekend guests.' },
  { id: 8, name: 'Bukoto Family Flat', type: 'rental', area: 'Bukoto', price: 900000, per: 'month', unit: '2-bedroom flat', dist: 5.0, avail: 2, total: 10, v: 1, rating: 4.3, n: 27, hue: 85, owner: 'Bukoto Rentals', am: ['Security guard', 'Water tank', 'Parking'], desc: 'Family flat close to schools and Bukoto market. Landlord on the premises.' },
  { id: 9, name: 'Najjera Budget Rooms', type: 'rental', area: 'Najjera', price: 280000, per: 'month', unit: 'Single room', dist: 12, avail: 8, total: 20, v: 0, rating: 0, n: 0, hue: 50, owner: 'Awaiting verification', am: ['Water', 'Shared compound'], desc: 'Listing submitted and waiting for document and site checks. It cannot be booked until an administrator verifies the owner and the property.' },
  { id: 10, name: 'Nakasero Business Stay', type: 'airbnb', area: 'Nakasero', price: 340000, per: 'night', unit: 'Executive room', dist: 2.4, avail: 3, total: 9, v: 1, rating: 4.7, n: 98, hue: 250, owner: 'Nakasero Hosts', am: ['Desk', 'Wi-Fi', 'Air conditioning', 'Airport pickup'], desc: 'Executive rooms with a work desk, close to government offices and banks.' },
  { id: 11, name: 'Kansanga Student Lodge', type: 'hostel', area: 'Kansanga', price: 290000, per: 'month', unit: 'Single room', dist: 1.4, avail: 9, total: 36, v: 1, rating: 4.0, n: 52, hue: 330, owner: 'Lodge Care', am: ['Wi-Fi', 'Water tank', 'Security guard'], desc: 'Budget single rooms for students at Makerere Business School and nearby colleges.' }
];
const byId = id => L.find(x => x.id === id);
const AREAS = [...new Set(L.map(l => l.area))].sort();

/* ---------- state ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('rp_' + k); return v ? JSON.parse(v) : d } catch (e) { return d } },
  set(k, v) { try { localStorage.setItem('rp_' + k, JSON.stringify(v)) } catch (e) {} }
};
const NOW = Date.now();
const hash = str => { let h = 7; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h };
const efrisNo = id => String(1000000000 + hash(id) % 8000000000);
const vcode = id => { const t = ((hash(id) * 2654435761) >>> 0).toString(36).toUpperCase().padStart(8, '0').slice(-8); return t.slice(0, 4) + '-' + t.slice(4) };
const fdt = d => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const S = {
  role: store.get('role', 'student'), tab: 'home',
  f: { type: 'all', q: '', area: '', max: 0 },
  saved: store.get('saved', [4, 6]),
  bookings: store.get('bookings', [{ id: 'RP-2026-0412', lid: 2, room: 'B-14', start: iso(NOW - 52 * DAY), months: 6, amount: 1920000, fee: 57600, method: 'MTN MoMo', paidBy: 'Self', ts: NOW - 53 * DAY, listed: false }]),
  prefs: store.get('prefs', { course: 'Computer Science', college: 'COCIS', gender: 'any', budget: 400000, sleep: 'early', clean: 4, study: 'quiet' }),
  asked: store.get('asked', []),
  transfers: store.get('transfers', []),
  sent: {}, owner: { sel: null }, admin: {}, matched: false
};
S.terms = store.get('terms', {});
S.payments = store.get('payments', [
  { id: 'RP-2026-0412', lid: 2, room: 'B-14', ts: NOW - 53 * DAY, purpose: 'Rent, 6 months', start: iso(NOW - 52 * DAY), months: 6, nights: 0, amount: 1920000, fee: 57600, dep: 0, method: 'MTN MoMo', paidBy: 'Self' },
  { id: 'RP-2026-0233', lid: 6, room: 'S-204', ts: NOW - 120 * DAY, purpose: 'Stay, 2 nights', start: iso(NOW - 122 * DAY), months: 0, nights: 2, amount: 520000, fee: 15600, dep: 0, method: 'Card', paidBy: 'Self' },
  { id: 'RP-2026-0121', lid: 11, room: 'C-09', ts: NOW - 210 * DAY, purpose: 'Rent, 3 months', start: iso(NOW - 209 * DAY), months: 3, nights: 0, amount: 870000, fee: 26100, dep: 0, method: 'Airtel Money', paidBy: 'Mother, United States' }
].map(p => Object.assign(p, { fdn: efrisNo(p.id), vc: vcode(p.id) })));
const save = () => { store.set('terms', S.terms); store.set('payments', S.payments); store.set('agreements', S.agreements); store.set('bills2', S.bills); store.set('saved', S.saved); store.set('bookings', S.bookings); store.set('prefs', S.prefs); store.set('asked', S.asked); store.set('transfers', S.transfers) };
const monthsLeft = b => Math.max(0, Math.ceil((new Date(b.start).getTime() + b.months * 30.4 * DAY - Date.now()) / (30.4 * DAY)));

function toast(msg) {
  const h = $('#toast-host'); h.innerHTML = `<div class="toast">${esc(msg)}</div>`;
  clearTimeout(toast.t); toast.t = setTimeout(() => h.innerHTML = '', 2800);
}

/* ---------- shared pieces ---------- */
const verifiedPill = l => l.v ? `<span class="pill ok">${ic('shield')}Verified</span>` : `<span class="pill warn">Pending check</span>`;
const unitLabel = l => l.per === 'night' ? '/ night' : '/ month';

function card(l) {
  const saved = S.saved.includes(l.id);
  return `<article class="lcard">
    <div class="art" data-open="${l.id}" style="cursor:pointer">${art(l)}
      <div class="badges">${verifiedPill(l)}</div>
      <button class="heart" data-save="${l.id}" aria-pressed="${saved}" aria-label="Save ${esc(l.name)}">${ic('heart')}</button>
    </div>
    <div class="body">
      <div class="row" style="justify-content:space-between;gap:8px">
        <span class="eyebrow">${l.type === 'airbnb' ? 'Short stay' : l.type}</span>
        ${l.n ? `<span class="stars">${ic('star')}${l.rating.toFixed(1)} <span class="muted" style="font-weight:500">(${l.n})</span></span>` : '<span class="muted" style="font-size:12px">No reviews yet</span>'}
      </div>
      <h3>${esc(l.name)}</h3>
      <div class="muted" style="display:flex;gap:6px;align-items:center;font-size:13px">${ic('pin')}${l.area}${l.type === 'hostel' ? ` · ${l.dist} km to campus` : ` · ${l.dist} km from centre`}</div>
      <div class="am">${l.am.slice(0, 3).map(a => `<span>${a}</span>`).join('')}</div>
      <div class="row" style="justify-content:space-between;margin-top:auto;padding-top:6px">
        <div class="price">${fmt(l.price)} <small>${unitLabel(l)}</small></div>
        <button class="btn sm" data-open="${l.id}">${l.v ? 'View' : 'Details'}</button>
      </div>
    </div></article>`;
}

/* ---------- home ---------- */
function vHome() {
  const tiles = [
    ['Hostels', 'bed', 'explore:hostel', 'var(--accent-soft)', 'var(--accent)'],
    ['Airbnbs', 'building', 'explore:airbnb', 'var(--ok-soft)', 'var(--ok)'],
    ['Rentals', 'key', 'explore:rental', 'var(--surface-2)', 'var(--ink)'],
    ['Payment', 'wallet', 'wallet', 'var(--warn-soft)', 'var(--warn)'],
    ['Roommates', 'users', 'roommates', 'var(--accent-soft)', 'var(--accent)'],
    ['Sell space', 'tag', 'space', 'var(--ok-soft)', 'var(--ok)']
  ].map(t => `<button class="tile" data-go="${t[2]}"><span class="ico" style="background:${t[3]};color:${t[4]}">${ic(t[1])}</span>${t[0]}</button>`).join('');
  const near = L.filter(l => l.v && l.type === 'hostel').sort((a, b) => a.dist - b.dist).slice(0, 3);
  return `<section class="sec">
    <div class="hero">
      <svg class="skyline" viewBox="0 0 420 220" aria-hidden="true"><g fill="none" stroke="#2f6b63" stroke-width="2"><rect x="20" y="90" width="70" height="130"/><rect x="100" y="40" width="80" height="180"/><rect x="190" y="110" width="60" height="110"/><rect x="260" y="60" width="90" height="160"/><rect x="360" y="120" width="50" height="100"/></g><g fill="#FF5A36"><rect x="118" y="62" width="10" height="14"/><rect x="146" y="98" width="10" height="14"/><rect x="284" y="84" width="10" height="14"/><rect x="40" y="120" width="10" height="14"/></g></svg>
      <div class="stack" style="gap:10px;position:relative;z-index:1">
        <span class="eyebrow" style="color:var(--hero-muted)">Hello, Yokas</span>
        <h1>Find a place that is <em>really</em> there.</h1>
        <p class="sub">Verified owners, clear prices and one place to pay. Search hostels, rentals and short stays across Kampala before you travel.</p>
      </div>
      <form class="search" id="homeSearch">
        <input class="inp" id="hq" placeholder="Area, hostel or university (try Makerere)" aria-label="Search">
        <select class="inp" id="ht" aria-label="Type"><option value="all">All stays</option><option value="hostel">Hostels</option><option value="rental">Rentals</option><option value="airbnb">Airbnbs</option></select>
        <button class="btn" type="submit">${ic('search')}Search</button>
      </form>
    </div>
  </section>
  <section class="sec"><div class="tiles">${tiles}</div></section>
  <section class="sec">
    <div class="sec-h"><div><span class="eyebrow">Student living</span><h2>Closest to Makerere</h2></div><button class="btn ghost sm" data-go="explore:hostel">All hostels</button></div>
    <div class="grid">${near.map(card).join('')}</div>
  </section>
  <section class="sec">
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))">
      ${[['shield', 'Owners are checked first', 'Every listing passes ID, ownership and site checks before it can be booked.'], ['wallet', 'Pay inside Rentpply', 'No sending money to a stranger on social media. Every payment gets a receipt.'], ['users', 'Parents can pay from abroad', 'A sponsor pays by mobile money or card and you get the confirmation.']]
      .map(c => `<div class="card stack" style="gap:8px"><span style="color:var(--ok)">${ic(c[0])}</span><h3 style="font-size:18px">${c[1]}</h3><p class="muted">${c[2]}</p></div>`).join('')}
    </div>
  </section>`;
}

/* ---------- student hub ---------- */
function vStudentHome() {
  const featured = L.filter(l => l.v && l.type === 'hostel').sort((a, b) => a.dist - b.dist).slice(0, 3);
  const next = [...S.bookings].sort((a, b) => a.ts - b.ts)[0];
  const nextListing = next ? byId(next.lid) : null;
  return `<section class="sec">
    <div class="hero">
      <svg class="skyline" viewBox="0 0 420 220" aria-hidden="true"><g fill="none" stroke="#2f6b63" stroke-width="2"><rect x="20" y="90" width="70" height="130"/><rect x="100" y="40" width="80" height="180"/><rect x="190" y="110" width="60" height="110"/><rect x="260" y="60" width="90" height="160"/><rect x="360" y="120" width="50" height="100"/></g><g fill="#FF5A36"><rect x="118" y="62" width="10" height="14"/><rect x="146" y="98" width="10" height="14"/><rect x="284" y="84" width="10" height="14"/><rect x="40" y="120" width="10" height="14"/></g></svg>
      <div class="stack" style="gap:10px;position:relative;z-index:1">
        <span class="eyebrow" style="color:var(--hero-muted)">Student housing · Kampala</span>
        <h1>Your next chapter starts with a <em>real place.</em></h1>
        <p class="sub">Find checked student hostels, connect with compatible roommates and keep your housing details in one place.</p>
      </div>
      <form class="search" id="homeSearch">
        <input class="inp" id="hq" placeholder="Area, hostel or university (try Makerere)" aria-label="Search housing">
        <select class="inp" id="ht" aria-label="Type"><option value="all">All stays</option><option value="hostel">Hostels</option><option value="rental">Rentals</option><option value="airbnb">Airbnbs</option></select>
        <button class="btn" type="submit">${ic('search')}Find housing</button>
      </form>
    </div>
  </section>
  <section class="sec">
    <div class="tiles">
      <button class="tile" data-go="explore:hostel"><span class="ico" style="background:var(--accent-soft);color:var(--accent)">${ic('bed')}</span>Student hostels</button>
      <button class="tile" data-go="roommates"><span class="ico" style="background:var(--ok-soft);color:var(--ok)">${ic('users')}</span>Find roommates</button>
      <button class="tile" data-go="wallet"><span class="ico" style="background:var(--warn-soft);color:var(--warn)">${ic('wallet')}</span>My housing</button>
    </div>
  </section>
  <section class="sec">
    <div class="sec-h"><div><span class="eyebrow">Your account</span><h2>Student dashboard</h2></div><span class="pill mute">Demo account</span></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))">
      <div class="card stat"><span class="eyebrow">Saved places</span><b class="num">${S.saved.length}</b><span class="muted">Ready to compare</span></div>
      <div class="card stat"><span class="eyebrow">Roommate requests</span><b class="num">${S.asked.length}</b><span class="muted">Requests you've sent</span></div>
      <div class="card stat"><span class="eyebrow">Next booking</span><b style="font-size:20px">${nextListing ? esc(nextListing.name) : 'No booking yet'}</b><span class="muted">${next ? `${fdate(next.start)} · ${next.room}` : 'Your confirmed stays will appear here'}</span></div>
    </div>
    <div class="row"><button class="btn" data-tab="wallet">Open my housing</button><button class="btn ghost" data-tab="roommates">Set roommate preferences</button></div>
  </section>
  <section class="sec">
    <div class="sec-h"><div><span class="eyebrow">Checked near campus</span><h2>Student hostels near Makerere</h2></div><button class="btn ghost sm" data-go="explore:hostel">Browse all</button></div>
    <div class="grid">${featured.map(card).join('')}</div>
  </section>`;
}

/* ---------- explore ---------- */
function vExplore() {
  const f = S.f, q = f.q.trim().toLowerCase();
  let list = L.filter(l => (f.type === 'all' || l.type === f.type) && (!f.area || l.area === f.area) && (!f.max || l.price <= f.max) &&
    (!q || (l.name + ' ' + l.area + ' ' + (q.includes('makerere') && l.type === 'hostel' && l.dist < 1.5 ? 'makerere' : '')).toLowerCase().includes(q)));
  list.sort((a, b) => b.v - a.v || b.rating - a.rating);
  const chip = (v, t) => `<button class="chip" data-type="${v}" aria-pressed="${f.type === v}">${t}</button>`;
  return `<section class="sec">
    <div class="sec-h"><div><span class="eyebrow">${list.length} places</span><h2>Explore stays</h2></div></div>
    <div class="row">${chip('all', 'All')}${chip('hostel', 'Hostels')}${chip('rental', 'Rentals')}${chip('airbnb', 'Airbnbs')}</div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))">
      <div class="field"><label for="fq">Search</label><input class="inp" id="fq" value="${esc(f.q)}" placeholder="Name or area"></div>
      <div class="field"><label for="fa">Area</label><select class="inp" id="fa"><option value="">Anywhere</option>${AREAS.map(a => `<option ${f.area === a ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
      <div class="field"><label for="fm">Budget</label><select class="inp" id="fm">${[[0, 'Any price'], [350000, 'Up to UGX 350,000'], [600000, 'Up to UGX 600,000'], [1000000, 'Up to UGX 1,000,000']].map(o => `<option value="${o[0]}" ${f.max === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></div>
    </div>
    ${list.length ? `<div class="grid">${list.map(card).join('')}</div>` : `<div class="card"><h3>Nothing matches yet</h3><p class="muted">Try a wider budget or a different area.</p></div>`}
  </section>`;
}

/* ---------- listing sheet: details → pay → receipt ---------- */
function sheet(inner, title) {
  $('#layer').innerHTML = `<div class="veil" data-veil><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="bar"><span class="eyebrow">${esc(title)}</span><button class="ibtn" data-close aria-label="Close">${ic('x')}</button></div><div class="in">${inner}</div></div></div>`;
}
const closeSheet = () => { $('#layer').innerHTML = ''; };
let BK = null; // booking draft

function openListing(id) {
  const l = byId(id);
  BK = { acc: false, lid: id, start: iso(NOW + 5 * DAY), qty: l.per === 'night' ? 2 : 1, paidBy: 'Self', method: 'MTN MoMo', phone: '', spName: '', spCountry: '' };
  const m = [['Cleanliness', 4.6], ['Security', 4.7], ['Location', 4.4], ['Facilities', 4.3], ['Service', 4.5]];
  const rev = [['Nakato S.', 'Guard at the gate all night and the water never ran out. Price on the app matched what I paid.'], ['Brian K.', 'Room looked exactly like the photos. Wi-Fi is slow at peak hours.']];
  sheet(`
    <div style="border-radius:18px;overflow:hidden;aspect-ratio:16/8">${art(l, 1)}</div>
    <div class="row" style="justify-content:space-between;align-items:start">
      <div class="stack" style="gap:6px"><div class="row">${verifiedPill(l)}<span class="eyebrow">${l.type === 'airbnb' ? 'Short stay' : l.type} · ${l.unit}</span></div><h2 style="font-size:30px">${esc(l.name)}</h2><div class="muted">${ic('pin').replace('class="i"', 'class="i" style="vertical-align:-4px"')} ${l.area}, Kampala · Managed by ${esc(l.owner)}</div></div>
      <div class="price" style="font-size:26px">${fmt(l.price)} <small>${unitLabel(l)}</small></div>
    </div>
    <p>${esc(l.desc)}</p>
    <div class="am">${l.am.map(a => `<span>${a}</span>`).join('')}</div>
    ${l.v ? `<div class="card stack" style="gap:10px"><span class="eyebrow">Rated by people who stayed</span>${m.map(r => `<div class="meter"><span>${r[0]}</span><i><b style="width:${r[1] / 5 * 100}%"></b></i><span class="num">${r[1]}</span></div>`).join('')}
      ${rev.map(r => `<div style="border-top:1px solid var(--line);padding-top:10px"><b>${r[0]}</b><p class="muted">${r[1]}</p></div>`).join('')}</div>` : ''}
    ${l.v ? bookPanel(l) : `<div class="notice">This place is still being verified. You can save it and we will tell you when it opens for booking.</div>`}`, l.name);
  renderAgr(); recalc();
}

/* ---------- roommates ---------- */
const PEOPLE = [
  { n: 'Aisha N.', course: 'Computer Science', college: 'COCIS', g: 'f', yr: 2, budget: 380000, sleep: 'early', clean: 5, study: 'quiet', loc: 'Kikoni' },
  { n: 'Brian M.', course: 'Computer Science', college: 'COCIS', g: 'm', yr: 3, budget: 420000, sleep: 'late', clean: 3, study: 'group', loc: 'Wandegeya' },
  { n: 'Daniel O.', course: 'Software Engineering', college: 'COCIS', g: 'm', yr: 2, budget: 350000, sleep: 'early', clean: 4, study: 'quiet', loc: 'Kikoni' },
  { n: 'Esther K.', course: 'Law', college: 'School of Law', g: 'f', yr: 1, budget: 450000, sleep: 'early', clean: 4, study: 'quiet', loc: 'Makerere' },
  { n: 'Moses T.', course: 'Computer Science', college: 'COCIS', g: 'm', yr: 2, budget: 300000, sleep: 'early', clean: 4, study: 'quiet', loc: 'Kansanga' },
  { n: 'Grace A.', course: 'Medicine', college: 'CHS', g: 'f', yr: 4, budget: 520000, sleep: 'late', clean: 5, study: 'group', loc: 'Makerere' }
];
const HUES = [18, 168, 205, 300, 45, 330];
function score(p) {
  const a = S.prefs; let s = 0;
  s += p.course === a.course ? 28 : 0; s += p.college === a.college ? 14 : 0;
  s += Math.abs(p.budget - a.budget) <= 100000 ? 20 : Math.abs(p.budget - a.budget) <= 200000 ? 8 : 0;
  s += p.sleep === a.sleep ? 14 : 0; s += Math.abs(p.clean - a.clean) <= 1 ? 14 : 0; s += p.study === a.study ? 10 : 0;
  return s;
}
function vRoommates() {
  const a = S.prefs, sel = (id, opts, v) => `<select class="inp" id="${id}">${opts.map(o => `<option value="${o[0]}" ${String(v) === String(o[0]) ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`;
  const out = PEOPLE.filter(p => a.gender === 'any' || p.g === a.gender).map(p => ({ p, s: score(p) })).sort((x, y) => y.s - x.s);
  const trait = p => [p.course === a.course ? 'Same course' : '', p.college === a.college ? 'Same college' : '', p.sleep === a.sleep ? (p.sleep === 'early' ? 'Early riser' : 'Night owl') : '', p.study === a.study ? (p.study === 'quiet' ? 'Quiet study' : 'Group study') : '', Math.abs(p.budget - a.budget) <= 100000 ? 'Similar budget' : ''].filter(Boolean);
  return `<section class="sec">
    <div class="sec-h"><div><span class="eyebrow">Share the rent</span><h2>Find a roommate</h2></div></div>
    <p class="muted" style="max-width:60ch">Answer a few questions and see verified students and workers who fit how you live. You are only matched with people whose identity Rentpply has checked.</p>
    <div class="card stack">
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))">
        <div class="field"><label for="rc">Course</label>${sel('rc', ['Computer Science', 'Software Engineering', 'Law', 'Medicine', 'Economics', 'Architecture'].map(x => [x, x]), a.course)}</div>
        <div class="field"><label for="rcol">College</label>${sel('rcol', [['COCIS', 'COCIS (Computing)'], ['School of Law', 'School of Law'], ['CHS', 'Health Sciences'], ['CEDAT', 'CEDAT (Engineering)']], a.college)}</div>
        <div class="field"><label for="rg">Roommate gender</label>${sel('rg', [['any', 'No preference'], ['f', 'Women'], ['m', 'Men']], a.gender)}</div>
        <div class="field"><label for="rb">Your share of rent</label>${sel('rb', [[250000, 'UGX 250,000'], [300000, 'UGX 300,000'], [400000, 'UGX 400,000'], [500000, 'UGX 500,000']], a.budget)}</div>
        <div class="field"><label for="rs">Sleep</label>${sel('rs', [['early', 'Early to bed'], ['late', 'Night owl']], a.sleep)}</div>
        <div class="field"><label for="rst">Study style</label>${sel('rst', [['quiet', 'Quiet'], ['group', 'With friends']], a.study)}</div>
        <div class="field"><label for="rcl">Tidiness (1 relaxed, 5 spotless)</label>${sel('rcl', [1, 2, 3, 4, 5].map(x => [x, x]), a.clean)}</div>
      </div>
    </div>
    <div class="sec-h"><h2 style="font-size:22px">${out.length} people to consider</h2><span class="pill mute">Sample profiles</span></div>
    <div class="grid">${out.map((o, i) => { const p = o.p, asked = S.asked.includes(p.n); return `<div class="card stack" style="gap:10px">
      <div class="row" style="justify-content:space-between;flex-wrap:nowrap"><div class="row" style="flex-wrap:nowrap"><span class="avatar" style="background:hsl(${HUES[i % 6]},70%,75%)">${p.n[0]}</span><div><b>${p.n}</b><div class="muted" style="font-size:13px">${p.course}, year ${p.yr}</div></div></div><div style="text-align:right"><div class="match">${o.s}%</div><div class="muted" style="font-size:11px">match</div></div></div>
      <div class="row"><span class="pill ok">${ic('shield')}Student ID verified</span><span class="pill mute">${p.loc}</span></div>
      <div class="am">${trait(p).map(t => `<span>${t}</span>`).join('') || '<span>Different routines</span>'}</div>
      <button class="btn ${asked ? 'ghost' : ''} sm" data-ask="${p.n}" ${asked ? 'disabled' : ''}>${asked ? 'Request sent' : 'Ask to share a room'}</button></div>`}).join('')}</div>
  </section>`;
}

/* ---------- sell space (rent transfer) ---------- */
const OPEN = [
  { id: 't1', lid: 1, room: 'C-07', left: 3, price: 380000, from: iso(NOW + 9 * DAY), why: 'Changing university' },
  { id: 't2', lid: 3, room: 'A-21', left: 2, price: 500000, from: iso(NOW + 14 * DAY), why: 'Internship in Mbarara' },
  { id: 't3', lid: 4, room: 'Flat 3B', left: 5, price: 1150000, from: iso(NOW + 20 * DAY), why: 'Job transfer to Gulu' },
  { id: 't4', lid: 11, room: 'D-12', left: 4, price: 280000, from: iso(NOW + 7 * DAY), why: 'Moving abroad' }
];
function vSpace() {
  const mine = S.bookings.filter(b => b.months > 0);
  const mc = mine.map(b => { const l = byId(b.lid), left = monthsLeft(b), t = S.transfers.find(x => x.bid === b.id); return `<div class="card stack" style="gap:10px">
    <div class="row" style="justify-content:space-between"><div><b style="font-size:17px">${esc(l.name)}</b><div class="muted" style="font-size:13px">Unit <span class="mono">${b.room}</span> · paid until ${fdate(new Date(b.start).getTime() + b.months * 30.4 * DAY)}</div></div><span class="pill ${t ? 'warn' : 'ok'}">${t ? 'Waiting for owner' : left + ' months left'}</span></div>
    ${t ? `<p class="muted">Listed for ${fmt(t.price)} a month from ${fdate(t.from)}. The owner approves any new tenant before the transfer completes.</p>` : left > 0 ? `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr))">
      <div class="field"><label for="sp-p-${b.id}">Price per month</label><input class="inp" id="sp-p-${b.id}" type="number" value="${l.price}" step="10000"></div>
      <div class="field"><label for="sp-r-${b.id}">Reason</label><select class="inp" id="sp-r-${b.id}"><option>Job transfer</option><option>Changing school</option><option>Moving abroad</option><option>Emergency</option></select></div></div>
      <button class="btn" data-list="${b.id}">List my remaining ${left} months</button>` : '<p class="muted">Nothing left to pass on.</p>'}</div>`; }).join('');
  return `<section class="sec">
    <div class="sec-h"><div><span class="eyebrow">Rent transfer</span><h2>Sell space</h2></div></div>
    <p class="muted" style="max-width:62ch">Paid for months you cannot use? List the rest of your rental period. A verified person can take it over once your landlord approves them.</p>
    <h3 style="font-size:20px">Your paid-up places</h3>
    <div class="grid">${mc || '<div class="card"><p class="muted">Book a hostel or rental first. Months you have paid for show up here.</p></div>'}</div>
    <div class="sec-h" style="margin-top:8px"><h3 style="font-size:20px">Spaces other tenants are passing on</h3><span class="pill mute">Sample listings</span></div>
    <div class="grid">${OPEN.map(t => { const l = byId(t.lid), asked = S.asked.includes(t.id); return `<div class="card stack" style="gap:10px">
      <div class="row" style="flex-wrap:nowrap"><div style="width:84px;border-radius:12px;overflow:hidden;flex:none">${art(l)}</div><div><b>${esc(l.name)}</b><div class="muted" style="font-size:13px">${l.area} · unit <span class="mono">${t.room}</span></div></div></div>
      <div class="kv"><span>Months left</span><span>${t.left}</span></div><div class="kv"><span>Available from</span><span>${fdate(t.from)}</span></div><div class="kv"><span>Why</span><span>${t.why}</span></div>
      <div class="row" style="justify-content:space-between"><div class="price">${fmt(t.price)} <small>/ month</small></div><button class="btn sm ${asked ? 'ghost' : ''}" data-take="${t.id}" ${asked ? 'disabled' : ''}>${asked ? 'Requested' : 'Request this space'}</button></div></div>`}).join('')}</div>
  </section>`;
}


/* ---------- owner (Kikoni Scholars Hostel, sample data) ---------- */
const NAMES = ['Nakato Sarah', 'Okello Brian', 'Namutebi Joy', 'Mugisha Allan', 'Achieng Ruth', 'Kato Daniel', 'Nansubuga Pearl', 'Tumusiime Ivan', 'Auma Esther', 'Ssebunya Peter', 'Kyomuhendo Lilian', 'Opio Samuel', 'Nabirye Hellen', 'Mwesigwa Joel', 'Akello Faith', 'Byaruhanga Tom', 'Nalubega Grace', 'Ochieng Mark', 'Birungi Alice', 'Lubega Henry'];
const PLAN = 'ooopoooovooopooooomoooopo'; // o occupied, p paid-late/due, v vacant, m maintenance
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
const CORP = { 'A-04': 'Nile Logistics Ltd', 'B-03': 'Lake Basin Traders' }; // company tenants that withhold 6% on rent above UGX 1M
occ.forEach(u => { if (CORP[u.id]) { u.tenant = CORP[u.id]; u.corp = 1; } u.ytdM = u.pay === 'overdue' ? 3 : 4; const n = u.corp ? 1 : u.ytdM; u.efris = Math.max(0, n - (u.pay === 'due' ? 1 : 0)); });
const MONTHS = [['May', 5.4e6], ['Jun', 6.1e6], ['Jul', 6.9e6], ['Aug', 7.6e6], ['Sep', 7.2e6], ['Oct', occ.filter(u => u.pay === 'paid').length * 380000 + 190000 * occ.filter(u => u.pay === 'due').length]];
S.owner.req = S.owner.req || [
  { id: 'q1', kind: 'New tenant', who: 'Brian Kigozi', what: 'Booked unit B-05 from 1 Nov, 5 months paid (UGX 1,900,000). Student ID and admission letter verified.', st: 'open' },
  { id: 'q2', kind: 'Rent transfer', who: 'Nansubuga Pearl to Esther K.', what: 'Pearl has 3 months left on A-03 and is moving to Mbarara. Esther K. is a verified Law student.', st: 'open' },
  { id: 'q3', kind: 'Roommate request', who: 'Okello Brian', what: 'Wants to share A-02 with Moses T. (verified, Computer Science). Rent would split 190,000 each.', st: 'open' }
];

function vOverview() {
  const col = MONTHS[5][1], out = occ.reduce((s, u) => s + (u.bal || 0), 0), n = UNITS.length;
  const late = occ.filter(u => u.pay !== 'paid');
  // bar chart, one linear scale 0..10M
  const W = 520, H = 220, L0 = 44, B = 190, T = 14, max = 10e6, y = v => B - (v / max) * (B - T), bw = 44, gap = (W - L0 - 8 - bw * 6) / 5;
  const bars = MONTHS.map((m, i) => { const x = L0 + i * (bw + gap), cur = i === 5; return `<rect x="${x}" y="${y(m[1])}" width="${bw}" height="${B - y(m[1])}" rx="6" fill="${cur ? 'var(--accent)' : 'var(--ok)'}" opacity="${cur ? 1 : .8}"/><text x="${x + bw / 2}" y="${y(m[1]) - 6}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink)">${(m[1] / 1e6).toFixed(1)}</text><text x="${x + bw / 2}" y="${B + 18}" text-anchor="middle" font-size="12" fill="var(--muted)">${m[0]}${cur ? ' (so far)' : ''}</text>`; }).join('');
  const grid = [0, 2e6, 4e6, 6e6, 8e6, 10e6].map(v => `<line x1="${L0 - 6}" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L0 - 10}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--muted)">${v / 1e6}M</text>`).join('');
  const ytd = MONTHS.slice(2).reduce((s, m) => s + m[1], 0), proj = ytd / 4 * 12, tax = Math.max(0, proj - 2820000) * .12;
  return `<section class="sec">
    <div class="sec-h"><div><span class="eyebrow">Owner dashboard · sample property</span><h2>Kikoni Scholars Hostel</h2></div><span class="pill ok">${ic('shield')}Verified owner</span></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))">
      <div class="card stat"><span class="eyebrow">Occupancy</span><b>${Math.round(occ.length / n * 100)}%</b><span class="muted">${occ.length} of ${n} units</span></div>
      <div class="card stat"><span class="eyebrow">Collected in October</span><b class="num">${(col / 1e6).toFixed(1)}M</b><span class="muted">UGX, from receipts</span></div>
      <div class="card stat"><span class="eyebrow">Still to collect</span><b class="num" style="color:var(--bad)">${(out / 1e6).toFixed(2)}M</b><span class="muted">${late.length} tenants</span></div>
      <div class="card stat"><span class="eyebrow">Vacant or reserved</span><b>${UNITS.filter(u => u.st === 'vacant' || u.st === 'reserved').length}</b><span class="muted">ready for new bookings</span></div>
    </div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))">
      <div class="card stack" style="gap:8px"><span class="eyebrow">Rent collected per month, UGX millions</span><div class="scroll-x"><svg viewBox="0 0 ${W} ${H}" style="min-width:420px;width:100%;display:block" role="img" aria-label="Bar chart of rent collected per month">${grid}${bars}</svg></div></div>
      <div class="card stack" style="gap:10px"><span class="eyebrow">Needs a reminder</span>
        ${late.map(u => `<div class="row" style="justify-content:space-between;flex-wrap:nowrap"><div style="min-width:0"><b>${u.tenant}</b><div class="muted" style="font-size:13px"><span class="mono">${u.id}</span> · ${u.pay === 'overdue' ? 'overdue since ' + fdate(u.thru) : 'due ' + fdate(u.thru)}</div></div>
        <button class="btn sm ${S.sent[u.id] ? 'ghost' : ''}" data-remind="${u.id}" ${S.sent[u.id] ? 'disabled' : ''}>${S.sent[u.id] ? 'Sent' : 'Remind'}</button></div>`).join('')}
      </div>
    </div>
    <div class="card stack" style="gap:10px"><div class="row" style="justify-content:space-between"><div><span class="eyebrow">Uganda Revenue Authority</span><h3 style="font-size:22px">Your rental tax, estimated</h3></div><div class="row"><span class="pill warn">Estimate</span><button class="btn sm" data-paytab="tax">Open tax dashboard</button></div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))">
        <div class="stat"><span class="muted">Rent recorded since 1 Jul</span><b class="num">${fmt(ytd)}</b></div>
        <div class="stat"><span class="muted">Projected for the year</span><b class="num">${fmt(proj)}</b></div>
        <div class="stat"><span class="muted">Tax at 12% above 2,820,000</span><b class="num" style="color:var(--accent)">${fmt(tax)}</b></div></div>
      <p class="muted" style="font-size:13px">For an individual landlord, URA taxes gross annual rent above UGX 2,820,000 at 12% with no deductions. The year runs 1 July to 30 June and the return for the year ending 30 June 2027 is due by 31 December 2027. Companies and other landlord types are taxed differently, so confirm with URA before you pay. <a href="https://ura.go.ug/?p=40935" target="_blank" rel="noopener" style="color:var(--accent)">Read the URA guidance</a></p></div>
  </section>`;
}

function vPayStudents() {
  const rows = occ.filter(u => u.pay === 'paid' || u.pay === 'due').slice(0, 14);
  return `<section class="sec">
    <div class="sec-h"><div><span class="eyebrow">Digital records</span><h2>Student payments</h2></div></div>
    <div class="card scroll-x" style="padding:6px"><table><thead><tr><th>Tenant</th><th>Unit</th><th>Amount</th><th>Method</th><th>Status</th><th>Receipt</th><th>EFRIS</th></tr></thead><tbody>
    ${rows.map((u, i) => `<tr><td><button class="linkbtn" data-gounit="${u.id}">${u.tenant}</button></td><td class="mono">${u.id}</td><td class="num">${fmt(u.pay === 'due' ? 190000 : 380000)}</td><td>${['MTN MoMo', 'Airtel Money', 'Card'][i % 3]}</td><td><span class="pill ${u.pay === 'paid' ? 'ok' : 'warn'}">${u.pay === 'paid' ? 'Paid' : 'Part paid'}</span></td><td class="mono">RP-2026-${String(2100 + i * 7)}</td><td>${u.efris < (u.corp ? 1 : u.ytdM) ? '<span class="pill warn">Pending</span>' : `<span class="mono">${efrisNo('LD' + u.id)}</span>`}</td></tr>`).join('')}
    </tbody></table></div></section>`;
}

function vRequests() {
  return `<section class="sec">
    <div class="sec-h"><div><span class="eyebrow">Your approval needed</span><h2>Requests</h2></div></div>
    <div class="stack">${S.owner.req.map(r => `<div class="card stack" style="gap:8px"><div class="row" style="justify-content:space-between"><span class="pill mute">${r.kind}</span>${r.st !== 'open' ? `<span class="pill ${r.st === 'approved' ? 'ok' : 'bad'}">${r.st === 'approved' ? 'Approved' : 'Declined'}</span>` : ''}</div><b style="font-size:17px">${r.who}</b><p class="muted">${r.what}</p>
      ${r.st === 'open' ? `<div class="row"><button class="btn sm" data-req="${r.id}:approved">Approve</button><button class="btn ghost sm" data-req="${r.id}:declined">Decline</button></div>` : ''}</div>`).join('')}</div></section>`;
}

/* ---------- admin (Rentpply team) ---------- */
S.admin.q = S.admin.q || [
  { id: 'a1', kind: 'Property owner', who: 'R. Wasswa', what: 'Najjera Budget Rooms · 20 rooms', docs: [['National ID', 1], ['Land title', 1], ['LC1 letter', 1], ['Site visit', 0]], lid: 9, st: 'open' },
  { id: 'a2', kind: 'Student', who: 'Peter Okot', what: 'Admission letter, Gulu University transfer to Makerere', docs: [['National ID', 1], ['Admission letter', 1], ['Student ID', 0]], st: 'open' },
  { id: 'a3', kind: 'New block', who: 'Garden Estates', what: 'Ntinda Garden Apartments · Block C, 8 units', docs: [['Building permit', 1], ['Photos', 1], ['Fire safety', 0]], st: 'open' },
  { id: 'a4', kind: 'Tenant', who: 'Joan Namara', what: 'Worker relocating from Mbarara, employer letter', docs: [['National ID', 1], ['Employer letter', 1]], st: 'open' }
];
S.admin.fr = S.admin.fr || [
  { id: 'f1', what: 'Listing "Cheap 2BR Kanyanya" asks for money before any viewing', src: 'Reported by 3 users', st: 'open' },
  { id: 'f2', what: 'Broker reusing photos from Kikoni Scholars Hostel on another account', src: 'Reported by the owner', st: 'open' },
  { id: 'f3', what: 'Two accounts registered with the same National ID', src: 'Flagged by verification checks', st: 'open' }
];
function vQueue() {
  const open = S.admin.q.filter(x => x.st === 'open').length;
  return `<section class="sec">
    <div class="sec-h"><div><span class="eyebrow">${open} waiting</span><h2>Verification queue</h2></div><span class="pill mute">Sample requests</span></div>
    <div class="grid">${S.admin.q.map(r => `<div class="card stack" style="gap:10px"><div class="row" style="justify-content:space-between"><span class="pill mute">${r.kind}</span>${r.st !== 'open' ? `<span class="pill ${r.st === 'approved' ? 'ok' : 'bad'}">${r.st === 'approved' ? 'Verified' : 'Rejected'}</span>` : ''}</div>
      <div><b style="font-size:17px">${r.who}</b><p class="muted">${r.what}</p></div>
      <div class="am">${r.docs.map(d => `<span style="${d[1] ? 'background:var(--ok-soft);color:var(--ok)' : 'background:var(--warn-soft);color:var(--warn)'}">${d[1] ? '✓' : '…'} ${d[0]}</span>`).join('')}</div>
      ${r.st === 'open' ? `<div class="row"><button class="btn sm" data-adm="${r.id}:approved">Verify</button><button class="btn ghost sm" data-adm="${r.id}:rejected">Reject</button></div>` : ''}</div>`).join('')}</div>
    <div class="sec-h" style="margin-top:10px"><h2 style="font-size:22px">Fraud and fake listing reports</h2></div>
    <div class="stack">${S.admin.fr.map(f => `<div class="card row" style="justify-content:space-between;flex-wrap:nowrap;gap:14px"><div style="min-width:0"><b>${f.what}</b><div class="muted" style="font-size:13px">${f.src}</div></div>
      ${f.st === 'open' ? `<div class="row" style="flex-wrap:nowrap"><button class="btn sm" data-fr="${f.id}:suspended">Suspend</button><button class="btn ghost sm" data-fr="${f.id}:dismissed">Dismiss</button></div>` : `<span class="pill ${f.st === 'suspended' ? 'bad' : 'mute'}">${f.st === 'suspended' ? 'Suspended' : 'Dismissed'}</span>`}</div>`).join('')}</div>
  </section>`;
}
function vListings() {
  return `<section class="sec"><div class="sec-h"><div><span class="eyebrow">${L.length} properties</span><h2>Listings</h2></div></div>
    <div class="card scroll-x" style="padding:6px"><table><thead><tr><th>Property</th><th>Type</th><th>Area</th><th>Owner</th><th>Units free</th><th>Status</th></tr></thead><tbody>
    ${L.map(l => `<tr><td><b>${esc(l.name)}</b></td><td>${l.type}</td><td>${l.area}</td><td>${esc(l.owner)}</td><td class="num">${l.avail} / ${l.total}</td><td><span class="pill ${l.v ? 'ok' : 'warn'}">${l.v ? 'Verified' : 'Pending'}</span></td></tr>`).join('')}
    </tbody></table></div></section>`;
}
function vKpis() {
  const v = L.filter(l => l.v).length, free = L.reduce((s, l) => s + l.avail, 0), units = L.reduce((s, l) => s + l.total, 0);
  const k = [['Registered users', '3,482'], ['Verified property owners', new Set(L.filter(l=>l.v).map(l=>l.owner)).size + ' of ' + new Set(L.map(l=>l.owner)).size], ['Verified properties', `${v} of ${L.length}`], ['Units free to book', `${free} of ${units}`], ['Successful bookings', '1,126'], ['Completed payments', '1,094'], ['Receipts issued', '1,094'], ['Active landlords', '212'], ['Students on the platform', '2,310'], ['Hotels and hostels', '74'], ['Repeat users', '38%'], ['Roommate connections', '186'], ['Rent transfers completed', '41'], ['Customer satisfaction', '4.5 / 5'], ['Fraud reports this month', String(S.admin.fr.length)], ['Verification success rate', '91%']];
  return `<section class="sec"><div class="sec-h"><div><span class="eyebrow">Key performance indicators</span><h2>How Rentpply is doing</h2></div><span class="pill mute">Sample figures</span></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr))">${k.map(x => `<div class="card stat"><span class="muted" style="font-size:13px">${x[0]}</span><b class="num">${x[1]}</b></div>`).join('')}</div></section>`;
}

/* =====================================================================
   Added features: agreements + acceptance gate, receipts, tax dashboard,
   owner bills (water, electricity, TV, workers)
   ===================================================================== */
Object.assign(IC, {
  drop: 'M12 3s6 6.500 6 11a6 6 0 0 1-12 0c0-4.500 6-11 6-11z',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  tv: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8 21h8M12 18v3',
  broom: 'M14 3l7 7M13 8l3 3-8 8a3 3 0 0 1-4.200 0l-.8-.8a3 3 0 0 1 0-4.200z',
  lock: 'M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5z'
});
const ME = 'Yokas Gero';
const daysTo = d => Math.ceil((new Date(d).getTime() - Date.now()) / DAY);

/* ---------- agreements ---------- */
const DEFAULT_TERMS = l => ({
  deposit: l.type === 'rental' ? 2 : 0, late: 5, notice: l.per === 'night' ? 0 : 30,
  rules: l.type === 'hostel' ? 'Visitors leave by 10 pm. No cooking in rooms. Quiet hours are 10 pm to 6 am.' : 'Keep the compound clean and respect neighbours. No subletting without the landlord.'
});
const termsFor = lid => Object.assign({}, DEFAULT_TERMS(byId(lid)), S.terms[lid] || {});
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const endOf = (l, start, qty) => new Date(new Date(start).getTime() + (l.per === 'night' ? qty * DAY : qty * 30.4 * DAY));

function clauses(l, t, qty, start) {
  const night = l.per === 'night', per = night ? 'night' : 'month', total = l.price * qty, dep = l.price * t.deposit;
  return [
    ['Parties and property', `${l.owner} (the Landlord) lets the ${l.unit.toLowerCase()} at ${l.name}, ${l.area}, Kampala to the Tenant named on the Rentpply booking. Both sides have been identity checked by Rentpply.`],
    ['Rent and period', `Rent is ${fmt(l.price)} per ${per}. The period is ${plural(qty, per)} from ${fdate(start)} to ${fdate(endOf(l, start, qty))}, a total of ${fmt(total)}.`],
    ['Security deposit', t.deposit ? `A refundable deposit of ${fmt(dep)} (${plural(t.deposit, 'month')} of rent) is paid with the first payment. The Landlord returns it within 14 days of moving out, less any documented damage.` : 'No security deposit is required.'],
    ['Late payment', t.late ? `If rent is more than 7 days late, a fee of ${t.late}% of the overdue amount is added.` : 'No late fee applies.'],
    ['Ending the tenancy', night ? 'Cancel free of charge up to 48 hours before check-in. Later cancellations are charged the first night.' : `Either side gives ${t.notice} days written notice to end the tenancy early. The Tenant may instead pass the remaining paid months to a Rentpply-verified person with the Landlord's approval.`],
    ['House rules', t.rules],
    ['Receipts and tax', 'The Landlord issues an EFRIS receipt for every payment. The amounts on those receipts match this agreement, as Uganda Revenue Authority requires.'],
    ['Rentpply terms', 'Payments are made through Rentpply. The 3% service fee is not refundable. Rentpply may suspend an account that breaks these terms or the law. Disputes are first handled by Rentpply support.']
  ];
}
const agrHTML = cl => cl.map(c => `<div><h4>${esc(c[0])}</h4><p>${esc(c[1])}</p></div>`).join('');
function keyTerms(l, t, qty, start) {
  const per = l.per === 'night' ? 'night' : 'month';
  return [`${fmt(l.price)} / ${per}`, plural(qty, per), t.deposit ? `Deposit ${fmt(l.price * t.deposit)}` : 'No deposit', t.late ? `Late fee ${t.late}%` : 'No late fee', l.per === 'night' ? 'Free cancel 48h' : `${t.notice} days notice`].map(x => `<span>${x}</span>`).join('');
}
function renderAgr() {
  const box = $('#agrbox'); if (!box) return;
  const l = byId(BK.lid), t = termsFor(BK.lid);
  box.innerHTML = agrHTML(clauses(l, t, BK.qty, BK.start));
  $('#agchips').innerHTML = keyTerms(l, t, BK.qty, BK.start);
  BK.acc = false; const c = $('#acc'); if (c) c.checked = false; gate();
}
function gate() {
  const pm = $('#pm'); if (!pm) return;
  pm.inert = !BK.acc; pm.classList.toggle('locked', !BK.acc); $('#pmhint').hidden = BK.acc;
  $('#payBtn').disabled = !BK.acc;
  const st = $('#agst'); st.className = 'pill ' + (BK.acc ? 'ok' : 'warn'); st.textContent = BK.acc ? 'Accepted' : 'Waiting for your acceptance';
}

/* ---------- booking panel (agreement first, then payment) ---------- */
function bookPanel(l) {
  const night = l.per === 'night';
  return `<div class="card stack" id="bp">
    <span class="eyebrow">${l.avail} ${night ? 'rooms' : 'units'} available · Book and pay</span>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr))">
      <div class="field"><label for="bs">${night ? 'Check-in' : 'Move-in date'}</label><input class="inp" type="date" id="bs" value="${BK.start}" min="${iso(NOW)}"></div>
      <div class="field"><label for="bq">${night ? 'Nights' : 'Months'}</label><select class="inp" id="bq">${(night ? [1, 2, 3, 5, 7, 14] : [1, 2, 3, 4, 6, 12]).map(n => `<option ${BK.qty === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    </div>
    <div class="stack" style="gap:8px"><span class="lbl">Who is paying</span>
      <div class="row"><button class="chip" data-payer="Self" aria-pressed="true">I am paying</button><button class="chip" data-payer="Sponsor" aria-pressed="false">A sponsor is paying</button></div>
      <div id="sp" hidden class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr))">
        <div class="field"><label for="spn">Sponsor name</label><input class="inp" id="spn" placeholder="e.g. Mother"></div>
        <div class="field"><label for="spc">Paying from</label><input class="inp" id="spc" placeholder="e.g. United States"></div></div></div>

    <div class="stack" style="gap:10px;border-top:1px solid var(--line);padding-top:14px" id="agr">
      <div class="row" style="justify-content:space-between"><div><span class="lbl">Step 1 · Tenancy agreement</span><div class="muted" style="font-size:13px">Issued by ${esc(l.owner)} · Ref AG-2026-${String(l.id * 37 + 4000)}</div></div><span class="pill warn" id="agst">Waiting for your acceptance</span></div>
      <div class="am" id="agchips"></div>
      <div class="agrbox" id="agrbox" tabindex="0" aria-label="Tenancy agreement text"></div>
      <label class="chk" for="acc"><input type="checkbox" id="acc"><span>I have read and accept this tenancy agreement and the Rentpply terms and conditions.</span></label>
    </div>

    <div class="stack" style="gap:10px;border-top:1px solid var(--line);padding-top:14px">
      <div class="row" style="justify-content:space-between"><span class="lbl">Step 2 · Payment method</span><span class="muted" id="pmhint" style="font-size:13px;display:flex;gap:6px;align-items:center">${ic('lock')}Accept the agreement to unlock</span></div>
      <div class="stack locked" id="pm" inert style="gap:8px">
        ${[['MTN MoMo', 'MTN', '#FFCC00'], ['Airtel Money', 'AIR', '#E40000'], ['Card', 'VISA', '#8FB4FF']].map((m, i) => `<button class="opt" data-method="${m[0]}" aria-pressed="${i === 0}"><span class="dot" style="background:${m[2]};color:#111">${m[1]}</span><b>${m[0]}</b></button>`).join('')}
        <div class="field"><label for="ph">Mobile number or card holder</label><input class="inp" id="ph" inputmode="tel" placeholder="07XX XXX XXX"></div>
      </div>
    </div>
    <div class="stack" style="gap:6px" id="sum"></div>
    <button class="btn" id="payBtn" data-pay disabled>Pay securely</button>
    <p class="muted" style="font-size:12px">Demo mode. No real money moves in this prototype. A live version connects to MTN MoMo, Airtel Money and card processors.</p></div>`;
}
const calc = () => { const l = byId(BK.lid), t = termsFor(BK.lid), sub = l.price * BK.qty, fee = Math.round(sub * .03), dep = l.price * t.deposit; return { sub, fee, dep, tot: sub + fee + dep } };
function recalc() {
  const s = $('#sum'); if (!s) return; const l = byId(BK.lid), c = calc(), night = l.per === 'night';
  s.innerHTML = `<div class="kv"><span>${fmt(l.price)} × ${BK.qty} ${night ? 'night' : 'month'}${BK.qty > 1 ? 's' : ''}</span><span class="num">${fmt(c.sub)}</span></div>${c.dep ? `<div class="kv"><span>Refundable deposit</span><span class="num">${fmt(c.dep)}</span></div>` : ''}<div class="kv"><span>Rentpply service fee (3%)</span><span class="num">${fmt(c.fee)}</span></div><div class="kv tot"><span style="color:var(--ink)">Total</span><span class="num">${fmt(c.tot)}</span></div>`;
  $('#payBtn').textContent = 'Pay ' + fmt(c.tot);
}
function doPay() {
  if (!BK.acc) { toast('Accept the tenancy agreement first'); return; }
  const ph = $('#ph').value.trim();
  if (BK.method !== 'Card' && ph.replace(/\D/g, '').length < 9) { toast('Enter the mobile money number to pay from'); $('#ph').focus(); return; }
  if (BK.paidBy === 'Sponsor' && !$('#spn').value.trim()) { toast('Add the sponsor name'); $('#spn').focus(); return; }
  const b = $('#payBtn'); b.disabled = true; b.textContent = 'Waiting for approval on your phone…';
  setTimeout(() => {
    const l = byId(BK.lid), c = calc(), night = l.per === 'night', id = 'RP-2026-' + String(Math.floor(1000 + Math.random() * 8999)), ts = Date.now();
    const room = String.fromCharCode(65 + Math.floor(Math.random() * 4)) + '-' + (10 + Math.floor(Math.random() * 30));
    const ag = { id: 'AG-2026-' + String(4100 + S.agreements.length), lid: l.id, room, tenant: ME, qty: BK.qty, start: BK.start, status: 'accepted', issued: ts, accepted: ts, paid: true };
    S.agreements.unshift(ag);
    const rec = {
      id, lid: l.id, room, start: BK.start, months: night ? 0 : BK.qty, nights: night ? BK.qty : 0, amount: c.sub, fee: c.fee, dep: c.dep, method: BK.method,
      purpose: night ? 'Stay, ' + plural(BK.qty, 'night') : 'Rent, ' + plural(BK.qty, 'month'), fdn: efrisNo(id), vc: vcode(id), agId: ag.id,
      paidBy: BK.paidBy === 'Sponsor' ? ($('#spn').value.trim() + (($('#spc').value.trim()) ? ', ' + $('#spc').value.trim() : '')) : 'Self', ts, listed: false
    };
    S.bookings.unshift(rec); S.payments.unshift(Object.assign({}, rec)); l.avail = Math.max(0, l.avail - 1); save(); showReceipt(rec, true);
  }, 1700);
}

/* ---------- receipt ---------- */
function showReceipt(r, fresh) {
  r = S.payments.find(p => p.id === r.id) || S.bookings.find(p => p.id === r.id) || r;
  const l = byId(r.lid), night = r.nights > 0, end = endOf(l, r.start, night ? r.nights : r.months), ag = S.agreements.find(a => a.id === r.agId);
  const total = r.amount + r.fee + (r.dep || 0);
  sheet(`${fresh ? `<div class="stack" style="align-items:center;text-align:center;gap:8px;padding-top:6px"><span class="avatar" style="background:var(--ok-soft);color:var(--ok);width:60px;height:60px">${ic('check')}</span><h2 style="font-size:28px">Booking confirmed</h2><p class="muted">Your receipt was sent to your email. The owner has been told who is coming.</p></div>` : ''}
    <div class="receipt">
      <div class="row" style="justify-content:space-between"><b style="font-family:var(--f-display);font-size:20px">Rentpply receipt</b><span class="pill ok">Paid</span></div>
      <div class="kv"><span>Receipt no.</span><span class="mono">${r.id}</span></div>
      <div class="kv"><span>Date</span><span>${fdt(r.ts)}</span></div>
      <div class="kv"><span>Property</span><span>${esc(l.name)}</span></div>
      <div class="kv"><span>Unit</span><span class="mono">${r.room} · ${l.unit}</span></div>
      <div class="kv"><span>For</span><span>${esc(r.purpose || (night ? 'Stay' : 'Rent'))}</span></div>
      <div class="kv"><span>Period</span><span>${fdate(r.start)} to ${fdate(end)}</span></div>
      <div class="kv"><span>Tenant</span><span>${ME} (ID verified)</span></div>
      <div class="kv"><span>Paid by</span><span>${esc(r.paidBy)}</span></div>
      <div class="kv"><span>Method</span><span>${r.method}</span></div>
      <div class="kv"><span>Rent</span><span class="num">${fmt(r.amount)}</span></div>
      ${r.dep ? `<div class="kv"><span>Refundable deposit</span><span class="num">${fmt(r.dep)}</span></div>` : ''}
      <div class="kv"><span>Service fee</span><span class="num">${fmt(r.fee)}</span></div>
      <div class="kv tot"><span style="color:var(--ink)">Total</span><span class="num">${fmt(total)}</span></div>
      <div style="border-top:1px dashed var(--line);padding-top:10px;display:flex;flex-direction:column;gap:8px">
        <div class="row" style="justify-content:space-between"><b>EFRIS tax receipt</b><span class="pill ok">${ic('shield')}Issued</span></div>
        <div class="kv"><span>Fiscal document no.</span><span class="mono">${r.fdn || efrisNo(r.id)}</span></div>
        <div class="kv"><span>Verification code</span><span class="mono">${r.vc || vcode(r.id)}</span></div>
        <div class="kv"><span>Agreement</span><span>${ag ? `<span class="mono">${ag.id}</span> accepted ${fdate(ag.accepted)}` : 'Accepted at booking'}</span></div>
        <p class="muted" style="font-size:12px">Sample EFRIS numbers for this demo. A live system receives them from URA when the landlord's receipt is submitted.</p>
      </div>
    </div>
    <button class="btn" data-close>Done</button>`, 'Receipt');
}

/* ---------- tenant: payments, receipts (newest first), agreements ---------- */
function vWallet() {
  const link = 'rentpply.com/pay/YG-4471';
  const rc = [...S.payments].sort((a, b) => b.ts - a.ts);
  const paid = rc.reduce((s, r) => s + r.amount + r.fee + (r.dep || 0), 0);
  const mine = S.agreements.filter(a => a.tenant === ME).sort((a, b) => (b.issued || 0) - (a.issued || 0));
  const st = { accepted: ['ok', 'Accepted'], sent: ['warn', 'Waiting for you'], draft: ['mute', 'Draft'] };
  return `<section class="sec">
    <div class="sec-h"><div><span class="eyebrow">Payments</span><h2>Receipts and reminders</h2></div></div>
    ${mine.some(a => a.status === 'sent') ? `<div class="notice">A landlord sent you an agreement. Read and accept it before you pay.</div>` : ''}
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))">
      <div class="card stack" style="gap:10px"><span class="eyebrow">Let someone else pay</span><h3 style="font-size:20px">Share a payment link</h3><p class="muted">A parent, relative or employer abroad opens this link, pays by card or mobile money and you both get the receipt.</p>
        <div class="row" style="flex-wrap:nowrap"><code class="mono inp" style="display:flex;align-items:center;overflow:auto">${link}</code><button class="btn sm" data-copy="${link}">Copy</button></div></div>
      <div class="card stack" style="gap:10px"><span class="eyebrow">Reminders</span><h3 style="font-size:20px">You will hear from us</h3>
        ${['7 days before rent is due', 'On the due date', 'When payment arrives'].map(t => `<div class="row" style="flex-wrap:nowrap;gap:10px"><span style="color:var(--ok)">${ic('bell')}</span>${t}</div>`).join('')}</div>
    </div>

    <div class="sec-h" style="margin-top:6px"><div><span class="eyebrow">Newest first</span><h3 style="font-size:22px">Receipts you have paid</h3></div><div class="muted num" style="font-size:14px">${rc.length} receipts · ${fmt(paid)} paid</div></div>
    <div class="stack" style="gap:10px">${rc.map((r, i) => { const l = byId(r.lid); return `<div class="card rrow ${i === 0 ? 'first' : ''}">
      <span class="ric">${ic('receipt')}</span>
      <div style="min-width:0"><div class="row" style="gap:8px"><b>${esc(l.name)}</b>${i === 0 ? '<span class="pill ok">Latest</span>' : ''}</div>
        <div class="muted" style="font-size:13px">${esc(r.purpose || 'Rent')} · ${fdt(r.ts)}</div>
        <div class="muted" style="font-size:12px"><span class="mono">${r.id}</span> · ${r.method} · EFRIS <span class="mono">${r.fdn || efrisNo(r.id)}</span></div></div>
      <div class="rr"><b class="num">${fmt(r.amount + r.fee + (r.dep || 0))}</b><button class="btn ghost sm" data-receipt="${r.id}">View</button></div></div>`; }).join('')}</div>

    <h3 style="font-size:22px;margin-top:6px">Your agreements</h3>
    <div class="stack" style="gap:10px">${mine.map(a => { const l = byId(a.lid), s = st[a.status]; return `<div class="card row" style="justify-content:space-between;flex-wrap:nowrap">
      <div style="min-width:0"><b>${esc(l.name)}</b><div class="muted" style="font-size:13px"><span class="mono">${a.id}</span> · unit <span class="mono">${a.room}</span> · ${plural(a.qty, l.per === 'night' ? 'night' : 'month')} from ${fdate(a.start)}</div></div>
      <div class="row" style="flex-wrap:nowrap"><span class="pill ${s[0]}">${s[1]}</span>${a.status === 'sent' ? `<button class="btn sm" data-agview="${a.id}">Review and accept</button>` : a.status === 'accepted' && !a.paid ? `<button class="btn sm" data-open="${a.lid}">Pay now</button><button class="btn ghost sm" data-agview="${a.id}">View</button>` : `<button class="btn ghost sm" data-agview="${a.id}">View</button>`}</div></div>`; }).join('') || '<div class="card"><p class="muted">Agreements you accept show up here.</p></div>'}</div>

    <h3 style="font-size:22px;margin-top:6px">Your bookings</h3>
    <div class="stack">${[...S.bookings].sort((a, b) => b.ts - a.ts).map(b => { const l = byId(b.lid); return `<div class="card row" style="justify-content:space-between;flex-wrap:nowrap"><div style="min-width:0"><b>${esc(l.name)}</b><div class="muted" style="font-size:13px"><span class="mono">${b.id}</span> · ${fdate(b.ts)} · ${b.method}</div></div><div class="row" style="flex-wrap:nowrap"><b class="num">${fmt(b.amount + b.fee + (b.dep || 0))}</b><button class="btn ghost sm" data-receipt="${b.id}">${ic('receipt')}Receipt</button></div></div>`; }).join('')}</div>
  </section>`;
}

/* ---------- agreements: open, owner-side seeding ---------- */
S.agreements = store.get('agreements', null) || (() => {
  const a = [], st = i => (i === 3 || i === 9) ? 'draft' : 'accepted';
  occ.forEach((u, i) => a.push({ id: 'AG-2026-' + String(3000 + i), lid: 1, room: u.id, tenant: u.tenant, qty: 12, start: iso(NOW - (40 + i * 6) * DAY), status: st(i), issued: st(i) === 'draft' ? null : NOW - (46 + i * 6) * DAY, accepted: st(i) === 'accepted' ? NOW - (45 + i * 6) * DAY : null, paid: true }));
  a.push({ id: 'AG-2026-3900', lid: 1, room: 'B-05', tenant: 'Brian Kigozi', qty: 5, start: iso(NOW + 8 * DAY), status: 'draft', issued: null, accepted: null, paid: false });
  a.push({ id: 'AG-2026-3901', lid: 1, room: 'A-09', tenant: ME, qty: 4, start: iso(NOW + 10 * DAY), status: 'sent', issued: NOW - 2 * 3600e3, accepted: null, paid: false });
  return a;
})();
function openAgreement(id, mode) {
  const a = S.agreements.find(x => x.id === id), l = byId(a.lid), t = termsFor(a.lid);
  const st = { accepted: ['ok', 'Accepted'], sent: ['warn', 'Waiting for tenant'], draft: ['mute', 'Draft, not issued'] }[a.status];
  const can = mode === 'tenant' && a.status === 'sent';
  sheet(`<div class="stack" style="gap:6px"><span class="pill ${st[0]}">${st[1]}</span><h2 style="font-size:26px">Tenancy agreement</h2><p class="muted">${esc(l.name)} · unit <span class="mono">${a.room}</span> · ${esc(a.tenant)} · <span class="mono">${a.id}</span></p></div>
    <div class="am">${keyTerms(l, t, a.qty, a.start)}</div>
    <div class="agrbox" style="max-height:none">${agrHTML(clauses(l, t, a.qty, a.start))}</div>
    ${a.accepted ? `<div class="kv"><span>Accepted</span><span>${fdt(a.accepted)}</span></div>` : ''}
    ${can ? `<label class="chk" for="agacc"><input type="checkbox" id="agacc"><span>I have read and accept this tenancy agreement and the Rentpply terms and conditions.</span></label><button class="btn" id="agBtn" data-agaccept="${a.id}" disabled>Accept agreement</button>` : '<button class="btn ghost" data-close>Close</button>'}`, 'Agreement');
}
function issueAgreement(id) {
  const a = S.agreements.find(x => x.id === id); if (!a) return;
  a.status = 'sent'; a.issued = Date.now(); save();
  toast(`Agreement sent to ${a.tenant}. They must accept it before paying.`);
}

/* ---------- owner: Terms tab ---------- */
function formTerms() {
  const l = byId(1), d = termsFor(1);
  return { deposit: +($('#tm-dep') ? $('#tm-dep').value : d.deposit), late: +($('#tm-late') ? $('#tm-late').value : d.late), notice: +($('#tm-notice') ? $('#tm-notice').value : d.notice), rules: ($('#tm-rules') ? $('#tm-rules').value.trim() : d.rules) || DEFAULT_TERMS(l).rules };
}
function tmPreview() { const p = $('#tmprev'); if (!p) return; const l = byId(1), t = formTerms(); p.innerHTML = agrHTML(clauses(l, t, 6, iso(NOW + 7 * DAY))); }
function vTerms() {
  const l = byId(1), t = termsFor(1), list = S.agreements.filter(a => a.lid === 1);
  const n = k => list.filter(a => a.status === k).length;
  const order = { sent: 0, draft: 1, accepted: 2 };
  const rows = [...list].sort((a, b) => order[a.status] - order[b.status] || (b.issued || 0) - (a.issued || 0));
  const vac = UNITS.filter(u => u.st === 'vacant' || u.st === 'reserved');
  const sel = (id, opts, v) => `<select class="inp" id="${id}">${opts.map(o => `<option value="${o[0]}" ${String(v) === String(o[0]) ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`;
  const pill = { accepted: ['ok', 'Accepted'], sent: ['warn', 'Waiting for tenant'], draft: ['mute', 'Draft'] };
  return `<section class="sec">
    <div class="sec-h"><div><span class="eyebrow">Kikoni Scholars Hostel</span><h2>Tenancy agreements</h2></div></div>
    <div class="notice">Every tenant must read and accept the agreement before payment options open. Receipts and EFRIS invoices then match what was agreed.</div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))">
      <div class="card stat"><span class="eyebrow">Accepted</span><b>${n('accepted')}</b><span class="muted">tenants</span></div>
      <div class="card stat"><span class="eyebrow">Waiting for tenant</span><b style="color:var(--warn)">${n('sent')}</b><span class="muted">sent, not accepted</span></div>
      <div class="card stat"><span class="eyebrow">Drafts</span><b>${n('draft')}</b><span class="muted">not issued yet</span></div>
    </div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))">
      <div class="card stack"><h3 style="font-size:20px">Your standard terms</h3>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr))">
          <div class="field"><label for="tm-dep">Deposit</label>${sel('tm-dep', [[0, 'None'], [1, '1 month'], [2, '2 months'], [3, '3 months']], t.deposit)}</div>
          <div class="field"><label for="tm-late">Late fee</label>${sel('tm-late', [[0, 'None'], [2, '2%'], [5, '5%'], [10, '10%']], t.late)}</div>
          <div class="field"><label for="tm-notice">Notice to leave</label>${sel('tm-notice', [[14, '14 days'], [30, '30 days'], [60, '60 days']], t.notice)}</div></div>
        <div class="field"><label for="tm-rules">House rules</label><textarea class="inp" id="tm-rules" rows="3">${esc(t.rules)}</textarea></div>
        <button class="btn" data-saveterms>Save terms</button></div>
      <div class="card stack" style="gap:10px"><div class="row" style="justify-content:space-between"><h3 style="font-size:20px">What tenants must accept</h3><span class="pill mute">Live preview</span></div><div class="agrbox" id="tmprev" style="max-height:330px">${agrHTML(clauses(l, t, 6, iso(NOW + 7 * DAY)))}</div></div>
    </div>
    <div class="card stack"><h3 style="font-size:20px">Issue an agreement</h3><p class="muted">Choose the room and the tenant. They see it before they can pay.</p>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr))">
        <div class="field"><label for="ag-unit">Room</label><select class="inp" id="ag-unit">${vac.map(u => `<option value="${u.id}">${u.id} · ${u.st === 'reserved' ? 'reserved' : 'vacant'}</option>`).join('')}</select></div>
        <div class="field"><label for="ag-name">Tenant name</label><input class="inp" id="ag-name" placeholder="e.g. Aisha Nakamya"></div>
        <div class="field"><label for="ag-q">Months</label>${sel('ag-q', [1, 2, 3, 4, 5, 6, 12].map(x => [x, x]), 6)}</div>
        <div class="field"><label for="ag-s">Move-in date</label><input class="inp" type="date" id="ag-s" value="${iso(NOW + 7 * DAY)}"></div></div>
      <button class="btn" data-issue>Issue to tenant</button></div>
    <div class="sec-h"><h3 style="font-size:20px">All agreements</h3><span class="pill mute">Sample tenants</span></div>
    <div class="card" style="padding:6px"><div class="tablebox"><table><thead><tr><th>Tenant</th><th>Unit</th><th>Period</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody>
      ${rows.map(a => { const p = pill[a.status]; return `<tr><td><b>${esc(a.tenant)}</b></td><td class="mono">${a.room}</td><td>${plural(a.qty, 'month')} from ${fdate(a.start)}</td><td><span class="pill ${p[0]}">${p[1]}</span></td><td>${a.accepted ? fdate(a.accepted) : a.issued ? 'Sent ' + fdate(a.issued) : '-'}</td>
        <td>${a.status === 'draft' ? `<button class="btn sm" data-agissue="${a.id}">Issue to tenant</button>` : a.status === 'sent' ? `<button class="btn ghost sm" data-agresend="${a.id}">Remind</button>` : `<button class="btn ghost sm" data-agview="${a.id}">View</button>`}</td></tr>`; }).join('')}
    </tbody></table></div></div>
  </section>`;
}

/* ---------- owner: Tax tab ---------- */
function taxModel() {
  const THR = 2820000, RATE = .12;
  const rows = occ.map(u => ({ u, annual: u.rent * 12 }));
  const G = rows.reduce((s, r) => s + r.annual, 0), chargeable = Math.max(0, G - THR), tax = chargeable * RATE, eff = G ? tax / G : 0;
  rows.forEach(r => {
    const u = r.u; r.paidN = u.corp ? 1 : u.ytdM; r.ytd = u.corp ? 1140000 : u.rent * u.ytdM; r.whtYtd = u.corp ? 68400 : 0; r.whtAnnual = u.corp ? 273600 : 0;
    r.set = Math.max(0, r.ytd * eff - r.whtYtd); r.share = G ? tax * r.annual / G : 0;
  });
  const sum = k => rows.reduce((s, r) => s + r[k], 0), wht = sum('whtAnnual');
  return { rows, G, THR, chargeable, tax, eff, wht, net: Math.max(0, tax - wht), ytd: sum('ytd'), set: sum('set'), whtYtd: sum('whtYtd'), paidN: sum('paidN'), efris: rows.reduce((s, r) => s + r.u.efris, 0), share: sum('share') };
}
function vTax() {
  const m = taxModel(), pending = m.paidN - m.efris, pct = m.net ? Math.min(100, Math.round(m.set / m.net * 100)) : 0, days = daysTo('2026-12-31T23:59:00');
  const acc = S.agreements.filter(a => a.lid === 1 && a.status === 'accepted' && occ.some(u => u.id === a.room)).length;
  const chk = [
    [1, 'Tax number (TIN) registered', 'Your TIN is linked to this property.'],
    [1, 'Registered for EFRIS', 'You can issue fiscal receipts to tenants.'],
    [pending === 0, 'EFRIS receipt issued for every payment', pending === 0 ? 'All payments have a fiscal receipt.' : `${pending} payments still need a receipt. Submit them from the table below.`],
    [acc === occ.length, 'Receipts match tenancy agreements', `${acc} of ${occ.length} tenants have an accepted agreement. URA says receipts must match the agreement and rental account.`],
    [0, 'Rental return for the year to 30 June 2026', `Due 31 December 2026, in ${days} days. Rent is declared in full from your receipts.`]
  ];
  return `<section class="sec">
    <div class="sec-h"><div><span class="eyebrow">Uganda Revenue Authority · individual landlord · estimate</span><h2>Tax dashboard</h2></div><button class="btn ${pending ? '' : 'ghost'}" data-efris-all ${pending ? '' : 'disabled'}>${pending ? `Submit ${pending} pending EFRIS receipts` : 'All receipts submitted'}</button></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))">
      <div class="card stat"><span class="eyebrow">Tax set aside to date</span><b class="num" style="color:var(--accent)">${fmt(m.set)}</b><span class="muted">from ${m.efris} EFRIS receipts</span></div>
      <div class="card stat"><span class="eyebrow">Withheld by company tenants</span><b class="num">${fmt(m.wht)}</b><span class="muted">6% credit for the year</span></div>
      <div class="card stat"><span class="eyebrow">Rental tax to URA this year</span><b class="num">${fmt(m.net)}</b><span class="muted">after withholding credit</span></div>
      <div class="card stat"><span class="eyebrow">EFRIS receipts submitted</span><b class="num">${m.efris} of ${m.paidN}</b><span class="muted">${pending ? pending + ' pending' : 'complete'}</span></div>
    </div>
    <div class="card stack" style="gap:10px"><div class="row" style="justify-content:space-between"><b>Reserve towards this year's rental tax</b><span class="num"><b>${pct}%</b> · ${fmt(m.set)} of ${fmt(m.net)}</span></div>
      <div class="bar" role="img" aria-label="${pct}% of the annual rental tax is set aside"><b style="width:${pct}%"></b></div>
      <p class="muted" style="font-size:13px">Each rent payment adds ${(m.eff * 100).toFixed(1)}% of its value to the reserve, the share of rent that ends up as tax. The year of income runs from 1 July 2026 to 30 June 2027.</p></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))">
      <div class="card stack" style="gap:10px"><h3 style="font-size:20px">How the main rental tax is worked out</h3>
        <div class="kv"><span>Rent for the year, ${occ.length} occupied units × 12 months</span><span class="num">${fmt(m.G)}</span></div>
        <div class="kv"><span>Less tax-free amount</span><span class="num">- ${fmt(m.THR)}</span></div>
        <div class="kv"><span>Taxable rent</span><span class="num">${fmt(m.chargeable)}</span></div>
        <div class="kv"><span>Rental tax at 12%</span><span class="num">${fmt(m.tax)}</span></div>
        <div class="kv"><span>Less 6% withheld by company tenants</span><span class="num">- ${fmt(m.wht)}</span></div>
        <div class="kv tot"><span style="color:var(--ink)">Payable to URA</span><span class="num">${fmt(m.net)}</span></div>
        <p class="muted" style="font-size:12px">URA taxes individual landlords at 12% on gross annual rent above UGX 2,820,000, with no deductions. Companies and VAT-registered landlords are taxed differently. <a href="https://ura.go.ug/?p=40935" target="_blank" rel="noopener" style="color:var(--accent)">URA guidance</a></p></div>
      <div class="card stack" style="gap:12px"><h3 style="font-size:20px">Compliance checklist</h3>
        ${chk.map(c => `<div class="check"><span class="pill ${c[0] ? 'ok' : 'warn'}">${ic(c[0] ? 'check' : 'bell')}${c[0] ? 'Done' : 'Action'}</span><div><b>${c[1]}</b><div class="muted" style="font-size:13px">${c[2]}</div></div></div>`).join('')}</div>
    </div>
    <div class="sec-h" style="margin-top:6px"><div><span class="eyebrow">Per tenant</span><h3 style="font-size:22px">Tax set aside on each tenant's EFRIS receipts</h3></div><span class="pill mute">Sample tenants</span></div>
    <div class="card" style="padding:6px"><div class="tablebox"><table><thead><tr><th>Tenant</th><th>Unit</th><th class="r">Rent received</th><th>EFRIS receipts</th><th class="r">Tax set aside</th><th class="r">6% withheld</th><th class="r">Tax for the year</th></tr></thead><tbody>
      ${m.rows.map(r => { const u = r.u, p = u.efris < r.paidN; return `<tr><td><b>${esc(u.tenant)}</b>${u.corp ? ' <span class="pill mute">Company</span>' : ''}</td><td class="mono">${u.id}</td><td class="r num">${fmt(r.ytd)}</td>
        <td>${p ? `<span class="pill warn">${u.efris} of ${r.paidN}</span> <button class="btn sm ghost" data-efris="${u.id}">Submit</button>` : `<span class="pill ok">${ic('check')}${u.efris} of ${r.paidN}</span>`}</td>
        <td class="r num">${fmt(r.set)}</td><td class="r num">${r.whtYtd ? fmt(r.whtYtd) : '-'}</td><td class="r num">${fmt(r.share)}</td></tr>`; }).join('')}
    </tbody><tfoot><tr><td>Total</td><td></td><td class="r num">${fmt(m.ytd)}</td><td>${m.efris} of ${m.paidN}</td><td class="r num">${fmt(m.set)}</td><td class="r num">${fmt(m.whtYtd)}</td><td class="r num">${fmt(m.share)}</td></tr></tfoot></table></div></div>
    <p class="muted" style="font-size:12px;max-width:80ch">The set-aside figure is a reserve for you to keep, worked out from each EFRIS receipt. URA charges the tax on your yearly total, not per payment. Company tenants that pay more than UGX 1,000,000 at a time withhold 6% and pay it to URA for you. All figures are estimates from sample data.</p>
  </section>`;
}


/* =====================================================================
   Owner: Payments hub (Students / Bills / Tax), owner-entered bills,
   unit profiles and status switching
   ===================================================================== */
const short = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(Math.round(n));
const STAT = [['occupied', 'Occupied'], ['reserved', 'Reserved'], ['vacant', 'Vacant'], ['maint', 'Maintenance']];
const STNAME = { occupied: 'occupied', reserved: 'reserved', vacant: 'vacant', maint: 'under maintenance' };

/* ---------- units: state, roommates, persistence ---------- */
const STRIP = ['tenant', 'rent', 'pay', 'bal', 'thru', 'credit', 'corp', 'ytdM', 'efris', 'roommate'];
const snap = u => { const o = {}; STRIP.forEach(k => { if (k in u) o[k] = u[k]; }); return o; };
const stripTenant = u => STRIP.forEach(k => delete u[k]);
function syncOcc() { occ.length = 0; UNITS.filter(u => u.st === 'occupied').forEach(u => occ.push(u)); }
function fillDefaults(u) {
  if (u.rent == null) u.rent = 380000; if (!u.pay) u.pay = 'paid'; if (u.bal == null) u.bal = 0; if (!u.thru) u.thru = iso(NOW + 25 * DAY);
  if (!u.credit) u.credit = 'Good'; if (u.ytdM == null) u.ytdM = 1; if (u.efris == null) u.efris = u.corp ? 1 : u.ytdM;
}
function persistUnits() { store.set('units2', UNITS.map(u => ({ id: u.id, st: u.st, keep: u.keep || null, roommate: u.roommate || null }))); }
(function seedRoommates() {
  const pool = occ.filter(u => !u.corp), names = ['Nambooze Lydia', 'Kaweesi Brian', 'Atim Doreen', 'Wanyama Collins', 'Namusoke Prossy'];
  [2, 5, 8, 12, 15].forEach((ix, k) => { if (pool[ix]) pool[ix].roommate = names[k]; });
})();
(function applyUnitState() {
  const saved = store.get('units2', null); if (!saved) return;
  saved.forEach(s => {
    const u = UNITS.find(x => x.id === s.id); if (!u) return;
    if (s.roommate && u.st === 'occupied') u.roommate = s.roommate;
    if (s.st !== u.st) {
      if (s.st === 'occupied') { if (s.keep) Object.assign(u, s.keep); fillDefaults(u); u.st = 'occupied'; }
      else { if (u.tenant && !u.keep) u.keep = snap(u); if (u.tenant) stripTenant(u); if (s.keep) u.keep = s.keep; u.st = s.st; }
    } else if (s.keep && s.st !== 'occupied') u.keep = s.keep;
  });
  syncOcc();
})();
function setUnitStatus(id, st) {
  const u = UNITS.find(x => x.id === id); if (!u || u.st === st) return;
  if (st === 'occupied') {
    if (!u.keep && !u.tenant) { toast('No tenant on record. Issue an agreement and the tenant moves in after paying.'); return; }
    if (u.keep) { Object.assign(u, u.keep); delete u.keep; } fillDefaults(u); u.st = 'occupied';
  } else {
    if (u.tenant && !u.keep) u.keep = snap(u); if (u.tenant) stripTenant(u); u.st = st;
  }
  syncOcc(); persistUnits(); closeSheet(); toast(`Unit ${id} is now ${STNAME[st]}`); render();
}
function openUnitMenu(id) {
  const u = UNITS.find(x => x.id === id); if (!u) return;
  const hint = { occupied: 'Restore the tenant on record', reserved: 'Held for someone who is about to move in', vacant: 'Shows as available to people searching', maint: 'Hidden from search until you reopen it' };
  const who = u.tenant ? u.tenant : u.keep && u.keep.tenant ? 'Previous tenant: ' + u.keep.tenant : 'No tenant';
  sheet(`<div class="stack" style="gap:4px"><h2 style="font-size:28px">Unit <span class="mono">${u.id}</span></h2><p class="muted">Now ${STNAME[u.st]} · ${esc(who)}</p></div>
    <div class="stack" style="gap:8px">${STAT.map(([k, t]) => `<button class="opt" data-setst="${u.id}:${k}" aria-pressed="${u.st === k}" ${k === 'occupied' && !u.keep && !u.tenant ? 'disabled style="opacity:.45"' : ''}><span class="dot" style="background:${k === 'occupied' ? 'var(--ok-soft);color:var(--ok)' : k === 'reserved' ? 'var(--warn-soft);color:var(--warn)' : k === 'maint' ? 'var(--bad-soft);color:var(--bad)' : 'var(--surface-2);color:var(--muted)'}">${t[0]}</span><span><b>${t}</b><div class="muted" style="font-size:13px">${hint[k]}</div></span></button>`).join('')}</div>
    <button class="btn ghost" data-close>Cancel</button>`, 'Change status');
}

/* ---------- unit profile data (sample people) ---------- */
const COURSES = ['Computer Science', 'Law', 'Medicine', 'Economics', 'Architecture', 'Software Engineering', 'Education', 'Nursing', 'Statistics'];
const UNIS = ['Makerere University', 'Makerere University Business School', 'Kyambogo University', 'Uganda Christian University'];
const DIST = ['Mbarara', 'Gulu', 'Jinja', 'Mbale', 'Masaka', 'Lira', 'Kabale', 'Arua', 'Fort Portal', 'Soroti'];
const SPON = ['Mother', 'Father', 'Uncle', 'Aunt', 'Government sponsorship'];
const JOBS = ['Bank teller', 'Pharmacy assistant', 'Law firm intern', 'Shop supervisor'];
const BIO_OVR = { 'Moses Tumusiime': { student: true, course: 'Computer Science', year: 2, uni: 'Makerere University' } };
function bio(name) {
  const h = hash(name + 'x');
  return Object.assign({ name, student: h % 6 !== 0, course: COURSES[h % COURSES.length], year: 1 + (h >>> 2) % 4, uni: UNIS[(h >>> 4) % UNIS.length], job: JOBS[(h >>> 6) % JOBS.length], district: DIST[(h >>> 8) % DIST.length], sponsor: SPON[(h >>> 10) % SPON.length], phone: '07XX XXX ' + String(100 + (h >>> 12) % 900), hue: [18, 168, 205, 300, 45, 330][h % 6] }, BIO_OVR[name] || {});
}
function pcard(b, role, share, company) {
  const rows = company ? [['Type', 'Company tenant, staff housing'], ['Pays', 'Quarterly, 6% withheld for URA'], ['Rent', fmt(share) + ' / month']]
    : [b.student ? ['Studying', `${b.course}, year ${b.year}`] : ['Works as', b.job], ...(b.student ? [['University', b.uni]] : []), ['Home district', b.district], b.student ? ['Sponsor', b.sponsor] : ['Next of kin', 'Family member'], ['Phone', b.phone], ['Rent share', fmt(share) + ' / month']];
  return `<div class="card pcard"><div class="row" style="flex-wrap:nowrap"><span class="avatar" style="background:hsl(${b.hue || 168},70%,75%)">${esc(b.name[0])}</span><div style="min-width:0"><b style="font-size:17px">${esc(b.name)}</b><div class="muted" style="font-size:13px">${role}</div></div></div>
    <div class="row">${company ? '<span class="pill mute">Company</span>' : b.student ? '<span class="pill ok">Student</span>' : '<span class="pill mute">Not a student</span>'}<span class="pill ok">${ic('shield')}ID verified</span></div>
    ${rows.map(r => `<div class="kv"><span>${r[0]}</span><span>${esc(r[1])}</span></div>`).join('')}</div>`;
}
function historyOf(u) {
  const names = [u.tenant, u.roommate].filter(Boolean), rows = [], MN = ['July', 'August', 'September', 'October'];
  if (u.corp) {
    rows.push({ m: 'Quarter July to September 2026', amt: 1140000, note: '6% (UGX 68,400) withheld', st: 'paid', d: new Date(2026, 6, 3) });
    if (u.pay !== 'paid') rows.push({ m: 'Quarter October to December 2026', amt: 1140000, st: u.pay === 'overdue' ? 'overdue' : 'due' });
  } else {
    for (let i = 0; i < u.ytdM; i++) rows.push({ m: MN[i] + ' 2026', amt: u.rent, st: 'paid', d: new Date(2026, 6 + i, 1 + hash(u.id + i) % 5) });
    if (u.pay === 'due') { const r = rows[rows.length - 1]; if (u.ytdM === 4) { r.amt = u.rent / 2; r.st = 'part'; r.note = 'Balance ' + fmt(u.rent / 2); } }
    if (u.pay === 'overdue') rows.push({ m: 'October 2026', amt: u.rent, st: 'overdue' });
  }
  rows.reverse();
  const paidRows = rows.filter(r => r.st === 'paid' || r.st === 'part'); let pend = Math.max(0, paidRows.length - (u.efris == null ? paidRows.length : u.efris));
  rows.forEach((r, i) => { const hs = hash(u.id + r.m); r.id = 'RP-2026-' + String(1000 + hs % 8999); r.method = ['MTN MoMo', 'Airtel Money', 'Card'][hs % 3]; r.by = names[(rows.length - i) % names.length]; if (r.st === 'paid' || r.st === 'part') { r.fdn = pend > 0 ? null : efrisNo(r.id); if (pend > 0) pend--; } });
  return rows;
}
function unitDetail(u) {
  const chips = STAT.map(([k, t]) => `<button class="chip" data-setst="${u.id}:${k}" aria-pressed="${u.st === k}">${t}</button>`).join('');
  const head = `<div class="row" style="justify-content:space-between;align-items:start"><div><span class="eyebrow">Selected unit</span><h3 style="font-size:26px">Unit <span class="mono">${u.id}</span></h3></div><div class="stack" style="gap:6px"><span class="lbl">Change status</span><div class="row">${chips}</div></div></div>`;
  if (u.st !== 'occupied') {
    const msg = { vacant: 'This unit is empty and shows as available to people searching on Rentpply.', maint: 'This unit is closed for repairs and hidden from search. Reopen it by choosing Vacant.', reserved: u.tenant ? `Held for ${u.tenant}, who is moving in soon. Their agreement and first payment are still to come.` : 'This unit is being held for someone who is about to move in.' }[u.st];
    return `<div class="card stack" id="unitDetail">${head}<p class="muted">${msg}</p>${u.tenant ? `<div class="row"><button class="btn sm" data-setst="${u.id}:occupied">Mark as moved in</button></div>` : ''}${u.keep && u.keep.tenant ? `<div class="notice">Previous tenant on record: <b>${esc(u.keep.tenant)}</b>${u.keep.roommate ? ' and ' + esc(u.keep.roommate) : ''}. Choose Occupied to restore them.</div>` : ''}</div>`;
  }
  const main = u.corp ? null : bio(u.tenant), mate = u.roommate ? bio(u.roommate) : null, split = mate ? u.rent / 2 : u.rent;
  const hist = historyOf(u), ag = S.agreements.find(a => a.lid === 1 && a.room === u.id);
  const paidSum = hist.filter(r => r.st === 'paid' || r.st === 'part').reduce((s, r) => s + r.amt, 0);
  const pillSt = { paid: ['ok', 'Paid'], part: ['warn', 'Part paid'], overdue: ['bad', 'Overdue'], due: ['warn', 'Due'] };
  return `<div class="card stack" id="unitDetail" style="gap:16px">${head}
    <div class="who">${u.corp ? pcard({ name: u.tenant, hue: 205 }, 'Main tenant', u.rent, true) : pcard(main, 'Main tenant', split)}${mate ? pcard(mate, 'Roommate', split) : ''}</div>
    <div class="share">${ic(mate ? 'users' : 'bed')}<span>${mate ? `Shared room: <b>${esc(u.tenant)}</b> and <b>${esc(u.roommate)}</b> each pay ${fmt(split)} a month.` : u.corp ? 'Company staff housing. No roommate listed.' : 'No roommate. This unit has one tenant.'}</span></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))">
      <div class="stat"><span class="muted">Rent for the unit</span><b class="num" style="font-size:22px">${fmt(u.rent)}</b></div>
      <div class="stat"><span class="muted">Paid through</span><b style="font-size:22px">${fdate(u.thru)}</b></div>
      <div class="stat"><span class="muted">Balance</span><b class="num" style="font-size:22px;color:${u.bal ? 'var(--bad)' : 'var(--ok)'}">${fmt(u.bal || 0)}</b></div>
      <div class="stat"><span class="muted">Payment record</span><b style="font-size:22px">${u.credit}</b></div></div>
    <div class="row" style="justify-content:space-between"><div><b>Tenancy agreement</b><div class="muted" style="font-size:13px">${ag ? `<span class="mono">${ag.id}</span> · ${ag.status === 'accepted' ? 'accepted ' + fdate(ag.accepted) : ag.status === 'sent' ? 'waiting for the tenant' : 'draft, not issued'}` : 'None on record'}</div></div>${ag && ag.status === 'accepted' ? `<button class="btn ghost sm" data-agview="${ag.id}">View</button>` : ''}</div>
    <div><div class="sec-h" style="margin-bottom:8px"><b style="font-size:17px">Payment history</b><span class="muted num" style="font-size:13px">${fmt(paidSum)} paid this year</span></div>
      <div class="tablebox" style="max-height:340px"><table><thead><tr><th>For</th><th>Paid by</th><th class="r">Amount</th><th>Method</th><th>Receipt</th><th>EFRIS</th><th>Status</th></tr></thead><tbody>
      ${hist.map(r => { const p = pillSt[r.st], paid = r.st === 'paid' || r.st === 'part'; return `<tr><td>${r.m}${r.note ? `<div class="muted" style="font-size:12px">${r.note}</div>` : ''}</td><td>${paid ? esc(r.by) : '-'}</td><td class="r num">${fmt(r.amt)}</td><td>${paid ? r.method : '-'}</td><td class="mono">${paid ? r.id : '-'}</td><td>${paid ? (r.fdn ? `<span class="mono">${r.fdn}</span>` : '<span class="pill warn">Pending</span>') : '-'}</td><td><span class="pill ${p[0]}">${p[1]}</span></td></tr>`; }).join('')}
      </tbody></table></div></div>
    <div class="row"><button class="btn sm ${S.sent[u.id] ? 'ghost' : ''}" data-remind="${u.id}" ${S.sent[u.id] ? 'disabled' : ''}>${S.sent[u.id] ? 'Reminder sent' : 'Send reminder'}</button><button class="btn ghost sm" data-agree="${u.id}">Issue tenancy agreement</button><button class="btn ghost sm" data-rcpt="${u.id}">Email receipt</button></div>
  </div>`;
}
function vUnits() {
  const sel = UNITS.find(u => u.id === S.owner.sel), n = k => UNITS.filter(u => u.st === k).length;
  const lab = u => u.st === 'occupied' ? (u.roommate ? u.tenant.split(' ')[0] + ' +1' : u.tenant.split(' ')[0]) : u.st === 'maint' ? 'Maintenance' : u.st === 'reserved' ? 'Reserved' : 'Vacant';
  return `<section class="sec">
    <div class="sec-h"><div><span class="eyebrow">Kikoni Scholars Hostel</span><h2>Units</h2></div></div>
    <p class="muted" style="max-width:62ch">Tap a unit to see who lives there. Press and hold a unit to change its status.</p>
    <div class="legend"><span><i style="background:var(--ok-soft);border-color:var(--ok)"></i>Occupied ${n('occupied')}</span><span><i style="background:var(--warn-soft);border-color:var(--warn)"></i>Reserved ${n('reserved')}</span><span><i style="border-style:dashed"></i>Vacant ${n('vacant')}</span><span><i style="background:var(--bad-soft);border-color:var(--bad)"></i>Maintenance ${n('maint')}</span></div>
    <div class="units">${UNITS.map(u => `<button class="unit ${u.st}" data-unit="${u.id}" aria-pressed="${u.id === S.owner.sel}" aria-label="Unit ${u.id}, ${STNAME[u.st]}"><b>${u.id}</b><small>${esc(lab(u))}</small>${u.pay && u.pay !== 'paid' ? `<span class="pill ${u.pay === 'overdue' ? 'bad' : 'warn'}" style="font-size:10px;padding:1px 7px">${u.pay === 'overdue' ? 'Overdue' : 'Due'}</span>` : ''}</button>`).join('')}</div>
    ${sel ? unitDetail(sel) : '<div class="card"><p class="muted">Select a unit to see the tenant, whether they are a student, their payment history and any roommate.</p></div>'}
  </section>`;
}

/* ---------- Payments hub: Students / Bills / Tax ---------- */
function vPayments() {
  const tab = S.owner.pay || 'students', owing = S.bills.filter(b => b.st !== 'paid').reduce((s, b) => s + b.amount, 0), m = taxModel();
  const tabs = [['students', 'Students', 'users', 'UGX ' + short(MONTHS[5][1]) + ' in'], ['bills', 'Bills', 'bolt', S.bills.length ? (owing ? 'UGX ' + short(owing) + ' to pay' : 'All paid') : 'Add yours'], ['tax', 'Tax', 'flag', 'UGX ' + short(m.set) + ' set aside']];
  const body = tab === 'bills' ? vBills() : tab === 'tax' ? vTax() : vPayStudents();
  return `<section class="sec" style="padding-bottom:0"><div class="sec-h"><div><span class="eyebrow">Kikoni Scholars Hostel</span><h2>Payments</h2></div></div>
    <div class="paytabs" role="group" aria-label="Payment sections">${tabs.map(t => `<button class="ptab" data-paytab="${t[0]}" aria-pressed="${tab === t[0]}">${ic(t[2])}<b>${t[1]}</b><small>${t[3]}</small></button>`).join('')}</div></section>${body}`;
}

/* ---------- Bills: entered by the owner ---------- */
const CAT = { water: ['Water', 'drop', 'var(--cw)'], power: ['Electricity', 'bolt', 'var(--cp)'], tv: ['TV', 'tv', 'var(--ct)'], staff: ['Workers', 'broom', 'var(--cs)'] };
S.bills = store.get('bills2', null) || [];
const mk = d => String(d).slice(0, 7);
const exampleBills = () => [
  { id: 'x1', cat: 'water', name: 'NWSC, main meter', ref: 'Meter 4471-2208', note: '96 m³ at UGX 6,700', amount: 643200, due: iso(NOW + 9 * DAY), st: 'due' },
  { id: 'x2', cat: 'power', name: 'UMEME, whole building', ref: 'Account 0443 881 207', note: '1,150 kWh at UGX 700', amount: 805000, due: iso(NOW + 3 * DAY), st: 'due' },
  { id: 'x3', cat: 'tv', name: 'DStv, common room', ref: 'Smartcard 7014 2290', note: 'Monthly subscription', amount: 165000, due: iso(NOW - 4 * DAY), st: 'paid', paid: NOW - 4 * DAY },
  { id: 'x4', cat: 'staff', name: 'Nakalema Joyce', role: 'Cleaner', ref: '07XX 482 117', note: 'Floors A and B', amount: 280000, due: iso(NOW + 5 * DAY), st: 'due' },
  { id: 'x5', cat: 'staff', name: 'Mugabi Stephen', role: 'Custodian', ref: '07XX 217 640', note: 'Keys, gate and night rounds', amount: 450000, due: iso(NOW + 5 * DAY), st: 'due' }
];
const billPill = b => b.st === 'paid' ? `<span class="pill ok">${ic('check')}Paid ${fdate(b.paid)}</span>` : daysTo(b.due) < 0 ? '<span class="pill bad">Overdue</span>' : `<span class="pill warn">Due ${fdate(b.due)}</span>`;
const HINTS = { water: ['NWSC, main meter', 'Meter or account number', 'Usage, e.g. 96 m³'], power: ['UMEME, whole building', 'Account or meter number', 'Usage, e.g. 1,150 kWh'], tv: ['DStv, common room', 'Smartcard or IUC number', 'Package, e.g. monthly subscription'], staff: ['Worker name', 'Mobile money number', 'Duties, e.g. floors A and B'] };
function billFormHints() {
  const c = $('#bl-cat'); if (!c) return; const h = HINTS[c.value];
  $('#bl-name').placeholder = h[0]; $('#bl-ref').placeholder = h[1]; $('#bl-note').placeholder = h[2];
  $('#bl-rolef').hidden = c.value !== 'staff'; $('#bl-namelbl').textContent = c.value === 'staff' ? 'Worker name' : 'Provider';
}
function addBill() {
  const cat = $('#bl-cat').value, name = $('#bl-name').value.trim(), amt = +$('#bl-amt').value;
  if (!name) { toast('Enter the ' + (cat === 'staff' ? 'worker name' : 'provider')); $('#bl-name').focus(); return; }
  if (!(amt > 0)) { toast('Enter the amount'); $('#bl-amt').focus(); return; }
  const b = { id: 'b' + Date.now(), cat, name, ref: $('#bl-ref').value.trim() || '-', note: $('#bl-note').value.trim() || '-', amount: Math.round(amt), due: $('#bl-due').value || iso(NOW + 7 * DAY), st: 'due' };
  if (cat === 'staff') b.role = $('#bl-role').value;
  S.bills.push(b); save(); toast((cat === 'staff' ? 'Worker added: ' : 'Bill added: ') + name); render();
}
function vBills() {
  const cur = mk(iso(NOW)), month = S.bills.filter(b => mk(b.due) === cur), tot = month.reduce((s, b) => s + b.amount, 0);
  const owing = S.bills.filter(b => b.st !== 'paid').reduce((s, b) => s + b.amount, 0), nOwing = S.bills.filter(b => b.st !== 'paid').length, expected = occ.length * 380000;
  const catTot = c => S.bills.filter(b => b.cat === c).reduce((s, b) => s + b.amount, 0);
  const form = `<details class="card" id="addbill" ${S.bills.length ? '' : 'open'}><summary style="cursor:pointer;font-weight:700;font-size:16px;display:flex;justify-content:space-between;align-items:center;gap:10px">Add a bill or a worker<span class="pill mute">You enter these</span></summary>
    <div class="stack" style="margin-top:14px"><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))">
      <div class="field"><label for="bl-cat">What is it</label><select class="inp" id="bl-cat"><option value="water">Water bill</option><option value="power">Electricity bill</option><option value="tv">TV subscription</option><option value="staff">Worker salary</option></select></div>
      <div class="field"><label for="bl-name" id="bl-namelbl">Provider</label><input class="inp" id="bl-name" placeholder="NWSC, main meter"></div>
      <div class="field" id="bl-rolef" hidden><label for="bl-role">Role</label><select class="inp" id="bl-role"><option>Cleaner</option><option>Custodian</option><option>Security guard</option><option>Other</option></select></div>
      <div class="field"><label for="bl-ref">Reference</label><input class="inp" id="bl-ref" placeholder="Meter or account number"></div>
      <div class="field"><label for="bl-note">Details</label><input class="inp" id="bl-note" placeholder="Usage, e.g. 96 m³"></div>
      <div class="field"><label for="bl-amt">Amount (UGX)</label><input class="inp" id="bl-amt" type="number" inputmode="numeric" min="0" step="1000" placeholder="0"></div>
      <div class="field"><label for="bl-due">Due date</label><input class="inp" id="bl-due" type="date" value="${iso(NOW + 7 * DAY)}"></div></div>
      <button class="btn" data-addbill>Add</button></div></details>`;
  if (!S.bills.length) return `<section class="sec"><div class="sec-h"><div><span class="eyebrow">Water, electricity, TV and workers</span><h2>Bills and workers</h2></div></div>${form}
    <div class="card stack" style="gap:8px;align-items:flex-start"><h3 style="font-size:20px">No bills yet</h3><p class="muted" style="max-width:56ch">Add the bills you pay for this property and your workers' salaries. Totals, the monthly chart and payment buttons appear here once you do.</p><button class="btn ghost sm" data-loadbills>Show me with example bills</button></div></section>`;
  const months = [...Array(6)].map((_, i) => { const d = new Date(NOW); d.setDate(1); d.setMonth(d.getMonth() - (5 - i)); return { k: mk(iso(d)), l: d.toLocaleDateString('en-GB', { month: 'short' }) }; });
  const order = ['staff', 'power', 'water', 'tv'], vals = months.map(m => order.map(c => S.bills.filter(b => b.cat === c && mk(b.due) === m.k).reduce((s, b) => s + b.amount, 0)));
  const top = Math.max(...vals.map(v => v.reduce((a, b) => a + b, 0))), max = Math.max(1e6, Math.ceil(top / 1e6) * 1e6);
  const W = 520, H = 230, L0 = 48, B = 196, T = 14, y = v => B - v / max * (B - T), bw = 44, gap = (W - L0 - 8 - bw * 6) / 5;
  const tick = v => { const x = v / 1e6; return (Number.isInteger(x) ? x : x.toFixed(2)) + 'M'; };
  const grid = [0, 1, 2, 3, 4].map(i => max * i / 4).map(v => `<line x1="${L0 - 6}" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L0 - 10}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--muted)">${tick(v)}</text>`).join('');
  const bars = vals.map((vs, i) => { const x = L0 + i * (bw + gap); let acc = 0, out = ''; vs.forEach((v, k) => { const y1 = y(acc + v), h = y(acc) - y1; if (v > 0) out += `<rect x="${x}" y="${y1}" width="${bw}" height="${Math.max(0, h - 1)}" fill="${CAT[order[k]][2]}"/>`; acc += v; });
    return out + (acc ? `<text x="${x + bw / 2}" y="${y(acc) - 6}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink)">${(acc / 1e6).toFixed(2)}</text>` : '') + `<text x="${x + bw / 2}" y="${B + 18}" text-anchor="middle" font-size="12" fill="var(--muted)">${months[i].l}</text>`; }).join('');
  const section = c => { const list = S.bills.filter(b => b.cat === c).sort((a, b) => (a.st === 'paid') - (b.st === 'paid') || a.due.localeCompare(b.due)), ct = CAT[c]; if (!list.length) return ''; return `<div class="card stack" style="gap:10px">
    <div class="row" style="justify-content:space-between;flex-wrap:nowrap"><div class="row" style="flex-wrap:nowrap;gap:10px"><span style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--surface-2);color:${ct[2]}">${ic(ct[1])}</span><h3 style="font-size:20px">${ct[0]}</h3></div><b class="num">${fmt(catTot(c))}</b></div>
    ${list.map(b => `<div class="rrow" style="grid-template-columns:minmax(0,1fr) auto;border-top:1px solid var(--line);padding-top:10px"><div style="min-width:0"><b>${esc(b.name)}</b>${b.role ? ` <span class="pill mute">${esc(b.role)}</span>` : ''}<div class="muted" style="font-size:13px;overflow-wrap:anywhere">${esc(b.note)} · <span class="mono">${esc(b.ref)}</span></div>
      ${c === 'staff' ? `<div class="muted" style="font-size:12px">Employer NSSF at 10%: ${fmt(b.amount * .1)}</div>` : ''}<div style="margin-top:4px">${billPill(b)}</div></div>
      <div class="rr"><b class="num">${fmt(b.amount)}</b>${b.st === 'paid' ? '' : `<button class="btn sm" data-paybill="${b.id}">${c === 'staff' ? 'Pay salary' : 'Pay bill'}</button>`}<button class="btn ghost sm" data-delbill="${b.id}" aria-label="Remove ${esc(b.name)}">Remove</button></div></div>`).join('')}</div>`; };
  return `<section class="sec">
    <div class="sec-h"><div><span class="eyebrow">Water, electricity, TV and workers</span><h2>Bills and workers</h2></div><button class="btn ${nOwing ? '' : 'ghost'}" data-payall ${nOwing ? '' : 'disabled'}>${nOwing ? `Pay ${nOwing} unpaid ${nOwing === 1 ? 'bill' : 'bills'}` : 'Everything paid'}</button></div>
    ${form}
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))">
      <div class="card stat"><span class="eyebrow">Bills due this month</span><b class="num">${fmt(tot)}</b><span class="muted">${month.length} ${month.length === 1 ? 'entry' : 'entries'}</span></div>
      <div class="card stat"><span class="eyebrow">Still to pay</span><b class="num" style="color:${owing ? 'var(--bad)' : 'var(--ok)'}">${fmt(owing)}</b><span class="muted">${nOwing} unpaid</span></div>
      <div class="card stat"><span class="eyebrow">Cost per occupied room</span><b class="num">${fmt(occ.length ? tot / occ.length : 0)}</b><span class="muted">${occ.length} rooms</span></div>
      <div class="card stat"><span class="eyebrow">Share of monthly rent</span><b class="num">${expected ? Math.round(tot / expected * 100) : 0}%</b><span class="muted">of ${fmt(expected)}</span></div>
    </div>
    ${top ? `<div class="card stack" style="gap:10px"><span class="eyebrow">Bills by month and type, UGX millions</span>
      <div class="scroll-x"><svg viewBox="0 0 ${W} ${H}" style="min-width:420px;width:100%;display:block" role="img" aria-label="Stacked bars of monthly bills for workers, electricity, water and TV">${grid}${bars}</svg></div>
      <div class="legend">${order.slice().reverse().map(c => `<span><i style="background:${CAT[c][2]};border-color:${CAT[c][2]}"></i>${CAT[c][0]}</span>`).join('')}</div></div>` : ''}
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))">${['water', 'power', 'tv', 'staff'].map(section).join('')}</div>
    <p class="muted" style="font-size:12px;max-width:80ch">NSSF figures are estimates. A live version pays workers by mobile money and can read water and electricity bills from the utility accounts.</p>
  </section>`;
}

/* ---------- navigation + render ---------- */
const NAV = {
  student: [['home', 'Campus', 'home', vStudentHome], ['explore', 'Find housing', 'search', vExplore], ['roommates', 'Roommates', 'users', vRoommates], ['wallet', 'My housing', 'wallet', vWallet]],
  tenant: [['home', 'Home', 'home', vHome], ['explore', 'Explore', 'search', vExplore], ['roommates', 'Roommates', 'users', vRoommates], ['space', 'Sell space', 'swap', vSpace], ['wallet', 'Pay', 'wallet', vWallet]],
  owner: [['overview', 'Overview', 'chart', vOverview], ['units', 'Units', 'building', vUnits], ['payments', 'Payments', 'receipt', vPayments], ['terms', 'Terms', 'key', vTerms], ['requests', 'Requests', 'list', vRequests]],
  admin: [['queue', 'Verify', 'shield', vQueue], ['listings', 'Listings', 'building', vListings], ['kpis', 'KPIs', 'chart', vKpis]]
};
const FIRST = { student: 'home', tenant: 'home', owner: 'overview', admin: 'queue' };
function render(top) {
  const nav = NAV[S.role], cur = nav.find(n => n[0] === S.tab) || nav[0];
  S.tab = cur[0];
  $('#main').innerHTML = cur[3]();
  $('#dock').innerHTML = nav.map(n => `<button data-tab="${n[0]}" ${n[0] === S.tab ? 'aria-current="page"' : ''}>${ic(n[2])}<span>${n[1]}</span></button>`).join('');
  document.querySelectorAll('[data-role]').forEach(b => b.setAttribute('aria-pressed', b.dataset.role === S.role));
  if (top) window.scrollTo({ top: 0 });
}
function go(spec) {
  const [t, arg] = spec.split(':');
  if (S.role !== 'tenant' && S.role !== 'student') S.role = 'tenant';
  if (t === 'explore') { S.f.type = arg || 'all'; S.f.q = ''; }
  S.tab = t; render(true);
}
function applyTheme(t) { if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme'); }
applyTheme(store.get('theme', null));

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const t = e.target, c = s => t.closest(s);
  let el;
  if (c('#theme')) { const dark = document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme:dark)').matches); const n = dark ? 'light' : 'dark'; applyTheme(n); store.set('theme', n); return; }
  if ((el = c('[data-role]'))) { S.role = el.dataset.role; store.set('role', S.role); S.tab = FIRST[S.role]; render(true); return; }
  if ((el = c('[data-tab]'))) { S.tab = el.dataset.tab; render(true); return; }
  if ((el = c('[data-go]'))) { go(el.dataset.go); return; }
  if ((el = c('[data-save]'))) { const id = +el.dataset.save; S.saved = S.saved.includes(id) ? S.saved.filter(x => x !== id) : [...S.saved, id]; save(); el.setAttribute('aria-pressed', S.saved.includes(id)); toast(S.saved.includes(id) ? 'Saved to your list' : 'Removed from your list'); return; }
  if ((el = c('[data-open]'))) { openListing(+el.dataset.open); return; }
  if ((el = c('[data-type]'))) { S.f.type = el.dataset.type; render(); return; }
  if (c('[data-close]') || (t.matches && t.matches('[data-veil]'))) { closeSheet(); return; }
  if ((el = c('[data-payer]'))) { BK.paidBy = el.dataset.payer; document.querySelectorAll('[data-payer]').forEach(b => b.setAttribute('aria-pressed', b === el)); $('#sp').hidden = BK.paidBy !== 'Sponsor'; return; }
  if ((el = c('[data-method]'))) { BK.method = el.dataset.method; document.querySelectorAll('[data-method]').forEach(b => b.setAttribute('aria-pressed', b === el)); const card = BK.method === 'Card'; $('#ph').placeholder = card ? 'Name on card' : '07XX XXX XXX'; $('#ph').inputMode = card ? 'text' : 'tel'; return; }
  if (c('[data-pay]')) { doPay(); return; }
  if ((el = c('[data-receipt]'))) { showReceipt({ id: el.dataset.receipt }); return; }
  if ((el = c('[data-ask]'))) { S.asked.push(el.dataset.ask); save(); toast('Request sent. They will see your verified profile.'); render(); return; }
  if ((el = c('[data-take]'))) { S.asked.push(el.dataset.take); save(); toast('Sent to the owner for approval'); render(); return; }
  if ((el = c('[data-list]'))) {
    const b = S.bookings.find(x => x.id === el.dataset.list), p = +$('#sp-p-' + b.id).value || byId(b.lid).price;
    S.transfers.push({ bid: b.id, price: p, from: iso(NOW + 7 * DAY), why: $('#sp-r-' + b.id).value }); save(); toast('Listed. Waiting for owner approval of the new tenant.'); render(); return;
  }
  if ((el = c('[data-copy]'))) { const v = el.dataset.copy; (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => toast('Link copied')).catch(() => { const r = document.createRange(); const code = el.parentNode.querySelector('code'); r.selectNodeContents(code); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Press and hold to copy'); }); return; }
  /* owner */
  if ((el = c('[data-unit]'))) { if (lp.done) { lp.done = false; return; } S.owner.sel = el.dataset.unit; render(); setTimeout(() => { const d = $('#unitDetail'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); return; }
  if ((el = c('[data-setst]'))) { const [id, st] = el.dataset.setst.split(':'); setUnitStatus(id, st); return; }
  if ((el = c('[data-paytab]'))) { S.owner.pay = el.dataset.paytab; S.tab = 'payments'; render(true); return; }
  if ((el = c('[data-gounit]'))) { S.owner.sel = el.dataset.gounit; S.tab = 'units'; render(); setTimeout(() => { const d = $('#unitDetail'); if (d) d.scrollIntoView({ block: 'start' }); }, 60); return; }
  if (c('[data-addbill]')) { addBill(); return; }
  if ((el = c('[data-delbill]'))) { S.bills = S.bills.filter(b => b.id !== el.dataset.delbill); save(); toast('Removed'); render(); return; }
  if (c('[data-loadbills]')) { S.bills = exampleBills(); save(); toast('Example bills loaded. Remove them any time.'); render(); return; }
  if ((el = c('[data-remind]'))) { S.sent[el.dataset.remind] = 1; toast('Reminder sent by SMS and email'); render(); return; }
  if ((el = c('[data-agree]'))) { const u = UNITS.find(x => x.id === el.dataset.agree); let a = S.agreements.find(x => x.lid === 1 && x.room === u.id); if (!a) { a = { id: 'AG-2026-' + String(4200 + S.agreements.length), lid: 1, room: u.id, tenant: u.tenant || 'Tenant', qty: 12, start: iso(NOW), status: 'draft', issued: null, accepted: null, paid: true }; S.agreements.push(a); } if (a.status === 'accepted') { toast('This tenant has already accepted'); return; } issueAgreement(a.id); return; }
  /* agreements, bills, tax */
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
  /* admin */
  if ((el = c('[data-adm]'))) { const [id, st] = el.dataset.adm.split(':'), r = S.admin.q.find(x => x.id === id); r.st = st; if (r.lid && st === 'approved') { const l = byId(r.lid); l.v = 1; l.owner = 'Wasswa Rentals'; } toast(st === 'approved' ? 'Verified. The listing can now be booked.' : 'Rejected. The applicant is told what to fix.'); render(); return; }
  if ((el = c('[data-fr]'))) { const [id, st] = el.dataset.fr.split(':'); S.admin.fr.find(x => x.id === id).st = st; toast(st === 'suspended' ? 'Account and listing suspended' : 'Report dismissed'); render(); return; }
});
document.addEventListener('submit', e => {
  if (e.target.id === 'homeSearch') { e.preventDefault(); S.f = { type: $('#ht').value, q: $('#hq').value, area: '', max: 0 }; S.tab = 'explore'; render(true); }
});
document.addEventListener('input', e => {
  const id = e.target.id;
  if (id === 'fq') { S.f.q = e.target.value; render(); const n = $('#fq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
  else if (id === 'bs') { BK.start = e.target.value || BK.start; renderAgr(); }
  else if (id === 'bq') { BK.qty = +e.target.value; renderAgr(); recalc(); }
  else if (id === 'tm-rules') { tmPreview(); }
});
document.addEventListener('change', e => {
  const id = e.target.id, v = e.target.value;
  if (id === 'bl-cat') { billFormHints(); return; }
  if (id === 'acc') { BK.acc = e.target.checked; gate(); return; }
  if (id === 'agacc') { $('#agBtn').disabled = !e.target.checked; return; }
  if (id === 'tm-dep' || id === 'tm-late' || id === 'tm-notice') { tmPreview(); return; }
  if (id === 'fa') { S.f.area = v; render(); } else if (id === 'fm') { S.f.max = +v; render(); }
  else if (({ rc: 'course', rcol: 'college', rg: 'gender', rs: 'sleep', rst: 'study' })[id]) { S.prefs[({ rc: 'course', rcol: 'college', rg: 'gender', rs: 'sleep', rst: 'study' })[id]] = v; save(); render(); }
  else if (id === 'rb') { S.prefs.budget = +v; save(); render(); } else if (id === 'rcl') { S.prefs.clean = +v; save(); render(); }
});
/* long press on a unit opens the quick status menu */
const lp = { t: null, done: false };
document.addEventListener('pointerdown', e => { const el = e.target.closest('[data-unit]'); if (!el) return; lp.done = false; clearTimeout(lp.t); lp.t = setTimeout(() => { lp.done = true; openUnitMenu(el.dataset.unit); try { navigator.vibrate && navigator.vibrate(15); } catch (_) {} }, 520); });
['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => document.addEventListener(ev, () => clearTimeout(lp.t), true));
document.addEventListener('contextmenu', e => { const el = e.target.closest('[data-unit]'); if (el) { e.preventDefault(); lp.done = true; openUnitMenu(el.dataset.unit); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

export { render };

render();
