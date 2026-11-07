-- ============================================================================
-- 019 — Documentos só para o dono, logado
--
-- Correção da 018: a leitura liberada para quem soubesse o caminho permitia
-- LISTAR a pasta e descobrir arquivos de outros clientes (listar e assinar
-- usam a mesma permissão de SELECT no storage).
--
-- Agora o arquivo só é lido por quem está logado com o e-mail do pedido
-- (código por e-mail) ou é o cliente do projeto de sistema. Listar a pasta
-- passa a mostrar só os arquivos da própria pessoa.
-- ============================================================================

drop policy if exists "documentos_cliente_select" on storage.objects;
drop function if exists public.documento_compartilhado(text);

create or replace function public.documento_do_usuario(p_path text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  with eu as (
    select lower(coalesce(auth.jwt()->>'email', '')) as email, auth.uid() as uid
  )
  select exists (
    select 1
    from public.lancamentos l
    left join public.pedidos p on p.id = l.pedido_id
    left join public.projects pr on pr.id = l.projeto_id
    cross join eu
    where l.nota_path = p_path
      and (
        (eu.email <> '' and p.email is not null and lower(p.email) = eu.email)
        or (eu.uid is not null and pr.cliente_id = eu.uid)
      )
  )
  or exists (
    select 1
    from public.pedidos p
    cross join lateral jsonb_array_elements(p.entrega) e
    cross join eu
    where e->>'path' = p_path
      and eu.email <> ''
      and p.email is not null
      and lower(p.email) = eu.email
  );
$$;

revoke all on function public.documento_do_usuario(text) from public;
grant execute on function public.documento_do_usuario(text) to authenticated;

create policy "documentos_dono_select" on storage.objects
  for select
  to authenticated
  using (bucket_id = 'documentos' and public.documento_do_usuario(name));
