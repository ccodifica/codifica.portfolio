-- ============================================================================
-- 011 — Pedidos de site (fluxo enxuto)
--
-- Um "pedido" nasce no formulário /comecar ou como pré-cadastro feito pelo
-- admin (lead da Meta, prospecção). O cliente acompanha tudo por um link
-- pessoal /pedido/<codigo>, sem login: confere os dados, vê a prévia, aprova,
-- aceita o contrato e paga.
--
-- Segurança: a tabela fica fechada para anon (RLS só para admin). O cliente
-- acessa apenas pelas funções SECURITY DEFINER abaixo, sempre pelo código
-- aleatório de 32 caracteres. Nenhum dado pessoal vai na URL.
--
-- Migração só ADITIVA: não altera nenhuma tabela existente do Espaço do Cliente.
-- ============================================================================

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default replace(gen_random_uuid()::text, '-', ''),
  status text not null default 'recebido'
    check (status in (
      'pre_cadastro',     -- criado pelo admin; cliente só confere os dados
      'recebido',         -- dados confirmados; prévia em preparação
      'previa_pronta',
      'mudanca_pedida',   -- cliente pediu a mudança da prévia
      'aprovado',         -- prévia aprovada; falta aceitar o contrato
      'contrato_aceito',  -- falta pagar
      'pago',             -- site completo em produção
      'no_ar',
      'cancelado'
    )),
  origem text not null default 'site'
    check (origem in ('site', 'meta', 'prospeccao', 'indicacao', 'outro')),

  -- dados do formulário
  nome text not null,
  whatsapp text not null,
  negocio text not null,
  cidade text not null,
  redes jsonb not null default '{}'::jsonb,  -- {instagram, facebook, google, tiktok, outro, nenhuma}
  site_atual text,
  referencia text,
  aparece_maps text check (aparece_maps in ('sim', 'nao', 'nao_sei')),
  precisa_sistema text check (precisa_sistema in ('sim', 'nao', 'nao_sei')),

  -- prévia
  previa_url text,
  mudancas_usadas int not null default 0,
  mudanca_texto text,

  -- contrato (registro do aceite eletrônico)
  contrato_versao text,
  contrato_aceito_em timestamptz,
  contrato_nome text,
  contrato_documento text,     -- CPF ou CNPJ
  contrato_user_agent text,

  -- pagamento (preenchido pelo webhook do gateway, etapa futura)
  pagamento_status text not null default 'pendente'
    check (pagamento_status in ('pendente', 'aguardando', 'pago', 'estornado')),
  pagamento_link text,
  pago_em timestamptz,

  -- entrega
  site_url text,
  arquivos jsonb not null default '[]'::jsonb,  -- [{path, nome, tamanho, em}]
  notas_admin text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pedidos_status_idx on public.pedidos(status);
create index pedidos_created_idx on public.pedidos(created_at desc);

create trigger pedidos_set_updated_at
  before update on public.pedidos
  for each row execute function public.set_updated_at();

alter table public.pedidos enable row level security;

create policy "pedidos_admin_all" on public.pedidos
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Helpers de validação
-- ----------------------------------------------------------------------------
create or replace function public._pedido_texto(v text, max_len int, obrigatorio boolean)
returns text
language plpgsql
immutable
as $$
declare
  t text := nullif(btrim(coalesce(v, '')), '');
begin
  if t is null and obrigatorio then
    raise exception 'campo_obrigatorio';
  end if;
  if t is not null and length(t) > max_len then
    raise exception 'campo_longo_demais';
  end if;
  return t;
end;
$$;

create or replace function public._pedido_redes(r jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  limpo jsonb := '{}'::jsonb;
  k text;
begin
  if r is null or jsonb_typeof(r) <> 'object' then
    return limpo;
  end if;
  foreach k in array array['instagram', 'facebook', 'google', 'tiktok', 'outro'] loop
    if public._pedido_texto(r->>k, 300, false) is not null then
      limpo := limpo || jsonb_build_object(k, public._pedido_texto(r->>k, 300, false));
    end if;
  end loop;
  if coalesce((r->>'nenhuma')::boolean, false) then
    limpo := limpo || '{"nenhuma": true}'::jsonb;
  end if;
  return limpo;
end;
$$;

-- O que o cliente pode ver do próprio pedido (sem notas internas)
create or replace function public._pedido_publico(p public.pedidos)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'codigo', p.codigo,
    'status', p.status,
    'nome', p.nome,
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
    'arquivos', (
      select coalesce(jsonb_agg(jsonb_build_object('nome', a->>'nome', 'em', a->>'em')), '[]'::jsonb)
      from jsonb_array_elements(p.arquivos) a
    ),
    'created_at', p.created_at
  );
$$;

-- ----------------------------------------------------------------------------
-- RPCs públicas (anon), sempre pelo código
-- ----------------------------------------------------------------------------

