import { IsEmail, IsEnum, IsOptional, MaxLength } from 'class-validator';
import {
  INTEREST_BILLING_CYCLES,
  INTEREST_PLANS,
  InterestBillingCycle,
  InterestPlan,
} from './register-plan-interest.dto';

// Sprint 18 (Ciclo 10/10 · Volta 3/B71) — captura pública só-e-mail da
// lista de interessados, espelhando o DTO da waitlist (JoinWaitlistDto):
// e-mail válido + plano do catálogo fechado. Quem escreve é um
// visitante (sem conta); a proteção é o DTO fechado e o throttler
// global. Nenhuma resposta expõe e-mails — a escrita devolve só o
// plano, a contagem pública total e se o e-mail já estava na lista.
export class JoinPlanInterestLeadDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsEnum(INTEREST_PLANS)
  plan!: InterestPlan;

  @IsOptional()
  @IsEnum(INTEREST_BILLING_CYCLES)
  billingCycle?: InterestBillingCycle;
}
