# Templates de e-mail — Supabase Auth

Templates HTML em pt-BR com a identidade visual da Codifica (gradiente roxo→cyan).
Estes e-mails são enviados pelo próprio Supabase (auth) quando o usuário faz signup, pede reset de senha, etc.

## Onde colar cada template

Acesse: **Supabase Dashboard → seu projeto → Authentication → Email Templates**

Tem 4 abas no painel:

| Template | Arquivo neste repo | Subject sugerido |
|---|---|---|
| **Confirm signup** | [confirm_signup.html](confirm_signup.html) | `Confirme seu cadastro na Codifica` |
| **Magic Link** | [magic_link.html](magic_link.html) | `Seu link de acesso à Codifica` |
| **Change Email Address** | [change_email.html](change_email.html) | `Confirme seu novo e-mail` |
| **Reset Password** | [recovery.html](recovery.html) | `Codifica — Redefinir sua senha` |

Para cada template:

1. Clica na aba (ex: "Reset password")
2. **Subject heading**: cola o subject sugerido da tabela acima
3. **Message body (HTML)**: cola o conteúdo do arquivo `.html`
4. Clica em **Save changes**

> Os arquivos usam as variáveis nativas do Supabase: `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .SiteURL }}`. Não mexe nelas — o Supabase substitui automático no envio.

## Configurações extras importantes

### Authentication → URL Configuration

- **Site URL**: `http://localhost:8080` (dev) — quando subir produção, mude pro domínio real
- **Redirect URLs**: adicionar:
  - `http://localhost:8080/**`
  - `http://localhost:8080/espaco-do-cliente/redefinir-senha`
  - (em produção, adicione também o domínio público)

### Authentication → Sign In / Up

- **Confirm email**: pode deixar **OFF** no começo (cliente já entra direto após o signUp). Quando ligar pra produção, **ON** e o template `confirm_signup.html` entra em ação.

### Authentication → Email — Rate limits

A SMTP padrão do Supabase tem limite **muito baixo** (2 e-mails/hora). Pra produção, configure SMTP próprio:

- Settings → Authentication → SMTP Settings
- Recomendo **Resend** (3000 e-mails/mês free, fácil setup)
- Permite usar `noreply@codifica.com.br` (após verificar o domínio)

## Como testar

1. Configura os 4 templates
2. Apaga sua conta no Supabase (Authentication → Users → seu user → ⋯ → Delete)
3. Faz signUp pelo app
4. Confere se o e-mail chegou bonito

Se quiser disparar manualmente pra testar layout, no SQL Editor:
```sql
-- Reset password: vai pra Authentication → Users → seu user → ⋯ → Send password recovery
```

---

Próximo: emails transacionais via EmailJS — veja [supabase/email-templates/README.md](../email-templates/README.md)