-- Formulário /comecar: cria o pedido e devolve o código do link pessoal
create or replace function public.pedido_criar(dados jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  novo public.pedidos;
begin
  insert into public.pedidos (
    status, origem, nome, whatsapp, negocio, cidade, redes,
    site_atual, referencia, aparece_maps, precisa_sistema
  ) values (
    'recebido',
    'site',
    public._pedido_texto(dados->>'nome', 120, true),
    public._pedido_texto(dados->>'whatsapp', 30, true),
    public._pedido_texto(dados->>'negocio', 120, true),
    public._pedido_texto(dados->>'cidade', 80, true),
    public._pedido_redes(dados->'redes'),
    public._pedido_texto(dados->>'site_atual', 300, false),
    public._pedido_texto(dados->>'referencia', 300, false),
    nullif(dados->>'aparece_maps', ''),
    nullif(dados->>'precisa_sistema', '')
  )
  returning * into novo;
  return novo.codigo;
end;
$$;

create or replace function public.pedido_ver(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  p public.pedidos;
begin
  select * into p from public.pedidos where codigo = p_codigo;
  if not found then
    return null;
  end if;
  return public._pedido_publico(p);
end;
$$;

-- Pré-cadastro (lead da Meta) ou correção antes da prévia
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

create or replace function public.pedido_responder_previa(p_codigo text, p_aprova boolean, p_texto text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.pedidos;
begin
  select * into p from public.pedidos where codigo = p_codigo and status = 'previa_pronta' for update;
  if not found then
    raise exception 'etapa_invalida';
  end if;
  if p_aprova then
    update public.pedidos set status = 'aprovado' where id = p.id returning * into p;
  else
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

create or replace function public.pedido_aceitar_contrato(
  p_codigo text, p_nome text, p_documento text, p_versao text, p_user_agent text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.pedidos;
  doc text := regexp_replace(coalesce(p_documento, ''), '\D', '', 'g');
begin
  if length(doc) not in (11, 14) then
    raise exception 'documento_invalido';
  end if;
  update public.pedidos set
    status = 'contrato_aceito',
    contrato_versao = public._pedido_texto(p_versao, 40, true),
    contrato_aceito_em = now(),
    contrato_nome = public._pedido_texto(p_nome, 160, true),
    contrato_documento = doc,
    contrato_user_agent = left(coalesce(p_user_agent, ''), 400)
  where codigo = p_codigo and status = 'aprovado'
  returning * into p;
  if not found then
    raise exception 'etapa_invalida';
  end if;
  return public._pedido_publico(p);
end;
$$;

-- Registro de arquivo enviado (o upload em si vai para o bucket 'pedidos')
create or replace function public.pedido_registrar_arquivo(p_codigo text, p_path text, p_nome text, p_tamanho bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.pedidos;
begin
  if split_part(p_path, '/', 1) <> p_codigo then
    raise exception 'caminho_invalido';
  end if;
  update public.pedidos set
    arquivos = arquivos || jsonb_build_array(jsonb_build_object(
      'path', p_path,
      'nome', left(coalesce(p_nome, 'arquivo'), 200),
      'tamanho', p_tamanho,
      'em', now()
    ))
  where codigo = p_codigo
    and status not in ('no_ar', 'cancelado')
    and jsonb_array_length(arquivos) < 30
  returning * into p;
  if not found then
    raise exception 'etapa_invalida';
  end if;
  return public._pedido_publico(p);
end;
$$;

-- Usado pela policy do storage: o código existe e ainda aceita arquivos?
create or replace function public.pedido_aceita_arquivos(p_codigo text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.pedidos
    where codigo = p_codigo
      and status not in ('no_ar', 'cancelado')
      and jsonb_array_length(arquivos) < 30
  );
$$;

revoke all on function public.pedido_criar(jsonb) from public;
revoke all on function public.pedido_ver(text) from public;
revoke all on function public.pedido_confirmar(text, jsonb) from public;
revoke all on function public.pedido_responder_previa(text, boolean, text) from public;
revoke all on function public.pedido_aceitar_contrato(text, text, text, text, text) from public;
revoke all on function public.pedido_registrar_arquivo(text, text, text, bigint) from public;

grant execute on function public.pedido_criar(jsonb) to anon, authenticated;
grant execute on function public.pedido_ver(text) to anon, authenticated;
grant execute on function public.pedido_confirmar(text, jsonb) to anon, authenticated;
grant execute on function public.pedido_responder_previa(text, boolean, text) to anon, authenticated;
grant execute on function public.pedido_aceitar_contrato(text, text, text, text, text) to anon, authenticated;
grant execute on function public.pedido_registrar_arquivo(text, text, text, bigint) to anon, authenticated;
grant execute on function public.pedido_aceita_arquivos(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Bucket privado para logo e fotos (opcional para o cliente)
-- Caminho: {codigo}/{timestamp}-{nome}
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pedidos',
  'pedidos',
  false,
  10485760, -- 10 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "pedidos_objects_insert" on storage.objects
  for insert
  with check (
    bucket_id = 'pedidos'
    and public.pedido_aceita_arquivos(split_part(name, '/', 1))
  );

create policy "pedidos_objects_admin_select" on storage.objects
  for select
  using (bucket_id = 'pedidos' and public.is_admin());

create policy "pedidos_objects_admin_delete" on storage.objects
  for delete
  using (bucket_id = 'pedidos' and public.is_admin());
