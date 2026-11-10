import { Test, TestingModule } from '@nestjs/testing';
import { BillingEventsProcessor } from './billing-events.processor';
import { BillingService } from './billing.service';

/**
 * A10 (Lote 3 · portões do merge) — o worker que aplica o evento e
 * libera o plano nem APARECIA na cobertura: o `collectCoverageFrom`
 * só incluía `*.service|*.controller|*.guard`. Com `*.processor.ts`
 * incluído no jest.config, este spec cobre o processador de verdade:
 * o job viaja serializado em JSON (o `currentPeriodEnd` chega como
 * string e precisa ser reidratado para Date antes de aplicar).
 */
describe('BillingEventsProcessor', () => {
  let processor: BillingEventsProcessor;
  const mockBilling = { applyPaymentEvent: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingEventsProcessor,
        { provide: BillingService, useValue: mockBilling },
      ],
    }).compile();
    processor = module.get<BillingEventsProcessor>(BillingEventsProcessor);
  });

  const baseEvent = {
    providerEventId: 'evt-1',
    type: 'payment_approved',
    providerSubscriptionId: 'sub_1',
    userId: 'user-1',
    plan: 'pro',
    billingCycle: 'monthly',
  };

  it('reidrata currentPeriodEnd de string para Date antes de aplicar', async () => {
    mockBilling.applyPaymentEvent.mockResolvedValue(undefined);
    const job = {
      data: {
        paymentEventId: 'evt-1',
        event: { ...baseEvent, currentPeriodEnd: '2026-12-07T10:00:00.000Z' },
      },
    } as never;

    const result = await processor.process(job);

    expect(mockBilling.applyPaymentEvent).toHaveBeenCalledWith({
      ...baseEvent,
      currentPeriodEnd: new Date('2026-12-07T10:00:00.000Z'),
    });
    expect(result).toEqual({ applied: true, paymentEventId: 'evt-1' });
  });

  it('mantém currentPeriodEnd quando já é Date (sem reidratação)', async () => {
    mockBilling.applyPaymentEvent.mockResolvedValue(undefined);
    const periodEnd = new Date('2026-12-07T10:00:00.000Z');
    const job = {
      data: {
        paymentEventId: 'evt-2',
        event: { ...baseEvent, providerEventId: 'evt-2', currentPeriodEnd: periodEnd },
      },
    } as never;

    const result = await processor.process(job);

    expect(mockBilling.applyPaymentEvent).toHaveBeenCalledWith({
      ...baseEvent,
      providerEventId: 'evt-2',
      currentPeriodEnd: periodEnd,
    });
    expect(result).toEqual({ applied: true, paymentEventId: 'evt-2' });
  });

  it('evento sem currentPeriodEnd é aplicado como veio', async () => {
    mockBilling.applyPaymentEvent.mockResolvedValue(undefined);
    const job = {
      data: { paymentEventId: 'evt-3', event: { ...baseEvent, providerEventId: 'evt-3' } },
    } as never;

    await processor.process(job);

    expect(mockBilling.applyPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({ providerEventId: 'evt-3' }),
    );
    expect(
      mockBilling.applyPaymentEvent.mock.calls[0][0].currentPeriodEnd,
    ).toBeUndefined();
  });

  it('falha do service propaga (o retry com backoff é da job)', async () => {
    mockBilling.applyPaymentEvent.mockRejectedValue(new Error('db down'));
    const job = {
      data: { paymentEventId: 'evt-4', event: baseEvent },
    } as never;

    await expect(processor.process(job)).rejects.toThrow('db down');
  });
});
