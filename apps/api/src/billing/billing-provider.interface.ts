import type { Plan } from '@prisma/client';

/**
 * Fase 1 premium (desenho §2.1) — interface do provedor de pagamento.
 * NENHUM código de negócio importa SDK de provedor diretamente: toda a
 * cobrança passa por aqui. Provedores em modo teste: `simulated` e
 * Mercado Pago sandbox; cobrança real permanece desativada.
 */

export const BILLING_PROVIDER_TOKEN = 'BILLING_PROVIDER';

export type BillingCycle = 'monthly' | 'annual';

export interface CheckoutSessionInput {
  userId: string;
  plan: Plan;
  billingCycle: BillingCycle;
  /** Valor em centavos, também validado contra o evento confirmado pelo provedor. */
  amountCents: number;
  successUrl: string;
  failureUrl: string;
}

export interface CheckoutSession {
  sessionId: string;
  checkoutUrl: string;
  /** Id da assinatura no provedor (no simulado, igual ao sessionId). */
  providerSubscriptionId: string;
}

/** Tipos de evento normalizados que o BillingService sabe aplicar. */
export type BillingWebhookType =
  | 'payment_approved'
  | 'payment_rejected'
  | 'subscription_active'
  | 'subscription_canceled'
  | 'subscription_expired'
  | 'payment_refunded'
  | 'payment_pending';

export interface NormalizedBillingEvent {
  providerEventId: string;
  type: BillingWebhookType;
  /** Id da sessão/assinatura no provedor (chave de idempotência de aplicação). */
  providerSubscriptionId?: string;
  userId?: string;
  plan?: Plan;
  billingCycle?: BillingCycle;
  /** Fim do período vigente informado pelo provedor, quando houver. */
  currentPeriodEnd?: Date;
  /** Valores retornados pela API do provedor; conferidos contra a sessão. */
  amountCents?: number;
  currencyId?: string;
}

export interface BillingWebhookContext {
  requestId?: string;
  dataId?: string;
}

export interface BillingProvider {
  /** Nome do provedor, igual ao segmento da rota de webhook. */
  readonly name: string;
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession>;
  /**
   * Valida a assinatura, consulta o provedor quando necessário e
   * normaliza o payload. Lança em assinatura inválida ou payload
   * irreconhecível — o controller responde 4xx sem gravar evento.
   */
  parseWebhook(
    rawBody: Buffer,
    signature: string | undefined,
    context?: BillingWebhookContext,
  ): Promise<NormalizedBillingEvent>;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
  refund(paymentId: string): Promise<void>;
}
