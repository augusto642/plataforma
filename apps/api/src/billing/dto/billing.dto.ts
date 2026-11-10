import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { Plan } from '@prisma/client';
import type { BillingCycle } from '../billing-provider.interface';

export class CreateCheckoutDto {
  /** Só `pro` é comprável hoje; `career` é rejeitado com 409 (sem preço). */
  @IsEnum(Plan)
  plan!: Plan;

  @IsIn(['monthly', 'annual'])
  billingCycle!: BillingCycle;
}

export class SimulatePaymentDto {
  /**
   * Id da sessão de checkout criada por `POST /billing/checkout`.
   * Só o `sessionId` vem do cliente: usuário, plano e ciclo são lidos
   * da sessão persistida no servidor — o corpo nunca decide o que é
   * liberado (C1, Lote 1 P0).
   */
  @IsString()
  sessionId!: string;
}

export class ListSubscriptionsQueryDto {
  @IsOptional()
  @IsEnum(['trialing', 'active', 'past_due', 'canceled', 'expired'])
  status?: string;

  @IsOptional()
  @IsEnum(Plan)
  plan?: Plan;

  @IsOptional()
  @IsString()
  userId?: string;
}
