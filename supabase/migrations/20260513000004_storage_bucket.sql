-- ============================================================================
-- 004 — Storage bucket de anexos
--
-- Cria o bucket privado 'attachments' (10 MB por arquivo, MIME types
-- permitidos) e policies de leitura/escrita baseadas em ownership do projeto.
-- Path pattern: {project_id}/{message_id}/{filename}
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  10485760, -- 10 MB
  array[
    'image/png','image/jpeg','image/gif','image/webp','image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-zip-compressed',
    'text/plain'
  ]
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- Helper para extrair project_id do path do storage e validar ownership
-- ----------------------------------------------------------------------------
create or replace function public.storage_owns_project(object_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
begin
  pid := split_part(object_name, '/', 1)::uuid;
  return public.owns_project(pid);
exception
  when others then return false;
end;
$$;

-- ----------------------------------------------------------------------------
-- Policies em storage.objects para o bucket 'attachments'
-- ----------------------------------------------------------------------------

create policy "attachments_objects_select" on storage.objects
  for select
  using (
    bucket_id = 'attachments'
    and (public.is_admin() or public.storage_owns_project(name))
  );

create policy "attachments_objects_insert" on storage.objects
  for insert
  with check (
    bucket_id = 'attachments'
    and (public.is_admin() or public.storage_owns_project(name))
  );

create policy "attachments_objects_update_admin" on storage.objects
  for update
  using (
    bucket_id = 'attachments' and public.is_admin()
  );

create policy "attachments_objects_delete_admin" on storage.objects
  for delete
  using (
    bucket_id = 'attachments' and public.is_admin()
  );
