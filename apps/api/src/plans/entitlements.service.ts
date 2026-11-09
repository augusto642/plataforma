import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CareerTier, Plan, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { canUseAiTutor } from './plan-entitlements';

/**
 * B32 (Sprint 10) — camada de entitlement do produto.
 *
 * Antes desta sprint o plano pago não existia como entidade: User não
 * tinha campo de plano e nenhuma superfície distinguia free × Pro.
 * Este serviço é o ponto único de consulta ("qual é o plano deste
 * usuário e o que ele libera"), reutilizável por guards e controllers.
 */
@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Plano atual do usuário (free é o default de todos os cadastros). */
  async getUserPlan(userId: string): Promise<Plan> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user.plan;
  }

  /**
   * Garante o acesso à tutora de IA conforme plano × nível de carreira.
   * - free: tutora durante todo o nível Iniciante (promessa da landing).
   * - pro: tutora em todos os níveis.
   * - staff (instructor/admin): sem bloqueio — não são clientes do plano.
   */
  async assertAiTutorAccess(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, careerTier: true, role: true },
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.role !== Role.student) return;

    if (!canUseAiTutor(user.plan, user.careerTier)) {
      throw new ForbiddenException(
        'A tutora de IA a partir do nível Júnior faz parte do plano Pro. ' +
          'No plano gratuito, ela acompanha você durante todo o nível Iniciante.',
      );
    }
  }

  /** Conveniência para consumers que já têm plano e nível em mãos. */
  canUseAiTutor(plan: Plan, careerTier: CareerTier): boolean {
    return canUseAiTutor(plan, careerTier);
  }
}
