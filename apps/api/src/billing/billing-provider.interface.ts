import type { Plan } from '@prisma/client';

/**
 * Fase 1 premium (desenho §2.1) — interface do provedor de pagamento.
 * NENHUM código de negócio importa SDK de provedor diretamente: toda a
 * cobrança passa por aqui. Provedor v1 ATIVO: `simulated` (sandbox
 * simulado, sem credencial e sem rede externa de pagamento real).
 * Mercado Pago existe como segundo adapter atrás desta mesma interface,
 * DESATIVADO (decisão de provedor v1 + credenciais de teste pendentes
 * do Augusto; ver providers/mercadopago-test.provider.ts).
 */

export const BILLING_PROVIDER_TOKEN = 'BILLING_PROVIDER';

export type BillingCycle = 'monthly' | 'annual';

export interface CheckoutSessionInput {
  userId: string;
  plan: Plan;
  billingCycle: BillingCycle;
  /** Valor em centavos, só para exibição no resumo — nunca cobrado de verdade em modo teste. */
  amountCents: number;
  successUrl: string;
  failureUrl: string;
}

export interface CheckoutSession {
  sessionId: string;
  checkoutUrl: string;
  /** Id da assinatura/sessão no provedor (no simulado, igual ao sessionId). */
  providerSubscriptionId: string;
}

/** Tipos de evento normalizados que o BillingService sabe aplicar. */
export type BillingWebhookType =
  | 'payment_approved'
  | 'payment_rejected'
  | 'subscription_active'
  | 'subscription_canceled'
  | 'subscription_expired'
  | 'payment_refunded';

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
}

export interface BillingProvider {
  /** Nome do provedor, igual ao segmento da rota de webhook. */
  readonly name: string;
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession>;
  /**
   * Valida a assinatura do webhook (quando o provedor usa uma) e
   * normaliza o payload. Lança em assinatura inválida ou payload
   * irreconhecível — o controller responde 400/401 sem gravar evento.
   */
  parseWebhook(rawBody: Buffer, signature: string | undefined): NormalizedBillingEvent;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
  refund(paymentId: string): Promise<void>;
}
