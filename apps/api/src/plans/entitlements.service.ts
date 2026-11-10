import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CareerTier, Plan, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  canUseAiTutor,
  planHasFeature,
  type PremiumFeature,
} from './plan-entitlements';

/**
 * M10 (Lote 4) — quais status de assinatura CONCEDEM acesso pago.
 * - `active`: acesso.
 * - `trialing`: acesso SOMENTE enquanto o trial vigora
 *   (`currentPeriodEnd` no futuro); trial expirado não concede nada.
 * - `canceled`: acesso até o fim do período já pago (regra anterior,
 *   preservada); vencido, nada.
 * - `past_due`, `expired` e qualquer status desconhecido: SEM acesso.
 *
 * DECISÃO DE PRODUTO (M10, para o Augusto confirmar): `past_due`
 * revoga IMEDIATAMENTE — não há período de tolerância definido no
 * produto. Se o Augusto quiser uma tolerância (ex.: 3 dias para o
 * pagamento compensar), basta trocar o ramo `past_due` aqui por
 * `currentPeriodEnd + tolerância > now`.
 */
export function subscriptionGrantsAccess(
  subscription: { status: string; currentPeriodEnd: Date | null },
  now = new Date(),
): boolean {
  switch (subscription.status) {
    case 'active':
      return true;
    case 'trialing':
    case 'canceled':
      return !!subscription.currentPeriodEnd && subscription.currentPeriodEnd > now;
    default:
      // past_due, expired e qualquer status futuro/desconhecido:
      // negar por padrão (fail-closed).
      return false;
  }
}

/**
 * B32 (Sprint 10) — camada de entitlement do produto.
 *
 * Antes desta sprint o plano pago não existia como entidade: User não
 * tinha campo de plano e nenhuma superfície distinguia free × Pro.
 * Este serviço é o ponto único de consulta ("qual é o plano deste
 * usuário e o que ele libera"), reutilizável por guards e controllers.
 *
 * Fase 1 premium (desenho §2.2) — RESOLUÇÃO ÚNICA do plano efetivo:
 * a assinatura mais recente em estado que concede acesso vence;
 * senão `User.plan` (fallback, que preserva o estado atual e o
 * `PATCH /admin/users/:id/plan` manual). Uma assinatura cancelada
 * mantém o acesso até `currentPeriodEnd` (sem corte imediato);
 * depois disso, volta a valer o `User.plan`.
 * M10 (Lote 4) — `past_due`, trial expirado e `expired` NÃO concedem
 * acesso (ver `subscriptionGrantsAccess`); e o fallback em `User.plan`
 * não é cego: o webhook grava `User.plan` na concessão e só o zera
 * em reembolso/expiração/cancelamento com período vencido — uma
 * assinatura `past_due` deixaria o `User.plan` defasado em `pro`
 * para sempre. Nenhum controller confere `user.plan` diretamente:
 * passa por aqui.
 */
@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Plano efetivo do usuário. A assinatura mais recente em estado que
   * concede acesso vence; sem ela, vale o `User.plan` — EXCETO quando
   * a assinatura mais recente existe e NÃO concede acesso: nesse caso
   * o `User.plan` pode ser só o resíduo da concessão do webhook
   * (ver `subscriptionGrantsAccess`). O fallback só é honrado quando
   * diverge do plano da assinatura — sinal de concessão manual via
   * `PATCH /admin/users/:id/plan`, que não toca na assinatura.
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
    const subscriptions = await this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { plan: true, status: true, currentPeriodEnd: true },
    });

    const granting = subscriptions.find((s) => subscriptionGrantsAccess(s, now));
    if (granting) return granting.plan;
    if (subscriptions.length === 0) return user.plan;

    // Nenhuma assinatura concede acesso: a concessão paga morreu
    // (past_due, trial expirado, expirada, cancelada vencida). Se o
    // `User.plan` é o MESMO plano da assinatura mais recente, ele é
    // o resíduo da concessão — não uma decisão manual — e o acesso
    // pago cai para free. Se diverge, é concessão manual do admin.
    const latest = subscriptions[0];
    if (user.plan !== latest.plan) return user.plan;
    return Plan.free;
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
