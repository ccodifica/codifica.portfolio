-- ============================================================================
-- 021 — Link do pedido com etapas navegáveis
--
-- 1) Registro da aprovação da prévia: quando e por onde (site ou WhatsApp,
--    registrado pela equipe no painel).
-- 2) O cliente pode aprovar pelo site mesmo que tenha visto a prévia só pelo
--    WhatsApp (pedido ainda em "recebido" ou "mudança pedida" no sistema).
-- 3) A versão pública do pedido passa a trazer o histórico das etapas (datas),
--    quem aceitou o contrato e a aprovação da prévia, para o cliente rever as
--    etapas concluídas.
-- Migração só ADITIVA.
-- ============================================================================

alter table public.pedidos
  add column if not exists previa_aprovada_em timestamptz,
  add column if not exists previa_aprovada_por text check (previa_aprovada_por in ('cliente_site', 'admin_whatsapp'));

-- Pedidos já aprovados antes desta migração: usa a data da etapa no histórico
update public.pedidos p set previa_aprovada_em = e.created_at
from (
  select pedido_id, min(created_at) as created_at from public.pedido_eventos where para_status = 'aprovado' group by pedido_id
) e
where e.pedido_id = p.id and p.previa_aprovada_em is null;

create or replace function public._pedido_publico(p public.pedidos)
returns jsonb
language sql
stable
security definer
set search_path = public
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
    'previa_aprovada_em', p.previa_aprovada_em,
    'previa_aprovada_por', p.previa_aprovada_por,
    'mudancas_usadas', p.mudancas_usadas,
    'mudanca_texto', p.mudanca_texto,
    'contrato_versao', p.contrato_versao,
    'contrato_aceito_em', p.contrato_aceito_em,
    'contrato_nome', p.contrato_nome,
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
    'historico', (
      select coalesce(jsonb_agg(jsonb_build_object('status', e.para_status, 'em', e.created_at) order by e.created_at), '[]'::jsonb)
      from public.pedido_eventos e
      where e.pedido_id = p.id
    ),
    'created_at', p.created_at
  );
$$;

-- só as funções do pedido (que já exigem o código) usam a versão pública
revoke all on function public._pedido_publico(public.pedidos) from public, anon, authenticated;

-- Aprovar: vale com a prévia publicada no link OU vista só pelo WhatsApp.
-- Pedir mudança: só com a prévia publicada no link.
create or replace function public.pedido_responder_previa(p_codigo text, p_aprova boolean, p_texto text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.pedidos;
begin
  select * into p from public.pedidos
  where codigo = p_codigo
    and status in ('previa_pronta', 'recebido', 'mudanca_pedida')
  for update;
  if not found then
    raise exception 'etapa_invalida';
  end if;
  if p_aprova then
    update public.pedidos set
      status = 'aprovado',
      previa_aprovada_em = now(),
      previa_aprovada_por = 'cliente_site'
    where id = p.id
    returning * into p;
  else
    if p.status <> 'previa_pronta' then
      raise exception 'etapa_invalida';
    end if;
    if p.mudancas_usadas >= 1 then
      raise exception 'mudanca_ja_usada';
    end if;
    update public.pedidos set
      status = 'mudanca_pedida',
      mudancas_usadas = mudancas_usadas + 1,
      mudanca_texto = public._pedido_texto(p_texto, 2000, true)
    where id = p.id
    returning * into p;
  end if;
  return public._pedido_publico(p);
end;
$$;
