-- ============================================================================
-- 024 — Nota fiscal automática pelo Asaas
--
-- Quando o pagamento é confirmado, o webhook pede a nota (NFS-e) ao Asaas e
-- guarda aqui o id dela. Quando a prefeitura autoriza (INVOICE_AUTHORIZED), o
-- PDF é copiado para o bucket 'documentos' e preenche nota_path / nota_numero,
-- e o cliente baixa pelo link pessoal (mesmo caminho da nota anexada à mão).
-- Migração só ADITIVA.
-- ============================================================================

alter table public.lancamentos
  add column if not exists asaas_nota_id text,
  add column if not exists nota_status text
    check (nota_status in ('solicitada', 'emitida', 'erro'));

create unique index if not exists lancamentos_asaas_nota_idx
  on public.lancamentos(asaas_nota_id) where asaas_nota_id is not null;
