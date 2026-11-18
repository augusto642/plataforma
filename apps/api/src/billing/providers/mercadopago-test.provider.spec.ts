import {
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { Plan } from '@prisma/client';
import { MercadoPagoTestProvider } from './mercadopago-test.provider';

const ACCESS_TOKEN = 'TEST-sandbox-token';
const WEBHOOK_SECRET = 'mercadopago-webhook-secret-0123456789';

function provider() {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'MP_TEST_ACCESS_TOKEN') return ACCESS_TOKEN;
      if (key === 'MP_TEST_PAYER_EMAIL') return 'test_user_123@testuser.com';
      if (key === 'BILLING_WEBHOOK_SECRET') return WEBHOOK_SECRET;
      return undefined;
    }),
  } as unknown as ConfigService;
  return new MercadoPagoTestProvider(config);
}

function apiResponse(body: Record<string, unknown>, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function signedNotification(
  payload: Record<string, unknown>,
  dataId: string,
  requestId = 'request-123',
) {
  const timestamp = '1710000000000';
  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
  const digest = createHmac('sha256', WEBHOOK_SECRET)
    .update(manifest)
    .digest('hex');
  return {
    rawBody: Buffer.from(JSON.stringify(payload)),
    signature: `ts=${timestamp},v1=${digest}`,
    context: { dataId, requestId },
  };
}

describe('MercadoPagoTestProvider', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(apiResponse({}));
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('creates a pending recurring subscription with sandbox buyer and server price', async () => {
    fetchMock.mockImplementationOnce(async (_url, init) => {
      const request = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return apiResponse({
        id: 'preapproval-123',
        external_reference: request.external_reference,
        init_point:
          'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=preapproval-123',
      });
    });

    const result = await provider().createCheckoutSession({
      userId: 'user-1',
      plan: Plan.pro,
      billingCycle: 'annual',
      amountCents: 35880,
      successUrl: 'https://app.example.com/checkout/sucesso',
      failureUrl: 'https://app.example.com/checkout/falha',
    });

    const [url, init] = fetchMock.mock.calls[0];
    const request = JSON.parse(String(init.body));
    expect(url).toBe('https://api.mercadopago.com/preapproval');
    expect(init.headers).toEqual(
      expect.objectContaining({
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'x-idempotency-key': result.sessionId,
      }),
    );
    expect(request).toEqual(
      expect.objectContaining({
        external_reference: result.sessionId,
        payer_email: 'test_user_123@testuser.com',
        status: 'pending',
        auto_recurring: {
          frequency: 12,
          frequency_type: 'months',
          transaction_amount: 358.8,
          currency_id: 'BRL',
        },
      }),
    );
    const backUrl = new URL(String(request.back_url));
    expect(backUrl.searchParams.get('session')).toBe(result.sessionId);
    expect(backUrl.searchParams.get('provider')).toBe('mercadopago');
    expect(result.providerSubscriptionId).toBe('preapproval-123');
    expect(result.checkoutUrl).toContain('mercadopago.com.br');
  });

  it('rejects a checkout URL outside Mercado Pago', async () => {
    fetchMock.mockImplementationOnce(async (_url, init) => {
      const request = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return apiResponse({
        id: 'preapproval-123',
        external_reference: request.external_reference,
        init_point: 'https://attacker.example/checkout',
      });
    });

    await expect(
      provider().createCheckoutSession({
        userId: 'user-1',
        plan: Plan.pro,
        billingCycle: 'monthly',
        amountCents: 3990,
        successUrl: 'https://app.example.com/checkout/sucesso',
        failureUrl: 'https://app.example.com/checkout/falha',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('verifies the Mercado Pago signature and fetches subscription state before activation', async () => {
    fetchMock.mockResolvedValueOnce(
      apiResponse({
        id: 'preapproval-123',
        external_reference: 'local-session-1',
        status: 'authorized',
        next_payment_date: '2027-01-01T00:00:00.000Z',
        auto_recurring: { transaction_amount: '39.90', currency_id: 'BRL' },
      }),
    );
    const notification = signedNotification(
      {
        id: 8,
        type: 'subscription_preapproval',
        action: 'updated',
        data: { id: 'preapproval-123' },
      },
      'preapproval-123',
    );

    const event = await provider().parseWebhook(
      notification.rawBody,
      notification.signature,
      notification.context,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.mercadopago.com/preapproval/preapproval-123',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        }),
      }),
    );
    expect(event).toEqual(
      expect.objectContaining({
        providerEventId: 'subscription:8:updated',
        type: 'subscription_active',
        providerSubscriptionId: 'preapproval-123',
        amountCents: 3990,
        currencyId: 'BRL',
        currentPeriodEnd: new Date('2027-01-01T00:00:00.000Z'),
      }),
    );
  });

  it('rejects invalid signatures before making a provider API request', async () => {
    const notification = signedNotification(
      {
        id: 9,
        type: 'subscription_preapproval',
        data: { id: 'preapproval-123' },
      },
      'preapproval-123',
    );

    await expect(
      provider().parseWebhook(
        notification.rawBody,
        'ts=1710000000000,v1=' + '0'.repeat(64),
        notification.context,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the subscription reference on approved recurring payments', async () => {
    fetchMock.mockResolvedValueOnce(
      apiResponse({
        id: 42,
        preapproval_id: 'preapproval-123',
        status: 'approved',
        transaction_amount: 39.9,
        currency_id: 'BRL',
      }),
    );
    const notification = signedNotification(
      {
        id: 10,
        type: 'subscription_authorized_payment',
        action: 'payment.created',
        data: { id: '42' },
      },
      '42',
    );

    const event = await provider().parseWebhook(
      notification.rawBody,
      notification.signature,
      notification.context,
    );

    expect(event).toEqual(
      expect.objectContaining({
        type: 'payment_approved',
        providerSubscriptionId: 'preapproval-123',
        amountCents: 3990,
        currencyId: 'BRL',
      }),
    );
  });

  it('rejects a notification whose signed resource id differs from the body', async () => {
    const notification = signedNotification(
      {
        id: 11,
        type: 'subscription_preapproval',
        data: { id: 'different-id' },
      },
      'preapproval-123',
    );

    await expect(
      provider().parseWebhook(
        notification.rawBody,
        notification.signature,
        notification.context,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('cancels the remote preapproval subscription', async () => {
    fetchMock.mockResolvedValueOnce(apiResponse({ id: 'preapproval-123', status: 'canceled' }));

    await provider().cancelSubscription('preapproval-123');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.mercadopago.com/preapproval/preapproval-123',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ status: 'canceled' }),
      }),
    );
  });

  it('rejects webhook types that are not configured for subscription billing', async () => {
    const notification = signedNotification(
      { id: 12, type: 'chargebacks', data: { id: 'preapproval-123' } },
      'preapproval-123',
    );

    await expect(
      provider().parseWebhook(
        notification.rawBody,
        notification.signature,
        notification.context,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
