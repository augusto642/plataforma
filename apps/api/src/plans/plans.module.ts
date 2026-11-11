import { Module } from '@nestjs/common';
import { EntitlementsService } from './entitlements.service';
import { AiTutorPlanGuard } from './guards/ai-tutor-plan.guard';

/**
 * B32 (Sprint 10) — módulo de planos/entitlements.
 * PrismaModule é global, então o EntitlementsService injeta o
 * PrismaService sem import adicional.
 */
@Module({
  providers: [EntitlementsService, AiTutorPlanGuard],
  exports: [EntitlementsService, AiTutorPlanGuard],
})
export class PlansModule {}
