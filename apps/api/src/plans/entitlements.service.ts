import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CareerTier, Plan, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  canUseAiTutor,
  planHasFeature,
  type PremiumFeature,
} from './plan-entitlements';

/**
 * B32 (Sprint 10) — camada de entitlement do produto.
 *
 * Antes desta sprint o plano pago não existia como entidade: User não
 * tinha campo de plano e nenhuma superfície distinguia free × Pro.
 * Este serviço é o ponto único de consulta ("qual é o plano deste
 * usuário e o que ele libera"), reutilizável por guards e controllers.
 *
 * Fase 1 premium (desenho §2.2) — RESOLUÇÃO ÚNICA do plano efetivo:
 * `Subscription` ativa (a mais recente) → senão `User.plan` (fallback,
 * que preserva o estado atual e o `PATCH /admin/users/:id/plan` manual).
 * Uma assinatura cancelada mantém o acesso até `currentPeriodEnd`
 * (sem corte imediato); depois disso, volta a valer o `User.plan`.
 * Nenhum controller confere `user.plan` diretamente: passa por aqui.
 */
@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Plano efetivo do usuário. Uma assinatura cancelada com período
   * ainda vigente continua valendo; vencida, deixa de valer.
   */
  async getUserPlan(userId: string): Promise<Plan> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const now = new Date();
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        OR: [
          { status: 'active' },
          {
            status: 'canceled',
            currentPeriodEnd: { gt: now },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: { plan: true },
    });
    return subscription?.plan ?? user.plan;
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

    const plan = await this.getUserPlan(userId);
    if (!canUseAiTutor(plan, user.careerTier)) {
      throw new ForbiddenException(
        'A tutora de IA a partir do nível Júnior faz parte do plano Pro. ' +
          'No plano gratuito, ela acompanha você durante todo o nível Iniciante.',
      );
    }
  }

  /**
   * Fase 1 premium — guard genérico por feature (desenho §1.1).
   * Instructor/admin não são bloqueados (não são clientes do plano).
   * Nenhum controller confere `user.plan` diretamente.
   */
  async assertFeature(userId: string, feature: PremiumFeature): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (user.role !== Role.student) return;

    const plan = await this.getUserPlan(userId);
    if (!planHasFeature(plan, feature)) {
      throw new ForbiddenException(
        `Esta funcionalidade faz parte de um plano pago. Seu plano atual (${plan}) não a inclui.`,
      );
    }
  }

  /** Conveniência para consumers que já têm plano e nível em mãos. */
  canUseAiTutor(plan: Plan, careerTier: CareerTier): boolean {
    return canUseAiTutor(plan, careerTier);
  }

  /** Conveniência pura (sem banco) para a matriz de features. */
  hasFeature(plan: Plan, feature: PremiumFeature): boolean {
    return planHasFeature(plan, feature);
  }
}
