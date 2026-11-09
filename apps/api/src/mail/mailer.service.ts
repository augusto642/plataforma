import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { ConfigError } from '../config/secrets.validation';

/**
 * C5 (Lote 1) — Envio do código de confirmação de e-mail.
 *
 * Providers (MAILER_PROVIDER):
 * - `log` (padrão fora de produção): NÃO envia e-mail; registra o código no
 *   log do servidor para desenvolvimento/teste local. EXPLÍCITO e proibido em
 *   produção — com NODE_ENV=production + provider=log o envio falha com
 *   ConfigError (fail-closed: código de verificação nunca pode vazar em log
 *   de produção).
 * - `smtp`: envio real via nodemailer com as variáveis SMTP_HOST, SMTP_PORT,
 *   SMTP_SECURE ('true' = TLS implícito na porta 465), SMTP_USER, SMTP_PASS
 *   e SMTP_FROM (obrigatórias; faltando qualquer uma, ConfigError no boot do
 *   envio). PENDÊNCIA DECLARADA: não há servidor SMTP verificável neste
 *   ambiente — o envio real só foi validado até o ponto de configuração
 *   (transporter criado + erro honesto sem credenciais); o primeiro envio de
 *   verdade precisa de smoke test com SMTP real antes do piloto.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  get provider(): 'log' | 'smtp' {
    const configured = this.config.get<string>('MAILER_PROVIDER');
    if (configured === 'smtp' || configured === 'log') return configured;
    // Padrão: log fora de produção (dev/test), smtp em produção.
    return this.config.get<string>('NODE_ENV') === 'production' ? 'smtp' : 'log';
  }

  /**
   * Envia o código de 6 dígitos para `email`. O código em texto claro só
   * existe aqui (e no e-mail do usuário): no banco só vai o hash SHA-256.
   */
  async sendVerificationCode(email: string, name: string, code: string): Promise<void> {
    if (this.provider === 'log') {
      if (this.config.get<string>('NODE_ENV') === 'production') {
        throw new ConfigError(
          'MAILER_PROVIDER=log is forbidden in production: verification codes must never be written to logs. Configure SMTP (MAILER_PROVIDER=smtp + SMTP_HOST/SMTP_USER/SMTP_PASS/SMTP_FROM).',
        );
      }
      // Modo desenvolvimento EXPLÍCITO: o código aparece no log do servidor
      // para permitir o fluxo sem SMTP. Nunca usar em produção.
      this.logger.log(
        `[DEV-ONLY MAILER] Código de verificação para ${email}: ${code} (válido por 15 minutos; este log só existe com MAILER_PROVIDER=log fora de produção)`,
      );
      return;
    }

    const transporter = this.getTransporter();
    const from = this.config.get<string>('SMTP_FROM');
    await transporter.sendMail({
      from,
      to: email,
      subject: 'Seu código de confirmação — Nexus Code',
      text:
        `Olá, ${name}!\n\n` +
        `Seu código de confirmação da Nexus Code é: ${code}\n\n` +
        `Ele vale por 15 minutos. Se você não criou uma conta, ignore este e-mail.\n`,
      html:
        `<p>Olá, ${name}!</p>` +
        `<p>Seu código de confirmação da Nexus Code é: <strong style="font-size: 20px; letter-spacing: 4px;">${code}</strong></p>` +
        `<p>Ele vale por 15 minutos. Se você não criou uma conta, ignore este e-mail.</p>`,
    });
    this.logger.log(`Verification code e-mail sent to ${email} via SMTP.`);
  }

  private getTransporter(): nodemailer.Transporter {
    if (this.transporter) return this.transporter;
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const from = this.config.get<string>('SMTP_FROM');
    const missing = [
      ['SMTP_HOST', host],
      ['SMTP_USER', user],
      ['SMTP_PASS', pass],
      ['SMTP_FROM', from],
    ]
      .filter(([, v]) => !v)
      .map(([k]) => k);
    if (missing.length > 0) {
      throw new ConfigError(
        `MAILER_PROVIDER=smtp requires: ${missing.join(', ')}. Configure o SMTP antes de enviar códigos.`,
      );
    }
    this.transporter = nodemailer.createTransport({
      host,
      port: Number(this.config.get<string>('SMTP_PORT', '587')),
      secure: this.config.get<string>('SMTP_SECURE', 'false') === 'true',
      auth: { user, pass },
    });
    return this.transporter;
  }
}
