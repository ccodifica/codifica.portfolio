import emailjs from "@emailjs/browser";
import {
  ADMIN_EMAIL,
  EmailJSEndpoint,
  emailEndpoints,
} from "@/config/emailConfig";

export interface ContactFormData {
  name: string;
  email: string;
  service: string;
  description: string;
}

export interface MeetingScheduledData {
  toEmail: string;
  toName: string;
  meetingDate: string;
  meetingTime: string;
  meetingTopic: string;
  projectName: string;
}

export interface MeetingLinkData {
  toEmail: string;
  toName: string;
  meetingDate: string;
  meetingTime: string;
  meetLink: string;
  projectName: string;
}

class EmailService {
  /**
   * Formulário "Fale conosco" + notificação de novo lead após cadastro.
   * Envia para ccodifica@gmail.com.
   */
  async sendContactEmail(data: ContactFormData): Promise<void> {
    const errors = this.validateContact(data);
    if (errors.length > 0) throw new Error(errors.join(", "));

    await this.send(emailEndpoints.contactForm, {
      from_name: data.name,
      from_email: data.email,
      service: data.service,
      message: data.description,
      to_email: ADMIN_EMAIL,
      reply_to: data.email,
    });
  }

  /**
   * Cliente acabou de agendar uma reunião pelo Espaço do Cliente.
   * Envia confirmação para o cliente (toEmail).
   */
  async sendMeetingScheduled(data: MeetingScheduledData): Promise<void> {
    await this.send(emailEndpoints.meetingScheduled, {
      to_email: data.toEmail,
      to_name: data.toName,
      meeting_date: data.meetingDate,
      meeting_time: data.meetingTime,
      meeting_topic: data.meetingTopic || "Conversa de alinhamento do projeto",
      project_name: data.projectName,
      reply_to: ADMIN_EMAIL,
    });
  }

  /**
   * Admin acabou de colar o link do Google Meet. Envia o link para o cliente.
   */
  async sendMeetingLinkReady(data: MeetingLinkData): Promise<void> {
    await this.send(emailEndpoints.meetingLinkReady, {
      to_email: data.toEmail,
      to_name: data.toName,
      meeting_date: data.meetingDate,
      meeting_time: data.meetingTime,
      meet_link: data.meetLink,
      project_name: data.projectName,
      reply_to: ADMIN_EMAIL,
    });
  }

  private async send(
    endpoint: EmailJSEndpoint,
    params: Record<string, string>
  ): Promise<void> {
    if (
      endpoint.publicKey.startsWith("PUBLIC_KEY_") ||
      endpoint.templateId.startsWith("TEMPLATE_ID_")
    ) {
      throw new Error(
        `Credenciais EmailJS incompletas para o template ${endpoint.templateId}. Atualize em src/config/emailConfig.ts.`
      );
    }
    try {
      await emailjs.send(
        endpoint.serviceId,
        endpoint.templateId,
        params,
        endpoint.publicKey
      );
    } catch (error) {
      const detail = this.describeError(error);
      console.error("EmailJS ❌", {
        endpoint,
        params,
        error,
      });
      throw new Error(`Erro ao enviar e-mail (${endpoint.templateId}): ${detail}`);
    }
  }

  private describeError(error: unknown): string {
    if (error && typeof error === "object" && "status" in error) {
      const e = error as { status: number; text?: string };
      if (e.status === 400 && e.text?.includes("template")) {
        return "Template não encontrado. Verifique o ID em src/config/emailConfig.ts.";
      }
      if (e.status === 400 && e.text?.includes("service")) {
        return "Service ID inválido.";
      }
      if (e.text) return e.text;
    }
    return error instanceof Error ? error.message : "Erro desconhecido";
  }

  private validateContact(data: ContactFormData): string[] {
    const errors: string[] = [];
    if (!data.name?.trim()) errors.push("Nome é obrigatório");
    if (!data.email?.trim()) errors.push("E-mail é obrigatório");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      errors.push("E-mail inválido");
    if (!data.service?.trim()) errors.push("Serviço é obrigatório");
    return errors;
  }
}

export const emailService = new EmailService();
