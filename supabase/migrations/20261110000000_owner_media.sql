-- Owners manage the photos and videos of their own properties, alongside the admin.
-- Files live in the listing-media bucket under "<listing id>/<file>"; the folder decides who may write.

create or replace function public.owns_media_folder(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.listings l
    where l.id::text = (storage.foldername(object_name))[1]
      and l.owner_id = auth.uid()
  );
$$;
revoke all on function public.owns_media_folder(text) from public, anon;
grant execute on function public.owns_media_folder(text) to authenticated;

drop policy if exists listing_media_files_owner_insert on storage.objects;
drop policy if exists listing_media_files_owner_delete on storage.objects;
create policy listing_media_files_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-media' and public.owns_media_folder(name));
create policy listing_media_files_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'listing-media' and public.owns_media_folder(name));

drop policy if exists listing_media_insert_owner on public.listing_media;
drop policy if exists listing_media_delete_owner on public.listing_media;
drop policy if exists listing_media_update_owner on public.listing_media;
drop policy if exists listing_media_update_admin on public.listing_media;
create policy listing_media_insert_owner on public.listing_media for insert to authenticated
  with check (public.is_listing_owner(listing_id));
create policy listing_media_delete_owner on public.listing_media for delete to authenticated
  using (public.is_listing_owner(listing_id));
create policy listing_media_update_owner on public.listing_media for update to authenticated
  using (public.is_listing_owner(listing_id)) with check (public.is_listing_owner(listing_id));
create policy listing_media_update_admin on public.listing_media for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Make one photo the cover (first in the gallery) without touching the others' order.
create or replace function public.set_media_cover(media_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.listing_media%rowtype;
begin
  select * into target from public.listing_media where id = media_uuid;
  if not found then raise exception 'Photo not found.'; end if;
  if not (public.is_admin() or public.is_listing_owner(target.listing_id)) then
    raise exception 'Only the owner or an administrator can change the cover photo.';
  end if;
  if target.type <> 'photo' then raise exception 'Only a photo can be the cover.'; end if;
  update public.listing_media
     set sort_order = (select coalesce(min(sort_order), 0) - 1 from public.listing_media where listing_id = target.listing_id)
   where id = media_uuid;
end;
$$;
revoke all on function public.set_media_cover(uuid) from public, anon;
grant execute on function public.set_media_cover(uuid) to authenticated;
