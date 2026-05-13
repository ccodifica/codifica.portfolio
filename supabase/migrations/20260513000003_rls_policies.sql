-- ============================================================================
-- 003 — Row Level Security
--
-- Habilita RLS em todas as tabelas e cria as policies (negado por default,
-- libera só o que estiver explícito).
-- ============================================================================

alter table public.profiles            enable row level security;
alter table public.projects            enable row level security;
alter table public.messages            enable row level security;
alter table public.message_attachments enable row level security;
alter table public.meetings            enable row level security;
alter table public.project_events      enable row level security;

-- ============================================================================
-- profiles
-- ============================================================================

-- SELECT: usuário lê o próprio profile; admin lê todos
create policy "profiles_select" on public.profiles
  for select
  using (id = auth.uid() or public.is_admin());

-- INSERT: bloqueado para qualquer cliente. O trigger handle_new_user é
-- SECURITY DEFINER e cria o profile contornando RLS no signup.
-- (sem policy = denied by default)

-- UPDATE (próprio): usuário atualiza dados do próprio profile.
-- Não pode mudar 'role' — bloqueado pelo trigger prevent_role_self_promotion.
create policy "profiles_update_own" on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- UPDATE / DELETE (admin): admin altera/remove qualquer profile
create policy "profiles_update_admin" on public.profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "profiles_delete_admin" on public.profiles
  for delete
  using (public.is_admin());

-- ============================================================================
-- projects
-- ============================================================================

create policy "projects_select" on public.projects
  for select
  using (cliente_id = auth.uid() or public.is_admin());

-- Cliente só consegue criar projeto associado ao próprio user_id.
create policy "projects_insert" on public.projects
  for insert
  with check (cliente_id = auth.uid() or public.is_admin());

create policy "projects_update_admin" on public.projects
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "projects_delete_admin" on public.projects
  for delete
  using (public.is_admin());

-- ============================================================================
-- messages
-- ============================================================================

create policy "messages_select" on public.messages
  for select
  using (public.owns_project(project_id) or public.is_admin());

create policy "messages_insert" on public.messages
  for insert
  with check (
    (public.owns_project(project_id) or public.is_admin())
    and autor_id = auth.uid()
  );

create policy "messages_delete_admin" on public.messages
  for delete
  using (public.is_admin());

-- ============================================================================
-- message_attachments
-- ============================================================================

create policy "attachments_select" on public.message_attachments
  for select
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_id
        and (public.owns_project(m.project_id) or public.is_admin())
    )
  );

create policy "attachments_insert" on public.message_attachments
  for insert
  with check (
    exists (
      select 1 from public.messages m
      where m.id = message_id
        and (public.owns_project(m.project_id) or public.is_admin())
        and m.autor_id = auth.uid()
    )
  );

create policy "attachments_delete_admin" on public.message_attachments
  for delete
  using (public.is_admin());

-- ============================================================================
-- meetings
-- ============================================================================

create policy "meetings_select" on public.meetings
  for select
  using (cliente_id = auth.uid() or public.is_admin());

-- Cliente só agenda em projeto próprio; admin agenda em qualquer
create policy "meetings_insert" on public.meetings
  for insert
  with check (
    (cliente_id = auth.uid() or public.is_admin())
    and (public.owns_project(project_id) or public.is_admin())
  );

-- Cliente reagenda/cancela as próprias; admin altera qualquer
create policy "meetings_update" on public.meetings
  for update
  using (cliente_id = auth.uid() or public.is_admin())
  with check (cliente_id = auth.uid() or public.is_admin());

create policy "meetings_delete_admin" on public.meetings
  for delete
  using (public.is_admin());

-- ============================================================================
-- project_events
-- ============================================================================

create policy "events_select" on public.project_events
  for select
  using (public.owns_project(project_id) or public.is_admin());

-- Apenas admin registra eventos (marcos da equipe)
create policy "events_insert_admin" on public.project_events
  for insert
  with check (public.is_admin());

create policy "events_update_admin" on public.project_events
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "events_delete_admin" on public.project_events
  for delete
  using (public.is_admin());
