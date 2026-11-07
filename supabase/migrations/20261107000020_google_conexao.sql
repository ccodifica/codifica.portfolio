-- Conexão com o Google (Search Console + Perfil da Empresa) feita pelo botão
-- "Conectar Google" da aba Métricas. O token fica aqui, sem nenhuma policy:
-- só as Edge Functions (service role) leem e gravam. Ninguém copia token.

create table if not exists public.integracoes (
  id text primary key,                 -- 'google_metricas'
  refresh_token text,
  conta_email text,
  escopos text,
  conectado_em timestamptz,
  conectado_por uuid references auth.users (id) on delete set null,
  estado text,                         -- nonce do fluxo OAuth em andamento
  estado_expira timestamptz,
  voltar_para text,                    -- página do painel para onde voltar
  updated_at timestamptz not null default now()
);

alter table public.integracoes enable row level security;
revoke all on public.integracoes from anon, authenticated;
