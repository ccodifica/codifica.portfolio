-- ============================================================================
-- 026 — Endereço no aceite do contrato (exigido para emitir a NFS-e)
--
-- A prefeitura/Portal Nacional exige e-mail, CEP e endereço do tomador na nota.
-- O cliente informa CEP e número no aceite (rua e bairro vêm do CEP).
-- Migração ADITIVA; a função de aceite ganha 3 parâmetros (a antiga sai).
-- ============================================================================

alter table public.pedidos
  add column if not exists contrato_cep text check (contrato_cep ~ '^\d{8}$'),
  add column if not exists contrato_numero text check (length(contrato_numero) <= 20),
  add column if not exists contrato_complemento text check (length(contrato_complemento) <= 80);

drop function if exists public.pedido_aceitar_contrato(text, text, text, text, text, text);

create or replace function public.pedido_aceitar_contrato(
  p_codigo text, p_nome text, p_documento text, p_versao text, p_user_agent text, p_email text,
  p_cep text, p_numero text, p_complemento text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.pedidos;
  doc text := regexp_replace(coalesce(p_documento, ''), '\D', '', 'g');
  cep text := regexp_replace(coalesce(p_cep, ''), '\D', '', 'g');
  num text := nullif(btrim(coalesce(p_numero, '')), '');
  e text := public._pedido_email(p_email, false);
begin
  if length(doc) not in (11, 14) then
    raise exception 'documento_invalido';
  end if;
  if length(cep) <> 8 then
    raise exception 'cep_invalido';
  end if;
  if num is null then
    raise exception 'campo_obrigatorio';
  end if;
  update public.pedidos set
    status = 'contrato_aceito',
    email = coalesce(e, email),
    contrato_versao = public._pedido_texto(p_versao, 40, true),
    contrato_aceito_em = now(),
    contrato_nome = public._pedido_texto(p_nome, 160, true),
    contrato_documento = doc,
    contrato_cep = cep,
    contrato_numero = left(num, 20),
    contrato_complemento = left(nullif(btrim(coalesce(p_complemento, '')), ''), 80),
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

revoke all on function public.pedido_aceitar_contrato(text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.pedido_aceitar_contrato(text, text, text, text, text, text, text, text, text) to anon, authenticated;
