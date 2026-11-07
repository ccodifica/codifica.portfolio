-- ============================================================================
-- 027 — Eventos do vídeo "Como funciona" (play e assistiu até o fim)
-- Migração só ADITIVA: amplia a lista de eventos aceitos.
-- ============================================================================

alter table public.site_eventos drop constraint if exists site_eventos_evento_check;
alter table public.site_eventos add constraint site_eventos_evento_check check (evento in (
  'visita_oferta', 'visita_como_funciona', 'visita_contrato', 'visita_comecar',
  'form_inicio', 'form_erro', 'form_enviado',
  'clique_whatsapp', 'clique_comecar',
  'pedido_aberto', 'previa_aberta', 'clique_pagar',
  'clique_projeto',
  'video_play', 'video_fim'
));
