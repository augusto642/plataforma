import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  mixin,
  Type,
} from '@nestjs/common';
import { EntitlementsService } from '../entitlements.service';
import type { PremiumFeature } from '../plan-entitlements';

/**
 * Fase 1 premium (desenho §1.1) — guard genérico por feature, no padrão
 * do AiTutorPlanGuard existente. Uso:
 *   @UseGuards(FeatureGuard('interview-simulator'))
 * O JwtAuthGuard global roda antes, então `req.user` já está autenticado.
 * AiTutorPlanGuard segue intacto para a tutora.
 */
export function FeatureGuard(feature: PremiumFeature): Type<CanActivate> {
  @Injectable()
  class FeatureGuardMixin implements CanActivate {
    constructor(private readonly entitlements: EntitlementsService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const req = context.switchToHttp().getRequest();
      const userId: string | undefined = req.user?.sub;
      if (!userId) {
        throw new ForbiddenException('Autenticação necessária para esta funcionalidade');
      }
      await this.entitlements.assertFeature(userId, feature);
      return true;
    }
  }
  return mixin(FeatureGuardMixin);
}
