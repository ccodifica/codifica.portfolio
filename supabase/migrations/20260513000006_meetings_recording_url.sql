-- ============================================================================
-- 006 — URL da gravação da reunião
--
-- Coluna opcional onde o admin pode colar o link da gravação (Drive, Loom,
-- OBS upload, etc) após a reunião acontecer. O frontend mostra o botão
-- "Baixar gravação" ativo quando esse campo está preenchido.
-- ============================================================================

alter table public.meetings
  add column if not exists gravacao_url text;

comment on column public.meetings.gravacao_url is
  'URL da gravação da reunião (Drive, Loom, upload manual). Preenchido pelo admin após a reunião.';
