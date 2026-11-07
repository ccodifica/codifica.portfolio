-- Chave que o pg_cron manda para as Edge Functions automáticas (rotinas e monitor).
-- As funções rodam sem verificação de JWT (o site usa chave publishable), então
-- sem isto qualquer pessoa poderia disparar checagens, e-mails e relatórios.
-- A chave é gerada aqui e fica só no Vault: ninguém precisa copiá-la.

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'cron_chave') then
    perform vault.create_secret(
      md5(random()::text || clock_timestamp()::text) || md5(random()::text || clock_timestamp()::text),
      'cron_chave',
      'Chave enviada pelo pg_cron às Edge Functions rotinas e monitor'
    );
  end if;
end $$;

create or replace function public.cron_chave_valida(p text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(length(p) >= 32 and exists (
    select 1 from vault.decrypted_secrets where name = 'cron_chave' and decrypted_secret = p
  ), false);
$$;

revoke all on function public.cron_chave_valida(text) from public, anon, authenticated;
grant execute on function public.cron_chave_valida(text) to service_role;

-- cabeçalhos dos agendamentos, com a chave lida do Vault na hora de cada chamada
create or replace function public._cron_cabecalhos()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'Content-Type', 'application/json',
    'x-cron-chave', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_chave')
  );
$$;

revoke all on function public._cron_cabecalhos() from public, anon, authenticated;

select cron.schedule('codifica_rotinas', '7 * * * *', $$
  select net.http_post(url := 'https://zhmhcyzsrihvigtelvux.supabase.co/functions/v1/rotinas', body := '{}'::jsonb,
    headers := public._cron_cabecalhos(), timeout_milliseconds := 120000) $$);

select cron.schedule('monitor_checar', '*/5 * * * *', $$
  select net.http_post(url := 'https://zhmhcyzsrihvigtelvux.supabase.co/functions/v1/monitor', body := '{"modo":"checar"}'::jsonb,
    headers := public._cron_cabecalhos(), timeout_milliseconds := 60000) $$);

select cron.schedule('monitor_diario', '20 6 * * *', $$
  select public.monitor_consolidar_dia((now() at time zone 'America/Sao_Paulo')::date - 1);
  select net.http_post(url := 'https://zhmhcyzsrihvigtelvux.supabase.co/functions/v1/monitor', body := '{"modo":"diario"}'::jsonb,
    headers := public._cron_cabecalhos(), timeout_milliseconds := 300000) $$);

select cron.schedule('monitor_relatorio', '0 12 1 * *', $$
  select net.http_post(url := 'https://zhmhcyzsrihvigtelvux.supabase.co/functions/v1/monitor', body := '{"modo":"relatorio"}'::jsonb,
    headers := public._cron_cabecalhos(), timeout_milliseconds := 300000) $$);
