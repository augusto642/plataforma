import {
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { BillingController } from './billing.controller';
import { BILLING_PROVIDER_TOKEN } from './billing-provider.interface';
import { BillingService } from './billing.service';

/**
 * C1 (Lote 1 P0) — a simulação do pagamento NÃO passa pelo webhook
 * público: a rota `POST /billing/simulate-payment` é autenticada e o
 * service recebe o `userId` do JWT (`user.sub`) — nunca de um corpo
 * enviado pelo cliente — e só o `sessionId` vem do DTO.
 */
describe('BillingController — simulate-payment', () => {
  let controller: BillingController;
  const mockBilling = {
    createCheckout: jest.fn(),
    getMySubscription: jest.fn(),
    cancelMySubscription: jest.fn(),
    recordWebhook: jest.fn(),
    applyPaymentEvent: jest.fn(),
    simulatePaymentApproval: jest.fn(),
    listAdminSubscriptions: jest.fn(),
  };
  const mockProvider = {
    name: 'simulated',
    createCheckoutSession: jest.fn(),
    parseWebhook: jest.fn(),
    cancelSubscription: jest.fn(),
    refund: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [
        { provide: BillingService, useValue: mockBilling },
        { provide: BILLING_PROVIDER_TOKEN, useValue: mockProvider },
        // TestModeGuard (usado por checkout/cancel/simulate) injeta ConfigService.
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string, def?: unknown) => def) },
        },
      ],
    }).compile();
    controller = module.get<BillingController>(BillingController);
  });

  it('usa o userId do JWT (nunca do corpo) e só o sessionId do DTO', async () => {
    mockBilling.simulatePaymentApproval.mockResolvedValue({
      received: true,
      alreadyProcessed: false,
      paymentEventId: 'evt-sim',
    });
    const user = { sub: 'user-1', email: 'a@b.c', role: 'student' } as JwtPayload;

    const result = await controller.simulatePayment(user, {
      sessionId: 'sim_1',
    });

    expect(mockBilling.simulatePaymentApproval).toHaveBeenCalledWith(
      'user-1',
      'sim_1',
    );
    expect(mockBilling.simulatePaymentApproval).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      received: true,
      alreadyProcessed: false,
      paymentEventId: 'evt-sim',
    });
  });
});

describe('BillingController — checkout, cancel, subscription e admin', () => {
  let controller: BillingController;
  const mockBilling = {
    createCheckout: jest.fn(),
    getMySubscription: jest.fn(),
    cancelMySubscription: jest.fn(),
    recordWebhook: jest.fn(),
    applyPaymentEvent: jest.fn(),
    simulatePaymentApproval: jest.fn(),
    listAdminSubscriptions: jest.fn(),
  };
  const mockProvider = {
    name: 'simulated',
    createCheckoutSession: jest.fn(),
    parseWebhook: jest.fn(),
    cancelSubscription: jest.fn(),
    refund: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [
        { provide: BillingService, useValue: mockBilling },
        { provide: BILLING_PROVIDER_TOKEN, useValue: mockProvider },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string, def?: unknown) => def) },
        },
      ],
    }).compile();
    controller = module.get<BillingController>(BillingController);
  });

  const user = { sub: 'user-1', email: 'a@b.c', role: 'student' } as JwtPayload;

  it('checkout delega ao service com o userId do JWT, o plano e o ciclo', async () => {
    mockBilling.createCheckout.mockResolvedValue({
      checkoutUrl: 'https://pay.test/sim_1',
      sessionId: 'sim_1',
    });

    const result = await controller.createCheckout(user, {
      plan: 'pro',
      billingCycle: 'monthly',
    } as never);

    expect(mockBilling.createCheckout).toHaveBeenCalledWith(
      'user-1',
      'pro',
      'monthly',
    );
    expect(result).toEqual({
      checkoutUrl: 'https://pay.test/sim_1',
      sessionId: 'sim_1',
    });
  });

  it('getMySubscription devolve a assinatura do usuário do JWT', async () => {
    mockBilling.getMySubscription.mockResolvedValue({
      plan: 'pro',
      status: 'active',
    });

    const result = await controller.getMySubscription(user);

    expect(mockBilling.getMySubscription).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ plan: 'pro', status: 'active' });
  });

  it('cancel delega ao service com o userId do JWT', async () => {
    mockBilling.cancelMySubscription.mockResolvedValue({
      plan: 'pro',
      status: 'canceled',
    });

    const result = await controller.cancel(user);

    expect(mockBilling.cancelMySubscription).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ plan: 'pro', status: 'canceled' });
  });

  it('listAdmin repassa o filtro de query ao service', async () => {
    mockBilling.listAdminSubscriptions.mockResolvedValue([
      { userId: 'user-1', plan: 'pro', status: 'active' },
    ]);

    const result = await controller.listAdmin({
      status: 'active',
      plan: 'pro',
      userId: undefined,
    } as never);

    expect(mockBilling.listAdminSubscriptions).toHaveBeenCalledWith({
      status: 'active',
      plan: 'pro',
      userId: undefined,
    });
    expect(result).toHaveLength(1);
  });
});

