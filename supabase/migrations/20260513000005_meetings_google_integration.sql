-- ============================================================================
-- 005 — Integração com Google Calendar / Meet
--
-- Adiciona colunas para:
--  - participantes_extras: emails adicionais convidados pelo aluno (a Codifica
--    é sempre incluída automaticamente no backend, não precisa estar aqui)
--  - google_event_id: id do evento criado no Google Calendar, usado para
--    atualizar/cancelar o evento (e a sala do Meet) quando a reunião muda
-- ============================================================================

alter table public.meetings
  add column if not exists participantes_extras text[] not null default '{}'::text[],
  add column if not exists google_event_id text;

comment on column public.meetings.participantes_extras is
  'Emails extras convidados pelo cliente. A Codifica é incluída automaticamente pelo backend.';

comment on column public.meetings.google_event_id is
  'ID do evento no Google Calendar da Codifica. Permite cancelar/atualizar a sala do Meet.';
