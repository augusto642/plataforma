import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const CAREER_TIER_KEY = 'career_tier';
export const RequireCareerTier = (tier: string) => SetMetadata(CAREER_TIER_KEY, tier);

@Injectable()
export class CareerTierGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredTier = this.reflector.getAllAndOverride<string | undefined>(
      CAREER_TIER_KEY,
      [context.getHandler(), context.getClass()],
    );

    const req = context.switchToHttp().getRequest();
    const requestedTier =
      req.body?.careerTier ||
      req.body?.tier ||
      req.params?.careerTier ||
      req.params?.tier ||
      req.query?.careerTier ||
      req.query?.tier ||
      requiredTier;

    // Se nenhum tier foi especificado nem no decorator nem na requisição, permite o prosseguimento.
    if (!requestedTier) {
      return true;
    }

    const normalizedTier = String(requestedTier).toLowerCase().trim();

    // Apenas a trilha 'beginner' / Iniciante está liberada na Fase 1.
    if (normalizedTier !== 'beginner') {
      throw new ForbiddenException(
        'Patente bloqueada: conclua o nível Iniciante primeiro',
      );
    }

    return true;
  }
}
