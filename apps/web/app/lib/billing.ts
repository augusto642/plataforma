import { apiFetch } from './apiClient';
import { PLAN_PRICES, annualTotal, formatBRL } from '../components/landing/pricing-data';

/**
 * Fase 1 premium — client do checkout em MODO TESTE.
 * Nenhuma cobrança real: o checkout roda contra o provedor simulado
 * da API e a página exibe o selo "Ambiente de testes" enquanto
 * BILLING_MODE=test. Preços lidos da fonte única da landing.
 */
export type CheckoutPlan = 'pro' | 'career';
export type BillingCycle = 'monthly' | 'annual';

export interface CheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
  provider: string;
  plan: string;
  billingCycle: BillingCycle;
  amountCents: number;
  testMode: boolean;
}

export interface MySubscription {
  subscription: {
    id: string;
    plan: string;
    billingCycle: string;
    provider: string;
    status: string;
    testMode: boolean;
    currentPeriodEnd: string | null;
    canceledAt: string | null;
    createdAt: string;
  } | null;
  hasAccess: boolean;
  effectivePlan: string;
}

export function planCheckoutPrice(plan: CheckoutPlan, cycle: BillingCycle): string {
  if (plan === 'career') return 'A definir';
  const price = PLAN_PRICES.pro;
  if (cycle === 'annual') return `${formatBRL(annualTotal(price))}/ano`;
  return `${formatBRL(price.monthly)}/mês`;
}

export async function createCheckout(
  plan: CheckoutPlan,
  billingCycle: BillingCycle,
): Promise<CheckoutResponse> {
  const res = await apiFetch('/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan, billingCycle }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message || 'Não foi possível iniciar o checkout.',
    );
  }
  return (await res.json()) as CheckoutResponse;
}

export async function fetchMySubscription(): Promise<MySubscription | null> {
  try {
    const res = await apiFetch('/billing/subscription/me');
    if (!res.ok) return null;
    return (await res.json()) as MySubscription;
  } catch {
    return null;
  }
}

export async function cancelMySubscription(): Promise<{ message?: string }> {
  const res = await apiFetch('/billing/cancel', { method: 'POST' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message || 'Não foi possível cancelar a assinatura.',
    );
  }
  return (await res.json()) as { message?: string };
}

/** Simulação do webhook do provedor (ambiente de testes apenas). */
export async function simulateProviderWebhook(payload: {
  providerEventId: string;
  type: string;
  sessionId: string;
  userId: string;
  plan: string;
  billingCycle: BillingCycle;
}): Promise<{ received: boolean; alreadyProcessed?: boolean }> {
  const res = await apiFetch('/billing/webhooks/simulated', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message || 'A confirmação simulada falhou.',
    );
  }
  return (await res.json()) as { received: boolean; alreadyProcessed?: boolean };
}
