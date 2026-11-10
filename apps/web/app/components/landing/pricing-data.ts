/* B52/P5 (Sprint 16) — fonte ÚNICA de verdade dos preços da landing.
   Até aqui os valores viviam como literais espalhados em JSX (hero,
   pricing) e qualquer reajuste precisava caçar string por string —
   com risco de a âncora do hero divergir do card (foi o defeito do
   B45). Agora hero, PricingSection e o JSON-LD (Product/Offer em
   StructuredData.tsx) leem daqui. Reajustou o preço? É só aqui.
   Os números são os preços REAIS exibidos na página:
   Pro R$ 39,90/mês (anual: R$ 29,90/mês = R$ 358,80/ano) e
   Staff R$ 79,90/mês (anual: R$ 59,90/mês = R$ 718,80/ano). */

export interface PlanPrice {
  id: 'explorer' | 'pro' | 'staff';
  /** Nome do plano como entidade (usado no JSON-LD Product). */
  name: string;
  /** Preço no ciclo mensal, em R$/mês. */
  monthly: number;
  /** Preço mensal equivalente no ciclo anual, em R$/mês. */
  annualMonthly: number;
}

export const PLAN_PRICES: Record<PlanPrice['id'], PlanPrice> = {
  explorer: { id: 'explorer', name: 'Nexus Code Explorer', monthly: 0, annualMonthly: 0 },
  pro: { id: 'pro', name: 'Nexus Code Pro', monthly: 39.9, annualMonthly: 29.9 },
  staff: { id: 'staff', name: 'Nexus Code Staff', monthly: 79.9, annualMonthly: 59.9 },
};

/** Total cobrado no ciclo anual (12 × mensal-equivalente). */
export const annualTotal = (plan: PlanPrice): number => plan.annualMonthly * 12;

/** Economia do anual contra pagar o mensal por 12 meses, em R$. */
export const annualSavings = (plan: PlanPrice): number =>
  plan.monthly * 12 - annualTotal(plan);

/** Formata um valor em reais no padrão exibido na página ("R$ 39,90"). */
export const formatBRL = (value: number): string =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
