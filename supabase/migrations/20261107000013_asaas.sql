-- ============================================================================
-- 023 — Pagamento pelo Asaas
--
-- As Edge Functions 'asaas-pagamento' (gera Pix, boleto ou link de cartão) e
-- 'asaas-webhook' (confirma o pagamento) guardam aqui o que criaram no Asaas.
-- A confirmação só vale depois que a função consulta o pagamento direto na API
-- do Asaas: um aviso falso não marca nada como pago.
-- Migração só ADITIVA.
-- ============================================================================

alter table public.pedidos
  add column if not exists asaas_cliente_id text,
  -- { "pix": {id, valor}, "boleto": {id, url, valor}, "cartao": {link_id, url, valor} }
  add column if not exists asaas_cobrancas jsonb not null default '{}'::jsonb;

-- Um lançamento por pagamento do Asaas (o webhook pode chegar repetido)
alter table public.lancamentos
  add column if not exists asaas_pagamento_id text;
create unique index if not exists lancamentos_asaas_idx
  on public.lancamentos(asaas_pagamento_id) where asaas_pagamento_id is not null;

create index if not exists pedidos_asaas_link_idx
  on public.pedidos((asaas_cobrancas -> 'cartao' ->> 'link_id'));
