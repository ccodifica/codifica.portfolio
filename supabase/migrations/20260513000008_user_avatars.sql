-- ============================================================================
-- 008 — Avatares de usuário (foto de perfil)
--
-- Adiciona coluna `avatar_url` em profiles e cria o bucket público 'avatars'
-- para hospedar as fotos. Path pattern: {user_id}/{timestamp}.jpg
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Coluna em profiles
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is
  'URL pública do avatar do usuário (bucket avatars do Supabase Storage).';

-- ----------------------------------------------------------------------------
-- Bucket 'avatars' (PÚBLICO — URL direta carrega no <img>)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB (o crop client-side deixa bem abaixo disso)
  array['image/png','image/jpeg','image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- Helper: extrai o user_id do path do storage
-- Path esperado: {user_id}/qualquer-coisa.ext
-- ----------------------------------------------------------------------------
create or replace function public.storage_owns_avatar(object_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := split_part(object_name, '/', 1)::uuid;
  return uid = auth.uid();
exception
  when others then return false;
end;
$$;

-- ----------------------------------------------------------------------------
-- Policies em storage.objects para o bucket 'avatars'
-- ----------------------------------------------------------------------------

-- SELECT público — qualquer um vê (avatar aparece em listas, briefings, etc)
create policy "avatars_objects_select_public" on storage.objects
  for select
  using (bucket_id = 'avatars');

-- INSERT — só o dono pode subir avatar próprio; admin pode subir pra qualquer
create policy "avatars_objects_insert" on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and (public.is_admin() or public.storage_owns_avatar(name))
  );

-- UPDATE — só dono ou admin
create policy "avatars_objects_update" on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and (public.is_admin() or public.storage_owns_avatar(name))
  );

-- DELETE — só dono ou admin (pra trocar/remover avatar)
create policy "avatars_objects_delete" on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and (public.is_admin() or public.storage_owns_avatar(name))
  );
