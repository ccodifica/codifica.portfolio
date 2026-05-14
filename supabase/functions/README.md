# Supabase Edge Functions — Codifica

Este diretório tem as funções serverless (Deno) que rodam no Supabase e
fazem a ponte entre o frontend (Vite/SPA) e a Google Calendar API.

## Funções

- `create-google-meet` — cria um evento no Google Calendar da Codifica (com
  sala do Meet anexada), chamada logo após o aluno agendar uma reunião.
- `cancel-google-meet` — deleta o evento no Google quando uma reunião é
  cancelada.

Ambas leem 4 secrets configurados no painel do Supabase:

| Secret | Para que serve |
|---|---|
| `GOOGLE_CLIENT_ID` | ID público da credencial OAuth |
| `GOOGLE_CLIENT_SECRET` | Secret da credencial OAuth |
| `GOOGLE_REFRESH_TOKEN` | Refresh token de longa duração (autoriza só uma vez) |
| `CODIFICA_ORGANIZER_EMAIL` | Email da Codifica que vai ficar como organizadora |

---

## Passo a passo — configuração inicial (uma única vez)

### 1. Google Cloud Console — criar projeto

1. Acesse https://console.cloud.google.com e faça login com a conta da
   Codifica (a mesma que organizará as reuniões).
2. Topo da página → seletor de projeto → **Novo projeto**.
3. Nome: `Codifica Meetings`. Pode deixar a Organização em branco.
4. Crie e aguarde o projeto aparecer selecionado no topo.

### 2. Habilitar a Google Calendar API

1. Menu lateral → **APIs e serviços** → **Biblioteca**.
2. Pesquise `Google Calendar API` → clique → **Ativar**.

### 3. Configurar a tela de consentimento OAuth

1. Menu lateral → **APIs e serviços** → **Tela de consentimento OAuth**.
2. Tipo de usuário: **Externo** → **Criar**.
3. Preencha o mínimo:
   - Nome do app: `Codifica`
   - Email de suporte: o email da Codifica
   - Email do desenvolvedor: o email da Codifica
4. Em **Escopos**, clique **Adicionar ou remover escopos** e procure por
   `.../auth/calendar.events` → marque → **Atualizar**.
5. Em **Usuários de teste**, adicione o email da Codifica (e qualquer outro
   admin que vai ser organizador).
6. Salve. **Importante:** pode deixar o status como `Em teste` — não precisa
   publicar. O refresh token gerado abaixo continua funcionando.

### 4. Criar a credencial OAuth 2.0

1. Menu lateral → **APIs e serviços** → **Credenciais**.
2. **Criar credenciais** → **ID do cliente OAuth**.
3. Tipo de aplicativo: **Aplicativo da Web**.
4. Nome: `Codifica Backend`.
5. Em **URIs de redirecionamento autorizados**, adicione exatamente:
   ```
   https://developers.google.com/oauthplayground
   ```
6. Criar.
7. Copie o `Client ID` e o `Client Secret` que aparecem — você vai
   precisar deles no próximo passo e no Supabase.

### 5. Gerar o refresh token (OAuth Playground)

1. Acesse https://developers.google.com/oauthplayground/
2. Ícone de **engrenagem** no canto superior direito → marque
   **Use your own OAuth credentials** → cole o Client ID e o Client Secret
   do passo anterior → feche o painel.
3. No painel esquerdo, busque `Calendar API v3` e marque o escopo:
   ```
   https://www.googleapis.com/auth/calendar.events
   ```
4. Clique **Authorize APIs**.
5. Faça login com a conta da Codifica (a mesma do passo 1) e aceite as
   permissões. Se aparecer aviso "O Google não verificou este aplicativo",
   clique **Avançado** → **Acessar (não seguro)** — é o app de vocês mesmos.
6. Volta pro Playground na tela "Step 2" → clique **Exchange authorization
   code for tokens**.
7. Copie o valor de **Refresh token** que aparece. **Esse token é vitalício
   enquanto a conta não revogar** — guarde com segurança, ele é a chave que
   o backend usa pra criar reuniões.

### 6. Adicionar os secrets no Supabase

No painel do Supabase do projeto → **Project Settings** → **Edge Functions**
→ **Secrets** → adicione 4 chaves:

```
GOOGLE_CLIENT_ID         = <Client ID copiado no passo 4>
GOOGLE_CLIENT_SECRET     = <Client Secret copiado no passo 4>
GOOGLE_REFRESH_TOKEN     = <Refresh token copiado no passo 5>
CODIFICA_ORGANIZER_EMAIL = ccodifica@gmail.com
```

### 7. Deploy das Edge Functions

Pelo terminal, com o Supabase CLI já instalado (`npm i -g supabase` ou
`npx supabase`):

```bash
# Autenticar (uma vez)
npx supabase login

# Linkar com o projeto da Codifica (uma vez — pega o ref do painel)
npx supabase link --project-ref <SEU_PROJECT_REF>

# Deploy das duas funções
npx supabase functions deploy create-google-meet
npx supabase functions deploy cancel-google-meet
```

### 8. Aplicar a migração do banco

```bash
npx supabase db push
```

Isso aplica `20260513000005_meetings_google_integration.sql`, que adiciona
as colunas `participantes_extras` e `google_event_id` na tabela `meetings`.

---

## Verificação manual

Depois do deploy, dá pra testar a função `create-google-meet` sem precisar
ir pelo frontend. No painel do Supabase → **Edge Functions** → clique em
`create-google-meet` → aba **Invoke** e cole:

```json
{
  "data": "2026-06-01",
  "horario": "14:00",
  "topico": "Teste de integração",
  "clienteEmail": "seu-email-pessoal@gmail.com",
  "clienteNome": "Teste",
  "participantesExtras": []
}
```

Se a resposta vier com `{ meetLink, eventId }` e você receber o convite no
Google Calendar, está tudo certo.

---

## Troubleshooting rápido

- **`invalid_grant`** ao tentar gerar access_token: o refresh token foi
  revogado ou expirou. Refaz o passo 5.
- **`forbidden` / `403`**: a Calendar API está desabilitada. Volte ao
  passo 2.
- **Evento criado mas sem link do Meet**: faltou `conferenceDataVersion=1`
  na URL — não deve acontecer no nosso código, mas se acontecer, confirme
  que está usando a função `create-google-meet` deste diretório.
- **`CODIFICA_ORGANIZER_EMAIL ausente`** no log: faltou setar o secret no
  passo 6.
