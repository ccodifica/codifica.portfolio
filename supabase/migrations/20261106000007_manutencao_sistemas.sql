-- ============================================================================
-- 017 — Manutenção nos projetos de sistema
--
-- Para o painel separar sistemas "Concluídos" (todos os entregues) de "No ar"
-- (os entregues que estão com a manutenção da Codifica).
-- Migração só ADITIVA.
-- ============================================================================

alter table public.projects
  add column if not exists manutencao_ativa boolean not null default false;
