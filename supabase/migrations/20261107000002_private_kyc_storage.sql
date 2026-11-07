insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kyc-documents', 'kyc-documents', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = false, file_size_limit = 10485760,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists kyc_documents_select_own_or_admin on storage.objects;
create policy kyc_documents_select_own_or_admin on storage.objects
for select to authenticated
using (
  bucket_id = 'kyc-documents'
  and (owner_id = auth.uid()::text or public.is_admin())
);

drop policy if exists kyc_documents_insert_own on storage.objects;
create policy kyc_documents_insert_own on storage.objects
for insert to authenticated
with check (bucket_id = 'kyc-documents' and owner_id = auth.uid()::text);

drop policy if exists kyc_documents_update_own_or_admin on storage.objects;
create policy kyc_documents_update_own_or_admin on storage.objects
for update to authenticated
using (bucket_id = 'kyc-documents' and (owner_id = auth.uid()::text or public.is_admin()))
with check (bucket_id = 'kyc-documents' and (owner_id = auth.uid()::text or public.is_admin()));

drop policy if exists kyc_documents_delete_own_or_admin on storage.objects;
create policy kyc_documents_delete_own_or_admin on storage.objects
for delete to authenticated
using (bucket_id = 'kyc-documents' and (owner_id = auth.uid()::text or public.is_admin()));
