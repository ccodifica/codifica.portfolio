import emailjs from '@emailjs/browser';
import { emailConfig } from '@/config/emailConfig';

export interface ContactFormData {
  name: string;
  email: string;
  service: string;
  description: string;
}

class EmailService {
  async sendContactEmail(data: ContactFormData): Promise<void> {
    const errors = this.validateFormData(data);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    try {
      const templateParams = {
        from_name: data.name,
        from_email: data.email,
        service: data.service,
        message: data.description,
        to_email: emailConfig.toEmail,
        reply_to: data.email
      };

      console.log('📧 Enviando email com parâmetros:', templateParams);
      console.log('🔧 Configuração EmailJS:', {
        serviceId: emailConfig.serviceId,
        templateId: emailConfig.templateId,
        publicKey: emailConfig.publicKey
      });

      const result = await emailjs.send(
        emailConfig.serviceId,
        emailConfig.templateId,
        templateParams,
        emailConfig.publicKey
      );

      console.log('✅ Email enviado:', result);

    } catch (error) {
      console.error('❌ Erro completo:', error);
      
      if (error instanceof Error) {
        console.error('❌ Mensagem do erro:', error.message);
        console.error('❌ Stack trace:', error.stack);
      }
      
      // Verificar se é erro específico do EmailJS
      if (error && typeof error === 'object' && 'status' in error) {
        const emailError = error as { status: number; text?: string };
        console.error('❌ Status EmailJS:', emailError.status);
        console.error('❌ Text EmailJS:', emailError.text);
        
        if (emailError.status === 400) {
          if (emailError.text?.includes('service ID not found')) {
            throw new Error(`❌ Service ID "${emailConfig.serviceId}" não encontrado! Verifique em https://dashboard.emailjs.com/admin se o Service ID está correto.`);
          } else if (emailError.text?.includes('template')) {
            throw new Error(`❌ Template ID "${emailConfig.templateId}" não encontrado ou mal configurado! Verifique em https://dashboard.emailjs.com/admin`);
          } else {
            throw new Error(`❌ Erro EmailJS: ${emailError.text || 'Erro desconhecido'}`);
          }
        }
      }
      
      throw new Error('Erro ao enviar mensagem. Verifique as configurações do EmailJS.');
    }
  }

  private validateFormData(data: ContactFormData): string[] {
    const errors: string[] = [];
    if (!data.name?.trim()) errors.push('Nome é obrigatório');
    if (!data.email?.trim()) errors.push('E-mail é obrigatório');
    else if (!this.isValidEmail(data.email)) errors.push('E-mail inválido');
    if (!data.service?.trim()) errors.push('Serviço é obrigatório');
    return errors;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

export const emailService = new EmailService();
