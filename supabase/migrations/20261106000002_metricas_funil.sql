-- ============================================================================
-- 012 — Métricas do funil (site + WhatsApp)
--
-- 1) site_eventos: eventos anônimos de navegação (visitou a oferta, começou o
--    formulário, clicou no WhatsApp...). Sem cookie e sem dado pessoal: só um
--    id de sessão aleatório guardado no sessionStorage do navegador.
-- 2) pedido_eventos: histórico de mudança de etapa de cada pedido (trigger),
--    para saber quanto tempo cada um fica parado em cada etapa.
-- 3) pedidos.motivo_perda: por que o pedido não fechou (registrado pelo admin
--    ao cancelar). É assim que a desistência pelo WhatsApp vira dado.
-- 4) pedidos.utm: de qual anúncio/campanha o pedido veio.
--
-- Migração só ADITIVA.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Eventos do site
-- ----------------------------------------------------------------------------
create table public.site_eventos (
  id bigint generated always as identity primary key,
  sessao text not null check (length(sessao) between 8 and 64),
  evento text not null check (evento in (
    'visita_oferta', 'visita_como_funciona', 'visita_contrato', 'visita_comecar',
    'form_inicio', 'form_erro', 'form_enviado',
    'clique_whatsapp', 'clique_comecar',
    'pedido_aberto', 'previa_aberta', 'clique_pagar'
  )),
  pagina text check (length(pagina) <= 120),
  detalhe text check (length(detalhe) <= 120),
  utm jsonb not null default '{}'::jsonb,
  dispositivo text check (dispositivo in ('celular', 'computador')),
  created_at timestamptz not null default now()
);

create index site_eventos_created_idx on public.site_eventos(created_at desc);
create index site_eventos_evento_idx on public.site_eventos(evento, created_at desc);
create index site_eventos_sessao_idx on public.site_eventos(sessao);

alter table public.site_eventos enable row level security;

create policy "site_eventos_admin_select" on public.site_eventos
  for select using (public.is_admin());

create policy "site_eventos_admin_delete" on public.site_eventos
  for delete using (public.is_admin());

-- Gravação anônima só pela função (valida e limita tamanhos)
create or replace function public.registrar_evento(
  p_sessao text, p_evento text, p_pagina text, p_detalhe text, p_utm jsonb, p_dispositivo text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  utm_limpo jsonb := '{}'::jsonb;
  k text;
begin
  -- no máximo 200 eventos por sessão: evita lixo e abuso
  if (select count(*) from public.site_eventos where sessao = p_sessao) >= 200 then
    return;
  end if;
  if p_utm is not null and jsonb_typeof(p_utm) = 'object' then
    foreach k in array array['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'nicho'] loop
      if p_utm ? k then
        utm_limpo := utm_limpo || jsonb_build_object(k, left(p_utm->>k, 80));
      end if;
    end loop;
  end if;
  insert into public.site_eventos (sessao, evento, pagina, detalhe, utm, dispositivo)
  values (
    left(p_sessao, 64), p_evento, left(p_pagina, 120), left(p_detalhe, 120), utm_limpo,
    case when p_dispositivo in ('celular', 'computador') then p_dispositivo end
  );
exception
  when check_violation then return; -- evento desconhecido: ignora sem quebrar a página
end;
$$;

revoke all on function public.registrar_evento(text, text, text, text, jsonb, text) from public;
grant execute on function public.registrar_evento(text, text, text, text, jsonb, text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2) Histórico de etapas do pedido
-- ----------------------------------------------------------------------------
create table public.pedido_eventos (
  id bigint generated always as identity primary key,
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  de_status text,
  para_status text not null,
  created_at timestamptz not null default now()
);

create index pedido_eventos_pedido_idx on public.pedido_eventos(pedido_id, created_at);

alter table public.pedido_eventos enable row level security;

create policy "pedido_eventos_admin_select" on public.pedido_eventos
  for select using (public.is_admin());

create or replace function public.registrar_etapa_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.pedido_eventos (pedido_id, de_status, para_status) values (new.id, null, new.status);
  elsif new.status is distinct from old.status then
    insert into public.pedido_eventos (pedido_id, de_status, para_status) values (new.id, old.status, new.status);
  end if;
  return new;
end;
$$;

create trigger pedidos_registrar_etapa
  after insert or update of status on public.pedidos
  for each row execute function public.registrar_etapa_pedido();

-- Pedidos criados antes deste trigger ganham um evento inicial
insert into public.pedido_eventos (pedido_id, de_status, para_status, created_at)
select id, null, status, created_at from public.pedidos;

-- ----------------------------------------------------------------------------
-- 3 e 4) Motivo de perda e origem da campanha
-- ----------------------------------------------------------------------------
alter table public.pedidos
  add column motivo_perda text check (motivo_perda in (
    'sumiu_sem_responder', 'preco', 'nao_gostou_previa', 'ja_tem_site',
    'nao_e_o_momento', 'queria_sistema', 'fechou_com_outro', 'outro'
  )),
  add column motivo_perda_detalhe text,
  add column utm jsonb not null default '{}'::jsonb;

-- pedido_criar passa a guardar a campanha de origem
create or replace function public.pedido_criar(dados jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  novo public.pedidos;
  utm_limpo jsonb := '{}'::jsonb;
  k text;
begin
  if jsonb_typeof(dados->'utm') = 'object' then
    foreach k in array array['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'nicho'] loop
      if dados->'utm' ? k then
        utm_limpo := utm_limpo || jsonb_build_object(k, left(dados->'utm'->>k, 80));
      end if;
    end loop;
  end if;
  insert into public.pedidos (
    status, origem, nome, whatsapp, negocio, cidade, redes,
    site_atual, referencia, aparece_maps, precisa_sistema, utm
  ) values (
    'recebido',
    case when utm_limpo->>'utm_source' in ('facebook', 'instagram', 'meta', 'fb', 'ig') then 'meta' else 'site' end,
    public._pedido_texto(dados->>'nome', 120, true),
    public._pedido_texto(dados->>'whatsapp', 30, true),
    public._pedido_texto(dados->>'negocio', 120, true),
    public._pedido_texto(dados->>'cidade', 80, true),
    public._pedido_redes(dados->'redes'),
    public._pedido_texto(dados->>'site_atual', 300, false),
    public._pedido_texto(dados->>'referencia', 300, false),
    nullif(dados->>'aparece_maps', ''),
    nullif(dados->>'precisa_sistema', ''),
    utm_limpo
  )
  returning * into novo;
  return novo.codigo;
end;
$$;
