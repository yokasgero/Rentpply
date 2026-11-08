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
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z', doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6', search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3'
};
const icn = name => ic(ICON[name] || ICON.check);
const pill = (value, tone) => `<span class="pill ${tone || (['verified', 'confirmed', 'accepted', 'paid', 'done', 'approved'].includes(String(value).toLowerCase()) ? 'ok' : ['rejected', 'declined', 'overdue'].includes(String(value).toLowerCase()) ? 'bad' : 'warn')}">${esc(value)}</span>`;
const options = (values, selected) => values.map(v => { const [val, label] = Array.isArray(v) ? v : [v, v]; return `<option value="${esc(val)}" ${val === selected ? 'selected' : ''}>${esc(label)}</option>`; }).join('');
const MAINT = [['open', 'Open'], ['work', 'In progress'], ['done', 'Done']];
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
  const none = Promise.resolve({ data: [] });
  const requests = ids.length ? [
    supabase.from('units').select('*').in('listing_id', ids).order('unit_code'),
    supabase.from('payments').select('*').in('listing_id', ids).order('created_at', { ascending: false }),
    supabase.from('agreements').select('*').in('listing_id', ids).order('created_at', { ascending: false }),
    supabase.from('maintenance_requests').select('*').in('listing_id', ids).order('created_at', { ascending: false }),
    supabase.from('bills').select('*').in('listing_id', ids).order('due_date'),
    supabase.from('rent_transfers').select('*, bookings(reference, tenant_name, tenant_id)').in('listing_id', ids).order('created_at', { ascending: false }),
    supabase.from('owner_requests').select('*').in('listing_id', ids).order('created_at', { ascending: false }),
    supabase.from('board_entries').select('*').in('listing_id', ids).order('created_at', { ascending: false }),
    supabase.from('property_layouts').select('*').in('listing_id', ids),
    supabase.from('listing_media').select('*').in('listing_id', ids).order('sort_order'),
    supabase.from('listing_locations').select('*').in('listing_id', ids),
    supabase.from('agreement_templates').select('*').in('listing_id', ids),
    supabase.rpc('payment_tenant_checks', { listing_ids: ids })
  ] : [];
  const [detail, profileResult, queueResult, notificationsResult, loginsResult] = await Promise.all([
    Promise.all(requests),
    role === 'admin' ? supabase.from('profiles').select('*').order('created_at', { ascending: false }) : none,
    role === 'admin' ? supabase.from('admin_queue').select('*').order('created_at', { ascending: false }) : none,
    supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
    role === 'admin' ? supabase.from('owner_logins').select('*') : none
  ]);
  const at = i => detail[i]?.data || [];
  const transferIds = at(5).map(item => item.id), entryIds = at(7).map(item => item.id);
  const [transferRequestsResult, boardPaymentsResult] = await Promise.all([
    transferIds.length ? supabase.from('rent_transfer_requests').select('*, requester:profiles!rent_transfer_requests_requester_id_fkey(full_name)').in('transfer_id', transferIds).order('created_at', { ascending: false }) : none,
    entryIds.length ? supabase.from('board_payments').select('*').in('entry_id', entryIds).order('paid_at') : none
  ]);
  const failure = detail.find(result => result.error) || profileResult.error || queueResult.error || notificationsResult.error || transferRequestsResult.error || boardPaymentsResult.error || loginsResult.error;
  if (failure) throw failure.error || failure;
  return {
    listings: (properties || []).slice().sort((x, y) => (Number(y.verified) - Number(x.verified)) || x.name.localeCompare(y.name)),
    units: at(0), payments: at(1), agreements: at(2), maintenance: at(3), bills: at(4), transfers: at(5), ownerRequests: at(6),
    board: at(7), layouts: at(8), media: at(9), locations: at(10), templates: at(11),
    kyc: Object.fromEntries(at(12).map(x => [x.tenant_id, x.kyc_status])),
    boardPayments: boardPaymentsResult.data || [], transferRequests: transferRequestsResult.data || [], notifications: notificationsResult.data || [],
    profiles: profileResult.data || [], queue: queueResult.data || [], logins: loginsResult.data || []
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
  const W = 340, H = 190, pl = 30, pr = 6, pt = 10, pb = 22, n = labels.length, tot = labels.map((_, i) => sum(series.map(s => s.v[i]))), max = Math.ceil(Math.max(4, ...tot) / 4) * 4, bw = (W - pl - pr) / n, bar = Math.min(18, bw - 5), Y = v => (H - pt - pb) * v / max, step = Math.ceil(n / 6);
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
  const mt = data.maintenance.filter(m => inP(m) && m.status === 'open').length, rq = data.ownerRequests.filter(r => inP(r) && r.status === 'open').length + data.transferRequests.filter(r => r.status === 'pending' && data.transfers.some(t => t.id === r.transfer_id && inP(t))).length;
  const od = data.units.filter(u => inP(u) && u.payment_status === 'overdue').length, dr = data.payments.filter(p => inP(p) && p.status === 'pending').length;
  const rows = [[mt, 'bell', 'bad', `${mt} repair ${mt === 1 ? 'complaint' : 'complaints'}`, 'A tenant needs you to attend', 'units'], [rq, 'list', 'warn', `${rq} ${rq === 1 ? 'request' : 'requests'} to approve`, 'New tenants, transfers, roommates and viewings', 'requests'], [od, 'flag', 'bad', `${od} overdue ${od === 1 ? 'tenant' : 'tenants'}`, 'See who owes rent', 'payments']].filter(r => r[0] > 0);
  const pay = dr ? `<button class="needrow" data-tab="payments"><span class="ric warn">${icn('receipt')}</span><span style="min-width:0;text-align:left"><b>Pending payment approval (${dr})</b><small class="muted" style="display:block">${dr} ${dr === 1 ? 'tenant has' : 'tenants have'} paid and ${dr === 1 ? 'is' : 'are'} waiting for you to confirm</small></span>${ic(ICON.arrow, 'i" style="margin-left:auto;flex:none')}</button>`
    : `<button class="needrow quiet" data-tab="payments"><span class="ric mute">${icn('receipt')}</span><span style="min-width:0;text-align:left"><b>Pending payment approval</b><small class="muted" style="display:block">No payments waiting</small></span>${ic(ICON.arrow, 'i" style="margin-left:auto;flex:none')}</button>`;
  return `<div class="card stack needs" style="gap:2px;padding:8px"><span class="eyebrow" style="padding:8px 10px 2px">Needs you today</span>${rows.map(r => `<button class="needrow" data-tab="${r[5]}"><span class="ric ${r[2]}">${icn(r[1])}</span><span style="min-width:0;text-align:left"><b>${r[3]}</b><small class="muted" style="display:block">${r[4]}</small></span>${ic(ICON.arrow, 'i" style="margin-left:auto;flex:none')}</button>`).join('')}${pay}</div>`;
}
/* ---------- OWNER: overview ---------- */
function ownerOverview(data, profile) {
  const p = currentProp(data); if (!p) return noProps();
  const units = data.units.filter(u => u.listing_id === p.id), pays = data.payments.filter(x => x.listing_id === p.id && x.status === 'confirmed');
  const bk = buckets(6), series = bk.map(b => sum(pays.filter(x => inRange(when(x), b)).map(x => x.amount)));
  const occ = units.filter(u => u.status === 'occupied').length, late = units.filter(u => u.payment_status && u.payment_status !== 'paid' && u.status !== 'vacant' && u.status !== 'maint');
  const owed = sum(units.map(u => u.balance)), free = units.filter(u => u.status === 'vacant' || u.status === 'reserved').length;
  const admin = profile.role === 'admin';
  return `<section class="sec">${head(admin ? 'Admin view · property owner' : 'Property owner', p.name, `<span class="pill ${p.verified ? 'ok' : 'warn'}">${icn('shield')}${p.verified ? 'Verified' : 'Pending check'}</span>`)}${propChips(data)}
    ${needsYou(data, p.id)}${boardStrip(data, p.id)}
    <div class="kgrid">
      <div class="card stat"><span class="eyebrow">Occupancy</span><b>${units.length ? Math.round(occ / units.length * 100) : 0}%</b><span class="muted">${occ} of ${units.length} units</span></div>
      <div class="card stat"><span class="eyebrow">Collected in ${MN[new Date().getMonth()]}</span><b class="num">${mil(series[series.length - 1])}</b><span class="muted">UGX, from confirmed payments</span></div>
      <div class="card stat"><span class="eyebrow">Still to collect</span><b class="num" style="color:${owed ? 'var(--bad)' : 'var(--ok)'}">${mil(owed)}</b><span class="muted">${late.length} ${late.length === 1 ? 'tenant' : 'tenants'}</span></div>
      <div class="card stat"><span class="eyebrow">Vacant or reserved</span><b>${free}</b><span class="muted">ready for new bookings</span></div>
    </div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))">
      <div class="card stack" style="gap:8px"><span class="eyebrow">Rent collected per month, UGX millions</span><div class="scroll-x">${barChart(bk.map(b => b.label), series, 'Rent collected per month')}</div>${sum(series) ? '' : '<p class="muted" style="font-size:13px">No confirmed payments in the last 6 months yet.</p>'}</div>
      <div class="card stack" style="gap:10px"><span class="eyebrow">Needs a reminder</span>${late.length ? late.map(u => `<div class="row" style="justify-content:space-between;flex-wrap:nowrap"><div style="min-width:0"><b>${esc(u.tenant_name || 'Tenant')}</b><div class="muted" style="font-size:13px"><span class="mono">${esc(u.unit_code)}</span> · ${u.payment_status === 'overdue' ? 'overdue' : 'due'}${u.paid_through ? ' since ' + date(u.paid_through) : ''}</div></div><b class="num" style="color:var(--bad)">${money(u.balance)}</b></div>`).join('') : '<p class="muted">Everyone is paid up.</p>'}</div>
    </div>${admin ? '' : mediaEditor(data, p, false)}</section>`;
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
  const maint = mt.length ? `<div class="stack" style="gap:8px"><b>Repair requests</b>${mt.map(m => `<div class="card row" style="justify-content:space-between;flex-wrap:wrap;gap:10px;background:var(--surface-2);border:0"><span style="min-width:0"><b>${esc(m.type)}${m.urgent ? ' · urgent' : ''}</b><small class="muted" style="display:block">${esc(m.note)}</small></span><select class="inp" style="width:auto" data-live-maint="${esc(m.id)}" aria-label="Repair status">${options(MAINT, m.status)}</select></div>`).join('')}</div>` : '';
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
  const units = data.units.filter(u => u.listing_id === p.id).sort(byCode);
  const floors = [...new Set([...units.map(u => u.floor), ...data.layouts.filter(x => x.listing_id === p.id).map(x => x.floor)])].sort((a, b) => a - b);
  if (ui.floor === null || !floors.includes(ui.floor)) ui.floor = floors[0] ?? 0;
  const n = k => units.filter(u => u.status === k).length, open = data.maintenance.filter(m => m.listing_id === p.id && m.status === 'open').length;
  const sel = units.find(u => u.id === ui.unit);
  const page = f => {
    const us = units.filter(u => u.floor === f), lay = layoutOf(data, p.id, f), cols = lay ? lay.columns : 3, slots = lay ? Math.max(0, lay.columns * lay.rows - us.length) : 0;
    return `<div class="fpage" data-fp="${f}"><div class="floorlbl-row"><b class="floorlbl">${floorName(f)}</b><span class="muted" style="font-size:13px">${us.length} rooms${slots ? ` · ${slots} empty ${slots === 1 ? 'position' : 'positions'}` : ''}</span></div>
      <div class="units flr" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${us.map(u => unitTile(u, data)).join('')}${'<div class="unit empty" aria-hidden="true"><small>Empty</small></div>'.repeat(slots)}</div></div>`;
  };
  return `<section class="sec">${head(p.name, 'Units')}${adminMode ? '' : propChips(data)}
    ${open ? `<div class="alertbar" role="alert"><span class="bell ring">${icn('bell')}</span><div><b>${open} maintenance ${open === 1 ? 'complaint needs' : 'complaints need'} attention</b><div style="font-size:13px">Look for the red bell on a unit and tap it.</div></div></div>` : ''}
    <p class="muted" style="max-width:62ch">Tap a room to see who lives there. Press and hold a room to change its status.</p>
    <div class="legend"><span><i style="background:var(--ok-soft);border-color:var(--ok)"></i>Occupied ${n('occupied')}</span><span><i style="background:var(--warn-soft);border-color:var(--warn)"></i>Reserved ${n('reserved')}</span><span><i style="border-style:dashed"></i>Vacant ${n('vacant')}</span><span><i style="background:var(--bad-soft);border-color:var(--bad)"></i>Maintenance ${n('maint')}</span></div>
    ${floors.length > 1 ? `<div class="fchips" role="tablist" aria-label="Floors">${floors.map(f => `<button class="fchip" role="tab" data-p-floor="${f}" aria-pressed="${f === ui.floor}">${f === 0 ? 'Ground' : floorName(f).replace(' floor', '')}</button>`).join('')}<span class="muted fhint">Swipe for the next floor</span></div>` : ''}
    ${floors.length ? `<div class="fpager" id="fpager">${floors.map(page).join('')}</div>` : '<div class="card"><p class="muted">No rooms yet.</p></div>'}
    ${sel ? unitDetail(sel, data) : units.length ? '<div class="card"><p class="muted">Select a room to see the tenant, what they pay, their payment history and any repair requests.</p></div>' : ''}
    ${adminMode ? `<form class="card stack" data-live-form="unit"><div><span class="eyebrow">Add a single room</span><h3>New room</h3></div><input type="hidden" name="listing_id" value="${esc(p.id)}"><div class="grid">${field('Room code', 'unit_code')}${field('Floor', 'floor', 'number', `value="${ui.floor ?? 0}" min="0"`)}${field('Monthly rent (UGX)', 'rent', 'number', `min="1" value="${p.price}"`)}</div><button class="btn" type="submit">Add room</button></form>` : ''}</section>`;
}

