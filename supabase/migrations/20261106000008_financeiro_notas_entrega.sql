-- ============================================================================
-- 018 — Financeiro, notas fiscais e entrega ao cliente
--
-- 1) lancamentos: cada recebimento (venda de site, mês de manutenção, sistema
--    ou outro). A aba Financeiro do painel soma daqui. Cada lançamento pode
--    ter a nota fiscal (PDF) anexada.
-- 2) pedidos.entrega: arquivos e instruções transferidos ao cliente (ex.: quem
--    não quis a manutenção). O cliente baixa pelo link pessoal quando quiser.
-- 3) Bucket privado 'documentos' (notas e entregas). Admin faz tudo; o cliente
--    só lê arquivos que estão ligados a um pedido/lançamento dele. Os caminhos
--    levam UUIDs aleatórios e só são revelados pelas funções abaixo, que exigem
--    o código do pedido (mesmo modelo do link pessoal).
--
-- Migração só ADITIVA.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Lançamentos
-- ----------------------------------------------------------------------------
create table public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('site', 'manutencao', 'sistema', 'outro')),
  pedido_id uuid references public.pedidos(id) on delete set null,
  projeto_id uuid references public.projects(id) on delete set null,
  cliente text not null check (length(btrim(cliente)) between 1 and 160),
  descricao text check (length(descricao) <= 300),
  valor numeric(10, 2) not null check (valor > 0),
  forma text not null check (forma in ('pix', 'boleto', 'cartao', 'outro')),
  parcelas int not null default 1 check (parcelas between 1 and 12),
  recebido_em date not null default (now() at time zone 'America/Sao_Paulo')::date,
  competencia date,              -- manutenção: 1º dia do mês pago
  nota_path text,                -- PDF no bucket 'documentos'
  nota_numero text check (length(nota_numero) <= 40),
  nota_emitida_por text check (length(nota_emitida_por) <= 60),  -- de quem foi o CNPJ
  nota_emitida_em date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lancamentos_recebido_idx on public.lancamentos(recebido_em desc);
create index lancamentos_pedido_idx on public.lancamentos(pedido_id);
create index lancamentos_projeto_idx on public.lancamentos(projeto_id);
-- Um pagamento de manutenção por pedido e por mês
create unique index lancamentos_manutencao_mes_idx
  on public.lancamentos(pedido_id, competencia)
  where tipo = 'manutencao' and pedido_id is not null;

create trigger lancamentos_set_updated_at
  before update on public.lancamentos
  for each row execute function public.set_updated_at();

alter table public.lancamentos enable row level security;

create policy "lancamentos_admin_all" on public.lancamentos
  for all using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 2) Entrega no pedido
-- ----------------------------------------------------------------------------
alter table public.pedidos
  add column entrega jsonb not null default '[]'::jsonb,  -- [{path, nome, tamanho, em}]
  add column entrega_instrucoes text check (length(entrega_instrucoes) <= 4000);

-- ----------------------------------------------------------------------------
-- 3) Bucket 'documentos'
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos',
  'documentos',
  false,
  52428800, -- 50 MB (limite do plano gratuito)
  array[
    'application/pdf', 'application/zip', 'application/x-zip-compressed',
    'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml',
    'text/plain', 'text/html', 'text/css', 'application/javascript', 'text/javascript',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- O arquivo pertence a algum pedido/lançamento? (usado pela policy de leitura)
create or replace function public.documento_compartilhado(p_path text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.lancamentos l where l.nota_path = p_path)
      or exists (
        select 1 from public.pedidos p, jsonb_array_elements(p.entrega) e
        where e->>'path' = p_path
      );
$$;

revoke all on function public.documento_compartilhado(text) from public;
grant execute on function public.documento_compartilhado(text) to anon, authenticated;

create policy "documentos_admin_all" on storage.objects
  for all
  using (bucket_id = 'documentos' and public.is_admin())
  with check (bucket_id = 'documentos' and public.is_admin());

create policy "documentos_cliente_select" on storage.objects
  for select
  using (bucket_id = 'documentos' and public.documento_compartilhado(name));

-- ----------------------------------------------------------------------------
-- 4) O que o cliente vê: pagamentos, notas e entrega do pedido
-- ----------------------------------------------------------------------------
create or replace function public.pedido_documentos(p_codigo text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'pagamentos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id,
        'tipo', l.tipo,
        'descricao', l.descricao,
        'valor', l.valor,
        'forma', l.forma,
        'parcelas', l.parcelas,
        'recebido_em', l.recebido_em,
        'competencia', l.competencia,
        'nota_path', l.nota_path,
        'nota_numero', l.nota_numero,
        'nota_emitida_em', l.nota_emitida_em
      ) order by l.recebido_em desc, l.created_at desc)
      from public.lancamentos l where l.pedido_id = p.id
    ), '[]'::jsonb),
    'entrega', p.entrega,
    'entrega_instrucoes', p.entrega_instrucoes
  )
  from public.pedidos p
  where p.codigo = p_codigo;
$$;

revoke all on function public.pedido_documentos(text) from public;
grant execute on function public.pedido_documentos(text) to anon, authenticated;
