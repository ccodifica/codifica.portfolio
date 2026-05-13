-- ============================================================================
-- 001 — Schema inicial do Espaço do Cliente
--
-- Cria as 6 tabelas (profiles, projects, messages, message_attachments,
-- meetings, project_events) com FKs, defaults, checks e indexes.
-- ============================================================================

create extension if not exists "pgcrypto"; -- para gen_random_uuid()

-- ----------------------------------------------------------------------------
-- profiles: estende auth.users com dados do app
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  celular text not null default '',
  empresa text,
  cargo text,
  ramo text,
  role text not null default 'cliente'
    check (role in ('cliente', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);

-- ----------------------------------------------------------------------------
-- projects: 1 cliente N projetos
-- briefing armazena o QuestionnaireData completo como JSONB
-- ----------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profiles(id) on delete cascade,
  nome text not null,
  tipo text not null
    check (tipo in ('site', 'ecommerce', 'app', 'sistema', 'indeciso')),
  status text not null default 'aguardando_analise'
    check (status in (
      'aguardando_analise', 'briefing', 'design',
      'desenvolvimento', 'revisao', 'entrega', 'concluido'
    )),
  progresso int not null default 0
    check (progresso between 0 and 100),
  briefing jsonb not null,
  notas_admin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_cliente_idx on public.projects(cliente_id);
create index projects_status_idx on public.projects(status);
create index projects_created_idx on public.projects(created_at desc);

-- ----------------------------------------------------------------------------
-- messages: chat por projeto
-- autor_nome é snapshot — sobrevive a renomeio/deleção do profile
-- ----------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  autor_id uuid not null references public.profiles(id),
  autor_role text not null check (autor_role in ('cliente', 'admin')),
  autor_nome text not null,
  texto text not null default '',
  created_at timestamptz not null default now()
);

create index messages_project_idx on public.messages(project_id, created_at);

-- ----------------------------------------------------------------------------
-- message_attachments: 1 message N anexos
-- bytes ficam no bucket 'attachments'; aqui só metadados + storage_path
-- ----------------------------------------------------------------------------
create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  file_size bigint not null check (file_size > 0),
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create index message_attachments_msg_idx on public.message_attachments(message_id);

-- ----------------------------------------------------------------------------
-- meetings: reuniões agendadas por cliente, vinculadas a um projeto
-- ----------------------------------------------------------------------------
create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  cliente_id uuid not null references public.profiles(id),
  data date not null,
  horario time not null,
  topico text not null default '',
  notificar_email boolean not null default true,
  notificar_whatsapp boolean not null default false,
  meet_link text,
  status text not null default 'agendada'
    check (status in (
      'agendada', 'confirmada', 'realizada', 'cancelada', 'remarcada'
    )),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meetings_project_idx on public.meetings(project_id);
create index meetings_cliente_idx on public.meetings(cliente_id);
create index meetings_date_idx on public.meetings(data, horario);

-- ----------------------------------------------------------------------------
-- project_events: marcos registrados pela equipe (admin only)
-- aparecem no histórico do cliente
-- ----------------------------------------------------------------------------
create table public.project_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  fase text not null check (fase in (
    'aguardando_analise', 'briefing', 'design',
    'desenvolvimento', 'revisao', 'entrega', 'concluido'
  )),
  titulo text not null,
  descricao text not null default '',
  autor_id uuid not null references public.profiles(id),
  autor_role text not null,
  autor_nome text not null,
  created_at timestamptz not null default now()
);

create index project_events_idx
  on public.project_events(project_id, created_at desc);