const ownerUnits = (data) => { const p = currentProp(data); return p ? unitsView(data, p, false) : noProps(); };

/* ---------- OWNER: payments (students, bills, tax) ---------- */
function paymentsTable(data, lid, withActions) {
  const list = data.payments.filter(p => !lid || p.listing_id === lid);
  return table(['Reference', 'Tenant', 'Room', 'For', 'Total', 'Method', 'Status', withActions ? 'Review' : 'Receipt'], list.map(p => `<tr><td class="mono">${esc(p.reference)}</td><td>${esc(p.tenant_name)}${kycBadge(data, p.tenant_id)}</td><td class="mono">${esc(p.room_code === 'Unassigned' ? 'To be assigned' : p.room_code)}</td><td>${esc(p.purpose)}</td><td class="num">${money(p.amount + p.fee + p.deposit)}</td><td>${esc(p.payment_method)}</td><td>${pill(p.status)}</td><td>${p.status === 'pending' && withActions ? `<div class="row" style="flex-wrap:nowrap"><button class="btn sm" data-live-payment="${esc(p.id)}:confirmed">Confirm</button><button class="btn ghost sm" data-live-payment="${esc(p.id)}:rejected">Reject</button></div>` : p.status === 'confirmed' ? `<span class="mono">${esc(p.efris_document_no || 'EFRIS pending')}</span>` : '-'}</td></tr>`), 'No payments yet. Payment requests from tenants appear here.');
}

