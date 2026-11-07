-- ============================================================================
-- 013 — Acesso por código no e-mail
--
-- 1) pedidos.email: o cliente informa o e-mail no formulário e passa a entrar
--    na área do cliente com um código de 6 dígitos enviado para esse e-mail
--    (Supabase Auth OTP). Nada de senha.
-- 2) admins_autorizados: e-mails que viram admin automaticamente ao entrar pela
--    primeira vez. Ninguém se cadastra como admin pela tela.
-- 3) meus_pedidos(): pedidos do e-mail logado (dados públicos, sem notas internas).
--
-- Migração só ADITIVA (handle_new_user é recriada mantendo o comportamento antigo).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) E-mail no pedido
-- ----------------------------------------------------------------------------
alter table public.pedidos add column email text;
create index pedidos_email_idx on public.pedidos (lower(email));

create or replace function public._pedido_email(v text, obrigatorio boolean)
returns text
language plpgsql
immutable
as $$
declare
  e text := lower(nullif(btrim(coalesce(v, '')), ''));
begin
  if e is null then
    if obrigatorio then raise exception 'email_invalido'; end if;
    return null;
  end if;
  if length(e) > 254 or e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'email_invalido';
  end if;
  return e;
end;
$$;

-- Versão pública do pedido passa a incluir o e-mail
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
    'arquivos', (
      select coalesce(jsonb_agg(jsonb_build_object('nome', a->>'nome', 'em', a->>'em')), '[]'::jsonb)
      from jsonb_array_elements(p.arquivos) a
    ),
    'created_at', p.created_at
  );
$$;

-- Formulário: e-mail obrigatório
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
    public._pedido_email(dados->>'email', true),
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

-- Confirmação do pré-cadastro (lead da Meta): o cliente completa o e-mail aqui
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
    email = public._pedido_email(dados->>'email', true),
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

-- ----------------------------------------------------------------------------
-- 2) Admins autorizados por e-mail
-- ----------------------------------------------------------------------------
create table public.admins_autorizados (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

alter table public.admins_autorizados enable row level security;

create policy "admins_autorizados_admin_all" on public.admins_autorizados
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.admins_autorizados (email) values ('pedrohferreira98@hotmail.com');

-- Quem já tem perfil com um e-mail autorizado vira admin agora
update public.profiles set role = 'admin'
where lower(email) in (select email from public.admins_autorizados);

-- Novo usuário: perfil criado como antes; vira admin se o e-mail estiver autorizado
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, nome, email, celular, empresa, cargo, ramo, role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'celular', ''),
    nullif(new.raw_user_meta_data->>'empresa', ''),
    nullif(new.raw_user_meta_data->>'cargo', ''),
    nullif(new.raw_user_meta_data->>'ramo', ''),
    case when exists (select 1 from public.admins_autorizados where email = lower(new.email))
      then 'admin' else 'cliente' end
  );
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3) Pedidos do usuário logado (pelo e-mail da sessão)
-- ----------------------------------------------------------------------------
create or replace function public.meus_pedidos()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(public._pedido_publico(p) order by p.created_at desc), '[]'::jsonb)
  from public.pedidos p
  where p.email is not null
    and lower(p.email) = lower(coalesce(auth.jwt()->>'email', ''))
    and p.status <> 'cancelado';
$$;

revoke all on function public.meus_pedidos() from public;
grant execute on function public.meus_pedidos() to authenticated;