describe('BillingController — webhook', () => {
  let controller: BillingController;
  const mockBilling = {
    createCheckout: jest.fn(),
    getMySubscription: jest.fn(),
    cancelMySubscription: jest.fn(),
    recordWebhook: jest.fn(),
    applyPaymentEvent: jest.fn(),
    simulatePaymentApproval: jest.fn(),
    listAdminSubscriptions: jest.fn(),
  };
  const mockProvider = {
    name: 'simulated',
    createCheckoutSession: jest.fn(),
    parseWebhook: jest.fn(),
    cancelSubscription: jest.fn(),
    refund: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [
        { provide: BillingService, useValue: mockBilling },
        { provide: BILLING_PROVIDER_TOKEN, useValue: mockProvider },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string, def?: unknown) => def) },
        },
      ],
    }).compile();
    controller = module.get<BillingController>(BillingController);
  });

  const rawBody = Buffer.from('{"type":"payment_approved"}');
  const reqWithBody = (signature?: string) =>
    ({
      headers: signature ? { 'x-signature': signature } : {},
      rawBody,
    }) as never;

  it('provedor diferente do ativo responde 503 sem tocar no service', async () => {
    await expect(
      controller.webhook('mercadopago', reqWithBody('sig')),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(mockProvider.parseWebhook).not.toHaveBeenCalled();
    expect(mockBilling.recordWebhook).not.toHaveBeenCalled();
  });

  it('corpo bruto ausente responde 400', async () => {
    await expect(
      controller.webhook('simulated', { headers: {} } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockProvider.parseWebhook).not.toHaveBeenCalled();
  });

  it('assinatura HMAC válida: parseia, grava e responde received + resultado', async () => {
    const event = {
      providerEventId: 'evt-1',
      type: 'payment_approved',
      providerSubscriptionId: 'sub_1',
      userId: 'user-1',
      plan: 'pro',
      billingCycle: 'monthly',
    };
    mockProvider.parseWebhook.mockReturnValue(event);
    mockBilling.recordWebhook.mockResolvedValue({
      alreadyProcessed: false,
      paymentEventId: 'evt-1',
    });

    const result = await controller.webhook(
      'simulated',
      reqWithBody('sha256=abc'),
    );

    // O corpo BRUTO (não o JSON parseado) é o que o HMAC verifica.
    expect(mockProvider.parseWebhook).toHaveBeenCalledWith(
      rawBody,
      'sha256=abc',
    );
    expect(mockBilling.recordWebhook).toHaveBeenCalledWith(
      'simulated',
      event,
      rawBody,
    );
    expect(result).toEqual({
      received: true,
      alreadyProcessed: false,
      paymentEventId: 'evt-1',
    });
  });

  it('sem x-signature, usa o header x-hub-signature-256 (GitHub-style)', async () => {
    const event = { providerEventId: 'evt-9', type: 'payment_approved' };
    mockProvider.parseWebhook.mockReturnValue(event);
    mockBilling.recordWebhook.mockResolvedValue({ alreadyProcessed: false });

    const req = {
      headers: { 'x-hub-signature-256': 'sha256=xyz' },
      rawBody,
    } as never;
    const result = await controller.webhook('simulated', req);

    expect(mockProvider.parseWebhook).toHaveBeenCalledWith(
      rawBody,
      'sha256=xyz',
    );
    expect(result).toEqual({ received: true, alreadyProcessed: false });
  });

  it('assinatura inválida: o erro do parseWebhook propaga (nada é gravado)', async () => {
    mockProvider.parseWebhook.mockImplementation(() => {
      throw new UnauthorizedException('Assinatura inválida');
    });

    await expect(
      controller.webhook('simulated', reqWithBody('sha256=ruim')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockBilling.recordWebhook).not.toHaveBeenCalled();
  });
});
