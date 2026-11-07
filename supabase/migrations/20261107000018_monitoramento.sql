-- ============================================================================
-- 028 — Monitoramento e métricas (aba "Métricas" do painel)
--
-- monitor_sites       um registro por site/sistema monitorado (o da Codifica é só mais um)
-- monitor_eventos     visitas e cliques vindos do rastreador (dados brutos, 90 dias)
-- monitor_dia         resumo diário por site (permanente e leve)
-- monitor_checagens   checagens de disponibilidade a cada 5 min (30 dias)
-- monitor_estado      situação atual de cada site (no ar, domínio, última checagem)
-- monitor_externo     dados do Google: PageSpeed, Search Console e Perfil da Empresa
-- monitor_relatorios  relatório mensal de cada site (o que foi enviado ao cliente)
--
-- Coleta: Edge Function 'coletar' (script + recebimento), 'monitor' (checagens,
-- coletas diárias e relatórios). Ninguém de fora lê nada: só admin (RLS).
-- Migração só ADITIVA.
-- ============================================================================

create table if not exists public.monitor_sites (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(btrim(nome)) between 1 and 120),
  url text not null unique check (url ~ '^https?://'),
  tipo text not null default 'site' check (tipo in ('site', 'sistema', 'codifica')),
  cliente text check (length(cliente) <= 160),
  pedido_id uuid references public.pedidos(id) on delete set null,
  chave text not null unique default substr(md5(random()::text || clock_timestamp()::text), 1, 18),
  ativo boolean not null default true,
  rastreador_desde timestamptz,
  relatorio_ativo boolean not null default false,
  relatorio_email text check (relatorio_email is null or relatorio_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  gsc_propriedade text check (length(gsc_propriedade) <= 200),
  gbp_local text check (length(gbp_local) <= 120),
  observacao text check (length(observacao) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.monitor_eventos (
  id bigint generated always as identity primary key,
  site_id uuid not null references public.monitor_sites(id) on delete cascade,
  sessao text not null check (length(sessao) between 6 and 40),
  tipo text not null check (tipo in ('pagina', 'whatsapp', 'telefone', 'rota', 'formulario', 'erro')),
  pagina text check (length(pagina) <= 200),
  origem text check (length(origem) <= 40),
  referencia text check (length(referencia) <= 120),
  dispositivo text check (dispositivo in ('celular', 'computador')),
  detalhe text check (length(detalhe) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists monitor_eventos_site_idx on public.monitor_eventos(site_id, created_at desc);

create table if not exists public.monitor_dia (
  site_id uuid not null references public.monitor_sites(id) on delete cascade,
  dia date not null,
  visitas int not null default 0,
  paginas_vistas int not null default 0,
  whatsapp int not null default 0,
  telefone int not null default 0,
  rota int not null default 0,
  formularios int not null default 0,
  erros int not null default 0,
  celular int not null default 0,
  origens jsonb not null default '{}'::jsonb,
  paginas jsonb not null default '{}'::jsonb,
  checagens int not null default 0,
  falhas int not null default 0,
  tempo_medio_ms int,
  primary key (site_id, dia)
);

create table if not exists public.monitor_checagens (
  id bigint generated always as identity primary key,
  site_id uuid not null references public.monitor_sites(id) on delete cascade,
  ok boolean not null,
  status int,
  ms int,
  erro text check (length(erro) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists monitor_checagens_site_idx on public.monitor_checagens(site_id, created_at desc);

create table if not exists public.monitor_estado (
  site_id uuid primary key references public.monitor_sites(id) on delete cascade,
  no_ar boolean not null default true,
  falhas_seguidas int not null default 0,
  desde timestamptz not null default now(),
  ultima_checagem timestamptz,
  ultimo_status int,
  ultimo_ms int,
  dominio_expira date,
  dominio_checado date,
  dominio_avisado date
);

create table if not exists public.monitor_externo (
  id bigint generated always as identity primary key,
  site_id uuid not null references public.monitor_sites(id) on delete cascade,
  fonte text not null check (fonte in ('pagespeed', 'gsc', 'gbp')),
  periodo text not null check (length(periodo) <= 20),
  dados jsonb not null,
  manual boolean not null default false,
  coletado_em timestamptz not null default now(),
  unique (site_id, fonte, periodo)
);

create table if not exists public.monitor_relatorios (
  id bigint generated always as identity primary key,
  site_id uuid not null references public.monitor_sites(id) on delete cascade,
  mes date not null,
  dados jsonb not null,
  enviado_em timestamptz,
  enviado_para text,
  created_at timestamptz not null default now(),
  unique (site_id, mes)
);

-- Só a equipe lê e mexe (a coleta usa a service role nas Edge Functions)
do $$
declare t text;
begin
  foreach t in array array['monitor_sites','monitor_eventos','monitor_dia','monitor_checagens','monitor_estado','monitor_externo','monitor_relatorios'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s_admin_all" on public.%I', t, t);
    execute format('create policy "%s_admin_all" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Resumo diário (roda de madrugada) e limpeza dos dados brutos
-- ----------------------------------------------------------------------------
create or replace function public.monitor_consolidar_dia(p_dia date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  insert into public.monitor_dia as d (site_id, dia, visitas, paginas_vistas, whatsapp, telefone, rota, formularios, erros, celular, origens, paginas, checagens, falhas, tempo_medio_ms)
  select s.id, p_dia,
    coalesce(e.visitas, 0), coalesce(e.paginas_vistas, 0), coalesce(e.whatsapp, 0), coalesce(e.telefone, 0), coalesce(e.rota, 0),
    coalesce(e.formularios, 0), coalesce(e.erros, 0), coalesce(e.celular, 0),
    coalesce(o.origens, '{}'::jsonb), coalesce(pg.paginas, '{}'::jsonb),
    coalesce(c.checagens, 0), coalesce(c.falhas, 0), c.tempo_medio_ms
  from public.monitor_sites s
  left join lateral (
    select count(distinct sessao) filter (where tipo = 'pagina') as visitas,
           count(*) filter (where tipo = 'pagina') as paginas_vistas,
           count(*) filter (where tipo = 'whatsapp') as whatsapp,
           count(*) filter (where tipo = 'telefone') as telefone,
           count(*) filter (where tipo = 'rota') as rota,
           count(*) filter (where tipo = 'formulario') as formularios,
           count(*) filter (where tipo = 'erro') as erros,
           count(distinct sessao) filter (where tipo = 'pagina' and dispositivo = 'celular') as celular
    from public.monitor_eventos ev
    where ev.site_id = s.id and (ev.created_at at time zone 'America/Sao_Paulo')::date = p_dia
  ) e on true
  left join lateral (
    select jsonb_object_agg(origem, qtd) as origens from (
      select coalesce(origem, 'direto') as origem, count(distinct sessao) as qtd
      from public.monitor_eventos ev
      where ev.site_id = s.id and ev.tipo = 'pagina' and (ev.created_at at time zone 'America/Sao_Paulo')::date = p_dia
      group by 1
    ) x
  ) o on true
  left join lateral (
    select jsonb_object_agg(pagina, qtd) as paginas from (
      select coalesce(pagina, '/') as pagina, count(*) as qtd
      from public.monitor_eventos ev
      where ev.site_id = s.id and ev.tipo = 'pagina' and (ev.created_at at time zone 'America/Sao_Paulo')::date = p_dia
      group by 1 order by 2 desc limit 20
    ) x
  ) pg on true
  left join lateral (
    select count(*) as checagens, count(*) filter (where not ok) as falhas, round(avg(ms) filter (where ok))::int as tempo_medio_ms
    from public.monitor_checagens ch
    where ch.site_id = s.id and (ch.created_at at time zone 'America/Sao_Paulo')::date = p_dia
  ) c on true
  on conflict (site_id, dia) do update set
    visitas = excluded.visitas, paginas_vistas = excluded.paginas_vistas, whatsapp = excluded.whatsapp,
    telefone = excluded.telefone, rota = excluded.rota, formularios = excluded.formularios, erros = excluded.erros,
    celular = excluded.celular, origens = excluded.origens, paginas = excluded.paginas,
    checagens = excluded.checagens, falhas = excluded.falhas, tempo_medio_ms = excluded.tempo_medio_ms;
  get diagnostics n = row_count;

  delete from public.monitor_eventos where created_at < now() - interval '90 days';
  delete from public.monitor_checagens where created_at < now() - interval '30 days';
  return n;
end;
$$;
revoke all on function public.monitor_consolidar_dia(date) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Sites de clientes entram sozinhos quando o pedido vai ao ar
-- (relatório mensal ligado se a manutenção estiver ativa; desliga ao cancelar)
-- ----------------------------------------------------------------------------
create or replace function public.monitor_sincronizar_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'no_ar' and new.site_url ~ '^https?://' then
    insert into public.monitor_sites (nome, url, tipo, cliente, pedido_id, relatorio_ativo, relatorio_email)
    values (new.negocio, new.site_url, 'site', new.negocio, new.id, new.manutencao_status = 'ativa' and new.email is not null, new.email)
    on conflict (url) do update set pedido_id = excluded.pedido_id, cliente = excluded.cliente;
  end if;
  if new.manutencao_status = 'cancelada' and old.manutencao_status is distinct from 'cancelada' then
    update public.monitor_sites set relatorio_ativo = false, ativo = false where pedido_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists pedidos_monitor on public.pedidos;
create trigger pedidos_monitor
  after update of status, site_url, manutencao_status on public.pedidos
  for each row execute function public.monitor_sincronizar_pedido();

-- ----------------------------------------------------------------------------
-- O site da própria Codifica. Os de clientes entram pelo gatilho acima, quando
-- um pedido vendido vai ao ar (o portfólio antigo não é monitorado).
-- ----------------------------------------------------------------------------
insert into public.monitor_sites (nome, url, tipo, cliente) values ('Codifica', 'https://ccodifica.com.br', 'codifica', 'Codifica')
on conflict (url) do nothing;

-- estado inicial de qualquer site novo
create or replace function public.monitor_site_novo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.monitor_estado (site_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists monitor_sites_estado on public.monitor_sites;
create trigger monitor_sites_estado after insert on public.monitor_sites for each row execute function public.monitor_site_novo();

insert into public.monitor_estado (site_id) select id from public.monitor_sites on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Agendamentos
-- ----------------------------------------------------------------------------
do $$
declare j text;
begin
  foreach j in array array['monitor_checar', 'monitor_diario', 'monitor_relatorio'] loop
    if exists (select 1 from cron.job where jobname = j) then perform cron.unschedule(j); end if;
  end loop;
end $$;

-- disponibilidade a cada 5 minutos
select cron.schedule('monitor_checar', '*/5 * * * *', $$
  select net.http_post(url := 'https://zhmhcyzsrihvigtelvux.supabase.co/functions/v1/monitor', body := '{"modo":"checar"}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb, timeout_milliseconds := 60000) $$);

-- todo dia às 03:20 (Brasília): resumo do dia anterior + coletas do Google e do domínio
select cron.schedule('monitor_diario', '20 6 * * *', $$
  select public.monitor_consolidar_dia(((now() at time zone 'America/Sao_Paulo')::date - 1));
  select net.http_post(url := 'https://zhmhcyzsrihvigtelvux.supabase.co/functions/v1/monitor', body := '{"modo":"diario"}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb, timeout_milliseconds := 300000) $$);

-- dia 1º de cada mês às 09:00 (Brasília): relatórios do mês anterior
select cron.schedule('monitor_relatorio', '0 12 1 * *', $$
  select net.http_post(url := 'https://zhmhcyzsrihvigtelvux.supabase.co/functions/v1/monitor', body := '{"modo":"relatorio"}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb, timeout_milliseconds := 300000) $$);
