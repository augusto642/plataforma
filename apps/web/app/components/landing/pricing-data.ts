/* B52/P5 (Sprint 16) — fonte ÚNICA de verdade dos preços da landing.
   Até aqui os valores viviam como literais espalhados em JSX (hero,
   pricing) e qualquer reajuste precisava caçar string por string —
   com risco de a âncora do hero divergir do card (foi o defeito do
   B45). Agora hero, PricingSection e o JSON-LD (Product/Offer em
   StructuredData.tsx) leem daqui. Reajustou o preço? É só aqui.
   Os números são os preços REAIS exibidos na página:
   Pro R$ 39,90/mês (anual: R$ 29,90/mês = R$ 358,80/ano).
   Central 216 retrabalho (D1) — o terceiro plano passa a ser o
   Carreira do protótipo Stitch v2, com "Preço a definir" (monthly e
   annualMonthly null): o Staff R$ 79,90/mês não existe mais na
   vitrine. O id interno segue 'staff' (plan-interest/API) até a
   renomeação do backend — só o nome exibido muda. */

export interface PlanPrice {
  id: 'explorer' | 'pro' | 'staff';
  /** Nome do plano como entidade (usado no JSON-LD Product). */
  name: string;
  /** Nome exibido na vitrine (o id interno 'staff' é o Carreira). */
  displayName: string;
  /** Preço no ciclo mensal, em R$/mês — null = preço a definir. */
  monthly: number | null;
  /** Preço mensal equivalente no ciclo anual, em R$/mês — null = a definir. */
  annualMonthly: number | null;
}

export const PLAN_PRICES: Record<PlanPrice['id'], PlanPrice> = {
  explorer: {
    id: 'explorer',
    name: 'Nexus Code Explorer',
    displayName: 'Iniciante',
    monthly: 0,
    annualMonthly: 0,
  },
  pro: {
    id: 'pro',
    name: 'Nexus Code Pro',
    displayName: 'Pro',
    monthly: 39.9,
    annualMonthly: 29.9,
  },
  staff: {
    id: 'staff',
    name: 'Nexus Code Carreira',
    displayName: 'Carreira',
    monthly: null,
    annualMonthly: null,
  },
};

/** Total cobrado no ciclo anual (12 × mensal-equivalente). Null sem preço. */
export const annualTotal = (plan: PlanPrice): number | null =>
  plan.annualMonthly === null ? null : plan.annualMonthly * 12;

/** Economia do anual contra pagar o mensal por 12 meses, em R$. Null sem preço. */
export const annualSavings = (plan: PlanPrice): number | null =>
  plan.monthly === null || plan.annualMonthly === null
    ? null
    : plan.monthly * 12 - annualTotal(plan)!;

/** Formata um valor em reais no padrão exibido na página ("R$ 39,90"). */
export const formatBRL = (value: number): string =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
