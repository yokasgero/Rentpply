// Phone notifications. Called by the notifications trigger for every new notification of a person who turned
// phone notifications on. The sending keys are created here on first use and kept in Supabase Vault; the
// private key never leaves the server.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-push-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  const secret = async (name: string) => (await admin.rpc('push_secret', { secret_name: name })).data as string | null;
  const body = await req.json().catch(() => ({}));

  let pub = await secret('push_vapid_public'), priv = await secret('push_vapid_private');
  if (!pub || !priv) {
    const keys = webpush.generateVAPIDKeys();
    await admin.rpc('push_store_keys', { public_key: keys.publicKey, private_key: keys.privateKey });
    pub = await secret('push_vapid_public'); priv = await secret('push_vapid_private');
  }
  if (body.action === 'init') return json({ ready: !!pub });

  const hook = await secret('push_hook_secret');
  if (!hook || req.headers.get('x-push-secret') !== hook) return json({ error: 'Not allowed' }, 403);

  const { data: note } = await admin.from('notifications').select('id, user_id, title, message, type').eq('id', body.notification_id).single();
  if (!note) return json({ error: 'Notification not found' }, 404);
  const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', note.user_id);

  webpush.setVapidDetails('https://rentpply.pages.dev', pub!, priv!);
  const payload = JSON.stringify({ title: note.title || 'Rentpply', body: note.message || '', url: '/', tag: note.id });
  let sent = 0; const gone: string[] = [];
  for (const s of subs || []) {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 }); sent++; }
    catch (e) { const code = (e as { statusCode?: number }).statusCode; if (code === 404 || code === 410) gone.push(s.id); }
  }
  if (gone.length) await admin.from('push_subscriptions').delete().in('id', gone);
  return json({ sent, removed: gone.length });
});
