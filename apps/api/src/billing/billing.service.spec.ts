import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Plan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BILLING_PROVIDER_TOKEN } from './billing-provider.interface';
import { BillingService, BILLING_EVENTS_QUEUE } from './billing.service';

/**
 * Fase 1 premium — travas do checkout em modo teste:
 * - Carreira não é comprável (sem preço decidido) → 409;
 * - webhook replay não duplica (PaymentEvent unique → alreadyProcessed);
 * - aplicar o mesmo evento de aprovação duas vezes não duplica a
 *   assinatura (update em vez de segundo create) e libera o tier.
 */
describe('BillingService', () => {
  let service: BillingService;

  const mockPrisma = {
    user: { findUnique: jest.fn(), update: jest.fn() },
    subscription: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    paymentEvent: { create: jest.fn(), findUnique: jest.fn() },
  };
  const mockQueue = { add: jest.fn() };
  const mockProvider = {
    name: 'simulated',
    createCheckoutSession: jest.fn(),
    cancelSubscription: jest.fn(),
  };
  const mockConfig = {
    get: jest.fn((key: string, def?: unknown) =>
      key === 'BILLING_MODE' ? 'test' : def,
    ),
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
  });

  it('rejeita checkout do plano Carreira (sem preço decidido)', async () => {
    await expect(
      service.createCheckout('user-1', Plan.career, 'monthly'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockProvider.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('cria checkout Pro em modo teste com o preço da landing', async () => {
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
    const event = {
      providerEventId: 'evt-1',
      type: 'payment_approved' as const,
      providerSubscriptionId: 'sim_1',
      userId: 'user-1',
      plan: Plan.pro,
      billingCycle: 'monthly' as const,
    };
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
});
