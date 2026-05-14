-- ============================================================================
-- 007 — Documentação por etapa do projeto
--
-- Cada projeto agora tem uma documentação estruturada por etapa (fase).
-- Armazenada em JSONB com a chave sendo o status (aguardando_analise, briefing,
-- design, desenvolvimento, revisao, entrega, concluido) e o valor sendo o
-- objeto { resumo, entregaveis, pontos_atencao, proximos_passos, concluido_em }.
--
-- Visível para o cliente. Editável só pelo admin.
-- ============================================================================

alter table public.projects
  add column if not exists documentacoes jsonb not null default '{}'::jsonb;

comment on column public.projects.documentacoes is
  'Documentação estruturada por etapa do projeto (visível ao cliente). Schema: { [status]: { resumo, entregaveis, pontos_atencao, proximos_passos, concluido_em? } }.';
