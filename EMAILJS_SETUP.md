# Configuração do Template EmailJS

Para corrigir o erro 400, você precisa configurar seu template no EmailJS com os campos corretos.

## 1. Acesse https://dashboard.emailjs.com/

## 2. Vá em "Email Templates" > "Create New Template"

## 3. Configure o template assim:

**Subject:** Novo contato - {{service}}

**Content:**
```
Olá,

Você recebeu um novo contato através do site da Codifica:

=== DADOS DO CLIENTE ===
Nome: {{from_name}}
E-mail: {{from_email}}
Serviço: {{service}}

=== MENSAGEM ===
{{message}}

=== RESPONDER ===
Este e-mail foi enviado para: {{to_email}}
Para responder, envie para: {{reply_to}}

---
Enviado automaticamente pelo sistema de contato
```

## 4. Salve o template e copie o Template ID

## 5. Os campos que devem existir no template:
- {{from_name}} - Nome do cliente
- {{from_email}} - Email do cliente  
- {{service}} - Serviço de interesse
- {{message}} - Mensagem do cliente
- {{to_email}} - Seu email (ccodifica@gmail.com)
- {{reply_to}} - Email para resposta

## 6. Configure o "To Email" como: ccodifica@gmail.com