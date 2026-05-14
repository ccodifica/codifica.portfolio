-- ============================================================================
-- 010 — Status de presença do usuário (disponível / ausente / ocupado)
--
-- Cada perfil tem um status efetivo. O frontend gerencia a lógica de
-- auto-away (idle > 15s) escrevendo no banco; o cliente preserva a última
-- escolha manual em localStorage pra restaurar quando volta da idleness.
-- ============================================================================

alter table public.profiles
  add column if not exists presence_status text not null default 'available'
    check (presence_status in ('available', 'away', 'busy'));

comment on column public.profiles.presence_status is
  'Status de presença do usuário: available (disponível), away (ausente), busy (ocupado).';

-- O frontend já está autorizado a escrever no próprio perfil via policy
-- `profiles_update_own` (migration 003). Não precisa policy nova.
