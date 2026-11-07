-- ============================================================================
-- 016 — Cliques nos projetos do portfólio
--
-- O site registra "clique_projeto" (detalhe = id do projeto) e ordena o
-- portfólio pelos mais clicados. A contagem é por sessão distinta nos últimos
-- 180 dias, para que ninguém infle um projeto clicando várias vezes.
-- Migração só ADITIVA (amplia a lista de eventos aceitos).
-- ============================================================================

alter table public.site_eventos drop constraint if exists site_eventos_evento_check;
alter table public.site_eventos add constraint site_eventos_evento_check check (evento in (
  'visita_oferta', 'visita_como_funciona', 'visita_contrato', 'visita_comecar',
  'form_inicio', 'form_erro', 'form_enviado',
  'clique_whatsapp', 'clique_comecar',
  'pedido_aberto', 'previa_aberta', 'clique_pagar',
  'clique_projeto'
));

create index if not exists site_eventos_projeto_idx
  on public.site_eventos(detalhe) where evento = 'clique_projeto';

-- Total de pessoas (sessões) que clicaram em cada projeto. Público: só números.
create or replace function public.projetos_cliques()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_object_agg(detalhe, total), '{}'::jsonb)
  from (
    select detalhe, count(distinct sessao) as total
    from public.site_eventos
    where evento = 'clique_projeto'
      and detalhe is not null
      and created_at > now() - interval '180 days'
    group by detalhe
  ) x;
$$;

revoke all on function public.projetos_cliques() from public;
grant execute on function public.projetos_cliques() to anon, authenticated;
