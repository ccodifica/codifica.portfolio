-- ============================================================================
-- 014 — Nome certo no perfil de quem entra por código
--
-- No login por código não há formulário de cadastro, então o perfil nascia com
-- o começo do e-mail como nome ("pedrohferreira98"). Agora:
--   1) novo usuário com pedido no mesmo e-mail herda nome e WhatsApp do pedido;
--   2) perfis que ficaram com o nome = começo do e-mail são corrigidos pelo pedido;
--   3) o admin Pedro passa a se chamar "Pedro Henrique".
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ped record;
begin
  select nome, whatsapp into ped
  from public.pedidos
  where email is not null and lower(email) = lower(new.email)
  order by created_at desc
  limit 1;

  insert into public.profiles (
    id, nome, email, celular, empresa, cargo, ramo, role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', ped.nome, split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'celular', ped.whatsapp, ''),
    nullif(new.raw_user_meta_data->>'empresa', ''),
    nullif(new.raw_user_meta_data->>'cargo', ''),
    nullif(new.raw_user_meta_data->>'ramo', ''),
    case when exists (select 1 from public.admins_autorizados where email = lower(new.email))
      then 'admin' else 'cliente' end
  );
  return new;
end;
$$;

update public.profiles pr
set nome = ped.nome,
    celular = case when pr.celular = '' then ped.whatsapp else pr.celular end
from (
  select distinct on (lower(email)) lower(email) as email, nome, whatsapp
  from public.pedidos
  where email is not null
  order by lower(email), created_at desc
) ped
where lower(pr.email) = ped.email
  and pr.nome = split_part(pr.email, '@', 1);

update public.profiles
set nome = 'Pedro Henrique'
where lower(email) = 'pedrohferreira98@hotmail.com';
