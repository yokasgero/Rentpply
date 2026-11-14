-- Phone notifications: every in-app notification is also sent to the person's devices that turned them on.
create extension if not exists pg_net with schema extensions;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists push_subscriptions_own_select on public.push_subscriptions;
drop policy if exists push_subscriptions_own_insert on public.push_subscriptions;
drop policy if exists push_subscriptions_own_update on public.push_subscriptions;
drop policy if exists push_subscriptions_own_delete on public.push_subscriptions;
create policy push_subscriptions_own_select on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy push_subscriptions_own_insert on public.push_subscriptions for insert to authenticated with check (user_id = auth.uid());
create policy push_subscriptions_own_update on public.push_subscriptions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_subscriptions_own_delete on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());

-- Secrets live in Supabase Vault. The sending keys are created by the send-push function on first use.
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'push_hook_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'push_hook_secret', 'Shared secret between the notifications trigger and the send-push function');
  end if;
end $$;

create or replace function public.push_secret(secret_name text)
returns text language sql stable security definer set search_path = public, vault as $$
  select decrypted_secret from vault.decrypted_secrets where name = secret_name limit 1;
$$;
revoke all on function public.push_secret(text) from public, anon, authenticated;
grant execute on function public.push_secret(text) to service_role;

create or replace function public.push_store_keys(public_key text, private_key text)
returns void language plpgsql security definer set search_path = public, vault as $$
begin
  if not exists (select 1 from vault.secrets where name = 'push_vapid_public') then
    perform vault.create_secret(public_key, 'push_vapid_public', 'Public key for phone notifications');
    perform vault.create_secret(private_key, 'push_vapid_private', 'Private key for phone notifications');
  end if;
end $$;
revoke all on function public.push_store_keys(text, text) from public, anon, authenticated;
grant execute on function public.push_store_keys(text, text) to service_role;

-- The public key is safe to hand to signed-in browsers so they can subscribe.
create or replace function public.push_public_key()
returns text language sql stable security definer set search_path = public, vault as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'push_vapid_public' limit 1;
$$;
revoke all on function public.push_public_key() from public, anon;
grant execute on function public.push_public_key() to authenticated;

-- Each new notification pings send-push, but only when that person has a device subscribed.
create or replace function public.notify_push()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.push_subscriptions where user_id = new.user_id) then
    perform net.http_post(
      url := 'https://uacsoexkrvvdgdqotimg.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', public.push_secret('push_hook_secret')),
      body := jsonb_build_object('notification_id', new.id)
    );
  end if;
  return new;
exception when others then
  return new; -- a phone notification must never block the in-app one
end $$;
drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push after insert on public.notifications for each row execute function public.notify_push();
