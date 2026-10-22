import { API_BASE, apiFetch } from './apiClient';
import type { PlanIntent } from './attribution';
import {
  PLAN_PRICES,
  annualTotal,
  formatBRL,
  type PlanId,
} from '../components/landing/pricing-data';

/**
 * Sprint 17 (Ciclo 10/10 · Volta 2/B54) — destino real da intenção de
 * plano. Até a Sprint 16 a intenção salva no clique de preço
 * (`nexus_plan_intent`) só alimentava props de analytics: o usuário
 * clicava em "Assinar o Pro", concluía o cadastro e a intenção morria
 * no navegador. Agora ela é consumida com sessão ativa e vira registro
 * no servidor (POST /plan-interest, módulo espelho da waitlist):
 * a LISTA DE INTERESSADOS do plano. A cobrança dos planos pagos ainda
 * NÃO está ativa — o registro não promete benefício nenhum além do
 * aviso quando a cobrança abrir, e a confirmação diz exatamente isso.
 */

export type InterestPlanId = Extract<PlanId, 'pro' | 'staff'>;
export type InterestBillingCycle = 'monthly' | 'annual';

export interface PlanInterestRegistration {
  plan: InterestPlanId;
  billingCycle: InterestBillingCycle;
}

export interface PlanInterestView {
  plan: InterestPlanId;
  billingCycle: InterestBillingCycle | null;
  createdAt: string;
}

export interface RegisterPlanInterestResponse extends PlanInterestView {
  alreadyRegistered: boolean;
}

const PAID_PLANS: readonly string[] = ['pro', 'staff'];

/**
 * Converte a intenção salva no clique (qualquer origem da landing)
 * no payload do registro. Intenção do Explorer (grátis) ou ausente NÃO
 * gera registro: quem clicou no grátis quer só o cadastro.
 */
export function intentToRegistration(
  intent: PlanIntent | null,
): PlanInterestRegistration | null {
  if (!intent || !PAID_PLANS.includes(intent.plan)) return null;
  return {
    plan: intent.plan as InterestPlanId,
    billingCycle: intent.billingCycle === 'annual' ? 'annual' : 'monthly',
  };
}

export function planDisplayName(plan: InterestPlanId): string {
  return plan === 'pro' ? 'Pro' : 'Staff';
}

/** Preço exibido do plano no ciclo do registro — da fonte única de preços. */
export function planPriceLabel(view: PlanInterestView): string {
  const price = PLAN_PRICES[view.plan];
  return view.billingCycle === 'annual'
    ? `${formatBRL(annualTotal(price))}/ano`
    : `${formatBRL(price.monthly)}/mês`;
}

/**
 * Texto da confirmação exibida ao usuário. Diz o plano, o preço que
 * ele viu na landing e o estado real: cobrança inativa, conta gratuita,
 * nada cobrado — o único compromisso é o aviso da abertura.
 */
export function planInterestConfirmation(view: PlanInterestView): {
  title: string;
  body: string;
} {
  const name = planDisplayName(view.plan);
  return {
    title: `Você está na lista de interessados do plano ${name}`,
    body:
      `Preço exibido na página: ${planPriceLabel(view)}. A cobrança dos planos ` +
      'pagos ainda não está ativa: sua conta segue gratuita e nada foi cobrado. ' +
      'Quando a cobrança abrir, avisamos você.',
  };
}

export async function registerPlanInterest(
  registration: PlanInterestRegistration,
): Promise<RegisterPlanInterestResponse | null> {
  try {
    const res = await apiFetch(`${API_BASE}/plan-interest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registration),
    });
    if (!res.ok) return null;
    return (await res.json()) as RegisterPlanInterestResponse;
  } catch {
    return null;
  }
}

export async function fetchMyPlanInterest(): Promise<PlanInterestView | null> {
  try {
    const res = await apiFetch(`${API_BASE}/plan-interest/me`);
    if (!res.ok) return null;
    const data = (await res.json()) as PlanInterestView | null;
    if (!data || (data.plan !== 'pro' && data.plan !== 'staff')) return null;
    return data;
  } catch {
    return null;
  }
}
