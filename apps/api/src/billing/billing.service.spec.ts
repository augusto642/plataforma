import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Plan } from '@prisma/client';
import { createHmac } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { BILLING_PROVIDER_TOKEN } from './billing-provider.interface';
import { BillingService, BILLING_EVENTS_QUEUE } from './billing.service';

/**
 * Fase 1 premium — travas do checkout em modo teste:
 * - Carreira não é comprável (sem preço decidido) → 409;
 * - webhook replay não duplica (PaymentEvent unique → alreadyProcessed);
 * - aplicar o mesmo evento de aprovação duas vezes não duplica a
 *   assinatura (update em vez de segundo create) e libera o tier.
 *
 * C1 (Lote 1 P0) — vínculo checkout → webhook:
 * - `createCheckout` persiste a sessão em `CheckoutSession`;
 * - evento que libera plano SEM sessão daquele userId com aquele
 *   `providerSubscriptionId` é rejeitado com 400 (nada é persistido,
 *   nada é enfileirado, plano não muda) — no `recordWebhook` (HTTP) e
 *   no `applyPaymentEvent` (worker, defesa em profundidade);
 * - o plano/ciclo aplicados são os DA SESSÃO, nunca os do corpo do
 *   webhook;
 * - `simulatePaymentApproval` monta o evento da sessão e o assina no
 *   servidor; sem sessão daquele usuário, 404.
 */