function billsBlock(data, p) {
  const bills = data.bills.filter(b => b.listing_id === p.id);
  return `<section class="sec"><h3 style="font-size:22px">Bills and running costs</h3>${table(['Bill', 'Category', 'Amount', 'Due', 'Status'], bills.map(b => `<tr><td><b>${esc(b.name)}</b></td><td>${esc(b.category)}</td><td class="num">${money(b.amount)}</td><td>${date(b.due_date)}</td><td><select class="inp" style="width:auto" data-live-bill="${esc(b.id)}" aria-label="Bill status">${options(['due', 'paid', 'overdue'], b.status)}</select></td></tr>`), 'No bills recorded yet.')}
    <form class="card stack" data-live-form="bill"><div><span class="eyebrow">Record a bill</span><h3>Add a bill</h3></div><input type="hidden" name="listing_id" value="${esc(p.id)}"><div class="grid"><label class="field"><span>Category</span><select class="inp" name="category">${options(['water', 'power', 'tv', 'staff'], 'water')}</select></label>${field('Provider or worker', 'name')}${field('Amount (UGX)', 'amount', 'number', 'min="1"')}${field('Due date', 'due_date', 'date')}</div><button class="btn" type="submit">Save bill</button></form></section>`;
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
/* ---------- OWNER: agreements and requests ---------- */
function requestCards(data, lid) {
  const reqs = data.ownerRequests.filter(r => r.listing_id === lid && r.kind !== 'Rent transfer'), mt = data.maintenance.filter(m => m.listing_id === lid);
  const trs = data.transferRequests.filter(r => data.transfers.some(t => t.id === r.transfer_id && t.listing_id === lid));
  return `<div class="stack">${reqs.map(r => `<div class="card stack" style="gap:8px"><div class="row" style="justify-content:space-between"><span class="pill mute">${esc(r.kind)}</span>${r.status !== 'open' ? pill(r.status) : ''}</div><b style="font-size:17px">${esc(r.requester_name)}</b><p class="muted">${esc(r.details)}</p>${r.status === 'open' ? `<div class="row"><button class="btn sm" data-live-owner-request="${esc(r.id)}:approved">Approve</button><button class="btn ghost sm" data-live-owner-request="${esc(r.id)}:declined">Decline</button></div>` : ''}</div>`).join('')}
    ${trs.map(r => { const t = data.transfers.find(x => x.id === r.transfer_id); return `<div class="card stack" style="gap:8px"><div class="row" style="justify-content:space-between"><span class="pill mute">Rent transfer</span>${r.status !== 'pending' ? pill(r.status) : ''}</div><b style="font-size:17px">${esc(r.requester?.full_name || 'Tenant')}</b><p class="muted">Wants room ${esc(t?.room_code || '')} at ${money(t?.price_per_month)} a month from ${date(t?.available_from)}.</p>${r.status === 'pending' ? `<div class="row"><button class="btn sm" data-live-transfer-request="${esc(r.id)}:1">Approve</button><button class="btn ghost sm" data-live-transfer-request="${esc(r.id)}:0">Decline</button></div>` : ''}</div>`; }).join('')}
    ${mt.map(m => `<div class="card row" style="justify-content:space-between;flex-wrap:wrap;gap:10px"><span style="min-width:0"><span class="pill mute">Repair</span> <b>${esc(m.type)}${m.urgent ? ' · urgent' : ''}</b><small class="muted" style="display:block">Room ${esc(m.room_code)} · ${esc(m.tenant_name)} · ${esc(m.note)}</small></span><select class="inp" style="width:auto" data-live-maint="${esc(m.id)}" aria-label="Repair status">${options(MAINT, m.status)}</select></div>`).join('')}
    ${!reqs.length && !trs.length && !mt.length ? '<div class="card"><p class="muted">Nothing needs your approval right now.</p></div>' : ''}</div>`;
}
const ownerRequests = data => { const p = currentProp(data); return p ? `<section class="sec">${head('Your approval needed', 'Requests')}${propChips(data)}${requestCards(data, p.id)}</section>` : noProps(); };

function ownerView(tab, data, profile) {
  if (tab === 'units') return ownerUnits(data);
  if (tab === 'payments') return ownerPayments(data);
  if (tab === 'requests') return ownerRequests(data);
  if (tab === 'terms') return ownerBoard(data);
  return ownerOverview(data, profile);
}

/* ---------- ADMIN ---------- */
function newPropertyForm(data) {
  const owners = data.profiles.filter(x => x.role === 'owner');
  return `<form class="card stack" data-live-form="listing"><div><span class="eyebrow">Step 1</span><h3>Add a property</h3><p class="muted">It appears in the admin lists straight away and reaches tenants once it is verified.</p></div>
    <label class="field"><span>Owner</span><select class="inp" name="owner_id" data-p-ownerpick required>${owners.map(x => `<option value="${esc(x.id)}">${esc(x.full_name)}</option>`).join('')}<option value="__new">+ A new owner</option></select></label>
    <div class="grid" id="newOwner" hidden><label class="field"><span>Owner name</span><input class="inp" name="new_name"></label><label class="field"><span>Owner email (their username)</span><input class="inp" name="new_email" type="email"></label><label class="field"><span>Owner phone</span><input class="inp" name="new_phone" type="tel"></label></div>
    ${field('Property name', 'name')}<div class="grid">${field('Area', 'area')}${field('Price (UGX)', 'price', 'number', 'min="1"')}</div>
    <div class="grid"><label class="field"><span>Type</span><select class="inp" name="type">${options([['hostel', 'Hostel'], ['rental', 'Rental'], ['airbnb', 'Airbnb']], 'hostel')}</select></label>${field('Room type', 'unit_type')}</div>
    <label class="field"><span>Description</span><textarea class="inp" name="description" rows="3" required></textarea></label>
    <label class="field"><span>Amenities (comma separated)</span><input class="inp" name="amenities" placeholder="Wi-Fi, 24h security, Water tank"></label><button class="btn" type="submit">Add property</button></form>`;
}
function verifyHub(data) {
  const pending = data.listings.filter(l => !l.verified), reviews = data.profiles.filter(x => x.kyc_status === 'review'), q = data.queue;
  return `<div class="stack"><h3 style="font-size:22px">Properties to verify</h3><p class="muted">Ask the owner for two things: the LC1 letter and the property data consent agreement. Tick each when you have it, then verify.</p>${pending.length ? pending.map(verifyCard).join('') : '<div class="card"><p class="muted">Every property is verified.</p></div>'}
    <h3 style="font-size:22px;margin-top:8px">Identity reviews</h3>${reviews.length ? reviews.map(x => `<article class="card stack"><div class="row" style="justify-content:space-between"><span><b>${esc(x.full_name)}</b><small class="muted mono" style="display:block;word-break:break-all">${esc(x.id)}</small></span>${pill('In review', 'warn')}</div><div class="row"><button class="btn ghost sm" data-live-kyc-doc="${esc(x.id_document_url || '')}">View ID</button><button class="btn ghost sm" data-live-kyc-doc="${esc(x.selfie_url || '')}">View selfie</button><button class="btn sm" data-live-kyc="${esc(x.id)}:verified">Verify</button><button class="btn ghost sm" data-live-kyc="${esc(x.id)}:none">Request resubmission</button></div></article>`).join('') : '<div class="card"><p class="muted">No identity checks waiting.</p></div>'}
    <h3 style="font-size:22px;margin-top:8px">Queue items</h3>${table(['Type', 'Subject', 'Details', 'Status'], q.map(x => `<tr><td>${esc(x.kind)}</td><td><b>${esc(x.subject_name)}</b></td><td>${esc(x.details)}</td><td><select class="inp" style="width:auto" data-live-queue="${esc(x.id)}" aria-label="Queue status">${options(['open', 'resolved', 'dismissed'], x.status)}</select></td></tr>`), 'The queue is empty.')}</div>`;
}
function activityHub(data) {
  const trs = data.transferRequests.filter(r => r.status === 'pending');
  return `<div class="stack"><h3 style="font-size:22px">Payments</h3>${paymentsTable(data, null, true)}
    <h3 style="font-size:22px;margin-top:8px">Repair requests</h3>${table(['Property', 'Room', 'Issue', 'Status'], data.maintenance.map(m => `<tr><td>${esc(data.listings.find(l => l.id === m.listing_id)?.name || '')}</td><td class="mono">${esc(m.room_code)}</td><td>${esc(m.type)} · ${esc(m.note)}</td><td><select class="inp" style="width:auto" data-live-maint="${esc(m.id)}" aria-label="Repair status">${options(MAINT, m.status)}</select></td></tr>`), 'No repair requests.')}
    <h3 style="font-size:22px;margin-top:8px">Rent-transfer approvals</h3>${table(['Requester', 'Room', 'Status', 'Decision'], data.transferRequests.map(r => { const t = data.transfers.find(x => x.id === r.transfer_id); return `<tr><td>${esc(r.requester?.full_name || 'Tenant')}</td><td class="mono">${esc(t?.room_code || '')}</td><td>${pill(r.status)}</td><td>${r.status === 'pending' ? `<div class="row" style="flex-wrap:nowrap"><button class="btn sm" data-live-transfer-request="${esc(r.id)}:1">Approve</button><button class="btn ghost sm" data-live-transfer-request="${esc(r.id)}:0">Decline</button></div>` : '-'}</td></tr>`; }), 'No transfer requests.')}${trs.length ? '' : ''}</div>`;
}
function accountsHub(data) {
  return `<div class="stack"><h3 style="font-size:22px">Accounts</h3>${table(['Name', 'Role', 'Identity', 'Joined'], data.profiles.map(x => `<tr><td><b>${esc(x.full_name)}</b><div class="muted mono" style="font-size:11px">${esc(x.id.slice(0, 8))}</div></td><td><select class="inp" style="width:auto" data-live-role="${esc(x.id)}" aria-label="Role for ${esc(x.full_name)}">${options(['tenant', 'student', 'owner', 'admin'], x.role)}</select></td><td>${pill(x.kyc_status, x.kyc_status === 'verified' ? 'ok' : x.kyc_status === 'review' ? 'warn' : 'mute')}</td><td>${date(x.created_at)}</td></tr>`), 'No accounts yet.')}</div>`;
}
function adminQueue(data) {
  const pend = data.listings.filter(l => !l.verified).length, kyc = data.profiles.filter(x => x.kyc_status === 'review').length, openQ = data.queue.filter(x => x.status === 'open').length;
  const unsent = data.logins.filter(x => x.issued_at && !x.sent_at).length + data.profiles.filter(o => o.role === 'owner' && !(data.logins.find(x => x.owner_id === o.id) || {}).issued_at).length;
  const act = data.payments.filter(p => p.status === 'pending').length + data.maintenance.filter(m => m.status === 'open').length + data.transferRequests.filter(r => r.status === 'pending').length;
  const hubs = [['add', 'plus', 'Add property', 0], ['verify', 'shield', 'Verification', pend + kyc + openQ], ['logins', 'key', 'Owner logins', unsent], ['activity', 'receipt', 'Activity', act], ['accounts', 'users', 'Accounts', 0]];
  const hub = ui.hub;
  return `<section class="sec">${head('Admin', 'Onboarding')}
    <div class="kgrid"><div class="card stat"><span class="eyebrow">Pending properties</span><b>${pend}</b><span class="muted">waiting for verification</span></div><div class="card stat"><span class="eyebrow">Identity reviews</span><b>${kyc}</b><span class="muted">waiting for a decision</span></div><div class="card stat"><span class="eyebrow">Open queue items</span><b>${openQ}</b><span class="muted">needing follow-up</span></div><div class="card stat"><span class="eyebrow">Accounts</span><b>${data.profiles.length}</b><span class="muted">on the platform</span></div></div>
    <div class="hubs" role="group" aria-label="Onboarding steps">${hubs.map(h => `<button class="hubb" data-p-hub="${h[0]}" aria-pressed="${hub === h[0]}">${icn(h[1])}<b>${h[2]}</b>${h[3] ? `<i class="hbadge">${h[3]}</i>` : ''}</button>`).join('')}</div>
    ${hub === 'add' ? newPropertyForm(data) : hub === 'verify' ? verifyHub(data) : hub === 'logins' ? loginsHub(data) : hub === 'activity' ? activityHub(data) : accountsHub(data)}</section>`;
}

function adminUnits(data) {
  const p = currentProp(data, 'admProp'); if (!p) return propPicker(data, 'units', 'Units');
  return `<section class="sec" style="padding-bottom:0">${propBar(p)}${layoutEditor(data, p)}</section>${unitsView(data, p, true)}`;
}

function mediaEditor(data, p, admin) {
  const media = data.media.filter(m => m.listing_id === p.id).sort((a, b) => a.sort_order - b.sort_order), cover = media.find(m => m.type === 'photo');
  return `<div class="card stack" id="photos"><div class="row" style="justify-content:space-between;align-items:start"><div><span class="eyebrow">${admin ? 'Listing gallery' : 'What tenants see'}</span><h3>Photos and videos</h3></div><span class="pill mute">${media.length} ${media.length === 1 ? 'file' : 'files'}</span></div>
    <p class="muted">${admin ? 'These make up the gallery on the listing page.' : 'Show tenants your real rooms and building. Changes appear on your listing and the home page straight away.'} The cover photo is shown first.</p>
    ${media.length ? `<div class="mgrid">${media.map((m, i) => `<div class="mt" style="animation-delay:${Math.min(i, 8) * 40}ms">${m.type === 'video' ? `<video src="${esc(m.url)}" preload="metadata" muted playsinline></video>` : `<img src="${esc(m.url)}" alt="Photo ${i + 1} of ${esc(p.name)}" loading="lazy">`}${m === cover ? '<span class="mcov">Cover</span>' : ''}<div class="row">${m.type === 'photo' && m !== cover ? `<button class="btn ghost sm" type="button" data-p-media-cover="${esc(m.id)}">Make cover</button>` : ''}<button class="btn ghost sm" type="button" data-p-media-del="${esc(m.id)}">Remove</button></div></div>`).join('')}</div>` : '<p class="muted">No photos or videos yet. Tenants see an illustration until you add some.</p>'}
    <label class="btn sm upl" style="align-self:flex-start">${icn('plus')}<span>Add photos or videos</span><input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" multiple data-p-media-up="${esc(p.id)}" hidden></label></div>`;
}
function adminProperty(data) {
  const p = currentProp(data, 'admProp'); if (!p) return propPicker(data, 'prop', 'Property');
  const loc = data.locations.find(x => x.listing_id === p.id) || {}, t = data.templates.find(x => x.listing_id === p.id) || {};
  return `<section class="sec" style="padding-bottom:0">${propBar(p)}</section><section class="sec">${head('What tenants see', p.name, `<span class="pill ${p.verified ? 'ok' : 'warn'}">${p.verified ? 'Verified' : 'Pending'}</span>`)}
    <form class="card stack" data-live-form="edit-listing" data-listing-id="${esc(p.id)}"><h3>Details</h3><div class="grid"><label class="field"><span>Property name</span><input class="inp" name="name" value="${esc(p.name)}" required></label><label class="field"><span>Area</span><input class="inp" name="area" value="${esc(p.area)}" required></label><label class="field"><span>Price (UGX)</span><input class="inp" name="price" type="number" min="1" value="${esc(p.price)}" required></label></div>
      <label class="field"><span>Description</span><textarea class="inp" name="description" rows="4">${esc(p.description || '')}</textarea></label>
      <label class="field"><span>Amenities (comma separated)</span><input class="inp" name="amenities" value="${esc((p.amenities || []).join(', '))}"></label>
      <div class="row"><button class="btn" type="submit">Save details</button><button class="btn ghost" type="button" data-live-delete-listing="${esc(p.id)}">Delete property</button></div></form>
    ${mediaEditor(data, p, true)}
    <form class="card stack" data-live-form="location" data-listing-id="${esc(p.id)}"><h3>Location pin</h3><p class="muted">Paste a Google Maps link, or type the GPS coordinates. The listing then shows the property on a map.</p>
      <label class="field"><span>Google Maps link (optional)</span><input class="inp" name="link" placeholder="https://www.google.com/maps/place/...@0.3348,32.5677..."></label>
      <div class="grid"><label class="field"><span>Latitude</span><input class="inp" name="lat" type="number" step="any" value="${loc.lat ?? ''}"></label><label class="field"><span>Longitude</span><input class="inp" name="lng" type="number" step="any" value="${loc.lng ?? ''}"></label><label class="field"><span>Address or landmark</span><input class="inp" name="address" value="${esc(loc.address || '')}"></label></div>
      <button class="btn" type="submit" style="align-self:flex-start">Save location</button></form>
    <form class="card stack" data-live-form="agreement" data-listing-id="${esc(p.id)}"><h3>Agreement</h3><p class="muted">These clauses appear on the listing page as the rules and in the tenancy agreement tenants accept.${p.per === 'night' ? ' Short stays always show free cancellation up to 48 hours before check-in.' : ''}</p>
      <div class="grid"><label class="field"><span>Notice period (days)</span><input class="inp" name="notice" type="number" min="0" max="365" value="${t.notice_days ?? 30}" required></label><label class="field"><span>Refundable deposit (months of rent)</span><input class="inp" name="deposit" type="number" min="0" max="6" value="${t.deposit_months ?? 0}" required></label><label class="field"><span>Late fee (% of overdue rent)</span><input class="inp" name="late" type="number" min="0" max="50" value="${t.late_fee_percent ?? 5}" required></label></div>
      <label class="field"><span>House rules</span><textarea class="inp" name="rules" rows="3" placeholder="Visitors leave by 10 pm. Quiet hours are 10 pm to 6 am.">${esc(t.house_rules || '')}</textarea></label>
      <button class="btn" type="submit" style="align-self:flex-start">Save agreement</button></form></section>`;
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
  const extras = kpiExtras(data, bk);
  const cv = (title, sub, body) => `<div class="card cv"><div class="cvh"><div><b>${title}</b><small>${sub}</small></div></div>${body}</div>`;
  return `<section class="sec kpis">${head('Analytics', 'How Rentpply is doing', '<span class="pill ok">Live data</span>')}
    <div class="seg" role="group" aria-label="Time range"><button data-p-range="1" aria-pressed="${R === 1}">1 month</button><button data-p-range="6" aria-pressed="${R === 6}">6 months</button><button data-p-range="12" aria-pressed="${R === 12}">12 months</button></div>
    <div class="tgrid">${tiles.map(t => `<div class="card tile2"><span class="muted">${t[0]}</span><b class="num">${t[1]}</b><div class="trow">${t[2]}${spark(t[3].slice(-8))}</div></div>`).join('')}</div>
    ${cv('Gross rent value', `UGX millions per ${per}, confirmed payments`, lineChart(bk.map(b => b.label), rev, 'Gross rent value'))}
    ${cv('Bookings by property type', `Confirmed bookings per ${per}`, stackChart(bk.map(b => b.label), [{ n: 'Hostels', c: 1, v: byType('hostel') }, { n: 'Rentals', c: 2, v: byType('rental') }, { n: 'Airbnbs', c: 3, v: byType('airbnb') }], 'Bookings by type') + legend([{ n: 'Hostels', c: 1 }, { n: 'Rentals', c: 2 }, { n: 'Airbnbs', c: 3 }]))}
    ${cv('Occupancy by property', 'Live from unit data', hbars(occRows, v => v + '%', 3, 100))}
    ${cv('Monthly rent value by area', 'UGX millions from occupied units', hbars(areaRows, v => v + 'm', 1))}
    ${cv('Booking funnel', `${span} · from viewing requests to confirmed bookings`, extras.funnel)}
    ${cv('Payment status', `Payment requests made · ${span.toLowerCase()}`, extras.status)}
    ${cv('When people apply', 'Payment requests and agreements by day and time of day', extras.heat)}
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

const METHODS = ['Cash', 'MTN MoMo', 'Airtel Money', 'Bank transfer'];
const today = () => new Date().toISOString().slice(0, 10);
const byCode = (a, b) => a.floor - b.floor || a.unit_code.localeCompare(b.unit_code, undefined, { numeric: true });
const layoutOf = (data, lid, floor) => data.layouts.find(x => x.listing_id === lid && x.floor === floor) || null;
const kycBadge = (data, tenantId) => data.kyc[tenantId] === 'verified' ? `<span class="pill ok" style="margin-left:6px">${icn('shield')}ID verified</span>` : `<span class="pill mute" style="margin-left:6px">ID not verified</span>`;
const layer = html => { if (window.rpLayer) return window.rpLayer(html); const el = document.getElementById('layer'); if (el) el.innerHTML = html; };
const sheetHTML = (title, inner) => `<div class="veil" data-veil><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="bar"><span class="eyebrow">${esc(title)}</span><button class="ibtn" data-close aria-label="Close">×</button></div><div class="in">${inner}</div></div></div>`;

async function ownerLoginsCall(body) {
  const { data, error } = await supabase.functions.invoke('owner-logins', { body });
  if (error) { let msg = error.message; try { const j = await error.context.json(); if (j && j.error) msg = j.error; } catch (_) { /* keep the generic message */ } throw new Error(msg); }
  return data;
}
function showCredentials(username, password, ownerId) {
  layer(sheetHTML('Owner login', `<div class="stack" style="gap:14px"><h2 style="font-size:24px">Login for the owner</h2>
    <p class="notice">Copy these now. For security the password is not stored, so it cannot be shown again. You can issue a new one at any time.</p>
    <label class="field"><span>Username</span><div class="row" style="flex-wrap:nowrap"><input class="inp mono" readonly value="${esc(username)}"><button class="btn ghost sm" type="button" data-p-copy="${esc(username)}">Copy</button></div></label>
    <label class="field"><span>Password</span><div class="row" style="flex-wrap:nowrap"><input class="inp mono" id="credPw" type="password" readonly value="${esc(password)}"><button class="btn ghost sm" type="button" data-p-pwtoggle>Show</button><button class="btn ghost sm" type="button" data-p-copy="${esc(password)}">Copy</button></div></label>
    <button class="btn" type="button" data-p-logins-sent="${esc(ownerId)}">Mark as sent to the owner</button></div>`));
}
function quickMenu(unitId, code) {
  layer(sheetHTML(`Room ${code}`, `<div class="stack" style="gap:10px"><h2 style="font-size:24px">Room ${esc(code)}</h2><p class="muted">Change the status of this room.</p>${STAT.map(([k, t]) => `<button class="opt" type="button" data-p-setst="${esc(unitId)}:${k}"><b>${t}</b></button>`).join('')}</div>`));
}
function parseMapsLink(text) {
  const t = decodeURIComponent(String(text || ''));
  const m = t.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || t.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || t.match(/[?&](?:q|query|ll|destination|center)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/) || t.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
  return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null;
}
export function currentPropertyName(data) { const p = data && currentProp(data); return p ? p.name : ''; }

function boardTotals(data, lid) {
  const e = data.board.filter(x => x.listing_id === lid && x.status !== 'cancelled');
  return { n: e.length, booked: e.filter(x => x.status === 'booked').length, full: e.filter(x => x.status === 'full').length, owed: sum(e.filter(x => x.status !== 'full').map(x => x.total - x.paid)) };
}
function boardStrip(data, lid) {
  const t = boardTotals(data, lid); if (!t.n) return '';
  return `<div class="card stack" style="gap:10px"><div class="row" style="justify-content:space-between"><b>On the board</b><button class="btn ghost sm" data-tab="terms">Open board</button></div>
    <div class="tgrid" style="grid-template-columns:repeat(3,1fr);gap:8px;margin:0"><div class="kmini"><span class="muted">Booked</span><b class="num">${t.booked}</b></div><div class="kmini"><span class="muted">Fully paid</span><b class="num">${t.full}</b></div><div class="kmini"><span class="muted">Still owed</span><b class="num">${mil(t.owed)}</b></div></div></div>`;
}

function paymentGate(data) {
  const pend = data.payments.filter(p => p.status === 'pending').sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  if (!pend.length) return '';
  const p = pend[0], l = data.listings.find(x => x.id === p.listing_id) || {}, vac = data.units.filter(u => u.listing_id === p.listing_id && u.status === 'vacant').sort(byCode), total = p.amount + p.fee + p.deposit;
  const kv = (k, v) => `<div class="kv"><span>${k}</span><span>${v}</span></div>`;
  return `<div class="gateveil"><div class="sheet gatebox" role="alertdialog" aria-modal="true" aria-label="Confirm a payment first"><div class="in" style="padding-top:22px">
    <span class="pill warn" style="align-self:flex-start">${icn('bell')}Action needed${pend.length > 1 ? ` · ${pend.length} payments waiting` : ''}</span>
    <div class="stack" style="gap:6px"><h2 style="font-size:28px">Confirm this payment first</h2><p class="muted">${esc(p.tenant_name)} says they have paid. Check your mobile money or bank, then answer. Your dashboard opens again once you do.</p></div>
    <div class="card stack" style="gap:8px"><div class="row" style="flex-wrap:wrap;gap:4px"><b style="font-size:17px">${esc(p.tenant_name)}</b>${kycBadge(data, p.tenant_id)}</div>
      ${kv('Property', esc(l.name || ''))}${kv('For', esc(p.purpose))}${kv(p.nights ? 'Check-in' : 'Move-in', date(p.start_date))}${kv('Paid with', esc(p.payment_method) + (p.from_source ? ' · ' + esc(p.from_source) : ''))}${kv('Paid by', esc(p.paid_by))}${kv('Reference', `<span class="mono">${esc(p.reference)}</span>`)}${kv('Sent', new Date(p.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}
      <div class="kv tot"><span style="color:var(--ink)">Amount to look for</span><span class="num">${money(total)}</span></div></div>
    ${vac.length ? `<label class="field"><span>Give them this room</span><select class="inp" id="gateRoom">${vac.map(u => `<option value="${esc(u.id)}">${esc(u.unit_code)} · ${floorName(u.floor)}</option>`).join('')}</select></label>` : '<p class="notice">There is no vacant room at this property. Free a room in Units before you confirm.</p>'}
    <button class="btn" data-live-payment="${esc(p.id)}:confirmed" ${vac.length ? '' : 'disabled'}>Yes, I received it</button><button class="btn ghost" data-live-payment="${esc(p.id)}:rejected">I did not receive it</button></div></div></div>`;
}

function ownerBoard(data) {
  const p = currentProp(data); if (!p) return noProps();
  const entries = data.board.filter(e => e.listing_id === p.id && e.status !== 'cancelled').sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const vac = data.units.filter(u => u.listing_id === p.id && u.status === 'vacant').sort(byCode), t = boardTotals(data, p.id);
  const form = p.per !== 'month' ? '<div class="notice">The board is for monthly stays. Short-stay guests book through Rentpply.</div>'
    : `<form class="card stack" data-live-form="board-onboard" data-listing-id="${esc(p.id)}"><div><span class="eyebrow">Walk-in tenant</span><h3>Onboard tenant</h3><p class="muted">For someone who viewed a room and paid you directly. The room follows what they have paid: Reserved while part paid, Occupied once paid in full.</p></div>
      <div class="grid"><label class="field"><span>Room</span><select class="inp" name="unit_id" required>${vac.map(u => `<option value="${esc(u.id)}">${esc(u.unit_code)} · ${floorName(u.floor)}</option>`).join('')}</select></label>${field('Tenant name', 'tenant_name')}${field('Phone', 'phone', 'tel', 'placeholder="07XX XXX XXX"')}</div>
      <div class="grid"><label class="field"><span>Months</span><input class="inp" name="months" type="number" min="1" max="24" value="4" required></label><label class="field"><span>Start date</span><input class="inp" name="start_date" type="date" value="${today()}" required></label><label class="field"><span>Rent per month</span><input class="inp" value="${money(p.price)}" disabled></label></div>
      <label class="chk"><input type="checkbox" name="has_roommate"><span>They will have a roommate</span></label>
      <label class="chk"><input type="checkbox" name="booking_fee" checked><span>This payment is a booking fee</span></label>
      <div class="grid"><label class="field"><span>Amount paid now (UGX)</span><input class="inp" name="amount" type="number" min="0" step="1000" value="100000"></label><label class="field"><span>Paid with</span><select class="inp" name="method">${options(METHODS, 'Cash')}</select></label></div>
      <button class="btn" type="submit" ${vac.length ? '' : 'disabled'}>Onboard tenant</button>${vac.length ? '' : '<p class="muted">There are no vacant rooms right now.</p>'}</form>`;
  const card = e => {
    const pays = data.boardPayments.filter(x => x.entry_id === e.id).sort((a, b) => Date.parse(a.paid_at) - Date.parse(b.paid_at)), pct = e.total ? Math.min(100, Math.round(e.paid / e.total * 100)) : 0;
    const label = { unpaid: ['mute', 'Unpaid'], booked: ['warn', 'Booked'], full: ['ok', 'Full'] }[e.status];
    return `<article class="card stack" style="gap:10px"><div class="row" style="justify-content:space-between;align-items:flex-start"><span style="min-width:0"><b>Room ${esc(e.unit_code)} · ${esc(e.tenant_name)}${e.has_roommate ? ' +1' : ''}</b><small class="muted" style="display:block">${esc(e.phone)} · ${e.months} ${e.months === 1 ? 'month' : 'months'} from ${date(e.start_date)}</small></span><span class="pill ${label[0]}">${label[1]}</span></div>
      <div class="bar" role="img" aria-label="${pct}% paid"><b style="width:${pct}%"></b></div>
      <div class="row" style="justify-content:space-between;font-size:14px"><span>Paid <b>${money(e.paid)}</b> of ${money(e.total)}</span>${e.total - e.paid > 0 ? `<span>Still owed <b style="color:var(--bad)">${money(e.total - e.paid)}</b></span>` : '<b style="color:var(--ok)">Paid in full</b>'}</div>
      ${pays.length ? `<details><summary class="muted" style="cursor:pointer">Payment log (${pays.length})</summary><div class="stack" style="gap:6px;margin-top:8px">${pays.map(x => `<div class="kv"><span>${date(x.paid_at)} · ${esc(x.method)}${x.is_booking_fee ? ' · booking fee' : ''}</span><span class="num">${money(x.amount)}</span></div>`).join('')}</div></details>` : ''}
      ${e.status !== 'full' ? `<form class="row" data-live-form="board-pay" data-entry-id="${esc(e.id)}" style="flex-wrap:wrap;gap:8px"><input class="inp" name="amount" type="number" min="1" max="${e.total - e.paid}" placeholder="Amount (UGX)" required style="flex:1;min-width:140px"><select class="inp" name="method" style="width:auto" aria-label="Paid with">${options(METHODS, 'Cash')}</select><button class="btn sm" type="submit">Record payment</button><button class="btn ghost sm" type="button" data-p-board-cancel="${esc(e.id)}">Remove</button></form>` : ''}</article>`;
  };
  const ags = data.agreements.filter(a => a.listing_id === p.id), tone = { accepted: 'ok', sent: 'warn', draft: 'mute' };
  return `<section class="sec">${head(p.name, 'Board')}${propChips(data)}
    <div class="tgrid"><div class="card tile2"><span class="muted">On the board</span><b class="num">${t.n}</b></div><div class="card tile2"><span class="muted">Booked (reserved)</span><b class="num">${t.booked}</b></div><div class="card tile2"><span class="muted">Fully paid</span><b class="num">${t.full}</b></div><div class="card tile2"><span class="muted">Still owed</span><b class="num">${money(t.owed)}</b></div></div>
    ${form}<h3 style="font-size:22px">Tenants on the board</h3>${entries.length ? `<div class="stack">${entries.map(card).join('')}</div>` : '<div class="card"><p class="muted">Nobody is on the board yet.</p></div>'}
    <h3 style="font-size:22px">Agreements from Rentpply bookings</h3>${table(['Reference', 'Tenant', 'Room', 'Stay', 'Start', 'Status'], ags.map(a => `<tr><td class="mono">${esc(a.reference)}</td><td>${esc(a.tenant_name)}</td><td class="mono">${esc(a.room_code === 'Unassigned' ? 'To be assigned' : a.room_code)}</td><td>${a.quantity} ${esc((a.terms && a.terms.stay_unit) || 'month')}${a.quantity === 1 ? '' : 's'}</td><td>${date(a.start_date)}</td><td><span class="pill ${tone[a.status] || 'mute'}">${esc(a.status)}</span></td></tr>`), 'Agreements appear here when tenants accept them.')}</section>`;
}

function verifyCard(l) {
  const d = l.verification_docs && !Array.isArray(l.verification_docs) ? l.verification_docs : {}, st = d.state === 'rejected' ? 'rejected' : 'pending';
  return `<article class="card stack" style="gap:12px" data-vcard="${esc(l.id)}"><div class="row" style="justify-content:space-between;align-items:flex-start"><span><b>${esc(l.name)}</b><small class="muted" style="display:block">${esc(l.area)} · ${esc(l.owner_name)} · ${esc(TYPE[l.type] || l.type)}</small></span>${st === 'rejected' ? pill('Rejected', 'bad') : pill('Waiting for documents', 'warn')}</div>
    <label class="chk"><input type="checkbox" data-p-vdoc="${esc(l.id)}" data-doc="lc1" ${d.lc1 ? 'checked' : ''} ${st === 'rejected' ? 'disabled' : ''}><span>LC1 letter from the local council chairperson received</span></label>
    <label class="chk"><input type="checkbox" data-p-vdoc="${esc(l.id)}" data-doc="consent" ${d.consent ? 'checked' : ''} ${st === 'rejected' ? 'disabled' : ''}><span>Property data consent agreement received</span></label>
    <div class="row">${st === 'rejected' ? `<button class="btn sm" data-p-verify="${esc(l.id)}:reopen">Reopen</button>` : `<button class="btn sm" data-p-verify="${esc(l.id)}:verify" ${d.lc1 && d.consent ? '' : 'disabled'}>Verify and issue login</button><button class="btn ghost sm" data-p-verify="${esc(l.id)}:reject">Reject</button>`}</div></article>`;
}
function loginsHub(data) {
  const owners = data.profiles.filter(x => x.role === 'owner');
  return `<div class="stack"><h3 style="font-size:22px">Owner logins</h3><p class="muted">Each owner gets one username and password, and sees only their own properties. Passwords are shown once when issued; issue a new one if it is lost.</p>
    ${table(['Owner', 'Properties', 'Username', 'Status', ''], owners.map(o => { const lg = data.logins.find(x => x.owner_id === o.id), props = data.listings.filter(l => l.owner_id === o.id);
      const status = !lg || !lg.issued_at ? pill('Not issued', 'mute') : lg.sent_at ? pill('Sent ' + date(lg.sent_at), 'ok') : pill('Issued, not sent', 'warn');
      return `<tr><td><b>${esc(o.full_name)}</b></td><td>${props.length ? props.map(l => esc(l.name)).join(', ') : '<span class="muted">None yet</span>'}</td><td class="mono">${esc(lg ? lg.username : '')}</td><td>${status}</td><td><div class="row" style="flex-wrap:nowrap"><button class="btn sm" data-p-login-issue="${esc(o.id)}">${lg && lg.issued_at ? 'New password' : 'Issue login'}</button>${lg && lg.issued_at && !lg.sent_at ? `<button class="btn ghost sm" data-p-logins-sent="${esc(o.id)}">Mark as sent</button>` : ''}</div></td></tr>`; }), 'No owners yet.')}</div>`;
}
function layoutEditor(data, p) {
  const units = data.units.filter(u => u.listing_id === p.id), floors = [...new Set([...units.map(u => u.floor), ...data.layouts.filter(x => x.listing_id === p.id).map(x => x.floor)])].sort((a, b) => a - b);
  const f = ui.floor ?? floors[0] ?? 0, choices = [...floors, floors.length ? Math.max(...floors) + 1 : 0].filter((v, i, a) => a.indexOf(v) === i), lay = layoutOf(data, p.id, f), count = units.filter(u => u.floor === f).length, cap = lay ? lay.columns * lay.rows : 0;
  return `<form class="card stack" data-live-form="layout" data-listing-id="${esc(p.id)}"><div><span class="eyebrow">Floor layout</span><h3>Rooms per floor</h3><p class="muted">Pick a floor and set its columns and rows. The owner's floor page uses this grid. Fill adds only the rooms that are missing.</p></div>
    <div class="grid"><label class="field"><span>Floor</span><select class="inp" name="floor" data-p-layfloor>${choices.map(x => `<option value="${x}" ${x === f ? 'selected' : ''}>${floorName(x)}${floors.includes(x) ? '' : ' (new)'}</option>`).join('')}</select></label><label class="field"><span>Columns</span><input class="inp" name="columns" type="number" min="1" max="8" value="${lay ? lay.columns : 3}" required></label><label class="field"><span>Rows</span><input class="inp" name="rows" type="number" min="1" max="20" value="${lay ? lay.rows : Math.max(1, Math.ceil(count / 3))}" required></label></div>
    <p class="muted" style="font-size:14px">${lay ? `${cap} positions on this floor: ${count} rooms, ${Math.max(0, cap - count)} empty.` : `No grid yet for this floor, so rooms show three to a row.`}</p>
    <div class="row"><button class="btn" type="submit">Save layout</button><button class="btn ghost" type="button" data-p-fill="${esc(p.id)}:${f}" ${lay && cap > count ? '' : 'disabled'}>Fill ${lay && cap > count ? cap - count : ''} empty ${cap - count === 1 ? 'position' : 'positions'}</button></div></form>`;
}
function kpiExtras(data, bk) {
  const start = bk[0].start, end = bk[bk.length - 1].end, inB = v => { const t = Date.parse(v); return t >= start && t < end; };
  const ags = data.agreements.filter(a => inB(a.created_at));
  const sentIds = new Set(data.payments.filter(p => p.agreement_id).map(p => p.agreement_id));
  const views = data.ownerRequests.filter(r => r.kind === 'Viewing request' && inB(r.created_at)).length;
  const steps = [['Agreements accepted', ags.length], ['Payment sent', ags.filter(a => a.paid || sentIds.has(a.id)).length], ['Confirmed by the owner', ags.filter(a => a.paid).length]];
  const top = Math.max(1, steps[0][1]);
  const funnel = `<div class="hb">${steps.map((s, i) => `<div class="hbr"><span class="hbl">${s[0]}</span><span class="hbt"><i style="width:${Math.max(2, s[1] / top * 100)}%;background:var(--s1);opacity:${1 - i * .2}"></i></span><b class="hbv">${s[1]}</b></div>${i && steps[i - 1][1] ? `<div class="conv">${Math.round(s[1] / steps[i - 1][1] * 100)}% of the step before</div>` : ''}`).join('')}</div><p class="muted" style="font-size:12px">${views} viewing ${views === 1 ? 'request' : 'requests'} in the same period. Viewings are optional and searches are not recorded, so the funnel starts when a tenant accepts an agreement.</p>`;
  const stat = ['confirmed', 'pending', 'rejected'].map((k, i) => ({ n: k === 'confirmed' ? 'Confirmed' : k === 'pending' ? 'Waiting for the owner' : 'Not received', c: [3, 2, 1][i], v: data.payments.filter(p => p.status === k && inB(p.created_at)).length }));
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], slots = ['0–4', '4–8', '8–12', '12–16', '16–20', '20–24'], grid = days.map(() => slots.map(() => 0));
  [...data.payments, ...data.agreements].forEach(x => { if (!inB(x.created_at)) return; const d = new Date(x.created_at); grid[(d.getDay() + 6) % 7][Math.floor(d.getHours() / 4)]++; });
  const mx = Math.max(1, ...grid.flat());
  const heat = `<div class="heat"><div class="hrow hh"><span></span>${slots.map(s => `<span>${s}</span>`).join('')}</div>${grid.map((row, i) => `<div class="hrow"><span>${days[i]}</span>${row.map((v, k) => `<i class="hc" style="--a:${(.08 + v / mx * .92).toFixed(2)}" title="${days[i]} ${slots[k]}h · ${v} ${v === 1 ? 'application' : 'applications'}"></i>`).join('')}</div>`).join('')}</div><div class="lg"><span class="muted">Fewer</span><span class="ramp"></span><span class="muted">More applications</span></div>`;
  return { funnel, status: donut(stat.filter(s => s.v)), heat };
}
let pressTimer = 0, pressFired = false, pressBound = false;
export function portalBind() {
  const pager = document.getElementById('fpager');
  if (pager) {
    const pages = [...pager.querySelectorAll('.fpage')], target = pages.find(pg => Number(pg.dataset.fp) === ui.floor);
    if (target) pager.scrollLeft = target.offsetLeft - pager.offsetLeft;
    pager.addEventListener('scroll', () => {
      clearTimeout(pager._t);
      pager._t = setTimeout(() => {
        const pg = pages[Math.round(pager.scrollLeft / Math.max(1, pager.clientWidth))];
        if (!pg) return;
        ui.floor = Number(pg.dataset.fp);
        document.querySelectorAll('[data-p-floor]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.pFloor) === ui.floor)));
      }, 120);
    }, { passive: true });
  }
  if (pressBound) return;
  pressBound = true;
  document.addEventListener('pointerdown', e => {
    const u = e.target.closest && e.target.closest('.unit[data-p-unit]'); if (!u) return;
    pressFired = false; clearTimeout(pressTimer);
    pressTimer = setTimeout(() => { pressFired = true; quickMenu(u.dataset.pUnit, (u.querySelector('b') || {}).textContent || ''); }, 550);
  });
  ['pointerup', 'pointercancel', 'scroll'].forEach(ev => document.addEventListener(ev, () => clearTimeout(pressTimer), true));
  document.addEventListener('click', e => { if (pressFired && e.target.closest && e.target.closest('.unit[data-p-unit]')) { e.stopPropagation(); e.preventDefault(); pressFired = false; } }, true);
  document.addEventListener('contextmenu', e => { const u = e.target.closest && e.target.closest('.unit[data-p-unit]'); if (u) { e.preventDefault(); clearTimeout(pressTimer); pressFired = false; quickMenu(u.dataset.pUnit, (u.querySelector('b') || {}).textContent || ''); } });
}

async function issueLogin(ownerId) {
  const out = await ownerLoginsCall({ action: 'issue_login', owner_id: ownerId });
  showCredentials(out.username, out.password, ownerId);
}

export function renderPortal(role, tab, data, profile) {
  if (!data) return '<section class="sec"><div class="card skeleton" style="height:120px"></div><div class="tgrid"><div class="card skeleton" style="height:90px"></div><div class="card skeleton" style="height:90px"></div><div class="card skeleton" style="height:90px"></div></div></section>';
  if (role === 'admin') return adminView(tab, data);
  // The gate only stops the signed-in owner, on their own property; an admin previewing the owner view is not gated.
  return ownerView(tab, data, profile) + (profile.role === 'owner' ? paymentGate(data) : '');
}

/* long press on a room, and swiping between floors */
/* ---------- actions ---------- */
export async function handlePortalClick(target, refresh, ctx = {}) {
  const ui1 = (key, value, extra) => { ui[key] = value; if (extra) extra(); ctx.rerender && ctx.rerender(); return true; };
  let el;
  if ((el = target.closest('[data-p-prop]'))) return ui1('prop', el.dataset.pProp, () => { ui.unit = null; ui.floor = null; });
  if ((el = target.closest('[data-p-unit]'))) return ui1('unit', ui.unit === el.dataset.pUnit ? null : el.dataset.pUnit);
  if ((el = target.closest('[data-p-floor]'))) {
    ui.floor = Number(el.dataset.pFloor); ui.unit = null;
    const pg = document.querySelector(`#fpager .fpage[data-fp="${ui.floor}"]`), pager = document.getElementById('fpager');
    if (pg && pager) { pager.scrollTo({ left: pg.offsetLeft - pager.offsetLeft, behavior: 'smooth' }); document.querySelectorAll('[data-p-floor]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.pFloor) === ui.floor))); return true; }
    ctx.rerender && ctx.rerender(); return true;
  }
  if ((el = target.closest('[data-p-paytab]'))) return ui1('pay', el.dataset.pPaytab);
  if ((el = target.closest('[data-p-range]'))) return ui1('range', Number(el.dataset.pRange));
  if ((el = target.closest('[data-p-hub]'))) return ui1('hub', el.dataset.pHub);
  if ((el = target.closest('[data-p-adm-prop]'))) { ui.admProp = el.dataset.pAdmProp; ui.unit = null; ui.floor = null; if (el.dataset.pAdmTab && ctx.setTab) { ctx.setTab(el.dataset.pAdmTab); return true; } ctx.rerender && ctx.rerender(); return true; }
  if (target.closest('[data-p-adm-back]')) { ui.admProp = null; ui.unit = null; ui.floor = null; ctx.rerender && ctx.rerender(); return true; }
  if ((el = target.closest('[data-p-copy]'))) { await navigator.clipboard.writeText(el.dataset.pCopy); el.textContent = 'Copied'; return true; }
  if (target.closest('[data-p-pwtoggle]')) { const pw = document.getElementById('credPw'), btn = target.closest('[data-p-pwtoggle]'); if (pw) { pw.type = pw.type === 'password' ? 'text' : 'password'; btn.textContent = pw.type === 'password' ? 'Show' : 'Hide'; } return true; }
  if ((el = target.closest('[data-p-login-issue]'))) {
    const lg = (ctx.data && ctx.data.logins || []).find(x => x.owner_id === el.dataset.pLoginIssue);
    if (lg && lg.issued_at && !window.confirm('This replaces the owner\'s current password. They will need the new one to sign in. Continue?')) return true;
    await issueLogin(el.dataset.pLoginIssue); await refresh(); return true;
  }
  if ((el = target.closest('[data-p-logins-sent]'))) {
    const { error } = await supabase.from('owner_logins').update({ sent_at: new Date().toISOString() }).eq('owner_id', el.dataset.pLoginsSent);
    if (error) throw error;
    layer(''); await refresh(); return true;
  }
  if ((el = target.closest('[data-p-verify]'))) {
    const [id, action] = el.dataset.pVerify.split(':'), card = el.closest('[data-vcard]');
    const tick = doc => !!(card && card.querySelector(`[data-doc="${doc}"]`) || {}).checked;
    if (action === 'reject' && !window.confirm('Reject this property? It stays hidden from tenants until you reopen it.')) return true;
    const { data: listing, error } = await supabase.rpc('set_listing_verification', { listing_uuid: id, lc1_received: tick('lc1'), consent_received: tick('consent'), verification_action: action });
    if (error) throw error;
    if (action === 'verify') {
      const lg = (ctx.data && ctx.data.logins || []).find(x => x.owner_id === listing.owner_id);
      if (!lg || !lg.issued_at) await issueLogin(listing.owner_id);
    }
    await refresh(); return true;
  }
  if ((el = target.closest('[data-p-fill]'))) {
    const [id, floor] = el.dataset.pFill.split(':');
    const { data: made, error } = await supabase.rpc('fill_floor_layout', { listing_uuid: id, floor_no: Number(floor) });
    if (error) throw error;
    await refresh(); ctx.toast && ctx.toast(`${made} ${made === 1 ? 'room' : 'rooms'} added.`); return true;
  }
  if ((el = target.closest('[data-p-media-cover]'))) {
    const { error } = await supabase.rpc('set_media_cover', { media_uuid: el.dataset.pMediaCover });
    if (error) throw error;
    await refresh(); ctx.toast && ctx.toast('Cover photo changed.'); return true;
  }
  if ((el = target.closest('[data-p-media-del]'))) {
    const m = (ctx.data && ctx.data.media || []).find(x => x.id === el.dataset.pMediaDel);
    if (!window.confirm('Remove this from the listing gallery?')) return true;
    const path = m && m.url.split('/listing-media/')[1];
    if (path) { const rm = await supabase.storage.from('listing-media').remove([decodeURIComponent(path)]); if (rm.error) throw rm.error; }
    const { error } = await supabase.from('listing_media').delete().eq('id', el.dataset.pMediaDel);
    if (error) throw error;
    await refresh(); ctx.toast && ctx.toast('Removed from the gallery.'); return true;
  }
  if ((el = target.closest('[data-p-board-cancel]'))) {
    if (!window.confirm('Remove this tenant from the board? A reserved room goes back to vacant.')) return true;
    const { error } = await supabase.rpc('board_cancel', { entry_uuid: el.dataset.pBoardCancel });
    if (error) throw error;
    await refresh(); return true;
  }
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
    const [id, status] = payment.dataset.livePayment.split(':'), room = payment.closest('.gatebox') ? (document.getElementById('gateRoom') || {}).value : null;
    result = await supabase.rpc('resolve_payment', { payment_uuid: id, confirm_payment: status === 'confirmed', chosen_unit: room || null });
  } else if (transferRequest) {
    const [id, approve] = transferRequest.dataset.liveTransferRequest.split(':');
    result = await supabase.rpc('resolve_rent_transfer_request', { transfer_request_uuid: id, approve_request: approve === '1' });
  } else if (ownerRequest) {
    const [id, status] = ownerRequest.dataset.liveOwnerRequest.split(':');
    result = await supabase.rpc('resolve_owner_request', { request_uuid: id, approve: status === 'approved' });
  } else if (setst) {
    const [id, status] = setst.dataset.pSetst.split(':');
    result = await supabase.rpc('set_unit_status', { unit_uuid: id, desired_status: status });
    layer('');
  } else if (remove) {
    if (!window.confirm('Delete this property and everything attached to it? This cannot be undone.')) return true;
    result = await supabase.from('listings').delete().eq('id', remove.dataset.liveDeleteListing);
    ui.admProp = null;
  } else return false;
  if (result.error) throw result.error;
  await refresh();
  return true;
}

export async function handlePortalChange(target, refresh, ctx = {}) {
  let result;
  if (target.matches('[data-p-ownerpick]')) { const box = document.getElementById('newOwner'); if (box) box.hidden = target.value !== '__new'; return true; }
  if (target.matches('[data-p-layfloor]')) { ui.floor = Number(target.value); ctx.rerender && ctx.rerender(); return true; }
  if (target.matches('[data-p-vdoc]')) {
    const card = target.closest('[data-vcard]'), tick = doc => !!(card.querySelector(`[data-doc="${doc}"]`) || {}).checked;
    result = await supabase.rpc('set_listing_verification', { listing_uuid: target.dataset.pVdoc, lc1_received: tick('lc1'), consent_received: tick('consent'), verification_action: 'save' });
  } else if (target.matches('[data-p-media-up]')) {
    const id = target.dataset.pMediaUp, files = [...target.files], start = (ctx.data && ctx.data.media || []).filter(m => m.listing_id === id).length;
    const lab = target.closest('label'), txt = lab && lab.querySelector('span');
    const bad = files.find(f => f.size > 50 * 1024 * 1024 || !/^(image\/(jpeg|png|webp)|video\/(mp4|webm|quicktime))$/.test(f.type));
    if (bad) { target.value = ''; throw new Error(`${bad.name} is not a JPEG, PNG or WebP photo or an MP4, WebM or MOV video under 50 MB.`); }
    if (!files.length) return true;
    if (lab) lab.classList.add('busy');
    try {
    for (let i = 0; i < files.length; i++) {
      if (txt) txt.textContent = `Uploading ${i + 1} of ${files.length}…`;
      const f = files[i], ext = (f.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, ''), path = `${id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from('listing-media').upload(path, f, { contentType: f.type, upsert: false });
      if (up.error) throw up.error;
      const url = supabase.storage.from('listing-media').getPublicUrl(path).data.publicUrl;
      const ins = await supabase.from('listing_media').insert({ listing_id: id, type: f.type.startsWith('video') ? 'video' : 'photo', url, sort_order: start + i });
      if (ins.error) throw ins.error;
    }
    } finally { if (lab) lab.classList.remove('busy'); if (txt) txt.textContent = 'Add photos or videos'; target.value = ''; }
    await refresh(); ctx.toast && ctx.toast(files.length === 1 ? 'Added to the gallery.' : `${files.length} files added to the gallery.`); return true;
  } else if (target.matches('[data-live-role]')) result = await supabase.from('profiles').update({ role: target.value, updated_at: new Date().toISOString() }).eq('id', target.dataset.liveRole);
  else if (target.matches('[data-live-queue]')) result = await supabase.from('admin_queue').update({ status: target.value, resolved_at: target.value === 'open' ? null : new Date().toISOString() }).eq('id', target.dataset.liveQueue);
  else if (target.matches('[data-live-maint]')) result = await supabase.from('maintenance_requests').update({ status: target.value, updated_at: new Date().toISOString() }).eq('id', target.dataset.liveMaint);
  else if (target.matches('[data-live-bill]')) result = await supabase.from('bills').update({ status: target.value, paid_at: target.value === 'paid' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', target.dataset.liveBill);
  else return false;
  if (result.error) throw result.error;
  await refresh();
  return true;
}

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
  const kind = form.dataset.liveForm;
  let result;
  if (kind === 'listing') {
    let owner = data.profiles.find(item => item.id === values.owner_id);
    if (values.owner_id === '__new') {
      const made = await ownerLoginsCall({ action: 'create_owner', full_name: values.new_name, email: values.new_email, phone: values.new_phone });
      owner = { id: made.owner_id, full_name: made.full_name };
    }
    if (!owner) throw new Error('Choose an owner for this property.');
    result = await supabase.from('listings').insert({
      name: values.name.trim(), type: values.type, area: values.area.trim(), price: Number(values.price),
      per: values.type === 'airbnb' ? 'night' : 'month', unit_type: values.unit_type.trim(), description: values.description.trim(),
      amenities: amenityList(values.amenities), owner_id: owner.id, owner_name: owner.full_name,
      verified: false, total_units: 0, available_units: 0
    });
  } else if (kind === 'edit-listing') {
    const updates = { name: values.name.trim(), area: values.area.trim(), price: Number(values.price), updated_at: new Date().toISOString() };
    if (values.description !== undefined) updates.description = values.description.trim();
    if (values.amenities !== undefined) updates.amenities = amenityList(values.amenities);
    result = await supabase.from('listings').update(updates).eq('id', form.dataset.listingId);
  } else if (kind === 'location') {
    let lat = values.lat === '' ? NaN : Number(values.lat), lng = values.lng === '' ? NaN : Number(values.lng);
    if (values.link && values.link.trim()) {
      const got = parseMapsLink(values.link);
      if (!got) throw new Error('That link has no coordinates in it. Short links cannot be read: open the link, then copy the full address from the browser bar, or type the coordinates.');
      ({ lat, lng } = got);
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('Enter a Google Maps link or both coordinates.');
    if (lat < -1.6 || lat > 4.3 || lng < 29.5 || lng > 35.1) throw new Error('Those coordinates are outside Uganda. Check that latitude and longitude are not swapped.');
    result = await supabase.from('listing_locations').upsert({ listing_id: form.dataset.listingId, lat, lng, address: (values.address || '').trim() || null, updated_at: new Date().toISOString() });
  } else if (kind === 'agreement') {
    result = await supabase.from('agreement_templates').upsert({ listing_id: form.dataset.listingId, notice_days: Number(values.notice), deposit_months: Number(values.deposit), late_fee_percent: Number(values.late), house_rules: (values.rules || '').trim() || null, updated_at: new Date().toISOString() });
  } else if (kind === 'layout') {
    result = await supabase.from('property_layouts').upsert({ listing_id: form.dataset.listingId, floor: Number(values.floor), columns: Number(values.columns), rows: Number(values.rows) }, { onConflict: 'listing_id,floor' });
    ui.floor = Number(values.floor);
  } else if (kind === 'unit') {
    result = await supabase.rpc('create_listing_unit', { listing_uuid: values.listing_id, requested_code: values.unit_code.trim(), requested_floor: Number(values.floor) || 0, requested_rent: Number(values.rent) });
  } else if (kind === 'bill') {
    result = await supabase.from('bills').insert({ listing_id: values.listing_id, category: values.category, name: values.name.trim(), amount: Number(values.amount), due_date: values.due_date, status: 'due' });
  } else if (kind === 'efris-reference') {
    result = await supabase.from('payments').update({ efris_document_no: values.efris_document_no.trim() }).eq('id', form.dataset.paymentId).eq('status', 'confirmed');
  } else if (kind === 'board-onboard') {
    result = await supabase.rpc('board_onboard', { listing_uuid: form.dataset.listingId, unit_uuid: values.unit_id, tenant_name: values.tenant_name, tenant_phone: values.phone, has_roommate: values.has_roommate === 'on', stay_months: Number(values.months), start_on: values.start_date, first_amount: Number(values.amount) || 0, first_method: values.method, booking_fee: values.booking_fee === 'on' });
  } else if (kind === 'board-pay') {
    result = await supabase.rpc('board_record_payment', { entry_uuid: form.dataset.entryId, payment_amount: Number(values.amount), payment_method: values.method });
  } else return false;
  if (result.error) throw result.error;
  form.reset();
  await refresh();
  return true;
}
