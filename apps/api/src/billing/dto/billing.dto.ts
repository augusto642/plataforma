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
