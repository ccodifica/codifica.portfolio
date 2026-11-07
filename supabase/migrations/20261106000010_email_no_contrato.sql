-- ============================================================================
-- 020 — E-mail sai do formulário e entra no aceite do contrato
--
-- Menos campos no formulário da prévia (cada campo derruba conversão). O
-- e-mail só é necessário depois: nota fiscal, documentos e login por código.
-- 1) pedido_criar / pedido_confirmar: e-mail passa a ser opcional.
-- 2) pedido_aceitar_contrato ganha p_email (obrigatório se o pedido ainda não
--    tiver e-mail). A versão antiga, de 5 parâmetros, é removida.
-- ============================================================================

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
    status, origem, nome, email, whatsapp, negocio, cidade, redes,
    site_atual, referencia, aparece_maps, precisa_sistema, utm
  ) values (
    'recebido',
    case when utm_limpo->>'utm_source' in ('facebook', 'instagram', 'meta', 'fb', 'ig') then 'meta' else 'site' end,
    public._pedido_texto(dados->>'nome', 120, true),
    public._pedido_email(dados->>'email', false),
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

create or replace function public.pedido_confirmar(p_codigo text, dados jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.pedidos;
begin
  update public.pedidos set
    status = 'recebido',
    nome = public._pedido_texto(dados->>'nome', 120, true),
    email = coalesce(public._pedido_email(dados->>'email', false), email),
    whatsapp = public._pedido_texto(dados->>'whatsapp', 30, true),
    negocio = public._pedido_texto(dados->>'negocio', 120, true),
    cidade = public._pedido_texto(dados->>'cidade', 80, true),
    redes = public._pedido_redes(dados->'redes'),
    site_atual = public._pedido_texto(dados->>'site_atual', 300, false),
    referencia = public._pedido_texto(dados->>'referencia', 300, false),
    aparece_maps = nullif(dados->>'aparece_maps', ''),
    precisa_sistema = nullif(dados->>'precisa_sistema', '')
  where codigo = p_codigo and status in ('pre_cadastro', 'recebido')
  returning * into p;
  if not found then
    raise exception 'etapa_invalida';
  end if;
  return public._pedido_publico(p);
end;
$$;

drop function if exists public.pedido_aceitar_contrato(text, text, text, text, text);

create or replace function public.pedido_aceitar_contrato(
  p_codigo text, p_nome text, p_documento text, p_versao text, p_user_agent text, p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.pedidos;
  doc text := regexp_replace(coalesce(p_documento, ''), '\D', '', 'g');
  e text := public._pedido_email(p_email, false);
begin
  if length(doc) not in (11, 14) then
    raise exception 'documento_invalido';
  end if;
  update public.pedidos set
    status = 'contrato_aceito',
    email = coalesce(e, email),
    contrato_versao = public._pedido_texto(p_versao, 40, true),
    contrato_aceito_em = now(),
    contrato_nome = public._pedido_texto(p_nome, 160, true),
    contrato_documento = doc,
    contrato_user_agent = left(coalesce(p_user_agent, ''), 400)
  where codigo = p_codigo and status = 'aprovado' and (e is not null or email is not null)
  returning * into p;
  if not found then
    if exists (select 1 from public.pedidos where codigo = p_codigo and status = 'aprovado') then
      raise exception 'email_invalido';
    end if;
    raise exception 'etapa_invalida';
  end if;
  return public._pedido_publico(p);
end;
$$;

revoke all on function public.pedido_aceitar_contrato(text, text, text, text, text, text) from public;
grant execute on function public.pedido_aceitar_contrato(text, text, text, text, text, text) to anon, authenticated;
