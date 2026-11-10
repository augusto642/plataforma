import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Plan, SubscriptionStatus } from '@prisma/client';
import { createHash } from 'crypto';
import type { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import {
  BILLING_PROVIDER_TOKEN,
  type BillingCycle,
  type BillingProvider,
  type NormalizedBillingEvent,
} from './billing-provider.interface';

/**
 * Fase 1 premium (desenho §2.1–2.2) — checkout em MODO TESTE.
 *
 * Fluxo completo, sem pagamento real:
 * 1. `createCheckout` → sessão no provedor (simulado) → `checkoutUrl`.
 * 2. Webhook do provedor → `recordWebhook` grava `PaymentEvent`
 *    (idempotente por (provider, providerEventId)) → fila `billing-events`.
 * 3. Worker (`billing-events.processor`) → `applyPaymentEvent`:
 *    upsert de `Subscription` + `User.plan` — replay não duplica.
 * 4. `EntitlementsService.getUserPlan()` resolve o plano efetivo
 *    (assinatura ativa → senão `User.plan`).
 *
 * Preços exibidos (fonte: preços da landing, `pricing-data.ts`):
 * Pro mensal R$ 39,90; anual R$ 29,90/mês (R$ 358,80/ano). O Carreira
 * NÃO tem preço (R$ 79,90 era sugestão da pesquisa, não decisão) e o
 * checkout o rejeita com 409 até o Augusto decidir.
 */
export const BILLING_EVENTS_QUEUE = 'billing-events';

export interface BillingJobData {
  paymentEventId: string;
  event: NormalizedBillingEvent;
}

export const PRO_PRICE_CENTS: Record<BillingCycle, number> = {
  monthly: 3990,
  annual: 35880,
};

function periodEndFromNow(billingCycle: BillingCycle, from = new Date()): Date {
  const end = new Date(from);
  end.setMonth(end.getMonth() + (billingCycle === 'annual' ? 12 : 1));
  return end;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(BILLING_PROVIDER_TOKEN) private readonly provider: BillingProvider,
    @InjectQueue(BILLING_EVENTS_QUEUE) private readonly queue: Queue<BillingJobData>,
  ) {}

  assertTestMode(): void {
    const mode = this.config.get<string>('BILLING_MODE', 'test');
    if (mode !== 'test') {
      throw new ConflictException('Cobrança real não ativada.');
    }
  }

  async createCheckout(userId: string, plan: Plan, billingCycle: BillingCycle) {
    this.assertTestMode();
    if (plan === Plan.career) {
      throw new ConflictException(
        'O plano Carreira ainda não tem preço definido e não pode ser comprado. ' +
          'Entre na lista de espera enquanto o preço não é decidido.',
      );
    }
    if (plan !== Plan.pro) {
      throw new ConflictException('Só o plano Pro pode ser comprado no checkout.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const webUrl =
      this.config.get<string>('WEB_PUBLIC_URL') ||
      this.config.get<string>('WEB_URL') ||
      'http://localhost:3001';
    const session = await this.provider.createCheckoutSession({
      userId,
      plan,
      billingCycle,
      amountCents: PRO_PRICE_CENTS[billingCycle],
      successUrl: `${webUrl}/checkout/sucesso`,
      failureUrl: `${webUrl}/checkout/falha`,
    });
    return {
      checkoutUrl: session.checkoutUrl,
      sessionId: session.sessionId,
      provider: this.provider.name,
      plan,
      billingCycle,
      amountCents: PRO_PRICE_CENTS[billingCycle],
      testMode: true,
    };
  }

  /** Assinatura atual do aluno + se o acesso pago está vigente. */
  async getMySubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription) {
      return { subscription: null, hasAccess: false, effectivePlan: Plan.free as Plan };
    }
    const now = new Date();
    const hasAccess =
      subscription.status === 'active' ||
      (subscription.status === 'canceled' &&
        !!subscription.currentPeriodEnd &&
        subscription.currentPeriodEnd > now);
    return {
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        billingCycle: subscription.billingCycle,
        provider: subscription.provider,
        status: subscription.status,
        testMode: subscription.testMode,
        currentPeriodEnd: subscription.currentPeriodEnd,
        canceledAt: subscription.canceledAt,
        createdAt: subscription.createdAt,
      },
      hasAccess,
      effectivePlan: hasAccess ? subscription.plan : Plan.free,
    };
  }

  /** Cancela no provedor; mantém o acesso até `currentPeriodEnd`. */
  async cancelMySubscription(userId: string) {
    this.assertTestMode();
    const current = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['trialing', 'active', 'past_due'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!current) {
      throw new NotFoundException('Nenhuma assinatura ativa para cancelar');
    }
    if (current.providerSubscriptionId) {
      await this.provider.cancelSubscription(current.providerSubscriptionId);
    }
    const canceled = await this.prisma.subscription.update({
      where: { id: current.id },
      data: { status: 'canceled', canceledAt: new Date() },
    });
    return {
      id: canceled.id,
      plan: canceled.plan,
      status: canceled.status,
      currentPeriodEnd: canceled.currentPeriodEnd,
      message:
        'Assinatura cancelada. Seu acesso continua até o fim do período já vigente.',
    };
  }

  /**
   * Grava o evento do webhook (idempotente) e enfileira a aplicação.
   * Replay com o mesmo (provider, providerEventId) retorna
   * `alreadyProcessed: true` sem enfileirar de novo.
   */
  async recordWebhook(
    provider: string,
    event: NormalizedBillingEvent,
    rawBody: Buffer,
  ): Promise<{ alreadyProcessed: boolean; paymentEventId: string }> {
    const payloadHash = createHash('sha256').update(rawBody).digest('hex');
    try {
      const created = await this.prisma.paymentEvent.create({
        data: {
          provider,
          providerEventId: event.providerEventId,
          type: event.type,
          payloadHash,
        },
      });
      await this.queue.add('apply-billing-event', {
        paymentEventId: created.id,
        event: {
          ...event,
          currentPeriodEnd: event.currentPeriodEnd?.toISOString(),
        } as unknown as NormalizedBillingEvent,
      });
      return { alreadyProcessed: false, paymentEventId: created.id };
    } catch (err) {
      // P2002 = violação da unique (provider, providerEventId): replay.
      if ((err as { code?: string })?.code === 'P2002') {
        const existing = await this.prisma.paymentEvent.findUnique({
          where: {
            provider_providerEventId: { provider, providerEventId: event.providerEventId },
          },
          select: { id: true },
        });
        return { alreadyProcessed: true, paymentEventId: existing?.id ?? '' };
      }
      throw err;
    }
  }

  /**
   * Aplica um evento normalizado. Idempotente: a assinatura é localizada
   * por `providerSubscriptionId` (sessão do provedor) e atualizada em
   * vez de duplicada; reprocessar o mesmo evento chega ao mesmo estado.
   */
  async applyPaymentEvent(event: NormalizedBillingEvent): Promise<void> {
    const providerSubscriptionId = event.providerSubscriptionId;
    if (!providerSubscriptionId && event.type !== 'payment_rejected') {
      this.logger.warn(`Evento de billing sem providerSubscriptionId: ${event.type}`);
    }

    switch (event.type) {
      case 'payment_approved':
      case 'subscription_active': {
        if (!event.userId || !event.plan) {
          throw new Error('Evento de aprovação sem userId ou plano');
        }
        if (event.plan === Plan.career) {
          // Tier sem preço: nunca liberar por webhook até decisão.
          this.logger.warn(
            `Evento de aprovação para o plano Carreira ignorado (sem preço decidido): ${event.providerEventId}`,
          );
          return;
        }
        const billingCycle: BillingCycle = event.billingCycle ?? 'monthly';
        const currentPeriodEnd =
          event.currentPeriodEnd && !Number.isNaN(event.currentPeriodEnd.getTime())
            ? event.currentPeriodEnd
            : periodEndFromNow(billingCycle);
        const existing = providerSubscriptionId
          ? await this.prisma.subscription.findFirst({
              where: { providerSubscriptionId, userId: event.userId },
            })
          : null;
        if (existing) {
          await this.prisma.subscription.update({
            where: { id: existing.id },
            data: {
              plan: event.plan,
              billingCycle,
              status: 'active',
              currentPeriodEnd,
            },
          });
        } else {
          await this.prisma.subscription.create({
            data: {
              userId: event.userId,
              plan: event.plan,
              billingCycle,
              provider: this.provider.name,
              providerSubscriptionId: providerSubscriptionId ?? null,
              status: 'active',
              testMode: true,
              currentPeriodEnd,
            },
          });
        }
        await this.prisma.user.update({
          where: { id: event.userId },
          data: { plan: event.plan },
        });
        this.logger.log(
          `Plano ${event.plan} liberado para o usuário ${event.userId} (evento ${event.providerEventId})`,
        );
        return;
      }
      case 'payment_rejected':
      case 'payment_refunded': {
        // Sem liberação; reembolso de assinatura ativa volta ao free.
        if (event.type === 'payment_refunded' && providerSubscriptionId) {
          const sub = await this.prisma.subscription.findFirst({
            where: { providerSubscriptionId },
          });
          if (sub) {
            await this.prisma.subscription.update({
              where: { id: sub.id },
              data: { status: 'expired' },
            });
            await this.prisma.user.update({
              where: { id: sub.userId },
              data: { plan: Plan.free },
            });
          }
        }
        return;
      }
      case 'subscription_canceled': {
        if (!providerSubscriptionId) return;
        const sub = await this.prisma.subscription.findFirst({
          where: { providerSubscriptionId },
        });
        if (!sub) return;
        const periodPassed =
          !!sub.currentPeriodEnd && sub.currentPeriodEnd <= new Date();
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: periodPassed
              ? SubscriptionStatus.expired
              : SubscriptionStatus.canceled,
            canceledAt: new Date(),
          },
        });
        if (periodPassed) {
          await this.prisma.user.update({
            where: { id: sub.userId },
            data: { plan: Plan.free },
          });
        }
        return;
      }
      case 'subscription_expired': {
        if (!providerSubscriptionId) return;
        const sub = await this.prisma.subscription.findFirst({
          where: { providerSubscriptionId },
        });
        if (!sub) return;
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'expired' },
        });
        await this.prisma.user.update({
          where: { id: sub.userId },
          data: { plan: Plan.free },
        });
        return;
      }
    }
  }

  async listAdminSubscriptions(filter: {
    status?: string;
    plan?: Plan;
    userId?: string;
  }) {
    return this.prisma.subscription.findMany({
      where: {
        ...(filter.status ? { status: filter.status as SubscriptionStatus } : {}),
        ...(filter.plan ? { plan: filter.plan } : {}),
        ...(filter.userId ? { userId: filter.userId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        userId: true,
        plan: true,
        billingCycle: true,
        provider: true,
        status: true,
        testMode: true,
        currentPeriodEnd: true,
        canceledAt: true,
        createdAt: true,
        user: { select: { email: true, name: true } },
      },
    });
  }
}
