-- ============================================================================
-- 025 — E-mails automáticos, lembretes e mensalidade pelo Asaas
--
-- 1) pedidos.asaas_assinatura_id: assinatura de manutenção (R$ 49/mês) criada
--    quando o site vai ao ar com manutenção ativa; cancelada quando a
--    manutenção é cancelada/transferida. Quem cria e cancela é a função
--    'rotinas', que roda de hora em hora.
-- 2) envios: registro de cada e-mail/aviso enviado (evita mandar duas vezes e
--    mostra o histórico no painel).
-- 3) pg_cron chama a função 'rotinas' de hora em hora.
-- Migração só ADITIVA.
-- ============================================================================

alter table public.pedidos
  add column if not exists asaas_assinatura_id text;

create table if not exists public.envios (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references public.pedidos(id) on delete cascade,
  tipo text not null,            -- ex.: 'recibo', 'nota', 'lembrete_pagamento_1', 'atraso:pay_123'
  canal text not null default 'email' check (canal in ('email', 'telegram')),
  destino text,
  created_at timestamptz not null default now(),
  unique (pedido_id, tipo)
);

create index if not exists envios_pedido_idx on public.envios(pedido_id, created_at desc);

alter table public.envios enable row level security;
drop policy if exists "envios_admin_all" on public.envios;
create policy "envios_admin_all" on public.envios for all using (public.is_admin()) with check (public.is_admin());

-- Rotinas de hora em hora (lembretes, assinaturas, resumo diário no Telegram)
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'codifica_rotinas') then
    perform cron.unschedule('codifica_rotinas');
  end if;
end $$;

select cron.schedule(
  'codifica_rotinas',
  '7 * * * *',
  $$ select net.http_post(
       url := 'https://zhmhcyzsrihvigtelvux.supabase.co/functions/v1/rotinas',
       body := '{}'::jsonb,
       headers := '{"Content-Type": "application/json"}'::jsonb
     ) $$
);
