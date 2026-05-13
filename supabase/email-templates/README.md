# Templates de e-mail — EmailJS

E-mails transacionais que o app dispara pelo EmailJS (já configurado em `src/services/emailService.ts`).

São **3 templates**: um você só ajusta (já existe), os outros dois são novos e precisam ser criados.

## Templates

| Template | Arquivo | Quando dispara | Para quem |
|---|---|---|---|
| **Contato / Lead** | [emailjs_contact_form.html](emailjs_contact_form.html) | Fale Conosco do site + novo cadastro no Espaço do Cliente | `ccodifica@gmail.com` (admin) |
| **Reunião agendada** | [emailjs_meeting_scheduled.html](emailjs_meeting_scheduled.html) | Cliente agenda uma reunião | Cliente |
| **Link Meet pronto** | [emailjs_meeting_link_ready.html](emailjs_meeting_link_ready.html) | Admin cola o link do Google Meet | Cliente |

## Passo a passo no EmailJS Dashboard

Acesse: https://dashboard.emailjs.com/admin

### 1) Atualizar o template existente `template_736yr0u` (Contato / Lead)

1. Email Templates → clica em `template_736yr0u`
2. No editor de HTML, **substitui** o conteúdo pelo `emailjs_contact_form.html`
3. Subject: `🚀 Novo contato — {{service}}`
4. **To Email**: `ccodifica@gmail.com` (fixo)
5. **Reply To**: `{{reply_to}}`
6. **Variáveis usadas** (configurar em "Settings" do template): `from_name`, `from_email`, `service`, `message`, `reply_to`, `to_email`
7. **Save**

### 2) Criar template novo "Reunião agendada"

1. Email Templates → **Create New Template**
2. **Template Name**: `Codifica - Reunião agendada`
3. **Subject**: `Sua reunião com a Codifica está marcada — {{meeting_date}}`
4. **HTML**: cola o conteúdo de `emailjs_meeting_scheduled.html`
5. **To Email**: `{{to_email}}` ← dinâmico (clica em "To Email" e marca como variável)
6. **Reply To**: `{{reply_to}}`
7. **Variáveis**: `to_email`, `to_name`, `meeting_date`, `meeting_time`, `meeting_topic`, `project_name`, `reply_to`
8. **Save** — copia o **Template ID** gerado (algo tipo `template_abc123`)
9. Cola o ID em `src/config/emailConfig.ts`:
   ```ts
   templateMeetingScheduled: "template_abc123", // ← cola aqui
   ```

### 3) Criar template novo "Link Meet pronto"

1. Email Templates → **Create New Template**
2. **Template Name**: `Codifica - Link Meet pronto`
3. **Subject**: `Seu link do Google Meet está pronto — {{meeting_date}}`
4. **HTML**: cola o conteúdo de `emailjs_meeting_link_ready.html`
5. **To Email**: `{{to_email}}` ← dinâmico
6. **Reply To**: `{{reply_to}}`
7. **Variáveis**: `to_email`, `to_name`, `meeting_date`, `meeting_time`, `meet_link`, `project_name`, `reply_to`
8. **Save** — copia o **Template ID**
9. Cola em `src/config/emailConfig.ts`:
   ```ts
   templateMeetingLinkReady: "template_def456", // ← cola aqui
   ```

## Configuração do EmailJS Service

A configuração atual de `service_kh4vgfc` deve aceitar **To Email dinâmico**. Confirme em:

- Email Services → `service_kh4vgfc` → **Allow dynamic recipients** (se houver opção)

Sem isso, os e-mails de reunião não chegam ao cliente (cairiam no e-mail fixo do owner do service).

## Como testar cada e-mail

| Como testar | Onde |
|---|---|
| **Contato/Lead** | Manda mensagem no formulário do site OU cria conta no Espaço do Cliente |
| **Reunião agendada** | Loga no app, vai em Espaço do Cliente → Reunião → Agendar |
| **Link Meet pronto** | Loga como admin, abre uma reunião, cola um link no campo Google Meet, Salvar |

Se der erro:
- **Template not found** → ID errado em `emailConfig.ts`
- **Service ID not found** → service ID errado
- **Bad recipient** → "To Email" não está dinâmico
- DevTools → Console mostra detalhe específico

## Upgrade futuro — Resend + Supabase Edge Function

EmailJS é simples mas tem limitações:
- 200 e-mails/mês no free
- Templates só via dashboard (sem versionamento)
- Branding limitado

Path de upgrade quando crescer:
1. Conta no Resend (3000/mês free)
2. Verifica domínio `codifica.com.br` no Resend (DNS)
3. Cria Supabase Edge Function `send-email` que usa a Resend SDK
4. Substitui chamadas do `emailService` pra invocar a Edge Function
5. Templates ficam em React Email ou MJML no repositório (versionados, deployáveis)

Posso fazer essa migração quando você quiser.