describe('BillingService', () => {
  let service: BillingService;

  const TEST_WEBHOOK_SECRET = 'test-webhook-secret-0123456789abcdef';
  const SESSION = {
    sessionId: 'sim_1',
    providerSubscriptionId: 'sim_1',
    userId: 'user-1',
    plan: Plan.pro,
    billingCycle: 'monthly',
  };

  const mockPrisma = {
    user: { findUnique: jest.fn(), update: jest.fn() },
    subscription: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    paymentEvent: { create: jest.fn(), findUnique: jest.fn() },
    checkoutSession: { create: jest.fn(), findUnique: jest.fn() },
  };
  const mockQueue = { add: jest.fn() };
  const mockProvider = {
    name: 'simulated',
    createCheckoutSession: jest.fn(),
    parseWebhook: jest.fn(),
    cancelSubscription: jest.fn(),
  };
  const mockConfig = {
    get: jest.fn((key: string, def?: unknown) => {
      if (key === 'BILLING_MODE') return 'test';
      if (key === 'BILLING_WEBHOOK_SECRET') return TEST_WEBHOOK_SECRET;
      return def;
    }),
  };

  /** Default: existe sessão de checkout do user-1 / sim_1 (caminho feliz). */
  function mockSessionLookup() {
    mockPrisma.checkoutSession.findUnique.mockImplementation(
      async ({ where }: any) => {
        if (where.sessionId) {
          return where.sessionId === SESSION.sessionId ? SESSION : null;
        }
        const key = where.providerSubscriptionId_userId;
        if (key) {
          return key.providerSubscriptionId === SESSION.providerSubscriptionId &&
            key.userId === SESSION.userId
            ? SESSION
            : null;
        }
        return null;
      },
    );
  }

  const approvalEvent = {
    providerEventId: 'evt-1',
    type: 'payment_approved' as const,
    providerSubscriptionId: 'sim_1',
    userId: 'user-1',
    plan: Plan.pro,
    billingCycle: 'monthly' as const,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: BILLING_PROVIDER_TOKEN, useValue: mockProvider },
        { provide: getQueueToken(BILLING_EVENTS_QUEUE), useValue: mockQueue },
      ],
    }).compile();
    service = module.get<BillingService>(BillingService);
    mockSessionLookup();
  });

  it('rejeita checkout do plano Carreira (sem preço decidido)', async () => {
    await expect(
      service.createCheckout('user-1', Plan.career, 'monthly'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockProvider.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('cria checkout Pro em modo teste com o preço da landing e persiste a sessão', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    mockProvider.createCheckoutSession.mockResolvedValue({
      sessionId: 'sim_1',
      checkoutUrl: 'http://localhost:3001/checkout/sucesso?session=sim_1',
      providerSubscriptionId: 'sim_1',
    });

    const result = await service.createCheckout('user-1', Plan.pro, 'monthly');

    expect(result.testMode).toBe(true);
    expect(result.provider).toBe('simulated');
    expect(result.amountCents).toBe(3990);
    expect(mockProvider.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ plan: Plan.pro, amountCents: 3990 }),
    );
    expect(mockPrisma.checkoutSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sessionId: 'sim_1',
          providerSubscriptionId: 'sim_1',
          userId: 'user-1',
          plan: Plan.pro,
          billingCycle: 'monthly',
          amountCents: 3990,
          provider: 'simulated',
        }),
      }),
    );
  });

  it('replay de webhook não enfileira de novo (alreadyProcessed)', async () => {
    const p2002 = Object.assign(new Error('unique'), { code: 'P2002' });
    mockPrisma.paymentEvent.create.mockRejectedValue(p2002);
    mockPrisma.paymentEvent.findUnique.mockResolvedValue({ id: 'evt-1' });

    const result = await service.recordWebhook(
      'simulated',
      {
        providerEventId: 'evt-dup',
        type: 'payment_approved',
        providerSubscriptionId: 'sim_1',
        userId: 'user-1',
        plan: Plan.pro,
        billingCycle: 'monthly',
      },
      Buffer.from('{}'),
    );

    expect(result.alreadyProcessed).toBe(true);
    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  it('aprovação libera o tier; reaplicar atualiza em vez de duplicar', async () => {
    const event = { ...approvalEvent };
    mockPrisma.subscription.findFirst.mockResolvedValueOnce(null);
    await service.applyPaymentEvent(event);
    expect(mockPrisma.subscription.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { plan: Plan.pro } }),
    );

    mockPrisma.subscription.findFirst.mockResolvedValue({ id: 'sub-1' });
    await service.applyPaymentEvent(event);
    expect(mockPrisma.subscription.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.subscription.update).toHaveBeenCalledTimes(1);
  });

  it('aprovação para Carreira via webhook é ignorada (tier sem preço)', async () => {
    mockPrisma.checkoutSession.findUnique.mockResolvedValue({
      ...SESSION,
      plan: Plan.career,
    });
    await service.applyPaymentEvent({
      providerEventId: 'evt-career',
      type: 'payment_approved',
      providerSubscriptionId: 'sim_9',
      userId: 'user-1',
      plan: Plan.career,
      billingCycle: 'monthly',
    });
    expect(mockPrisma.subscription.create).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('cancelar sem assinatura ativa lança NotFound', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue(null);
    await expect(service.cancelMySubscription('user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('assinatura cancelada com período vigente mantém acesso', async () => {
    const future = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: 'sub-1',
      plan: Plan.pro,
      status: 'canceled',
      currentPeriodEnd: future,
      testMode: true,
      billingCycle: 'monthly',
      provider: 'simulated',
      canceledAt: new Date(),
      createdAt: new Date(),
    });
    const result = await service.getMySubscription('user-1');
    expect(result.hasAccess).toBe(true);
    expect(result.effectivePlan).toBe(Plan.pro);
  });

  it('M10: trialing ATIVO concede acesso; trialing expirado e past_due, não', async () => {
    const future = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    const past = new Date(Date.now() - 24 * 3600 * 1000);
    const base = {
      id: 'sub-1',
      plan: Plan.pro,
      testMode: true,
      billingCycle: 'monthly',
      provider: 'simulated',
      canceledAt: null,
      createdAt: new Date(),
    };

    mockPrisma.subscription.findFirst.mockResolvedValue({
      ...base,
      status: 'trialing',
      currentPeriodEnd: future,
    });
    const trialActive = await service.getMySubscription('user-1');
    expect(trialActive.hasAccess).toBe(true);
    expect(trialActive.effectivePlan).toBe(Plan.pro);

    mockPrisma.subscription.findFirst.mockResolvedValue({
      ...base,
      status: 'trialing',
      currentPeriodEnd: past,
    });
    const trialExpired = await service.getMySubscription('user-1');
    expect(trialExpired.hasAccess).toBe(false);
    expect(trialExpired.effectivePlan).toBe(Plan.free);

    mockPrisma.subscription.findFirst.mockResolvedValue({
      ...base,
      status: 'past_due',
      currentPeriodEnd: future,
    });
    const pastDue = await service.getMySubscription('user-1');
    expect(pastDue.hasAccess).toBe(false);
    expect(pastDue.effectivePlan).toBe(Plan.free);
  });

  describe('C1 — webhook sem sessão de checkout vinculada é rejeitado', () => {
    it('recordWebhook rejeita payment_approved sem sessão (400, sem persistir nem enfileirar)', async () => {
      mockPrisma.checkoutSession.findUnique.mockResolvedValue(null);

      await expect(
        service.recordWebhook('simulated', { ...approvalEvent }, Buffer.from('{}')),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(mockPrisma.paymentEvent.create).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
      expect(mockPrisma.subscription.create).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('recordWebhook rejeita quando a sessão é de outro usuário (userId divergente)', async () => {
      // mockSessionLookup só casa (sim_1, user-1); evento diz user-2.
      await expect(
        service.recordWebhook(
          'simulated',
          { ...approvalEvent, userId: 'user-2' },
          Buffer.from('{}'),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrisma.paymentEvent.create).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('recordWebhook rejeita payment_approved sem providerSubscriptionId', async () => {
      const event = {
        providerEventId: 'evt-1',
        type: 'payment_approved' as const,
        userId: 'user-1',
        plan: Plan.pro,
        billingCycle: 'monthly' as const,
      };
      await expect(
        service.recordWebhook('simulated', event, Buffer.from('{}')),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrisma.paymentEvent.create).not.toHaveBeenCalled();
    });

    it('applyPaymentEvent (worker) rejeita sem sessão: plano NÃO muda', async () => {
      mockPrisma.checkoutSession.findUnique.mockResolvedValue(null);

      await expect(service.applyPaymentEvent({ ...approvalEvent })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(mockPrisma.subscription.create).not.toHaveBeenCalled();
      expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('applyPaymentEvent rejeita quando a sessão é de outro usuário', async () => {
      await expect(
        service.applyPaymentEvent({ ...approvalEvent, userId: 'user-2' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('caminho feliz: recordWebhook grava e enfileira quando há sessão vinculada', async () => {
      mockPrisma.paymentEvent.create.mockResolvedValue({ id: 'evt-1' });

      const result = await service.recordWebhook(
        'simulated',
        { ...approvalEvent },
        Buffer.from('{}'),
      );

      expect(result).toEqual({ alreadyProcessed: false, paymentEventId: 'evt-1' });
      expect(mockPrisma.paymentEvent.create).toHaveBeenCalledTimes(1);
      expect(mockQueue.add).toHaveBeenCalledTimes(1);
    });

    it('plano aplicado é o DA SESSÃO, não o do corpo do webhook', async () => {
      // Evento forjado (mas com sessão válida) diz career; a sessão diz pro.
      mockPrisma.subscription.findFirst.mockResolvedValue(null);
      await service.applyPaymentEvent({
        ...approvalEvent,
        plan: Plan.career,
      });
      expect(mockPrisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ plan: Plan.pro }),
        }),
      );
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { plan: Plan.pro } }),
      );
    });
  });

  describe('C1 — simulatePaymentApproval (botão da UI)', () => {
    it('monta o evento da sessão, assina com o segredo e passa pelo webhook', async () => {
      mockProvider.parseWebhook.mockImplementation((rawBody: Buffer) => {
        const payload = JSON.parse(rawBody.toString('utf8'));
        return {
          providerEventId: payload.providerEventId,
          type: payload.type,
          providerSubscriptionId: payload.providerSubscriptionId,
          userId: payload.userId,
          plan: payload.plan,
          billingCycle: payload.billingCycle,
        };
      });
      mockPrisma.paymentEvent.create.mockResolvedValue({ id: 'evt-sim' });

      const result = await service.simulatePaymentApproval('user-1', 'sim_1');

      expect(result).toEqual({ alreadyProcessed: false, paymentEventId: 'evt-sim' });
      // Assinatura HMAC válida com o segredo do servidor, sobre o corpo
      // montado da sessão (usuário/plano da sessão, não do cliente).
      expect(mockProvider.parseWebhook).toHaveBeenCalledTimes(1);
      const [rawBody, signature] = mockProvider.parseWebhook.mock.calls[0];
      const expected = createHmac('sha256', TEST_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');
      expect(signature).toBe(`sha256=${expected}`);
      const payload = JSON.parse((rawBody as Buffer).toString('utf8'));
      expect(payload).toEqual(
        expect.objectContaining({
          type: 'payment_approved',
          sessionId: 'sim_1',
          providerSubscriptionId: 'sim_1',
          userId: 'user-1',
          plan: 'pro',
          billingCycle: 'monthly',
        }),
      );
      expect(mockQueue.add).toHaveBeenCalledTimes(1);
    });

    it('sessão de outro usuário → 404, sem tocar no webhook', async () => {
      await expect(
        service.simulatePaymentApproval('user-2', 'sim_1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockProvider.parseWebhook).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('sessão inexistente → 404, sem tocar no webhook', async () => {
      await expect(
        service.simulatePaymentApproval('user-1', 'sim_inexistente'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockProvider.parseWebhook).not.toHaveBeenCalled();
    });
  });
});
