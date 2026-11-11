import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { EntitlementsService } from '../entitlements.service';

/**
 * B32 (Sprint 10) — guard de entitlement da tutora de IA.
 * Aplicado nos endpoints da tutora (AiController): delega a regra
 * plano × nível de carreira ao EntitlementsService. O JwtAuthGuard
 * global roda antes, então `req.user` já está autenticado aqui.
 */
@Injectable()
export class AiTutorPlanGuard implements CanActivate {
  constructor(private readonly entitlements: EntitlementsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId: string | undefined = req.user?.sub;

    if (!userId) {
      throw new ForbiddenException('Autenticação necessária para usar a tutora de IA');
    }

    await this.entitlements.assertAiTutorAccess(userId);
    return true;
  }
}
