-- ============================================================================
-- 002 — Functions e triggers
--
-- Helpers usados nas policies (is_admin, owns_project) + triggers de
-- updated_at, criação automática de profile no signup, e proteção de role.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- is_admin(): retorna true se o usuário autenticado tem role='admin'
-- SECURITY DEFINER pra evitar recursão de RLS ao ler profiles
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- owns_project(pid): retorna true se o projeto pertence ao usuário autenticado
-- ----------------------------------------------------------------------------
create or replace function public.owns_project(pid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.projects
    where id = pid and cliente_id = auth.uid()
  );
$$;

-- ----------------------------------------------------------------------------
-- handle_new_user(): trigger em auth.users — cria profile automaticamente
-- Lê dos raw_user_meta_data (passados no signUp) os campos extras
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, nome, email, celular, empresa, cargo, ramo
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'celular', ''),
    nullif(new.raw_user_meta_data->>'empresa', ''),
    nullif(new.raw_user_meta_data->>'cargo', ''),
    nullif(new.raw_user_meta_data->>'ramo', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- set_updated_at(): trigger genérico pra atualizar updated_at em UPDATEs
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger meetings_set_updated_at
  before update on public.meetings
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- prevent_role_self_promotion(): impede usuário comum de mudar próprio role
-- (apenas admins podem alterar role de qualquer profile)
-- ----------------------------------------------------------------------------
create or replace function public.prevent_role_self_promotion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Apenas administradores podem alterar o role do profile.';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_self_promotion
  before update of role on public.profiles
  for each row execute function public.prevent_role_self_promotion();
