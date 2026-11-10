import { IsEnum, IsOptional } from 'class-validator';

// Sprint 17 (Ciclo 10/10 · Volta 2/B54) — planos pagos que aceitam
// lista de interessados. Catálogo FECHADO, espelhado no cliente web
// (pricing-data.ts): explorer é o plano gratuito (sem intenção a
// registrar — quem clica nele só quer o cadastro grátis) e não existe
// outro plano pago além de Pro e Staff.
export const INTEREST_PLANS = ['pro', 'staff'] as const;

export type InterestPlan = (typeof INTEREST_PLANS)[number];

export const INTEREST_BILLING_CYCLES = ['monthly', 'annual'] as const;

export type InterestBillingCycle = (typeof INTEREST_BILLING_CYCLES)[number];

export class RegisterPlanInterestDto {
  @IsEnum(INTEREST_PLANS)
  plan!: InterestPlan;

  @IsOptional()
  @IsEnum(INTEREST_BILLING_CYCLES)
  billingCycle?: InterestBillingCycle;
}
