// EmailJS — Credenciais por tipo de e-mail
// Cada chave aponta para (serviceId + publicKey + templateId). Permite usar
// contas EmailJS diferentes para tipos diferentes de e-mail (plano free só
// aceita 2 templates por conta).

export interface EmailJSEndpoint {
  serviceId: string;
  publicKey: string;
  templateId: string;
}

// Conta 1 — "Codifica Company"
const CONTA_1 = {
  serviceId: "service_kh4vgfc",
  publicKey: "e2b33sslmOMMHr5iP",
};

// Conta 2 — "CodificaCompany" (criada por causa do limite de templates)
const CONTA_2 = {
  serviceId: "service_mgzgnoi",
  publicKey: "xEKI9fCa3IGIDqc1r",
};

export const emailEndpoints = {
  contactForm: {
    ...CONTA_1,
    templateId: "template_736yr0u",
  } as EmailJSEndpoint,

  meetingScheduled: {
    ...CONTA_1,
    templateId: "template_bdeb24h",
  } as EmailJSEndpoint,

  meetingLinkReady: {
    ...CONTA_2,
    templateId: "template_5r7bl01",
  } as EmailJSEndpoint,
} as const;

// E-mail interno do admin (destinatário fixo de notificações)
export const ADMIN_EMAIL = "ccodifica@gmail.com";
