// Owner logins, as described in "Rentpply: Platform Logic", Part 3, and administrator accounts.
// Only an administrator may call this; the administrator actions are for the super user only. It runs on Supabase with the service role key,
// which never reaches the browser. Passwords are returned once and never stored.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Readable, hard to guess: Rp-xxxx-xxxx-xxxx from an alphabet without look-alike characters.
function makePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  let s = '';
  for (const b of bytes) s += chars[b % chars.length];
  return `Rp-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Who is calling? Check their session, then their role in the database.
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return json({ error: 'Sign in again.' }, 401);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin' && me?.role !== 'super') return json({ error: 'Only an administrator can manage owner logins.' }, 403);

  const body = await req.json().catch(() => ({}));

  // A new owner: create the account now. It cannot be used until a login is issued.
  if (body.action === 'create_owner') {
    const email = String(body.email ?? '').trim().toLowerCase();
    const fullName = String(body.full_name ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Enter a valid email address for the owner. It becomes their username.' }, 400);
    if (fullName.length < 2) return json({ error: 'Enter the owner name.' }, 400);
    const { data, error } = await admin.auth.admin.createUser({
      email, password: makePassword() + makePassword(), email_confirm: true,
      user_metadata: { full_name: fullName, role: 'owner', phone }
    });
    if (error) return json({ error: error.message }, 400);
    await admin.from('owner_logins').upsert({ owner_id: data.user.id, username: email, issued_at: null, sent_at: null });
    return json({ owner_id: data.user.id, username: email, full_name: fullName });
  }

  // Issue (or reset) the login: a fresh password, shown to the admin once.
  if (body.action === 'issue_login') {
    const ownerId = String(body.owner_id ?? '');
    const { data: profile } = await admin.from('profiles').select('id, role').eq('id', ownerId).single();
    if (!profile || profile.role !== 'owner') return json({ error: 'That account is not a property owner.' }, 400);
    const { data: found, error: findError } = await admin.auth.admin.getUserById(ownerId);
    if (findError || !found?.user) return json({ error: 'Owner account not found.' }, 404);
    const password = makePassword();
    const { error } = await admin.auth.admin.updateUserById(ownerId, { password });
    if (error) return json({ error: error.message }, 400);
    await admin.from('owner_logins').upsert({ owner_id: ownerId, username: found.user.email, issued_at: new Date().toISOString(), sent_at: null });
    return json({ username: found.user.email, password });
  }

  // ---------- Administrators: only the super user may add them, reset their password or see their sign-in details ----------
  const isSuper = me?.role === 'super';
  if (['create_admin', 'admin_password', 'admin_list'].includes(body.action) && !isSuper) {
    return json({ error: 'Only the super user can manage administrators.' }, 403);
  }

  // A new administrator: their account is made here, and the password is shown once to the super user.
  if (body.action === 'create_admin') {
    const email = String(body.email ?? '').trim().toLowerCase();
    const fullName = String(body.full_name ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Enter a valid email address. It becomes their username.' }, 400);
    if (fullName.length < 2) return json({ error: 'Enter the administrator\'s name.' }, 400);
    const password = makePassword();
    // Every new account starts as a tenant; the role is raised here, with the service role, which the role guard allows.
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName, role: 'tenant', phone } });
    if (error) return json({ error: /already/i.test(error.message) ? 'That email already has an account. Use "Make someone an admin" instead.' : error.message }, 400);
    const { error: roleError } = await admin.from('profiles').update({ role: 'admin', full_name: fullName, phone: phone || null, updated_at: new Date().toISOString() }).eq('id', data.user.id);
    if (roleError) { await admin.auth.admin.deleteUser(data.user.id); return json({ error: roleError.message }, 400); }
    return json({ user_id: data.user.id, username: email, password, full_name: fullName });
  }

  // A new password for an administrator who lost theirs.
  if (body.action === 'admin_password') {
    const targetId = String(body.user_id ?? '');
    const { data: target } = await admin.from('profiles').select('id, role').eq('id', targetId).single();
    if (!target || target.role !== 'admin') return json({ error: 'That account is not an administrator.' }, 400);
    const password = makePassword();
    const { data: updated, error } = await admin.auth.admin.updateUserById(targetId, { password });
    if (error) return json({ error: error.message }, 400);
    return json({ username: updated.user.email, password });
  }

  // The administrators' email addresses and when they last signed in (these live in the sign-in system, not in profiles).
  if (body.action === 'admin_list') {
    const { data: staff, error } = await admin.from('profiles').select('id').in('role', ['admin', 'super']);
    if (error) return json({ error: error.message }, 400);
    const admins = await Promise.all((staff ?? []).map(async (p: { id: string }) => {
      const { data: found } = await admin.auth.admin.getUserById(p.id);
      return { id: p.id, email: found?.user?.email ?? '', last_sign_in_at: found?.user?.last_sign_in_at ?? null };
    }));
    return json({ admins });
  }

  return json({ error: 'Unknown action.' }, 400);
});
