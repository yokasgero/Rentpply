import { supabase } from './lib/supabase.js';

/* ---------- small helpers ---------- */
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = value => 'UGX ' + Math.round(Number(value) || 0).toLocaleString('en-US');
const mil = value => { const v = (Number(value) || 0) / 1e6; return v >= 10 ? Math.round(v) + 'm' : v.toFixed(1) + 'm'; };
const date = value => value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set';
const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TYPE = { hostel: 'Hostel', rental: 'Rental', airbnb: 'Airbnb' };
const STAT = [['occupied', 'Occupied'], ['reserved', 'Reserved'], ['vacant', 'Vacant'], ['maint', 'Maintenance']];
const STNAME = { occupied: 'occupied', reserved: 'reserved', vacant: 'vacant', maint: 'under maintenance' };
const sum = a => a.reduce((s, v) => s + (Number(v) || 0), 0);
const when = p => Date.parse(p.confirmed_at || p.created_at);
const floorName = f => f === 0 ? 'Ground floor' : f === 1 ? '1st floor' : f === 2 ? '2nd floor' : f === 3 ? '3rd floor' : f + 'th floor';
const ic = (d, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const ICON = {
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0', list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6', check: 'M5 12.5l4.5 4.5L19 7.5', arrow: 'M9 6l6 6-6 6', plus: 'M12 5v14M5 12h14', shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  key: 'M7 14a4 4 0 1 1 3.9-5H21v3h-2v2h-3v-2h-5.1A4 4 0 0 1 7 14z', home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z', search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3'
};
const icn = name => ic(ICON[name] || ICON.check);
const pill = (value, tone) => `<span class="pill ${tone || (['verified', 'confirmed', 'accepted', 'paid', 'done', 'approved'].includes(String(value).toLowerCase()) ? 'ok' : ['rejected', 'declined', 'overdue'].includes(String(value).toLowerCase()) ? 'bad' : 'warn')}">${esc(value)}</span>`;
const options = (values, selected) => values.map(value => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(value)}</option>`).join('');
const field = (label, name, type = 'text', extra = '') => `<label class="field"><span>${label}</span><input class="inp" name="${name}" type="${type}" ${extra} required></label>`;
const table = (head, rows, empty) => rows.length ? `<div class="card scroll-x" style="padding:6px"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>` : `<div class="card"><p class="muted">${empty}</p></div>`;
const head = (eyebrow, title, right = '') => `<div class="sec-h"><div><span class="eyebrow">${esc(eyebrow)}</span><h2>${esc(title)}</h2></div>${right}</div>`;
const niceMax = v => { if (!(v > 0)) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };

/* ---------- screen state (what is selected), kept between renders ---------- */
const ui = { prop: null, admProp: null, unit: null, floor: null, pay: 'students', range: 1, hub: 'add' };

/* ---------- data ---------- */
export async function loadPortalData(role, userId) {
  if (!supabase || !userId) return null;
  const query = supabase.from('listings').select('*').order('created_at', { ascending: false });
  if (role !== 'admin') query.eq('owner_id', userId);
  const { data: properties, error } = await query;
  if (error) throw error;
  const ids = (properties || []).map(item => item.id);
  const requests = ids.length ? [
    supabase.from('units').select('*').in('listing_id', ids).order('unit_code'),
    supabase.from('payments').select('*').in('listing_id', ids).order('created_at', { ascending: false }),
    supabase.from('agreements').select('*').in('listing_id', ids).order('created_at', { ascending: false }),
    supabase.from('maintenance_requests').select('*').in('listing_id', ids).order('created_at', { ascending: false }),
    supabase.from('bills').select('*').in('listing_id', ids).order('due_date'),
    supabase.from('rent_transfers').select('*, bookings(reference, tenant_name, tenant_id)').in('listing_id', ids).order('created_at', { ascending: false }),
    supabase.from('owner_requests').select('*').in('listing_id', ids).order('created_at', { ascending: false })
  ] : [];
  const [detail, profileResult, queueResult, notificationsResult] = await Promise.all([
    Promise.all(requests),
    role === 'admin' ? supabase.from('profiles').select('*').order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    role === 'admin' ? supabase.from('admin_queue').select('*').order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
  ]);
  const transferIds = detail[5]?.data?.map(item => item.id) || [];
  const transferRequestsResult = transferIds.length
    ? await supabase.from('rent_transfer_requests').select('*, requester:profiles!rent_transfer_requests_requester_id_fkey(full_name)').in('transfer_id', transferIds).order('created_at', { ascending: false })
    : { data: [] };
  const failure = detail.find(result => result.error) || profileResult.error || queueResult.error || notificationsResult.error || transferRequestsResult.error;
  if (failure) throw failure.error || failure;
  return {
    listings: properties || [], units: detail[0]?.data || [], payments: detail[1]?.data || [],
    agreements: detail[2]?.data || [], maintenance: detail[3]?.data || [], bills: detail[4]?.data || [],
    transfers: detail[5]?.data || [], ownerRequests: detail[6]?.data || [],
    transferRequests: transferRequestsResult.data || [], notifications: notificationsResult.data || [],
    profiles: profileResult.data || [], queue: queueResult.data || []
  };
}

/* ---------- charts (plain SVG, from live numbers) ---------- */
function buckets(range) {
  const now = new Date(), out = [];
  if (range === 1) for (let i = 29; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i); out.push({ label: String(d.getDate()), start: +d, end: +d + 864e5 }); }
  else for (let i = range - 1; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1), e = new Date(now.getFullYear(), now.getMonth() - i + 1, 1); out.push({ label: MN[d.getMonth()], start: +d, end: +e }); }
  return out;
}
const inRange = (t, b) => t >= b.start && t < b.end;
function axisY(max, W, H, pl, pt, pb, unit) {
  return [0, .25, .5, .75, 1].map(f => { const y = H - pb - (H - pt - pb) * f; return `<line x1="${pl}" x2="${W}" y1="${y}" y2="${y}" stroke="var(--line)"/><text x="${pl - 6}" y="${y + 4}" class="ax" text-anchor="end">${unit === 'm' ? (max * f / 1e6).toFixed(max * f >= 1e7 ? 0 : 1) : Math.round(max * f)}</text>`; }).join('');
}
function barChart(labels, vals, label, highlightLast = true) {
  const W = 520, H = 220, pl = 40, pr = 8, pt = 16, pb = 26, max = niceMax(Math.max(...vals)), n = vals.length, bw = (W - pl - pr) / n, bar = Math.min(44, bw - 8), Y = v => H - pb - (H - pt - pb) * v / max;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}" style="min-width:380px;width:100%;display:block">${axisY(max, W, H, pl, pt, pb, 'm')}${vals.map((v, i) => { const x = pl + bw * i + (bw - bar) / 2, cur = highlightLast && i === n - 1; return `<rect x="${x}" y="${Y(v)}" width="${bar}" height="${Math.max(0, H - pb - Y(v))}" rx="6" fill="${cur ? 'var(--accent)' : 'var(--s1)'}" opacity="${cur ? 1 : .85}"><title>${esc(labels[i])}: ${money(v)}</title></rect>${v > 0 ? `<text x="${x + bar / 2}" y="${Y(v) - 6}" text-anchor="middle" class="ax" style="font-weight:700;fill:var(--ink)">${mil(v)}</text>` : ''}<text x="${x + bar / 2}" y="${H - 8}" text-anchor="middle" class="ax">${esc(labels[i])}</text>`; }).join('')}</svg>`;
}
function lineChart(labels, vals, label) {
  const W = 340, H = 190, pl = 34, pr = 8, pt = 10, pb = 22, max = niceMax(Math.max(...vals) * 1.05), n = vals.length, step = Math.ceil(n / 6);
  const X = i => pl + (W - pl - pr) * (n === 1 ? .5 : i / (n - 1)), Y = v => H - pb - (H - pt - pb) * v / max;
  const path = vals.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${axisY(max, W, H, pl, pt, pb, 'm')}<path d="${path} L${X(n - 1)} ${H - pb} L${X(0)} ${H - pb}Z" fill="var(--s1)" opacity=".12"/><path d="${path}" fill="none" stroke="var(--s1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${labels.map((m, i) => i % step === (n - 1) % step ? `<text x="${X(i)}" y="${H - 6}" class="ax" text-anchor="middle">${esc(m)}</text>` : '').join('')}${vals.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="${n > 12 ? 2 : 3.5}" fill="var(--s1)"><title>${esc(labels[i])}: ${money(v)}</title></circle>`).join('')}</svg>`;
}
function stackChart(labels, series, label) {
  const W = 340, H = 190, pl = 30, pr = 6, pt = 10, pb = 22, n = labels.length, tot = labels.map((_, i) => sum(series.map(s => s.v[i]))), max = niceMax(Math.max(4, ...tot)), bw = (W - pl - pr) / n, bar = Math.min(18, bw - 5), Y = v => (H - pt - pb) * v / max, step = Math.ceil(n / 6);
  let g = axisY(max, W, H, pl, pt, pb, '');
  labels.forEach((m, i) => { let y = H - pb; const x = pl + bw * i + (bw - bar) / 2; series.forEach(s => { const h = Y(s.v[i]); y -= h; if (h > 0) g += `<rect x="${x}" y="${y}" width="${bar}" height="${h}" fill="var(--s${s.c})" rx="2"><title>${esc(m)} · ${esc(s.n)}: ${s.v[i]}</title></rect>`; }); if (i % step === (n - 1) % step) g += `<text x="${x + bar / 2}" y="${H - 6}" class="ax" text-anchor="middle">${esc(m)}</text>`; });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${g}</svg>`;
}
const legend = a => `<div class="lg">${a.map(s => `<span><i style="background:var(--s${s.c})"></i>${esc(s.n)}</span>`).join('')}</div>`;
const hbars = (rows, fmtv, c = 1, max) => { max = max || Math.max(1, ...rows.map(r => r[1])); return rows.length ? `<div class="hb">${rows.map(r => `<div class="hbr"><span class="hbl">${esc(r[0])}</span><span class="hbt"><i style="width:${Math.max(2, r[1] / max * 100)}%;background:var(--s${c})"></i></span><b class="hbv">${fmtv(r[1])}</b></div>`).join('')}</div>` : '<p class="muted">Nothing to show yet.</p>'; };
function donut(parts) {
  const T = sum(parts.map(p => p.v)); if (!T) return '<p class="muted">No confirmed payments yet.</p>';
  const R = 52, C = 2 * Math.PI * R; let off = 0;
  return `<div class="dn"><svg viewBox="0 0 140 140" width="132" height="132" role="img" aria-label="Share by payment method"><circle cx="70" cy="70" r="${R}" fill="none" stroke="var(--line)" stroke-width="16" opacity=".4"/>${parts.map(p => { const len = p.v / T * C, o = `<circle cx="70" cy="70" r="${R}" fill="none" stroke="var(--s${p.c})" stroke-width="16" stroke-dasharray="${Math.max(0, len - 2)} ${C - Math.max(0, len - 2)}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"><title>${esc(p.n)}: ${Math.round(p.v / T * 100)}%</title></circle>`; off += len; return o; }).join('')}<text x="70" y="66" text-anchor="middle" class="ax" style="font-size:11px">Payments</text><text x="70" y="86" text-anchor="middle" style="font:800 22px var(--f-display);fill:var(--ink)">${T}</text></svg>
    <div class="dnl">${parts.map(p => `<div><i style="background:var(--s${p.c})"></i><span>${esc(p.n)}</span><b>${Math.round(p.v / T * 100)}%</b></div>`).join('')}</div></div>`;
}
function spark(a, w = 84, h = 26) {
  if (a.length < 2) return '';
  const mn = Math.min(...a), mx = Math.max(...a), p = a.map((v, i) => [i * (w - 4) / (a.length - 1) + 2, h - 3 - (v - mn) / (mx - mn || 1) * (h - 6)]);
  return `<svg class="spk" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${p.map(q => q.map(x => x.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="var(--s1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${p[p.length - 1][0]}" cy="${p[p.length - 1][1]}" r="3" fill="var(--s1)" stroke="var(--surface)" stroke-width="2"/></svg>`;
}

/* ---------- property selection ---------- */
function currentProp(data, key = 'prop') {
  const id = ui[key]; return data.listings.find(l => l.id === id) || (key === 'prop' ? data.listings[0] : null);
}
function propChips(data) {
  if (data.listings.length < 2) return '';
  const cur = currentProp(data);
  return `<div class="fchips" role="tablist" aria-label="Choose a property">${data.listings.map(l => `<button class="fchip" role="tab" data-p-prop="${esc(l.id)}" aria-pressed="${cur && cur.id === l.id}">${esc(l.name)}</button>`).join('')}</div>`;
}
const noProps = () => `<section class="sec"><div class="card stack" style="align-items:flex-start"><h3>No property yet</h3><p class="muted">Your properties appear here once the Rentpply team has added and verified them.</p></div></section>`;
function propPicker(data, tab, title) {
  const rows = data.listings.map(l => { const n = data.units.filter(u => u.listing_id === l.id).length;
    return `<button class="prow" data-p-adm-prop="${esc(l.id)}" data-q="${esc((l.name + ' ' + l.area + ' ' + l.owner_name + ' ' + (TYPE[l.type] || l.type)).toLowerCase())}"><span class="pav" style="--h:${Number(l.hue) || 0}">${esc(l.name[0] || '?')}</span><span class="pmain"><b>${esc(l.name)}</b><small>${esc(l.area)} · ${esc(l.owner_name)}</small></span><span class="pside"><span class="pill ${l.verified ? 'ok' : 'warn'}">${l.verified ? (TYPE[l.type] || l.type) : 'Pending'}</span><small>${n} units</small></span><span class="pgo" aria-hidden="true">›</span></button>`; }).join('');
  return `<section class="sec">${head('Admin', title, `<span class="pill mute">${data.listings.length} properties</span>`)}
    <div class="sbox">${icn('search')}<input class="inp" id="admq" type="search" placeholder="Search by property, area or owner" aria-label="Search properties" autocomplete="off"></div>
    <div class="plist" id="plist">${rows || '<div class="card"><p class="muted">No properties yet.</p></div>'}</div><p class="muted" id="pnone" hidden style="text-align:center;padding:18px 0">No property matches that search.</p></section>`;
}
const propBar = l => `<div class="pbar"><button class="pback" data-p-adm-back>‹ All properties</button><b>${esc(l.name)}</b></div>`;

/* ---------- needs-you list ---------- */
function needsYou(data, lid) {
  const inP = x => !lid || x.listing_id === lid;
  const mt = data.maintenance.filter(m => inP(m) && m.status === 'open').length, rq = data.ownerRequests.filter(r => inP(r) && r.status === 'open').length;
  const od = data.units.filter(u => inP(u) && u.payment_status === 'overdue').length, dr = data.payments.filter(p => inP(p) && p.status === 'pending').length;
  const rows = [[mt, 'bell', 'bad', `${mt} repair ${mt === 1 ? 'complaint' : 'complaints'}`, 'A tenant needs you to attend', 'units'], [rq, 'list', 'warn', `${rq} ${rq === 1 ? 'request' : 'requests'} to approve`, 'Viewings, transfers and roommates', 'requests'], [od, 'flag', 'bad', `${od} overdue ${od === 1 ? 'tenant' : 'tenants'}`, 'See who owes rent', 'payments'], [dr, 'receipt', 'warn', `${dr} ${dr === 1 ? 'payment' : 'payments'} to confirm`, 'Tenants say they have paid', 'payments']].filter(r => r[0] > 0);
  if (!rows.length) return `<div class="card row" style="color:var(--ok)">${icn('check')}<b>You are all caught up.</b></div>`;
  return `<div class="card stack needs" style="gap:2px;padding:8px"><span class="eyebrow" style="padding:8px 10px 2px">Needs you today</span>${rows.map(r => `<button class="needrow" data-tab="${r[5]}"><span class="ric ${r[2]}">${icn(r[1])}</span><span style="min-width:0;text-align:left"><b>${r[3]}</b><small class="muted" style="display:block">${r[4]}</small></span>${ic(ICON.arrow, 'i" style="margin-left:auto;flex:none')}</button>`).join('')}</div>`;
}

/* ---------- OWNER: overview ---------- */
function ownerOverview(data, profile) {
  const p = currentProp(data); if (!p) return noProps();
  const units = data.units.filter(u => u.listing_id === p.id), pays = data.payments.filter(x => x.listing_id === p.id && x.status === 'confirmed');
  const bk = buckets(6), series = bk.map(b => sum(pays.filter(x => inRange(when(x), b)).map(x => x.amount)));
  const occ = units.filter(u => u.status === 'occupied').length, late = units.filter(u => u.payment_status && u.payment_status !== 'paid' && u.status === 'occupied');
  const owed = sum(units.map(u => u.balance)), free = units.filter(u => u.status === 'vacant' || u.status === 'reserved').length;
  const admin = profile.role === 'admin';
  return `<section class="sec">${head(admin ? 'Admin view · property owner' : 'Property owner', p.name, `<span class="pill ${p.verified ? 'ok' : 'warn'}">${icn('shield')}${p.verified ? 'Verified' : 'Pending check'}</span>`)}${propChips(data)}
    ${needsYou(data, p.id)}
    <div class="kgrid">
      <div class="card stat"><span class="eyebrow">Occupancy</span><b>${units.length ? Math.round(occ / units.length * 100) : 0}%</b><span class="muted">${occ} of ${units.length} units</span></div>
      <div class="card stat"><span class="eyebrow">Collected in ${MN[new Date().getMonth()]}</span><b class="num">${mil(series[series.length - 1])}</b><span class="muted">UGX, from confirmed payments</span></div>
      <div class="card stat"><span class="eyebrow">Still to collect</span><b class="num" style="color:${owed ? 'var(--bad)' : 'var(--ok)'}">${mil(owed)}</b><span class="muted">${late.length} ${late.length === 1 ? 'tenant' : 'tenants'}</span></div>
      <div class="card stat"><span class="eyebrow">Vacant or reserved</span><b>${free}</b><span class="muted">ready for new bookings</span></div>
    </div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))">
      <div class="card stack" style="gap:8px"><span class="eyebrow">Rent collected per month, UGX millions</span><div class="scroll-x">${barChart(bk.map(b => b.label), series, 'Rent collected per month')}</div>${sum(series) ? '' : '<p class="muted" style="font-size:13px">No confirmed payments in the last 6 months yet.</p>'}</div>
      <div class="card stack" style="gap:10px"><span class="eyebrow">Needs a reminder</span>${late.length ? late.map(u => `<div class="row" style="justify-content:space-between;flex-wrap:nowrap"><div style="min-width:0"><b>${esc(u.tenant_name || 'Tenant')}</b><div class="muted" style="font-size:13px"><span class="mono">${esc(u.unit_code)}</span> · ${u.payment_status === 'overdue' ? 'overdue' : 'due'}${u.paid_through ? ' since ' + date(u.paid_through) : ''}</div></div><b class="num" style="color:var(--bad)">${money(u.balance)}</b></div>`).join('') : '<p class="muted">Everyone is paid up.</p>'}</div>
    </div></section>`;
}

/* ---------- OWNER / ADMIN: units ---------- */
const firstName = n => String(n || '').split(' ')[0];
function unitTile(u, data) {
  const lab = u.status === 'occupied' ? (u.roommate_name ? firstName(u.tenant_name) + ' +1' : firstName(u.tenant_name) || 'Occupied') : u.status === 'maint' ? 'Maintenance' : u.status === 'reserved' ? 'Reserved' : 'Vacant';
  const open = data.maintenance.filter(m => m.unit_id === u.id && m.status === 'open').length;
  return `<button class="unit ${u.status}" data-p-unit="${esc(u.id)}" aria-pressed="${ui.unit === u.id}" aria-label="Unit ${esc(u.unit_code)}, ${STNAME[u.status]}"><b>${esc(u.unit_code)}</b><small>${esc(lab)}</small>${open ? `<span class="bell ring" style="width:20px;height:20px">${icn('bell')}</span>` : ''}${u.status === 'occupied' && u.payment_status && u.payment_status !== 'paid' ? `<span class="pill ${u.payment_status === 'overdue' ? 'bad' : 'warn'}" style="font-size:10px;padding:1px 7px">${u.payment_status === 'overdue' ? 'Overdue' : 'Due'}</span>` : ''}</button>`;
}
function unitDetail(u, data) {
  const chips = STAT.map(([k, t]) => `<button class="chip" data-p-setst="${esc(u.id)}:${k}" aria-pressed="${u.status === k}">${t}</button>`).join('');
  const headHtml = `<div class="row" style="justify-content:space-between;align-items:start"><div><span class="eyebrow">Selected unit</span><h3 style="font-size:26px">Unit <span class="mono">${esc(u.unit_code)}</span></h3></div><div class="stack" style="gap:6px"><span class="lbl">Change status</span><div class="row">${chips}</div></div></div>`;
  const mt = data.maintenance.filter(m => m.unit_id === u.id);
  const maint = mt.length ? `<div class="stack" style="gap:8px"><b>Repair requests</b>${mt.map(m => `<div class="card row" style="justify-content:space-between;flex-wrap:wrap;gap:10px;background:var(--surface-2);border:0"><span style="min-width:0"><b>${esc(m.type)}${m.urgent ? ' · urgent' : ''}</b><small class="muted" style="display:block">${esc(m.note)}</small></span><select class="inp" style="width:auto" data-live-maint="${esc(m.id)}" aria-label="Repair status">${options(['open', 'working', 'done'], m.status)}</select></div>`).join('')}</div>` : '';
  if (u.status !== 'occupied') {
    const msg = { vacant: 'This unit is empty and shows as available to people searching on Rentpply.', maint: 'This unit is closed for repairs and hidden from search. Reopen it by choosing Vacant.', reserved: u.tenant_name ? `Held for ${esc(u.tenant_name)}, who is moving in soon.` : 'This unit is being held for someone who is about to move in.' }[u.status];
    return `<div class="card stack" id="unitDetail">${headHtml}<p class="muted">${msg}</p>${maint}</div>`;
  }
  const hist = data.payments.filter(p => p.unit_id === u.id || (p.listing_id === u.listing_id && p.room_code === u.unit_code)).sort((a, b) => when(b) - when(a));
  const ag = data.agreements.find(a => a.listing_id === u.listing_id && a.room_code === u.unit_code), paidSum = sum(hist.filter(p => p.status === 'confirmed').map(p => p.amount + p.fee + p.deposit));
  const split = u.roommate_name ? u.rent / 2 : u.rent;
  return `<div class="card stack" id="unitDetail" style="gap:16px">${headHtml}
    <div class="share">${icn(u.roommate_name ? 'users' : 'home')}<span>${u.roommate_name ? `Shared room: <b>${esc(u.tenant_name)}</b> and <b>${esc(u.roommate_name)}</b> each pay ${money(split)} a month.` : `<b>${esc(u.tenant_name || 'Tenant')}</b> has this unit${u.is_corporate ? ' (company staff housing)' : ''}. No roommate listed.`}</span></div>
    <div class="ustats"><div><span>Rent for the unit</span><b class="num">${money(u.rent)}</b></div><div><span>Paid through</span><b>${date(u.paid_through)}</b></div><div><span>Balance</span><b class="num" style="color:${u.balance ? 'var(--bad)' : 'var(--ok)'}">${money(u.balance)}</b></div><div><span>Payment record</span><b>${esc(u.credit_rating || 'Good')}</b></div></div>
    ${maint}
    <div class="row" style="justify-content:space-between"><div><b>Tenancy agreement</b><div class="muted" style="font-size:13px">${ag ? `<span class="mono">${esc(ag.reference)}</span> · ${ag.status === 'accepted' ? 'accepted ' + date(ag.accepted_at) : esc(ag.status)}` : 'None on record'}</div></div></div>
    <div><div class="sec-h" style="margin-bottom:8px"><b style="font-size:17px">Payment history</b><span class="muted num" style="font-size:13px">${money(paidSum)} confirmed</span></div>
      ${hist.length ? `<div class="tablebox" style="max-height:340px"><table><thead><tr><th>For</th><th>Paid by</th><th class="r">Amount</th><th>Method</th><th>Receipt</th><th>EFRIS</th><th>Status</th></tr></thead><tbody>${hist.map(p => `<tr><td>${esc(p.purpose)}<div class="muted" style="font-size:12px">${date(p.created_at)}</div></td><td>${esc(p.paid_by)}</td><td class="r num">${money(p.amount + p.fee + p.deposit)}</td><td>${esc(p.payment_method)}</td><td class="mono">${esc(p.reference)}</td><td>${p.efris_document_no ? `<span class="mono">${esc(p.efris_document_no)}</span>` : '<span class="pill warn">Pending</span>'}</td><td>${pill(p.status)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No payments recorded for this unit yet.</p>'}</div></div>`;
}
function unitsView(data, p, adminMode) {
  const units = data.units.filter(u => u.listing_id === p.id).sort((a, b) => a.floor - b.floor || a.unit_code.localeCompare(b.unit_code, undefined, { numeric: true }));
  const floors = [...new Set(units.map(u => u.floor))].sort((a, b) => a - b);
  if (ui.floor === null || !floors.includes(ui.floor)) ui.floor = floors[0] ?? 0;
  const n = k => units.filter(u => u.status === k).length, open = data.maintenance.filter(m => m.listing_id === p.id && m.status === 'open').length;
  const sel = units.find(u => u.id === ui.unit), shown = units.filter(u => u.floor === ui.floor);
  return `<section class="sec">${head(p.name, 'Units')}${adminMode ? '' : propChips(data)}
    ${open ? `<div class="alertbar" role="alert"><span class="bell ring">${icn('bell')}</span><div><b>${open} maintenance ${open === 1 ? 'complaint needs' : 'complaints need'} attention</b><div style="font-size:13px">Look for the red bell on a unit and tap it.</div></div></div>` : ''}
    <p class="muted" style="max-width:62ch">Tap a unit to see who lives there and change its status.</p>
    <div class="legend"><span><i style="background:var(--ok-soft);border-color:var(--ok)"></i>Occupied ${n('occupied')}</span><span><i style="background:var(--warn-soft);border-color:var(--warn)"></i>Reserved ${n('reserved')}</span><span><i style="border-style:dashed"></i>Vacant ${n('vacant')}</span><span><i style="background:var(--bad-soft);border-color:var(--bad)"></i>Maintenance ${n('maint')}</span></div>
    ${floors.length > 1 ? `<div class="fchips" role="tablist" aria-label="Floors">${floors.map(f => `<button class="fchip" role="tab" data-p-floor="${f}" aria-pressed="${f === ui.floor}">${f === 0 ? 'Ground' : floorName(f).replace(' floor', '')}</button>`).join('')}</div>` : ''}
    ${units.length ? `<div class="floorlbl-row"><b class="floorlbl">${floorName(ui.floor)}</b><span class="muted" style="font-size:13px">${shown.length} rooms</span></div><div class="units flr">${shown.map(u => unitTile(u, data)).join('')}</div>` : '<div class="card"><p class="muted">No rooms yet. Add the first room below.</p></div>'}
    ${sel ? unitDetail(sel, data) : units.length ? '<div class="card"><p class="muted">Select a unit to see the tenant, their payment history and any repair requests.</p></div>' : ''}
    <form class="card stack" data-live-form="unit"><div><span class="eyebrow">Add a room</span><h3>New unit</h3></div><input type="hidden" name="listing_id" value="${esc(p.id)}"><div class="grid">${field('Room code', 'unit_code')}${field('Floor', 'floor', 'number', 'value="0" min="0"')}${field('Monthly rent (UGX)', 'rent', 'number', 'min="1"')}</div><button class="btn" type="submit">Add room</button></form></section>`;
}
const ownerUnits = (data) => { const p = currentProp(data); return p ? unitsView(data, p, false) : noProps(); };

/* ---------- OWNER: payments (students, bills, tax) ---------- */
function paymentsTable(data, lid, withActions) {
  const list = data.payments.filter(p => !lid || p.listing_id === lid);
  return table(['Reference', 'Tenant', 'Room', 'For', 'Total', 'Method', 'Status', withActions ? 'Review' : 'Receipt'], list.map(p => `<tr><td class="mono">${esc(p.reference)}</td><td>${esc(p.tenant_name)}</td><td class="mono">${esc(p.room_code)}</td><td>${esc(p.purpose)}</td><td class="num">${money(p.amount + p.fee + p.deposit)}</td><td>${esc(p.payment_method)}</td><td>${pill(p.status)}</td><td>${p.status === 'pending' && withActions ? `<div class="row" style="flex-wrap:nowrap"><button class="btn sm" data-live-payment="${esc(p.id)}:confirmed">Confirm</button><button class="btn ghost sm" data-live-payment="${esc(p.id)}:rejected">Reject</button></div>` : p.status === 'confirmed' ? `<span class="mono">${esc(p.efris_document_no || 'EFRIS pending')}</span>` : '-'}</td></tr>`), 'No payments yet. Payment requests from tenants appear here.');
}
function billsBlock(data, p) {
  const bills = data.bills.filter(b => b.listing_id === p.id);
  return `<section class="sec"><h3 style="font-size:22px">Bills and running costs</h3>${table(['Bill', 'Category', 'Amount', 'Due', 'Status'], bills.map(b => `<tr><td><b>${esc(b.name)}</b></td><td>${esc(b.category)}</td><td class="num">${money(b.amount)}</td><td>${date(b.due_date)}</td><td><select class="inp" style="width:auto" data-live-bill="${esc(b.id)}" aria-label="Bill status">${options(['due', 'paid'], b.status)}</select></td></tr>`), 'No bills recorded yet.')}
    <form class="card stack" data-live-form="bill"><div><span class="eyebrow">Record a bill</span><h3>Add a bill</h3></div><input type="hidden" name="listing_id" value="${esc(p.id)}"><div class="grid"><label class="field"><span>Category</span><select class="inp" name="category">${options(['water', 'power', 'tv', 'staff', 'other'], 'water')}</select></label>${field('Provider or worker', 'name')}${field('Amount (UGX)', 'amount', 'number', 'min="1"')}${field('Due date', 'due_date', 'date')}</div><button class="btn" type="submit">Save bill</button></form></section>`;
}
function taxBlock(data, p) {
  const confirmed = data.payments.filter(x => x.listing_id === p.id && x.status === 'confirmed'), revenue = sum(confirmed.map(x => x.amount)), recorded = confirmed.filter(x => x.efris_document_no).length;
  return `<section class="sec"><h3 style="font-size:22px">Tax and receipt records</h3><p class="notice">Rentpply does not connect to URA EFRIS yet. Record the receipt reference after it has been issued through the official EFRIS service.</p>
    <div class="tgrid"><div class="card tile2"><span class="muted">Confirmed rent</span><b class="num">${money(revenue)}</b></div><div class="card tile2"><span class="muted">Confirmed payments</span><b class="num">${confirmed.length}</b></div><div class="card tile2"><span class="muted">Receipts recorded</span><b class="num">${recorded} of ${confirmed.length}</b></div></div>
    ${table(['Payment', 'Tenant', 'Rent amount', 'Confirmed', 'Receipt reference'], confirmed.map(x => `<tr><td class="mono">${esc(x.reference)}</td><td>${esc(x.tenant_name)}</td><td class="num">${money(x.amount)}</td><td>${date(x.confirmed_at || x.created_at)}</td><td>${x.efris_document_no ? `<span class="mono">${esc(x.efris_document_no)}</span>` : `<form class="row" data-live-form="efris-reference" data-payment-id="${esc(x.id)}" style="flex-wrap:nowrap"><input class="inp" name="efris_document_no" placeholder="EFRIS number" required style="min-width:150px"><button class="btn sm" type="submit">Save</button></form>`}</td></tr>`), 'No confirmed payments yet.')}</section>`;
}
function ownerPayments(data) {
  const p = currentProp(data); if (!p) return noProps();
  const pays = data.payments.filter(x => x.listing_id === p.id), pending = pays.filter(x => x.status === 'pending').length, owing = sum(data.bills.filter(b => b.listing_id === p.id && b.status !== 'paid').map(b => b.amount)), confirmed = pays.filter(x => x.status === 'confirmed');
  const tabs = [['students', 'Payments', 'users', pending ? `${pending} to confirm` : `${mil(sum(confirmed.map(x => x.amount)))} in`], ['bills', 'Bills', 'bolt', owing ? `${mil(owing)} to pay` : 'All paid'], ['tax', 'Tax', 'flag', `${confirmed.filter(x => x.efris_document_no).length} of ${confirmed.length} receipts`]];
  const body = ui.pay === 'bills' ? billsBlock(data, p) : ui.pay === 'tax' ? taxBlock(data, p) : `<section class="sec">${head('Tenant payments', 'Payments')}${paymentsTable(data, p.id, true)}</section>`;
  return `<section class="sec" style="padding-bottom:0">${head(p.name, 'Payments')}${propChips(data)}<div class="paytabs" role="group" aria-label="Payment sections">${tabs.map(t => `<button class="ptab" data-p-paytab="${t[0]}" aria-pressed="${ui.pay === t[0]}">${icn(t[2])}<b>${t[1]}</b><small>${t[3]}</small></button>`).join('')}</div></section>${body}`;
}
const ownerTax = data => { const p = currentProp(data); return p ? `<section class="sec" style="padding-bottom:0">${head(p.name, 'Tax records')}${propChips(data)}</section>${taxBlock(data, p)}` : noProps(); };

/* ---------- OWNER: agreements and requests ---------- */
function ownerAgreements(data) {
  const p = currentProp(data); if (!p) return noProps();
  const list = data.agreements.filter(a => a.listing_id === p.id), tone = { accepted: 'ok', sent: 'warn', draft: 'mute' };
  return `<section class="sec">${head(p.name, 'Agreements')}${propChips(data)}${table(['Reference', 'Tenant', 'Room', 'Stay', 'Start', 'Status'], list.map(a => `<tr><td class="mono">${esc(a.reference)}</td><td>${esc(a.tenant_name)}</td><td class="mono">${esc(a.room_code)}</td><td>${a.quantity}</td><td>${date(a.start_date)}</td><td><span class="pill ${tone[a.status] || 'mute'}">${esc(a.status)}</span></td></tr>`), 'Agreements appear here when tenants accept them.')}</section>`;
}
function requestCards(data, lid) {
  const reqs = data.ownerRequests.filter(r => r.listing_id === lid && r.kind !== 'Rent transfer'), mt = data.maintenance.filter(m => m.listing_id === lid);
  const trs = data.transferRequests.filter(r => data.transfers.some(t => t.id === r.transfer_id && t.listing_id === lid));
  return `<div class="stack">${reqs.map(r => `<div class="card stack" style="gap:8px"><div class="row" style="justify-content:space-between"><span class="pill mute">${esc(r.kind)}</span>${r.status !== 'open' ? pill(r.status) : ''}</div><b style="font-size:17px">${esc(r.requester_name)}</b><p class="muted">${esc(r.details)}</p>${r.status === 'open' ? `<div class="row"><button class="btn sm" data-live-owner-request="${esc(r.id)}:approved">Approve</button><button class="btn ghost sm" data-live-owner-request="${esc(r.id)}:declined">Decline</button></div>` : ''}</div>`).join('')}
    ${trs.map(r => { const t = data.transfers.find(x => x.id === r.transfer_id); return `<div class="card stack" style="gap:8px"><div class="row" style="justify-content:space-between"><span class="pill mute">Rent transfer</span>${r.status !== 'pending' ? pill(r.status) : ''}</div><b style="font-size:17px">${esc(r.requester?.full_name || 'Tenant')}</b><p class="muted">Wants room ${esc(t?.room_code || '')} at ${money(t?.price_per_month)} a month from ${date(t?.available_from)}.</p>${r.status === 'pending' ? `<div class="row"><button class="btn sm" data-live-transfer-request="${esc(r.id)}:1">Approve</button><button class="btn ghost sm" data-live-transfer-request="${esc(r.id)}:0">Decline</button></div>` : ''}</div>`; }).join('')}
    ${mt.map(m => `<div class="card row" style="justify-content:space-between;flex-wrap:wrap;gap:10px"><span style="min-width:0"><span class="pill mute">Repair</span> <b>${esc(m.type)}${m.urgent ? ' · urgent' : ''}</b><small class="muted" style="display:block">Room ${esc(m.room_code)} · ${esc(m.tenant_name)} · ${esc(m.note)}</small></span><select class="inp" style="width:auto" data-live-maint="${esc(m.id)}" aria-label="Repair status">${options(['open', 'working', 'done'], m.status)}</select></div>`).join('')}
    ${!reqs.length && !trs.length && !mt.length ? '<div class="card"><p class="muted">Nothing needs your approval right now.</p></div>' : ''}</div>`;
}
const ownerRequests = data => { const p = currentProp(data); return p ? `<section class="sec">${head('Your approval needed', 'Requests')}${propChips(data)}${requestCards(data, p.id)}</section>` : noProps(); };

function ownerView(tab, data, profile) {
  if (tab === 'units') return ownerUnits(data);
  if (tab === 'payments') return ownerPayments(data);
  if (tab === 'tax') return ownerTax(data);
  if (tab === 'requests') return ownerRequests(data);
  if (tab === 'terms') return ownerAgreements(data);
  return ownerOverview(data, profile);
}

/* ---------- ADMIN ---------- */
function newPropertyForm(data) {
  const owners = data.profiles.filter(x => x.role === 'owner');
  return `<form class="card stack" data-live-form="listing"><div><span class="eyebrow">Step 1</span><h3>Add a property</h3><p class="muted">It stays unverified, and hidden from tenants, until you verify it.</p></div>
    <label class="field"><span>Owner</span><select class="inp" name="owner_id" required>${owners.map(x => `<option value="${esc(x.id)}">${esc(x.full_name)}</option>`).join('')}</select></label>
    ${field('Property name', 'name')}<div class="grid">${field('Area', 'area')}${field('Price (UGX)', 'price', 'number', 'min="1"')}</div>
    <div class="grid"><label class="field"><span>Type</span><select class="inp" name="type">${options(['hostel', 'rental', 'airbnb'], 'hostel')}</select></label>${field('Room type', 'unit_type')}</div>
    <label class="field"><span>Description</span><textarea class="inp" name="description" rows="3" required></textarea></label>
    <label class="field"><span>Amenities (comma separated)</span><input class="inp" name="amenities" placeholder="Wi-Fi, 24h security, Water tank"></label><button class="btn" type="submit">Add property</button></form>`;
}
function verifyHub(data) {
  const pending = data.listings.filter(l => !l.verified), reviews = data.profiles.filter(x => x.kyc_status === 'review'), q = data.queue;
  return `<div class="stack"><h3 style="font-size:22px">Properties waiting for verification</h3>${pending.length ? pending.map(l => `<article class="card row" style="justify-content:space-between"><span><b>${esc(l.name)}</b><small class="muted">${esc(l.area)} · ${esc(l.owner_name)} · ${esc(TYPE[l.type] || l.type)}</small></span><div class="row"><button class="btn sm" data-live-verify="${esc(l.id)}">Verify</button><button class="btn ghost sm" data-live-delete-listing="${esc(l.id)}">Reject</button></div></article>`).join('') : '<div class="card"><p class="muted">Every property is verified.</p></div>'}
    <h3 style="font-size:22px;margin-top:8px">Identity reviews</h3>${reviews.length ? reviews.map(x => `<article class="card stack"><div class="row" style="justify-content:space-between"><span><b>${esc(x.full_name)}</b><small class="muted mono" style="display:block;word-break:break-all">${esc(x.id)}</small></span>${pill('In review', 'warn')}</div><div class="row"><button class="btn ghost sm" data-live-kyc-doc="${esc(x.id_document_url || '')}">View ID</button><button class="btn ghost sm" data-live-kyc-doc="${esc(x.selfie_url || '')}">View selfie</button><button class="btn sm" data-live-kyc="${esc(x.id)}:verified">Verify</button><button class="btn ghost sm" data-live-kyc="${esc(x.id)}:none">Request resubmission</button></div></article>`).join('') : '<div class="card"><p class="muted">No identity checks waiting.</p></div>'}
    <h3 style="font-size:22px;margin-top:8px">Queue items</h3>${table(['Type', 'Subject', 'Details', 'Status'], q.map(x => `<tr><td>${esc(x.kind)}</td><td><b>${esc(x.subject_name)}</b></td><td>${esc(x.details)}</td><td><select class="inp" style="width:auto" data-live-queue="${esc(x.id)}" aria-label="Queue status">${options(['open', 'resolved', 'dismissed'], x.status)}</select></td></tr>`), 'The queue is empty.')}</div>`;
}
function activityHub(data) {
  const trs = data.transferRequests.filter(r => r.status === 'pending');
  return `<div class="stack"><h3 style="font-size:22px">Payments</h3>${paymentsTable(data, null, true)}
    <h3 style="font-size:22px;margin-top:8px">Repair requests</h3>${table(['Property', 'Room', 'Issue', 'Status'], data.maintenance.map(m => `<tr><td>${esc(data.listings.find(l => l.id === m.listing_id)?.name || '')}</td><td class="mono">${esc(m.room_code)}</td><td>${esc(m.type)} · ${esc(m.note)}</td><td><select class="inp" style="width:auto" data-live-maint="${esc(m.id)}" aria-label="Repair status">${options(['open', 'working', 'done'], m.status)}</select></td></tr>`), 'No repair requests.')}
    <h3 style="font-size:22px;margin-top:8px">Rent-transfer approvals</h3>${table(['Requester', 'Room', 'Status', 'Decision'], data.transferRequests.map(r => { const t = data.transfers.find(x => x.id === r.transfer_id); return `<tr><td>${esc(r.requester?.full_name || 'Tenant')}</td><td class="mono">${esc(t?.room_code || '')}</td><td>${pill(r.status)}</td><td>${r.status === 'pending' ? `<div class="row" style="flex-wrap:nowrap"><button class="btn sm" data-live-transfer-request="${esc(r.id)}:1">Approve</button><button class="btn ghost sm" data-live-transfer-request="${esc(r.id)}:0">Decline</button></div>` : '-'}</td></tr>`; }), 'No transfer requests.')}${trs.length ? '' : ''}</div>`;
}
function accountsHub(data) {
  return `<div class="stack"><h3 style="font-size:22px">Accounts</h3>${table(['Name', 'Role', 'Identity', 'Joined'], data.profiles.map(x => `<tr><td><b>${esc(x.full_name)}</b><div class="muted mono" style="font-size:11px">${esc(x.id.slice(0, 8))}</div></td><td><select class="inp" style="width:auto" data-live-role="${esc(x.id)}" aria-label="Role for ${esc(x.full_name)}">${options(['tenant', 'student', 'owner', 'admin'], x.role)}</select></td><td>${pill(x.kyc_status, x.kyc_status === 'verified' ? 'ok' : x.kyc_status === 'review' ? 'warn' : 'mute')}</td><td>${date(x.created_at)}</td></tr>`), 'No accounts yet.')}</div>`;
}
function adminQueue(data) {
  const pend = data.listings.filter(l => !l.verified).length, kyc = data.profiles.filter(x => x.kyc_status === 'review').length, openQ = data.queue.filter(x => x.status === 'open').length;
  const act = data.payments.filter(p => p.status === 'pending').length + data.maintenance.filter(m => m.status === 'open').length + data.transferRequests.filter(r => r.status === 'pending').length;
  const hubs = [['add', 'plus', 'Add property', 0], ['verify', 'shield', 'Verification', pend + kyc + openQ], ['activity', 'receipt', 'Activity', act], ['accounts', 'users', 'Accounts', 0]];
  const hub = ui.hub;
  return `<section class="sec">${head('Admin', 'Onboarding')}
    <div class="kgrid"><div class="card stat"><span class="eyebrow">Pending properties</span><b>${pend}</b><span class="muted">waiting for verification</span></div><div class="card stat"><span class="eyebrow">Identity reviews</span><b>${kyc}</b><span class="muted">waiting for a decision</span></div><div class="card stat"><span class="eyebrow">Open queue items</span><b>${openQ}</b><span class="muted">needing follow-up</span></div><div class="card stat"><span class="eyebrow">Accounts</span><b>${data.profiles.length}</b><span class="muted">on the platform</span></div></div>
    <div class="hubs" role="group" aria-label="Onboarding steps">${hubs.map(h => `<button class="hubb" data-p-hub="${h[0]}" aria-pressed="${hub === h[0]}">${icn(h[1])}<b>${h[2]}</b>${h[3] ? `<i class="hbadge">${h[3]}</i>` : ''}</button>`).join('')}</div>
    ${hub === 'add' ? newPropertyForm(data) : hub === 'verify' ? verifyHub(data) : hub === 'activity' ? activityHub(data) : accountsHub(data)}</section>`;
}
function adminUnits(data) {
  const p = currentProp(data, 'admProp'); if (!p) return propPicker(data, 'units', 'Units');
  return `<section class="sec" style="padding-bottom:0">${propBar(p)}</section>${unitsView(data, p, true)}`;
}
function adminProperty(data) {
  const p = currentProp(data, 'admProp'); if (!p) return propPicker(data, 'prop', 'Property');
  return `<section class="sec" style="padding-bottom:0">${propBar(p)}</section><section class="sec">${head('Property details', p.name, `<span class="pill ${p.verified ? 'ok' : 'warn'}">${p.verified ? 'Verified' : 'Pending'}</span>`)}
    <form class="card stack" data-live-form="edit-listing" data-listing-id="${esc(p.id)}"><div class="grid"><label class="field"><span>Property name</span><input class="inp" name="name" value="${esc(p.name)}" required></label><label class="field"><span>Area</span><input class="inp" name="area" value="${esc(p.area)}" required></label><label class="field"><span>Price (UGX)</span><input class="inp" name="price" type="number" min="1" value="${esc(p.price)}" required></label><label class="field"><span>Status</span><select class="inp" name="verified"><option value="true" ${p.verified ? 'selected' : ''}>Verified</option><option value="false" ${p.verified ? '' : 'selected'}>Pending</option></select></label></div>
      <label class="field"><span>Description</span><textarea class="inp" name="description" rows="4">${esc(p.description || '')}</textarea></label>
      <label class="field"><span>Amenities (comma separated)</span><input class="inp" name="amenities" value="${esc((p.amenities || []).join(', '))}"></label>
      <div class="row"><button class="btn" type="submit">Save changes</button><button class="btn ghost" type="button" data-live-delete-listing="${esc(p.id)}">Delete property</button></div></form></section>`;
}
function adminListings(data) {
  return `<section class="sec">${head(`${data.listings.length} properties`, 'Listings')}${table(['Property', 'Type', 'Area', 'Owner', 'Units free', 'Status', ''], data.listings.map(l => `<tr><td><b>${esc(l.name)}</b></td><td>${esc(TYPE[l.type] || l.type)}</td><td>${esc(l.area)}</td><td>${esc(l.owner_name)}</td><td class="num">${l.available_units} / ${l.total_units}</td><td><span class="pill ${l.verified ? 'ok' : 'warn'}">${l.verified ? 'Verified' : 'Pending'}</span></td><td><div class="row" style="flex-wrap:nowrap"><button class="btn ghost sm" data-p-adm-prop="${esc(l.id)}" data-p-adm-tab="units">Manage units</button><button class="btn ghost sm" data-p-adm-prop="${esc(l.id)}" data-p-adm-tab="prop">Edit</button></div></td></tr>`), 'No properties yet.')}</section>`;
}

/* ---------- ADMIN: analytics from live data ---------- */
function adminKpis(data) {
  const R = ui.range, day = R === 1, bk = buckets(R), per = day ? 'day' : 'month', span = day ? 'Last 30 days' : `Last ${R} months`;
  const typeOf = id => data.listings.find(l => l.id === id)?.type, conf = data.payments.filter(p => p.status === 'confirmed');
  const rev = bk.map(b => sum(conf.filter(p => inRange(when(p), b)).map(p => p.amount)));
  const fee = bk.map(b => sum(conf.filter(p => inRange(when(p), b)).map(p => p.fee)));
  const cnt = bk.map(b => conf.filter(p => inRange(when(p), b)).length);
  const byType = t => bk.map(b => conf.filter(p => inRange(when(p), b) && typeOf(p.listing_id) === t).length);
  const users = role => bk.map(b => data.profiles.filter(x => (role === 'owner' ? x.role === 'owner' : ['tenant', 'student'].includes(x.role)) && inRange(Date.parse(x.created_at), b)).length);
  const ten = users('tenant'), own = users('owner');
  const span2 = bk[bk.length - 1].end - bk[0].start, prevB = { start: bk[0].start - span2, end: bk[0].start };
  const prevRev = sum(conf.filter(p => inRange(when(p), prevB)).map(p => p.amount)), prevCnt = conf.filter(p => inRange(when(p), prevB)).length, prevUsers = data.profiles.filter(x => inRange(Date.parse(x.created_at), prevB)).length;
  const pctd = (a, b) => b ? Math.round((a - b) / b * 100) : (a ? 100 : 0), dl = (a, b) => { const d = pctd(a, b); return `<span class="dl ${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d)}%</span>`; };
  const verified = data.listings.filter(l => l.verified), units = data.units.filter(u => verified.some(l => l.id === u.listing_id)), occ = units.filter(u => u.status === 'occupied').length;
  const nu = sum(ten) + sum(own), reviews = data.listings.filter(l => !l.verified).length + data.profiles.filter(x => x.kyc_status === 'review').length;
  const occRows = verified.map(l => { const us = data.units.filter(u => u.listing_id === l.id); return [l.name, us.length ? Math.round(us.filter(u => u.status === 'occupied').length / us.length * 100) : 0]; }).sort((a, b) => b[1] - a[1]);
  const area = {}; data.units.filter(u => u.status === 'occupied').forEach(u => { const l = data.listings.find(x => x.id === u.listing_id); if (l) area[l.area] = (area[l.area] || 0) + u.rent / 1e6; });
  const areaRows = Object.entries(area).sort((a, b) => b[1] - a[1]).slice(0, 7).map(r => [r[0], +r[1].toFixed(1)]);
  const methods = {}; conf.filter(p => bk.some(b => inRange(when(p), b))).forEach(p => { methods[p.payment_method] = (methods[p.payment_method] || 0) + 1; });
  const parts = Object.entries(methods).sort((a, b) => b[1] - a[1]).map(([n, v], i) => ({ n, c: Math.min(4, i + 1), v }));
  const top = verified.map(l => { const us = data.units.filter(u => u.listing_id === l.id), o = us.filter(u => u.status === 'occupied'); return { l, occ: us.length ? Math.round(o.length / us.length * 100) : 0, rent: sum(o.map(u => u.rent)) }; }).sort((a, b) => b.rent - a.rent).slice(0, 6);
  const tiles = [['Gross rent value', 'UGX ' + mil(sum(rev)), dl(sum(rev), prevRev), rev], ['Rentpply fees', 'UGX ' + mil(sum(fee)), dl(sum(rev), prevRev), fee], ['Confirmed bookings', String(sum(cnt)), dl(sum(cnt), prevCnt), cnt], ['Occupancy', (units.length ? Math.round(occ / units.length * 100) : 0) + '%', `<span class="muted" style="font-size:12px">${occ} of ${units.length} units</span>`, []], ['New users', String(nu), dl(nu, prevUsers), bk.map((_, i) => ten[i] + own[i])], ['Awaiting review', String(reviews), `<span class="muted" style="font-size:12px">properties and IDs</span>`, []]];
  const cv = (title, sub, body) => `<div class="card cv"><div class="cvh"><div><b>${title}</b><small>${sub}</small></div></div>${body}</div>`;
  return `<section class="sec kpis">${head('Analytics', 'How Rentpply is doing', '<span class="pill ok">Live data</span>')}
    <div class="seg" role="group" aria-label="Time range"><button data-p-range="1" aria-pressed="${R === 1}">1 month</button><button data-p-range="6" aria-pressed="${R === 6}">6 months</button><button data-p-range="12" aria-pressed="${R === 12}">12 months</button></div>
    <div class="tgrid">${tiles.map(t => `<div class="card tile2"><span class="muted">${t[0]}</span><b class="num">${t[1]}</b><div class="trow">${t[2]}${spark(t[3].slice(-8))}</div></div>`).join('')}</div>
    ${cv('Gross rent value', `UGX millions per ${per}, confirmed payments`, lineChart(bk.map(b => b.label), rev, 'Gross rent value'))}
    ${cv('Bookings by property type', `Confirmed bookings per ${per}`, stackChart(bk.map(b => b.label), [{ n: 'Hostels', c: 1, v: byType('hostel') }, { n: 'Rentals', c: 2, v: byType('rental') }, { n: 'Airbnbs', c: 3, v: byType('airbnb') }], 'Bookings by type') + legend([{ n: 'Hostels', c: 1 }, { n: 'Rentals', c: 2 }, { n: 'Airbnbs', c: 3 }]))}
    ${cv('Occupancy by property', 'Live from unit data', hbars(occRows, v => v + '%', 3, 100))}
    ${cv('Monthly rent value by area', 'UGX millions from occupied units', hbars(areaRows, v => v + 'm', 1))}
    ${cv('How tenants pay', `Share of confirmed payments · ${span.toLowerCase()}`, donut(parts))}
    ${cv('New users', `Sign-ups per ${per}`, stackChart(bk.map(b => b.label), [{ n: 'Tenants and students', c: 1, v: ten }, { n: 'Owners', c: 4, v: own }], 'New users') + legend([{ n: 'Tenants and students', c: 1 }, { n: 'Owners', c: 4 }]))}
    ${cv('Top properties', 'By monthly rent value from occupied units', top.length ? `<div class="tbl"><div class="tr th"><span>Property</span><span>Occ.</span><span>Rent</span></div>${top.map(t => `<div class="tr"><span class="tn"><b>${esc(t.l.name)}</b><small>${esc(t.l.area)}</small></span><span>${t.occ}%</span><span>${mil(t.rent)}</span></div>`).join('')}</div>` : '<p class="muted">No verified properties yet.</p>')}
    ${cv('Trust and safety', 'Verification and payment checks', `<div class="tgrid" style="margin:0">${[['Properties verified', `${verified.length} of ${data.listings.length}`], ['Identities verified', `${data.profiles.filter(x => x.kyc_status === 'verified').length} of ${data.profiles.length}`], ['Payments not received', String(data.payments.filter(p => p.status === 'rejected').length)], ['Open queue items', String(data.queue.filter(x => x.status === 'open').length)]].map(x => `<div class="kmini"><span class="muted">${x[0]}</span><b class="num">${x[1]}</b></div>`).join('')}</div>`)}</section>`;
}
function adminView(tab, data) {
  if (tab === 'units') return adminUnits(data);
  if (tab === 'prop') return adminProperty(data);
  if (tab === 'listings') return adminListings(data);
  if (tab === 'kpis') return adminKpis(data);
  return adminQueue(data);
}

export function renderPortal(role, tab, data, profile) {
  if (!data) return '<section class="sec"><div class="card skeleton" style="height:120px"></div><div class="tgrid"><div class="card skeleton" style="height:90px"></div><div class="card skeleton" style="height:90px"></div><div class="card skeleton" style="height:90px"></div></div></section>';
  return role === 'admin' ? adminView(tab, data) : ownerView(tab, data, profile);
}

/* ---------- actions ---------- */
export async function handlePortalClick(target, refresh, ctx = {}) {
  const ui1 = (key, value, extra) => { ui[key] = value; if (extra) extra(); ctx.rerender && ctx.rerender(); return true; };
  let el;
  if ((el = target.closest('[data-p-prop]'))) return ui1('prop', el.dataset.pProp, () => { ui.unit = null; ui.floor = null; });
  if ((el = target.closest('[data-p-unit]'))) return ui1('unit', ui.unit === el.dataset.pUnit ? null : el.dataset.pUnit);
  if ((el = target.closest('[data-p-floor]'))) return ui1('floor', Number(el.dataset.pFloor), () => { ui.unit = null; });
  if ((el = target.closest('[data-p-paytab]'))) return ui1('pay', el.dataset.pPaytab);
  if ((el = target.closest('[data-p-range]'))) return ui1('range', Number(el.dataset.pRange));
  if ((el = target.closest('[data-p-hub]'))) return ui1('hub', el.dataset.pHub);
  if ((el = target.closest('[data-p-adm-prop]'))) { ui.admProp = el.dataset.pAdmProp; ui.unit = null; ui.floor = null; if (el.dataset.pAdmTab && ctx.setTab) { ctx.setTab(el.dataset.pAdmTab); return true; } ctx.rerender && ctx.rerender(); return true; }
  if (target.closest('[data-p-adm-back]')) { ui.admProp = null; ui.unit = null; ctx.rerender && ctx.rerender(); return true; }
  const verify = target.closest('[data-live-verify]'), kyc = target.closest('[data-live-kyc]'), kycDoc = target.closest('[data-live-kyc-doc]'), payment = target.closest('[data-live-payment]');
  const remove = target.closest('[data-live-delete-listing]'), transferRequest = target.closest('[data-live-transfer-request]'), ownerRequest = target.closest('[data-live-owner-request]'), setst = target.closest('[data-p-setst]');
  let result;
  if (verify) result = await supabase.from('listings').update({ verified: true, updated_at: new Date().toISOString() }).eq('id', verify.dataset.liveVerify);
  else if (kyc) {
    const [id, status] = kyc.dataset.liveKyc.split(':');
    result = await supabase.from('profiles').update({ kyc_status: status, updated_at: new Date().toISOString() }).eq('id', id);
  } else if (kycDoc) {
    if (!kycDoc.dataset.liveKycDoc) throw new Error('No document was uploaded for this item.');
    const { data, error } = await supabase.storage.from('kyc-documents').createSignedUrl(kycDoc.dataset.liveKycDoc, 600);
    if (error) throw error;
    window.open(data.signedUrl, '_blank', 'noopener');
    return true;
  } else if (payment) {
    const [id, status] = payment.dataset.livePayment.split(':');
    result = await supabase.rpc('resolve_payment', { payment_uuid: id, confirm_payment: status === 'confirmed' });
  } else if (transferRequest) {
    const [id, approve] = transferRequest.dataset.liveTransferRequest.split(':');
    result = await supabase.rpc('resolve_rent_transfer_request', { transfer_request_uuid: id, approve_request: approve === '1' });
  } else if (ownerRequest) {
    const [id, status] = ownerRequest.dataset.liveOwnerRequest.split(':');
    result = await supabase.from('owner_requests').update({ status, resolved_at: new Date().toISOString() }).eq('id', id);
  } else if (setst) {
    const [id, status] = setst.dataset.pSetst.split(':');
    result = await supabase.rpc('set_unit_status', { unit_uuid: id, desired_status: status });
  } else if (remove) {
    if (!window.confirm('Delete this property and everything attached to it? This cannot be undone.')) return true;
    result = await supabase.from('listings').delete().eq('id', remove.dataset.liveDeleteListing);
    ui.admProp = null;
  } else return false;
  if (result.error) throw result.error;
  await refresh();
  return true;
}

export async function handlePortalChange(target, refresh) {
  let result;
  if (target.matches('[data-live-role]')) result = await supabase.from('profiles').update({ role: target.value, updated_at: new Date().toISOString() }).eq('id', target.dataset.liveRole);
  else if (target.matches('[data-live-queue]')) result = await supabase.from('admin_queue').update({ status: target.value, resolved_at: target.value === 'open' ? null : new Date().toISOString() }).eq('id', target.dataset.liveQueue);
  else if (target.matches('[data-live-maint]')) result = await supabase.from('maintenance_requests').update({ status: target.value, updated_at: new Date().toISOString() }).eq('id', target.dataset.liveMaint);
  else if (target.matches('[data-live-bill]')) result = await supabase.from('bills').update({ status: target.value, paid_at: target.value === 'paid' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', target.dataset.liveBill);
  else return false;
  if (result.error) throw result.error;
  await refresh();
  return true;
}

/* live search in the admin property picker */
export function handlePortalInput(target) {
  if (target.id !== 'admq') return false;
  const q = target.value.trim().toLowerCase(); let shown = 0;
  document.querySelectorAll('#plist .prow').forEach(r => { const hit = !q || r.dataset.q.includes(q); r.hidden = !hit; if (hit) shown++; });
  const none = document.getElementById('pnone'); if (none) none.hidden = shown > 0;
  return true;
}

const amenityList = text => String(text || '').split(',').map(x => x.trim()).filter(Boolean);
export async function handlePortalSubmit(form, role, user, profile, data, refresh) {
  const values = Object.fromEntries(new FormData(form));
  let result;
  if (form.dataset.liveForm === 'listing') {
    const owner = data.profiles.find(item => item.id === values.owner_id);
    if (!owner) throw new Error('Choose an owner for this property.');
    result = await supabase.from('listings').insert({
      name: values.name.trim(), type: values.type, area: values.area.trim(), price: Number(values.price),
      per: values.type === 'airbnb' ? 'night' : 'month', unit_type: values.unit_type.trim(), description: values.description.trim(),
      amenities: amenityList(values.amenities), owner_id: owner.id, owner_name: owner.full_name,
      verified: false, total_units: 0, available_units: 0
    });
  } else if (form.dataset.liveForm === 'edit-listing') {
    const updates = { name: values.name.trim(), area: values.area.trim(), price: Number(values.price), updated_at: new Date().toISOString() };
    if (values.description !== undefined) updates.description = values.description.trim();
    if (values.amenities !== undefined) updates.amenities = amenityList(values.amenities);
    if (role === 'admin' && values.verified !== undefined) updates.verified = values.verified === 'true';
    result = await supabase.from('listings').update(updates).eq('id', form.dataset.listingId);
  } else if (form.dataset.liveForm === 'unit') {
    result = await supabase.rpc('create_listing_unit', { listing_uuid: values.listing_id, requested_code: values.unit_code.trim(), requested_floor: Number(values.floor) || 0, requested_rent: Number(values.rent) });
  } else if (form.dataset.liveForm === 'bill') {
    result = await supabase.from('bills').insert({ listing_id: values.listing_id, category: values.category, name: values.name.trim(), amount: Number(values.amount), due_date: values.due_date, status: 'due' });
  } else if (form.dataset.liveForm === 'efris-reference') {
    result = await supabase.from('payments').update({ efris_document_no: values.efris_document_no.trim() }).eq('id', form.dataset.paymentId).eq('status', 'confirmed');
  } else return false;
  if (result.error) throw result.error;
  form.reset();
  await refresh();
  return true;
}
