-- ============================================================================
-- 015 — Manutenção opcional: situação e cancelamento
--
-- O cliente pode cancelar a manutenção pelo link pessoal (site) ou pedir pelo
-- WhatsApp (o admin registra no painel). Sem aviso prévio e sem multa.
-- Migração só ADITIVA.
-- ============================================================================

alter table public.pedidos
  add column manutencao_status text not null default 'ativa'
    check (manutencao_status in ('ativa', 'cancelada')),
  add column manutencao_cancelada_em timestamptz,
  add column manutencao_cancelada_por text check (manutencao_cancelada_por in ('cliente_site', 'admin_whatsapp')),
  add column manutencao_motivo text;

-- Versão pública passa a mostrar a situação da manutenção
create or replace function public._pedido_publico(p public.pedidos)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'codigo', p.codigo,
    'status', p.status,
    'nome', p.nome,
    'email', p.email,
    'whatsapp', p.whatsapp,
    'negocio', p.negocio,
    'cidade', p.cidade,
    'redes', p.redes,
    'site_atual', p.site_atual,
    'referencia', p.referencia,
    'aparece_maps', p.aparece_maps,
    'precisa_sistema', p.precisa_sistema,
    'previa_url', p.previa_url,
    'mudancas_usadas', p.mudancas_usadas,
    'mudanca_texto', p.mudanca_texto,
    'contrato_versao', p.contrato_versao,
    'contrato_aceito_em', p.contrato_aceito_em,
    'pagamento_status', p.pagamento_status,
    'pagamento_link', p.pagamento_link,
    'pago_em', p.pago_em,
    'site_url', p.site_url,
    'manutencao_status', p.manutencao_status,
    'manutencao_cancelada_em', p.manutencao_cancelada_em,
    'arquivos', (
      select coalesce(jsonb_agg(jsonb_build_object('nome', a->>'nome', 'em', a->>'em')), '[]'::jsonb)
      from jsonb_array_elements(p.arquivos) a
    ),
    'created_at', p.created_at
  );
$$;

-- Cliente cancela pelo link pessoal (site)
create or replace function public.pedido_cancelar_manutencao(p_codigo text, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.pedidos;
begin
  update public.pedidos set
    manutencao_status = 'cancelada',
    manutencao_cancelada_em = now(),
    manutencao_cancelada_por = 'cliente_site',
    manutencao_motivo = left(nullif(btrim(coalesce(p_motivo, '')), ''), 1000)
  where codigo = p_codigo and status = 'no_ar' and manutencao_status = 'ativa'
  returning * into p;
  if not found then
    raise exception 'etapa_invalida';
  end if;
  return public._pedido_publico(p);
end;
$$;

revoke all on function public.pedido_cancelar_manutencao(text, text) from public;
grant execute on function public.pedido_cancelar_manutencao(text, text) to anon, authenticated;
