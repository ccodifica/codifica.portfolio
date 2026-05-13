# Supabase — Espaço do Cliente

Estrutura de banco e storage do Espaço do Cliente da Codifica.

## Estrutura

```
supabase/
├── config.toml                                      # config local do CLI
├── migrations/
│   ├── 20260513000001_init_schema.sql               # tabelas + indexes
│   ├── 20260513000002_functions_triggers.sql        # helpers + triggers
│   ├── 20260513000003_rls_policies.sql              # RLS policies
│   └── 20260513000004_storage_bucket.sql            # bucket attachments
└── README.md
```

## Pré-requisitos

- Node 18+ (já instalado)
- Supabase CLI instalado como devDependency (já feito: `npx supabase`)
- Personal Access Token: gere em https://supabase.com/dashboard/account/tokens
- Database password: pega em Settings → Database → Connection string

## Aplicar as migrations (passo a passo)

### 1. Login no CLI (uma única vez por máquina)

```powershell
npx supabase login
```

Vai pedir o **Personal Access Token** (cola e enter). Token fica em `~/.supabase/access-token`.

### 2. Linkar com o projeto remoto

```powershell
npx supabase link --project-ref zhmhcyzsrihvigtelvux
```

Vai pedir a **senha do banco de dados** (database password do projeto Supabase).

### 3. Aplicar as migrations

```powershell
npx supabase db push
```

Vai listar as 4 migrations e pedir confirmação (`y`). Aplica em ordem.

### 4. Promover sua conta para admin

Após o `db push`:

1. Acesse o app em produção/dev e crie sua conta normalmente (fluxo do questionário → cadastro)
   - Use o e-mail: `gustavodsouzaaa@gmail.com`
2. No Supabase Dashboard, vá em **SQL Editor** e rode:

```sql
update public.profiles
set role = 'admin'
where email = 'gustavodsouzaaa@gmail.com';
```

3. Faça logout e login de novo no app para o role novo carregar.

## Configurações no Dashboard Supabase (manuais)

Algumas coisas não dá pra fazer via migration SQL — precisa configurar no painel:

### Authentication → Email

- **Confirm email**: DESLIGADO (acelera o teste inicial; ligar antes de produção)
- **Email templates**: traduzir para pt-BR (Confirm signup, Reset password, Magic link)

### Authentication → Email Templates → Reset password

Sugestão de template:

```
Assunto: Codifica — Recuperação de senha

Olá,

Recebemos um pedido para redefinir a senha da sua conta no Espaço do Cliente da Codifica.

Para criar uma nova senha, clique no link abaixo:
{{ .ConfirmationURL }}

Se você não pediu isso, ignore este e-mail.

— Equipe Codifica
```

### Authentication → URL Configuration

- **Site URL**: `http://localhost:8080` (dev) e `https://seu-dominio.com.br` (prod, quando subir)
- **Redirect URLs**: adicione `http://localhost:8080/**` e o domínio de produção

## Verificações úteis

### Ver as tabelas criadas
```sql
select table_name from information_schema.tables
where table_schema = 'public'
order by table_name;
```

### Ver as policies de uma tabela
```sql
select * from pg_policies where schemaname = 'public' and tablename = 'projects';
```

### Ver o bucket
```sql
select * from storage.buckets where id = 'attachments';
```

## Desfazer tudo (CUIDADO — apaga dados)

```powershell
npx supabase db reset --linked
```

Reset apaga e reaplica todas as migrations. Use só se algo der errado durante a configuração inicial.

## Próximo passo

Depois das migrations aplicadas e do admin promovido, vou integrar o front substituindo o `src/lib/client-area-store.ts` (localStorage mock) por chamadas reais ao Supabase via `@supabase/supabase-js`.

Variáveis de ambiente que vão pro `.env.local`:

```
VITE_SUPABASE_URL=https://zhmhcyzsrihvigtelvux.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```
