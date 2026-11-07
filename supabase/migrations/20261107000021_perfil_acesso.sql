-- ============================================================================
-- Acesso ao Perfil da Empresa do cliente
--
-- Como a Codifica cuida do Perfil do Google de cada cliente, o cliente adiciona
-- a conta ccodifica@gmail.com como administradora do Perfil dele (ou avisa que
-- não tem Perfil, e a Codifica cria). Isso também libera as métricas do Perfil
-- na aba Métricas, quando o Google aprovar o acesso à API.
--
--   null              ainda não respondeu
--   convite_enviado   cliente diz que mandou o convite (equipe aceita no e-mail)
--   sem_perfil        cliente não tem Perfil: a Codifica cria e transfere a propriedade
--   confirmado        equipe confirmou que já administra o Perfil
-- Migração só ADITIVA.
-- ============================================================================

alter table public.pedidos
  add column if not exists perfil_acesso text check (perfil_acesso in ('convite_enviado', 'sem_perfil', 'confirmado')),
  add column if not exists perfil_acesso_em timestamptz;

create or replace function public.pedido_perfil_acesso(p_codigo text, p_situacao text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.pedidos;
begin
  select * into p from public.pedidos where codigo = p_codigo and status in ('pago', 'no_ar');
  if not found then
    raise exception 'etapa_invalida';
  end if;
  if p_situacao is null or p_situacao not in ('convite_enviado', 'sem_perfil') then
    raise exception 'campo_obrigatorio';
  end if;
  if p.perfil_acesso = 'confirmado' then
    return public._pedido_publico(p);
  end if;
  update public.pedidos set perfil_acesso = p_situacao, perfil_acesso_em = now() where id = p.id returning * into p;
  perform public._telegram(
    case p_situacao
      when 'convite_enviado' then
        '🔑 ' || p.negocio || ' convidou a ccodifica@gmail.com para administrar o Perfil do Google.' || chr(10) ||
        'Aceitem o convite no e-mail da Codifica e marquem "Acesso confirmado" no pedido.'
      else
        '📍 ' || p.negocio || ' não tem Perfil no Google: criar pela conta da Codifica e transferir a propriedade para ' ||
        coalesce(p.email, 'o e-mail do cliente') || '.'
    end || chr(10) || chr(10) || 'https://ccodifica.com.br/painel-codifica'
  );
  return public._pedido_publico(p);
end;
$$;

revoke all on function public.pedido_perfil_acesso(text, text) from public;
grant execute on function public.pedido_perfil_acesso(text, text) to anon, authenticated;

-- A versão pública do pedido passa a dizer como está o acesso ao Perfil
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
    'perfil_acesso', p.perfil_acesso,
    'avaliacao', (select jsonb_build_object('nota', a.nota, 'comentario', a.comentario) from public.avaliacoes a where a.pedido_id = p.id),
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

revoke all on function public._pedido_publico(public.pedidos) from public, anon, authenticated;
