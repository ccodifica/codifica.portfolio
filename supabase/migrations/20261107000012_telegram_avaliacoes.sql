-- ============================================================================
-- 022 — Avisos no Telegram e avaliação do cliente
--
-- 1) Avisos automáticos no grupo de Telegram da equipe quando é a vez da
--    Codifica: pedido novo (fazer a prévia), mudança pedida na prévia, contrato
--    assinado, pagamento confirmado e avaliação nova.
--    O token do robô e o id do grupo ficam no Vault do Supabase (secrets
--    'telegram_token' e 'telegram_chat_id'), colados pela equipe. Sem eles,
--    nada é enviado e nada quebra.
-- 2) Avaliação do cliente quando o site vai ao ar (nota de 1 a 5, comentário e
--    autorização para publicar como depoimento).
-- Migração só ADITIVA.
-- ============================================================================

create extension if not exists pg_net with schema extensions;

-- ----------------------------------------------------------------------------
-- Envio para o Telegram
-- ----------------------------------------------------------------------------
create or replace function public._telegram(p_texto text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  token text;
  chat text;
begin
  select decrypted_secret into token from vault.decrypted_secrets where name = 'telegram_token';
  select decrypted_secret into chat from vault.decrypted_secrets where name = 'telegram_chat_id';
  if token is null or chat is null then
    return; -- ainda não configurado
  end if;
  perform net.http_post(
    url := 'https://api.telegram.org/bot' || token || '/sendMessage',
    body := jsonb_build_object('chat_id', chat, 'text', p_texto, 'disable_web_page_preview', true),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
exception when others then
  -- aviso nunca pode impedir o cliente de seguir no site
  raise warning 'telegram: %', sqlerrm;
end;
$$;

revoke all on function public._telegram(text) from public, anon, authenticated;

create or replace function public.avisar_equipe_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  painel constant text := 'https://ccodifica.com.br/painel-codifica';
  msg text;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;
  msg := case new.status
    when 'recebido' then
      '🆕 Pedido novo: ' || new.negocio || ' (' || new.cidade || ')' || chr(10) ||
      'Hora de fazer a prévia. WhatsApp: ' || new.whatsapp
    when 'mudanca_pedida' then
      '✏️ ' || new.negocio || ' pediu uma mudança na prévia:' || chr(10) || '“' || coalesce(new.mudanca_texto, '') || '”'
    when 'contrato_aceito' then
      '📝 ' || new.negocio || ' assinou o contrato. Falta o pagamento.'
    when 'pago' then
      '💰 Pagamento confirmado: ' || new.negocio || chr(10) || 'Pode começar o site completo (prazo de 7 dias).'
    else null
  end;
  if msg is not null then
    perform public._telegram(msg || chr(10) || chr(10) || painel);
  end if;
  return new;
end;
$$;

drop trigger if exists pedidos_avisar_equipe on public.pedidos;
create trigger pedidos_avisar_equipe
  after insert or update of status on public.pedidos
  for each row execute function public.avisar_equipe_pedido();

-- Teste: select public.testar_telegram();  (só a equipe)
create or replace function public.testar_telegram()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'sem_permissao';
  end if;
  perform public._telegram('✅ Avisos da Codifica funcionando! Vocês vão receber aqui: pedido novo, mudança na prévia, contrato assinado, pagamento e avaliações.');
  return 'enviado (confira o grupo)';
end;
$$;

-- ----------------------------------------------------------------------------
-- Avaliação do cliente
-- ----------------------------------------------------------------------------
create table if not exists public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null unique references public.pedidos(id) on delete cascade,
  nota int not null check (nota between 1 and 5),
  comentario text check (length(comentario) <= 1000),
  pode_publicar boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.avaliacoes enable row level security;
drop policy if exists "avaliacoes_admin_all" on public.avaliacoes;
create policy "avaliacoes_admin_all" on public.avaliacoes for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.pedido_avaliar(p_codigo text, p_nota int, p_comentario text, p_pode_publicar boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.pedidos;
begin
  select * into p from public.pedidos where codigo = p_codigo and status = 'no_ar';
  if not found then
    raise exception 'etapa_invalida';
  end if;
  if p_nota is null or p_nota < 1 or p_nota > 5 then
    raise exception 'campo_obrigatorio';
  end if;
  insert into public.avaliacoes (pedido_id, nota, comentario, pode_publicar)
  values (p.id, p_nota, left(nullif(btrim(coalesce(p_comentario, '')), ''), 1000), coalesce(p_pode_publicar, false))
  on conflict (pedido_id) do update set
    nota = excluded.nota,
    comentario = excluded.comentario,
    pode_publicar = excluded.pode_publicar,
    updated_at = now();
  perform public._telegram(
    '⭐ ' || p.negocio || ' avaliou com ' || p_nota || ' de 5' ||
    case when nullif(btrim(coalesce(p_comentario, '')), '') is not null then ':' || chr(10) || '“' || left(btrim(p_comentario), 400) || '”' else '' end ||
    case when p_pode_publicar then chr(10) || '(pode publicar como depoimento)' else '' end
  );
  return public._pedido_publico(p);
end;
$$;

revoke all on function public.pedido_avaliar(text, int, text, boolean) from public;
grant execute on function public.pedido_avaliar(text, int, text, boolean) to anon, authenticated;

-- A versão pública do pedido passa a dizer se o cliente já avaliou (e a nota)
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
