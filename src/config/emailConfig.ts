// EmailJS Configuration - Credenciais reais
export const emailConfig = {
  // Credenciais reais do EmailJS
  serviceId: 'service_kh4vgfc',      // ✅ Service ID correto
  templateId: 'template_736yr0u',    // ✅ Template ID correto  
  publicKey: 'e2b33sslmOMMHr5iP',    // ✅ Public Key correto
  
  // E-mail de destino para todos os formulários
  toEmail: 'ccodifica@gmail.com'
};

// Template de e-mail que será usado no EmailJS
export const emailTemplate = `
Assunto: [PRIORITÁRIO] Nova solicitação de orçamento - {{service}}

Nova mensagem recebida através do formulário do site:

📧 INFORMAÇÕES DE CONTATO
Nome: {{name || 'Não informado'}}
E-mail: {{email}}

🎯 SERVIÇO DE INTERESSE
{{service}}

📝 DESCRIÇÃO DO PROJETO
{{description || 'Não informada'}}

---
Data/Hora: {{date}}
IP: {{userIP || 'Não disponível'}}

Esta mensagem foi enviada automaticamente através do formulário de contato do site.
Para responder, utilize o e-mail: {{email}}
`;

// Instruções de configuração do EmailJS
export const setupInstructions = `
CONFIGURAÇÃO DO EMAILJS:

1. Acesse https://www.emailjs.com/ e crie uma conta
2. Configure um serviço de e-mail (recomendado: Gmail)
3. Crie um template de e-mail com os seguintes campos:
   - {{name}} - Nome do usuário
   - {{email}} - E-mail do usuário  
   - {{service}} - Serviço selecionado
   - {{description}} - Descrição do projeto
   - {{date}} - Data/hora do envio
4. Configure o template para marcar como prioritário (adicione "Priority: high" nos headers)
5. Substitua as constantes no arquivo emailConfig.ts pelos seus valores reais
6. Teste o envio através do dashboard do EmailJS

TEMPLATE SUGERIDO NO EMAILJS:
Assunto: [PRIORITÁRIO] Nova solicitação - {{service}}
Para: ccodifica@gmail.com

Nova mensagem do formulário:
Nome: {{name}}
E-mail: {{email}} 
Serviço: {{service}}
Descrição: {{description}}
Data: {{date}}
`;