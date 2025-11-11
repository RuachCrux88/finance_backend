import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: +(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  async sendVerificationEmail(to: string, url: string) {
    const from = process.env.MAIL_FROM ?? 'no-reply@finance.local';
    const info = await this.transporter.sendMail({
      from,
      to,
      subject: 'Verifica tu correo en Finance',
      html: `
        <h2>Confirma tu correo</h2>
        <p>Gracias por registrarte. Haz clic en el botón para verificar:</p>
        <p><a href="${url}" style="padding:10px 16px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none">Verificar correo</a></p>
        <p>Si no funciona, copia y pega esta URL en tu navegador:</p>
        <code>${url}</code>
      `,
    });
    this.logger.log(`Email de verificación enviado a ${to} (id: ${info.messageId})`);
  }

  async sendInvitationEmail(to: string, walletName: string, ownerName: string, acceptUrl: string) {
    const from = process.env.MAIL_FROM ?? 'no-reply@finance.local';
    const info = await this.transporter.sendMail({
      from,
      to,
      subject: `Invitación a la billetera "${walletName}"`,
      html: `
        <h2>Invitación a billetera grupal</h2>
        <p><strong>${ownerName}</strong> te ha invitado a unirte a la billetera grupal <strong>"${walletName}"</strong>.</p>
        <p>Haz clic en el botón para aceptar la invitación:</p>
        <p><a href="${acceptUrl}" style="padding:10px 16px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none">Aceptar invitación</a></p>
        <p>Si no funciona, copia y pega esta URL en tu navegador:</p>
        <code>${acceptUrl}</code>
        <p><small>Esta invitación expira en 7 días.</small></p>
      `,
    });
    this.logger.log(`Email de invitación enviado a ${to} (id: ${info.messageId})`);
  }
}
