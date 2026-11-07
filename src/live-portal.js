import { supabase } from './lib/supabase.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = value => 'UGX ' + Math.round(Number(value) || 0).toLocaleString('en-US');
const date = value => value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set';
const pill = value => `<span class="pill ${['verified', 'confirmed', 'accepted', 'paid', 'done'].includes(String(value).toLowerCase()) ? 'ok' : 'warn'}">${esc(value)}</span>`;
const options = (values, selected) => values.map(value => `<option value="${value}" ${value === selected ? 'selected' : ''}>${value}</option>`).join('');
const field = (label, name, type = 'text') => `<label class="field"><span>${label}</span><input class="inp" name="${name}" type="${type}" required></label>`;

export async function loadPortalData(role, userId) {
  if (!supabase || !userId) return null;
  const query = supabase.from('listings').select('*').order('created_at', { ascending: false });
  if (role !== 'admin') query.eq('owner_id', userId);
  const { data: properties, error } = await query;
  if (error) throw error;
  const ids = (properties || []).map(item => item.id);
  const requests = ids.length ? [
    supabase.from('units').select('*').in('listing_id', ids),
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

function listingForm(role, profile, profiles) {
  return `<form class="card stack" data-live-form="listing"><div><span class="eyebrow">${role === 'admin' ? 'Admin listing editor' : 'New property'}</span><h3>List a property</h3></div>
    ${role === 'admin' ? `<label class="field"><span>Owner</span><select class="inp" name="owner_id" required>${profiles.filter(item => item.role === 'owner').map(item => `<option value="${esc(item.id)}">${esc(item.full_name)}</option>`).join('')}</select></label>` : ''}
    ${field('Property name', 'name')}<div class="grid">${field('Area', 'area')}${field('Price (UGX)', 'price', 'number')}</div>
    <div class="grid"><label class="field"><span>Type</span><select class="inp" name="type">${options(['hostel', 'rental', 'airbnb'], 'hostel')}</select></label>${field('Room type', 'unit_type')}</div>
    ${field('Description', 'description')}<button class="btn" type="submit">Save property</button></form>`;
}

function ownerView(tab, data, profile) {
  const adminPreview = profile.role === 'admin';
  const { listings, units, payments, agreements, maintenance, bills } = data;
  if (tab === 'overview') return `<section class="sec"><div class="sec-h"><div><span class="eyebrow">${adminPreview ? 'Admin view' : 'Property owner'}</span><h2>${adminPreview ? 'Owner workspace preview' : 'Property workspace'}</h2></div></div>${adminPreview ? '<p class="muted">Read-only preview across owner records.</p>' : ''}
    <div class="tgrid">${[['Properties', listings.length], ['Rooms', units.length], ['Pending payments', payments.filter(item => item.status === 'pending').length], ['Open requests', maintenance.filter(item => item.status !== 'done').length]].map(([label, total]) => `<div class="card tile2"><span class="muted">${label}</span><b class="num">${total}</b></div>`).join('')}</div>
    ${listings.length ? `<div class="stack">${listings.map(item => adminPreview ? `<article class="card row" style="justify-content:space-between"><span><b>${esc(item.name)}</b><small class="muted">${esc(item.area)} · ${esc(item.type)} · ${money(item.price)} · ${item.available_units} available</small></span>${pill(item.verified ? 'Verified' : 'Pending')}</article>` : `<form class="card grid" data-live-form="edit-listing" data-listing-id="${esc(item.id)}"><label class="field"><span>Property name</span><input class="inp" name="name" value="${esc(item.name)}" required></label><label class="field"><span>Area</span><input class="inp" name="area" value="${esc(item.area)}" required></label><label class="field"><span>Price (UGX)</span><input class="inp" name="price" type="number" value="${item.price}" required></label><label class="field"><span>Description</span><input class="inp" name="description" value="${esc(item.description || '')}"></label><span>${pill(item.verified ? 'Verified' : 'Pending')}</span><button class="btn sm" type="submit">Save property</button></form>`).join('')}</div>` : adminPreview ? '<p class="card muted">No property records are available.</p>' : listingForm('owner', profile, [])}</section>`;
  if (tab === 'units') return `<section class="sec"><div class="sec-h"><div><span class="eyebrow">Live inventory</span><h2>Rooms and availability</h2></div></div>${listings.map(property => `<h3>${esc(property.name)}</h3><div class="card" style="overflow:auto"><table><thead><tr><th>Room</th><th>Floor</th><th>Rent</th><th>Status</th>${adminPreview ? '' : '<th>Update</th>'}</tr></thead><tbody>${units.filter(unit => unit.listing_id === property.id).map(unit => `<tr><td>${esc(unit.unit_code)}</td><td>${unit.floor}</td><td>${money(unit.rent)}</td><td>${pill(unit.status)}</td>${adminPreview ? '' : `<td><select class="inp" data-live-unit="${esc(unit.id)}">${options(['vacant', 'occupied', 'reserved', 'maint'], unit.status)}</select></td>`}</tr>`).join('') || '<tr><td colspan="5">No rooms yet.</td></tr>'}</tbody></table></div>`).join('') || '<p class="card muted">Add a property to manage rooms.</p>'}${!adminPreview && listings.length ? `<form class="card grid" data-live-form="unit"><label class="field"><span>Property</span><select class="inp" name="listing_id">${listings.map(item => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('')}</select></label>${field('Room code', 'unit_code')}${field('Floor', 'floor', 'number')}${field('Rent (UGX)', 'rent', 'number')}<button class="btn" type="submit">Add room</button></form>` : ''}</section>`;
  if (tab === 'payments') return `<section class="sec"><div class="sec-h"><div><span class="eyebrow">Payment records</span><h2>Payments</h2></div></div><div class="card" style="overflow:auto"><table><thead><tr><th>Reference</th><th>Tenant</th><th>Purpose</th><th>Total</th><th>Status</th>${adminPreview ? '' : '<th>Review</th>'}</tr></thead><tbody>${payments.map(item => `<tr><td>${esc(item.reference)}</td><td>${esc(item.tenant_name)}</td><td>${esc(item.purpose)}</td><td>${money(item.amount + item.fee + item.deposit)}</td><td>${pill(item.status)}</td>${adminPreview ? '' : `<td>${item.status === 'pending' ? `<button class="btn sm" data-live-payment="${esc(item.id)}:confirmed">Confirm</button> <button class="btn ghost sm" data-live-payment="${esc(item.id)}:rejected">Reject</button>` : '-'}</td>`}</tr>`).join('') || '<tr><td colspan="6">No payments recorded.</td></tr>'}</tbody></table></div></section>`;
  if (tab === 'tax') {
    const confirmed = payments.filter(item => item.status === 'confirmed');
    const revenue = confirmed.reduce((sum, item) => sum + item.amount, 0);
    const recorded = confirmed.filter(item => item.efris_document_no).length;
    return `<section class="sec"><div class="sec-h"><div><span class="eyebrow">Based on confirmed Supabase payments</span><h2>Tax and receipt records</h2></div></div>
      <p class="notice">Rentpply does not connect to URA EFRIS yet. Record the receipt reference after it has been issued through the official EFRIS service.</p>
      <div class="tgrid"><div class="card tile2"><span class="muted">Confirmed rent</span><b class="num">${money(revenue)}</b></div><div class="card tile2"><span class="muted">Confirmed payments</span><b class="num">${confirmed.length}</b></div><div class="card tile2"><span class="muted">Receipt references recorded</span><b class="num">${recorded} / ${confirmed.length}</b></div></div>
      <div class="card" style="overflow:auto"><table><thead><tr><th>Payment</th><th>Tenant</th><th>Rent amount</th><th>Confirmed</th><th>Receipt reference</th></tr></thead><tbody>${confirmed.map(item => `<tr><td>${esc(item.reference)}</td><td>${esc(item.tenant_name)}</td><td>${money(item.amount)}</td><td>${date(item.confirmed_at)}</td><td>${item.efris_document_no ? `<span class="mono">${esc(item.efris_document_no)}</span>` : adminPreview ? 'Not recorded' : `<form class="row" data-live-form="efris-reference" data-payment-id="${esc(item.id)}"><input class="inp" name="efris_document_no" aria-label="EFRIS receipt reference for ${esc(item.reference)}" placeholder="External EFRIS reference" required><button class="btn sm" type="submit">Save reference</button></form>`}</td></tr>`).join('') || '<tr><td colspan="5">No confirmed payments yet.</td></tr>'}</tbody></table></div>
    </section>`;
  }
  if (tab === 'requests') return `<section class="sec">
    <div class="sec-h"><div><span class="eyebrow">Live tenant activity</span><h2>Requests</h2></div></div>
    <h3>Maintenance</h3><div class="card" style="overflow:auto"><table><thead><tr><th>Room</th><th>Issue</th><th>Urgency</th><th>Created</th><th>Status</th>${adminPreview ? '' : '<th>Update</th>'}</tr></thead><tbody>${maintenance.map(item => `<tr><td>${esc(item.room_code)}</td><td>${esc(item.type)} · ${esc(item.note)}</td><td>${item.urgent ? 'Urgent' : 'Standard'}</td><td>${date(item.created_at)}</td><td>${pill(item.status)}</td>${adminPreview ? '' : `<td><select class="inp" data-live-maint="${esc(item.id)}">${options(['open', 'work', 'done'], item.status)}</select></td>`}</tr>`).join('') || '<tr><td colspan="6">No maintenance requests.</td></tr>'}</tbody></table></div>
    <h3>Rent-transfer requests</h3><div class="card" style="overflow:auto"><table><thead><tr><th>Requester</th><th>Room</th><th>Price</th><th>Available</th><th>Status</th><th>Decision</th></tr></thead><tbody>${data.transferRequests.map(request => { const transfer = data.transfers.find(item => item.id === request.transfer_id); return `<tr><td>${esc(request.requester?.full_name || 'Tenant')}</td><td>${esc(transfer?.room_code || '-')}</td><td>${money(transfer?.price_per_month)}</td><td>${date(transfer?.available_from)}</td><td>${pill(request.status)}</td><td>${request.status === 'pending' && !adminPreview ? `<button class="btn sm" data-live-transfer-request="${esc(request.id)}:1">Approve</button> <button class="btn ghost sm" data-live-transfer-request="${esc(request.id)}:0">Decline</button>` : '-'}</td></tr>`; }).join('') || '<tr><td colspan="6">No transfer requests.</td></tr>'}</tbody></table></div>
    <h3>Other owner requests</h3><div class="card" style="overflow:auto"><table><thead><tr><th>Type</th><th>Requester</th><th>Details</th><th>Status</th><th>Decision</th></tr></thead><tbody>${data.ownerRequests.filter(item => !item.details.startsWith('rent_transfer_request:')).map(item => `<tr><td>${esc(item.kind)}</td><td>${esc(item.requester_name)}</td><td>${esc(item.details)}</td><td>${pill(item.status)}</td><td>${item.status === 'open' && !adminPreview ? `<button class="btn sm" data-live-owner-request="${esc(item.id)}:approved">Approve</button> <button class="btn ghost sm" data-live-owner-request="${esc(item.id)}:declined">Decline</button>` : '-'}</td></tr>`).join('') || '<tr><td colspan="5">No other requests.</td></tr>'}</tbody></table></div>
  </section>`;
  return `<section class="sec"><div class="sec-h"><div><span class="eyebrow">Rental records</span><h2>Agreements and bills</h2></div></div><div class="grid"><div><h3>Agreements</h3>${agreements.map(item => `<div class="card row" style="justify-content:space-between"><span>${esc(item.reference)} · ${esc(item.tenant_name)}</span>${pill(item.status)}</div>`).join('') || '<p class="muted">No agreements yet.</p>'}</div><div><h3>Bills</h3>${bills.map(item => `<div class="card row" style="justify-content:space-between"><span>${esc(item.name)} · ${date(item.due_date)} · ${money(item.amount)}</span>${adminPreview ? pill(item.status) : `<select class="inp" data-live-bill="${esc(item.id)}">${options(['due', 'paid', 'overdue'], item.status)}</select>`}</div>`).join('') || '<p class="muted">No bills recorded.</p>'}</div></div>${!adminPreview && listings.length ? `<form class="card stack" data-live-form="bill"><h3>Add a bill</h3><label class="field"><span>Property</span><select class="inp" name="listing_id">${listings.map(item => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('')}</select></label><div class="grid"><label class="field"><span>Category</span><select class="inp" name="category">${options(['water', 'power', 'tv', 'staff'], 'water')}</select></label>${field('Provider or worker', 'name')}${field('Amount (UGX)', 'amount', 'number')}${field('Due date', 'due_date', 'date')}</div><button class="btn" type="submit">Save bill</button></form>` : ''}</section>`;
}

function adminView(tab, data, profile) {
  const pending = data.listings.filter(item => !item.verified);
  if (tab === 'queue') return `<section class="sec">
    <div class="sec-h"><div><span class="eyebrow">Administrator</span><h2>Review queue</h2></div></div>
    <div class="tgrid">${[['Pending listings', pending.length], ['Open queue items', data.queue.filter(item => item.status === 'open').length], ['KYC reviews', data.profiles.filter(item => item.kyc_status === 'review').length], ['Accounts', data.profiles.length]].map(([label, total]) => `<div class="card tile2"><span class="muted">${label}</span><b class="num">${total}</b></div>`).join('')}</div>
    <h3>Unverified properties</h3><div class="stack">${pending.map(item => `<article class="card row" style="justify-content:space-between"><span><b>${esc(item.name)}</b><small class="muted">${esc(item.area)} · ${esc(item.owner_name)}</small></span><button class="btn sm" data-live-verify="${esc(item.id)}">Verify</button></article>`).join('') || '<p class="muted">No listings waiting for review.</p>'}</div>
    <h3>Identity reviews</h3><div class="stack">${data.profiles.filter(item => item.kyc_status === 'review').map(item => `<article class="card stack"><div class="row" style="justify-content:space-between"><span><b>${esc(item.full_name)}</b><small class="muted">${esc(item.id)}</small></span>${pill('In review')}</div><div class="row"><button class="btn ghost sm" data-live-kyc-doc="${esc(item.id_document_url)}">View ID</button><button class="btn ghost sm" data-live-kyc-doc="${esc(item.selfie_url)}">View selfie</button>${item.student_proof_url ? `<button class="btn ghost sm" data-live-kyc-doc="${esc(item.student_proof_url)}">Student proof</button>` : ''}<button class="btn sm" data-live-kyc="${esc(item.id)}:verified">Verify</button><button class="btn ghost sm" data-live-kyc="${esc(item.id)}:none">Request resubmission</button></div></article>`).join('') || '<p class="muted">No identity reviews waiting.</p>'}</div>
    <h3>Account roles</h3><div class="card" style="overflow:auto"><table><thead><tr><th>Name</th><th>Account ID</th><th>Role</th><th>Change role</th></tr></thead><tbody>${data.profiles.map(item => `<tr><td>${esc(item.full_name)}</td><td class="mono">${esc(item.id)}</td><td>${pill(item.role)}</td><td><select class="inp" data-live-role="${esc(item.id)}" ${item.id === profile.id ? 'disabled' : ''}>${options(['tenant', 'student', 'owner', 'admin'], item.role)}</select></td></tr>`).join('')}</tbody></table></div>
    <h3>Payments requiring review</h3><div class="card" style="overflow:auto"><table><thead><tr><th>Reference</th><th>Property</th><th>Tenant</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>${data.payments.filter(item => item.status === 'pending').map(item => `<tr><td>${esc(item.reference)}</td><td>${esc(data.listings.find(listing => listing.id === item.listing_id)?.name || 'Property')}</td><td>${esc(item.tenant_name)}</td><td>${money(item.amount + item.fee + item.deposit)}</td><td>${pill(item.status)}</td><td><button class="btn sm" data-live-payment="${esc(item.id)}:confirmed">Confirm</button> <button class="btn ghost sm" data-live-payment="${esc(item.id)}:rejected">Reject</button></td></tr>`).join('') || '<tr><td colspan="6">No payments waiting for review.</td></tr>'}</tbody></table></div>
    <h3>Maintenance requests</h3><div class="card" style="overflow:auto"><table><thead><tr><th>Property</th><th>Room</th><th>Issue</th><th>Status</th><th>Update</th></tr></thead><tbody>${data.maintenance.map(item => `<tr><td>${esc(data.listings.find(listing => listing.id === item.listing_id)?.name || 'Property')}</td><td>${esc(item.room_code)}</td><td>${esc(item.type)} · ${esc(item.note)}</td><td>${pill(item.status)}</td><td><select class="inp" data-live-maint="${esc(item.id)}">${options(['open', 'work', 'done'], item.status)}</select></td></tr>`).join('') || '<tr><td colspan="5">No maintenance requests.</td></tr>'}</tbody></table></div>
    <h3>Rent-transfer approvals</h3><div class="card" style="overflow:auto"><table><thead><tr><th>Requester</th><th>Property</th><th>Room</th><th>Status</th><th>Decision</th></tr></thead><tbody>${data.transferRequests.map(request => `<tr><td>${esc(request.requester?.full_name || 'Tenant')}</td><td>${esc(data.listings.find(item => item.id === data.transfers.find(transfer => transfer.id === request.transfer_id)?.listing_id)?.name || 'Property')}</td><td>${esc(data.transfers.find(transfer => transfer.id === request.transfer_id)?.room_code || '-')}</td><td>${pill(request.status)}</td><td>${request.status === 'pending' ? `<button class="btn sm" data-live-transfer-request="${esc(request.id)}:1">Approve</button> <button class="btn ghost sm" data-live-transfer-request="${esc(request.id)}:0">Decline</button>` : '-'}</td></tr>`).join('') || '<tr><td colspan="5">No transfer approvals waiting.</td></tr>'}</tbody></table></div>
    <h3>Queue items</h3><div class="card" style="overflow:auto"><table><thead><tr><th>Type</th><th>Subject</th><th>Details</th><th>Status</th><th>Update</th></tr></thead><tbody>${data.queue.map(item => `<tr><td>${esc(item.kind)}</td><td>${esc(item.subject_name)}</td><td>${esc(item.details)}</td><td>${pill(item.status)}</td><td><select class="inp" data-live-queue="${esc(item.id)}">${options(['open', 'approved', 'rejected'], item.status)}</select></td></tr>`).join('') || '<tr><td colspan="5">No queue items.</td></tr>'}</tbody></table></div>
  </section>`;
  if (tab === 'units') return `<section class="sec"><div class="sec-h"><div><span class="eyebrow">All properties</span><h2>Unit inventory</h2></div></div><div class="card" style="overflow:auto"><table><thead><tr><th>Property</th><th>Room</th><th>Floor</th><th>Tenant</th><th>Rent</th><th>Status</th></tr></thead><tbody>${data.units.map(unit => `<tr><td>${esc(data.listings.find(item => item.id === unit.listing_id)?.name || 'Property')}</td><td>${esc(unit.unit_code)}</td><td>${unit.floor}</td><td>${esc(unit.tenant_name || '-')}</td><td>${money(unit.rent)}</td><td><select class="inp" data-live-unit="${esc(unit.id)}">${options(['vacant', 'occupied', 'reserved', 'maint'], unit.status)}</select></td></tr>`).join('') || '<tr><td colspan="6">No unit records.</td></tr>'}</tbody></table></div></section>`;
  if (tab === 'prop') return `<section class="sec"><div class="sec-h"><div><span class="eyebrow">Administrator</span><h2>Property records</h2></div></div>${listingForm('admin', profile, data.profiles)}<div class="stack">${data.listings.map(item => `<article class="card row" style="justify-content:space-between"><span><b>${esc(item.name)}</b><small class="muted">${esc(item.area)} · ${esc(item.owner_name)} · ${money(item.price)}</small></span>${pill(item.verified ? 'Verified' : 'Pending')}</article>`).join('')}</div></section>`;
  if (tab === 'listings') return `<section class="sec"><div class="sec-h"><div><span class="eyebrow">Catalog controls</span><h2>Listings</h2></div></div><div class="stack">${data.listings.map(item => `<form class="card grid" data-live-form="edit-listing" data-listing-id="${esc(item.id)}"><label class="field"><span>Property</span><input class="inp" name="name" value="${esc(item.name)}" required></label><label class="field"><span>Area</span><input class="inp" name="area" value="${esc(item.area)}" required></label><label class="field"><span>Price (UGX)</span><input class="inp" name="price" type="number" value="${item.price}" required></label><label class="field"><span>Verified</span><select class="inp" name="verified">${options(['true', 'false'], String(item.verified))}</select></label><button class="btn sm" type="submit">Save changes</button><button class="btn ghost sm" type="button" data-live-delete-listing="${esc(item.id)}">Delete</button></form>`).join('') || '<p class="card muted">No listings in the database.</p>'}</div></section>`;
  return `<section class="sec"><div class="sec-h"><div><span class="eyebrow">Live database totals</span><h2>Platform overview</h2></div></div><div class="tgrid">${[['Profiles', data.profiles.length], ['Properties', data.listings.length], ['Units', data.units.length], ['Payments', data.payments.length], ['Agreements', data.agreements.length], ['Maintenance', data.maintenance.length], ['Open queue', data.queue.filter(item => item.status === 'open').length]].map(([label, total]) => `<div class="card tile2"><span class="muted">${label}</span><b class="num">${total}</b></div>`).join('')}</div></section>`;
}

export function renderPortal(role, tab, data, profile) {
  if (!data) return '<section class="sec"><div class="card skeleton" style="height:120px"></div><div class="tgrid"><div class="card skeleton" style="height:90px"></div><div class="card skeleton" style="height:90px"></div><div class="card skeleton" style="height:90px"></div></div></section>';
  return role === 'admin' ? adminView(tab, data, profile) : ownerView(tab, data, profile);
}

export async function handlePortalClick(target, refresh) {
  const verify = target.closest('[data-live-verify]');
  const kyc = target.closest('[data-live-kyc]');
  const kycDoc = target.closest('[data-live-kyc-doc]');
  const payment = target.closest('[data-live-payment]');
  const remove = target.closest('[data-live-delete-listing]');
  const transferRequest = target.closest('[data-live-transfer-request]');
  const ownerRequest = target.closest('[data-live-owner-request]');
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
  }
  else if (payment) {
    const [id, status] = payment.dataset.livePayment.split(':');
    result = await supabase.rpc('resolve_payment', { payment_uuid: id, confirm_payment: status === 'confirmed' });
  } else if (transferRequest) {
    const [id, approve] = transferRequest.dataset.liveTransferRequest.split(':');
    result = await supabase.rpc('resolve_rent_transfer_request', { transfer_request_uuid: id, approve_request: approve === '1' });
  } else if (ownerRequest) {
    const [id, status] = ownerRequest.dataset.liveOwnerRequest.split(':');
    result = await supabase.from('owner_requests').update({ status, resolved_at: new Date().toISOString() }).eq('id', id);
  } else if (remove) result = await supabase.from('listings').delete().eq('id', remove.dataset.liveDeleteListing);
  else return false;
  if (result.error) throw result.error;
  await refresh();
  return true;
}

export async function handlePortalChange(target, refresh) {
  let result;
  if (target.matches('[data-live-role]')) result = await supabase.from('profiles').update({ role: target.value, updated_at: new Date().toISOString() }).eq('id', target.dataset.liveRole);
  else if (target.matches('[data-live-queue]')) result = await supabase.from('admin_queue').update({ status: target.value, resolved_at: target.value === 'open' ? null : new Date().toISOString() }).eq('id', target.dataset.liveQueue);
  else if (target.matches('[data-live-unit]')) {
    result = await supabase.rpc('set_unit_status', { unit_uuid: target.dataset.liveUnit, desired_status: target.value });
  }
  else if (target.matches('[data-live-maint]')) result = await supabase.from('maintenance_requests').update({ status: target.value, updated_at: new Date().toISOString() }).eq('id', target.dataset.liveMaint);
  else if (target.matches('[data-live-bill]')) result = await supabase.from('bills').update({ status: target.value, paid_at: target.value === 'paid' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', target.dataset.liveBill);
  else return false;
  if (result.error) throw result.error;
  await refresh();
  return true;
}

export async function handlePortalSubmit(form, role, user, profile, data, refresh) {
  const values = Object.fromEntries(new FormData(form));
  let result;
  if (form.dataset.liveForm === 'listing') {
    const owner = data.profiles.find(item => item.id === values.owner_id);
    result = await supabase.from('listings').insert({
      name: values.name.trim(), type: values.type, area: values.area.trim(), price: Number(values.price),
      per: values.type === 'airbnb' ? 'night' : 'month', unit_type: values.unit_type.trim(), description: values.description.trim(),
      owner_id: role === 'admin' ? values.owner_id : user.id, owner_name: owner?.full_name || profile.full_name,
      verified: role === 'admin', total_units: 0, available_units: 0
    });
  } else if (form.dataset.liveForm === 'edit-listing') {
    const updates = { name: values.name.trim(), area: values.area.trim(), price: Number(values.price), updated_at: new Date().toISOString() };
    if (values.description !== undefined) updates.description = values.description.trim();
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
