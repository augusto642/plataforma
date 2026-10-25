import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
import type {
  BillingProvider,
  BillingWebhookType,
  CheckoutSession,
  CheckoutSessionInput,
  NormalizedBillingEvent,
} from '../billing-provider.interface';

/**
 * Fase 1 premium — provedor v1 ATIVO: sandbox SIMULADO.
 * Não usa credencial, não chama rede externa de pagamento real e nunca
 * move dinheiro: `createCheckoutSession` só devolve uma URL de retorno
 * para a página de sucesso do próprio web (modo teste), e a aprovação
 * chega pelo webhook simulado (`POST /billing/webhooks/simulated`),
 * que é o harness de teste do fluxo completo.
 *
 * Assinatura do webhook: quando `BILLING_WEBHOOK_SECRET` está definido,
 * exige HMAC-SHA256 hex do corpo bruto no header `x-signature`
 * (`sha256=<hex>` ou hex puro). Sem segredo configurado, aceita o
 * evento sem assinatura — SOMENTE em modo teste e com aviso em log;
 * em qualquer outro modo o TestModeGuard já bloqueou o checkout e a
 * validação de segredos bloqueia o boot com BILLING_MODE != test.
 */
const KNOWN_TYPES: readonly string[] = [
  'payment_approved',
  'payment_rejected',
  'subscription_active',
  'subscription_canceled',
  'subscription_expired',
  'payment_refunded',
];

@Injectable()
export class SimulatedTestProvider implements BillingProvider {
  readonly name = 'simulated';
  private readonly logger = new Logger(SimulatedTestProvider.name);
  private readonly webhookSecret: string | undefined;
  private readonly webUrl: string;

  constructor(private readonly config: ConfigService) {
    this.webhookSecret = config.get<string>('BILLING_WEBHOOK_SECRET') || undefined;
    this.webUrl =
      config.get<string>('WEB_PUBLIC_URL') ||
      config.get<string>('WEB_URL') ||
      'http://localhost:3001';
  }

  async createCheckoutSession(_input: CheckoutSessionInput): Promise<CheckoutSession> {
    const sessionId = `sim_${randomUUID()}`;
    // Modo teste: não há provedor externo para redirecionar. A URL de
    // retorno é a página de sucesso do próprio web, que explica que a
    // confirmação chega via webhook simulado (harness de teste).
    return {
      sessionId,
      checkoutUrl: `${this.webUrl}/checkout/sucesso?session=${encodeURIComponent(sessionId)}&provider=simulated`,
      providerSubscriptionId: sessionId,
    };
  }

  parseWebhook(rawBody: Buffer, signature: string | undefined): NormalizedBillingEvent {
    if (this.webhookSecret) {
      const expected = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(rawBody)
        .digest('hex');
      const provided = (signature ?? '').replace(/^sha256=/, '');
      const ok =
        provided.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
      if (!ok) {
        throw new UnauthorizedException('Assinatura do webhook inválida');
      }
    } else {
      this.logger.warn(
        'Webhook simulado sem BILLING_WEBHOOK_SECRET: aceito sem assinatura (modo teste apenas)',
      );
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
    } catch {
      throw new UnauthorizedException('Payload do webhook inválido');
    }

    const providerEventId =
      typeof payload.providerEventId === 'string' ? payload.providerEventId : undefined;
    const type = typeof payload.type === 'string' ? payload.type : undefined;
    if (!providerEventId || !type || !KNOWN_TYPES.includes(type)) {
      throw new UnauthorizedException('Evento de webhook desconhecido ou sem id');
    }

    return {
      providerEventId,
      type: type as BillingWebhookType,
      providerSubscriptionId:
        typeof payload.sessionId === 'string'
          ? payload.sessionId
          : typeof payload.providerSubscriptionId === 'string'
            ? payload.providerSubscriptionId
            : undefined,
      userId: typeof payload.userId === 'string' ? payload.userId : undefined,
      plan: typeof payload.plan === 'string' ? (payload.plan as NormalizedBillingEvent['plan']) : undefined,
      billingCycle:
        typeof payload.billingCycle === 'string'
          ? (payload.billingCycle as NormalizedBillingEvent['billingCycle'])
          : undefined,
      currentPeriodEnd:
        typeof payload.currentPeriodEnd === 'string'
          ? new Date(payload.currentPeriodEnd)
          : undefined,
    };
  }

  async cancelSubscription(_providerSubscriptionId: string): Promise<void> {
    // Simulado: não há provedor externo para cancelar.
    return;
  }

  async refund(_paymentId: string): Promise<void> {
    // Simulado: não há pagamento real para estornar.
    return;
  }
}
