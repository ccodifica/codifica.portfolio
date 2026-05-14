-- ============================================================================
-- 009 — Reações em mensagens do chat
--
-- Cada usuário pode reagir a uma mensagem com diferentes emojis.
-- Uma reação (msg, user, emoji) é única — clicar de novo no mesmo emoji
-- remove a reação (toggle no frontend).
-- ============================================================================

create table public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

create index message_reactions_message_idx on public.message_reactions(message_id);
create index message_reactions_user_idx on public.message_reactions(user_id);

-- ----------------------------------------------------------------------------
-- RLS — quem pode ver/criar reações
-- ----------------------------------------------------------------------------
alter table public.message_reactions enable row level security;

-- SELECT: mesma regra das mensagens — só vê quem é dono do projeto ou admin
create policy "reactions_select" on public.message_reactions
  for select
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_id
        and (public.owns_project(m.project_id) or public.is_admin())
    )
  );

-- INSERT: o user só pode reagir como ele mesmo, e em mensagem que ele tem acesso
create policy "reactions_insert" on public.message_reactions
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.messages m
      where m.id = message_id
        and (public.owns_project(m.project_id) or public.is_admin())
    )
  );

-- DELETE: o user só apaga suas próprias reações (toggle); admin apaga qualquer
create policy "reactions_delete" on public.message_reactions
  for delete
  using (user_id = auth.uid() or public.is_admin());
