import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Plan, SubscriptionStatus } from '@prisma/client';
import { createHash, createHmac } from 'crypto';
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
 * 1. `createCheckout` → sessão no provedor (simulado) → `checkoutUrl`,
 *    e a sessão é PERSISTIDA em `CheckoutSession` (C1, Lote 1 P0).
 * 2. Webhook do provedor → `parseWebhook` (HMAC obrigatório, segredo
 *    exigido no boot) → `recordWebhook` grava `PaymentEvent`
 *    (idempotente por (provider, providerEventId)) → fila `billing-events`.
 *    Antes de gravar, eventos que liberam plano (`payment_approved`,
 *    `subscription_active`) precisam de uma sessão de checkout daquele
 *    `userId` com aquele `providerSubscriptionId` — sem ela, 400 e nada
 *    é persistido nem enfileirado.
 * 3. Worker (`billing-events.processor`) → `applyPaymentEvent`:
 *    revalida o vínculo com a sessão (defesa em profundidade) e usa o
 *    plano/ciclo DA SESSÃO como autoridade — nunca os do corpo do
 *    webhook; upsert de `Subscription` + `User.plan` — replay não duplica.
 * 4. `EntitlementsService.getUserPlan()` resolve o plano efetivo
 *    (assinatura ativa → senão `User.plan`).
 *
 * Simulação (botão "Simular pagamento aprovado" da UI): NÃO chama o
 * webhook público. A rota autenticada `POST /billing/simulate-payment`
 * usa `simulatePaymentApproval`, que monta o evento a partir da sessão
 * persistida e o assina no servidor com `BILLING_WEBHOOK_SECRET` — o
 * mesmo caminho de validação do webhook real, ponta a ponta.
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
    // C1 (Lote 1 P0) — a sessão é a prova do checkout: só um webhook
    // cujo providerSubscriptionId + userId casem com esta linha pode
    // liberar o plano (ver validateGrantEventSession).
    await this.prisma.checkoutSession.create({
      data: {
        sessionId: session.sessionId,
        providerSubscriptionId: session.providerSubscriptionId,
        userId,
        plan,
        billingCycle,
        amountCents: PRO_PRICE_CENTS[billingCycle],
        provider: this.provider.name,
      },
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
    // M10 (Lote 4) — mesmo critério de `EntitlementsService`: trial
    // ativo concede acesso; past_due/expirado, não.
    const hasAccess =
      subscription.status === 'active' ||
      ((subscription.status === 'trialing' || subscription.status === 'canceled') &&
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
   * C1 (Lote 1 P0) — vínculo checkout → webhook. Eventos que LIBERAM
   * plano (`payment_approved`, `subscription_active`) só valem quando
   * existe uma sessão de checkout criada por aquele `userId` com aquele
   * `providerSubscriptionId`. Sem sessão (ou com userId divergente), o
   * evento é rejeitado com 400 — sem tocar `User.plan`, sem criar
   * `Subscription` e, no caminho HTTP, sem nem persistir `PaymentEvent`.
   * Retorna a sessão: o plano/ciclo DELA são a autoridade na aplicação
   * (o corpo do webhook nunca decide o que foi comprado).
   * Outros tipos de evento não passam por aqui: não liberam nada e já
   * são no-op quando não há assinatura correspondente.
   */
  private async validateGrantEventSession(event: NormalizedBillingEvent) {
    const providerSubscriptionId = event.providerSubscriptionId;
    if (!providerSubscriptionId || !event.userId) {
      this.logger.warn(
        `Evento de liberação sem sessão vinculada rejeitado: type=${event.type} providerEventId=${event.providerEventId}`,
      );
      throw new BadRequestException(
        'Evento de liberação sem sessão de checkout vinculada',
      );
    }
    const session = await this.prisma.checkoutSession.findUnique({
      where: {
        providerSubscriptionId_userId: {
          providerSubscriptionId,
          userId: event.userId,
        },
      },
    });
    if (!session) {
      this.logger.warn(
        `Evento de liberação sem sessão de checkout correspondente rejeitado: type=${event.type} providerEventId=${event.providerEventId} userId=${event.userId} providerSubscriptionId=${providerSubscriptionId}`,
      );
      throw new BadRequestException(
        'Evento de liberação sem sessão de checkout correspondente',
      );
    }
    return session;
  }

  /**
   * Grava o evento do webhook (idempotente) e enfileira a aplicação.
   * Replay com o mesmo (provider, providerEventId) retorna
   * `alreadyProcessed: true` sem enfileirar de novo.
   * Evento que libera plano sem sessão de checkout vinculada é rejeitado
   * com 400 ANTES de persistir (ver validateGrantEventSession).
   */
  async recordWebhook(
    provider: string,
    event: NormalizedBillingEvent,
    rawBody: Buffer,
  ): Promise<{ alreadyProcessed: boolean; paymentEventId: string }> {
    if (event.type === 'payment_approved' || event.type === 'subscription_active') {
      await this.validateGrantEventSession(event);
    }
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
   * Simulação do webhook para o botão "Simular pagamento aprovado" da
   * UI (C1, Lote 1 P0). O cliente NÃO toca no webhook público: esta é
   * uma rota autenticada (JWT + TestModeGuard) que recebe só o
   * `sessionId`. O evento é montado AQUI, a partir da sessão de
   * checkout persistida (usuário, plano e ciclo da sessão — nunca do
   * corpo da requisição), assinado no servidor com
   * `BILLING_WEBHOOK_SECRET` e processado pelo MESMO caminho do
   * webhook real (`parseWebhook` → `recordWebhook` → fila). Sem sessão
   * desse usuário, 404; sem segredo configurado, o boot já falhou —
   * este erro é só defesa em profundidade.
   */
  async simulatePaymentApproval(
    userId: string,
    sessionId: string,
  ): Promise<{ alreadyProcessed: boolean; paymentEventId: string }> {
    this.assertTestMode();
    const session = await this.prisma.checkoutSession.findUnique({
      where: { sessionId },
    });
    if (!session || session.userId !== userId) {
      throw new NotFoundException(
        'Sessão de checkout não encontrada para este usuário',
      );
    }
    const secret = this.config.get<string>('BILLING_WEBHOOK_SECRET');
    if (!secret) {
      throw new Error(
        'BILLING_WEBHOOK_SECRET não configurado: simulação indisponível',
      );
    }
    const payload = {
      providerEventId: `sim-ev-${session.sessionId}`,
      type: 'payment_approved',
      sessionId: session.sessionId,
      providerSubscriptionId: session.providerSubscriptionId,
      userId: session.userId,
      plan: session.plan,
      billingCycle: session.billingCycle,
    };
    const rawBody = Buffer.from(JSON.stringify(payload), 'utf8');
    const signature = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
    const event = this.provider.parseWebhook(rawBody, signature);
    return this.recordWebhook(this.provider.name, event, rawBody);
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
        // Defesa em profundidade: o worker revalida o vínculo — um job
        // enfileirado antes desta trava (ou injetado direto na fila)
        // nunca libera plano sem sessão de checkout correspondente.
        const session = await this.validateGrantEventSession(event);
        if (session.plan === Plan.career) {
          // Tier sem preço: nunca liberar por webhook até decisão.
          this.logger.warn(
            `Evento de aprovação para o plano Carreira ignorado (sem preço decidido): ${event.providerEventId}`,
          );
          return;
        }
        // Autoridade é a SESSÃO (o que o usuário de fato comprou), não
        // o corpo do webhook: um evento assinado com plano/ciclo
        // divergentes não amplia o que foi contratado.
        if (
          event.plan !== undefined &&
          event.plan !== session.plan
        ) {
          this.logger.warn(
            `Evento ${event.providerEventId} traz plano ${event.plan}, divergente da sessão (${session.plan}): aplicado o plano da sessão`,
          );
        }
        const plan = session.plan;
        // Autoridade também para o usuário: a sessão já casou
        // (providerSubscriptionId, userId) com o evento, então
        // `session.userId` é o dono da liberação — nunca o corpo.
        const userId = session.userId;
        const billingCycle: BillingCycle =
          session.billingCycle === 'annual' ? 'annual' : 'monthly';
        const currentPeriodEnd =
          event.currentPeriodEnd && !Number.isNaN(event.currentPeriodEnd.getTime())
            ? event.currentPeriodEnd
            : periodEndFromNow(billingCycle);
        const existing = providerSubscriptionId
          ? await this.prisma.subscription.findFirst({
              where: { providerSubscriptionId, userId },
            })
          : null;
        if (existing) {
          await this.prisma.subscription.update({
            where: { id: existing.id },
            data: {
              plan,
              billingCycle,
              status: 'active',
              currentPeriodEnd,
            },
          });
        } else {
          await this.prisma.subscription.create({
            data: {
              userId,
              plan,
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
          where: { id: userId },
          data: { plan },
        });
        this.logger.log(
          `Plano ${plan} liberado para o usuário ${userId} (evento ${event.providerEventId})`,
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
