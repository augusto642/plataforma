import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { SimulatedTestProvider } from './simulated-test.provider';

/**
 * C1 (Lote 1 P0) — o webhook simulado é fail-closed:
 * - sem `BILLING_WEBHOOK_SECRET` configurado, TODO evento é rejeitado
 *   (o caminho antigo aceitava sem assinatura em modo teste);
 * - com segredo, só entra com HMAC-SHA256 válido do corpo bruto.
 */
const SECRET = 'test-webhook-secret-0123456789abcdef';

function providerWithSecret(secret: string | undefined) {
  const config = {
    get: jest.fn((key: string) =>
      key === 'BILLING_WEBHOOK_SECRET' ? secret : undefined,
    ),
  } as unknown as ConfigService;
  return new SimulatedTestProvider(config);
}

function signedBody(payload: Record<string, unknown>, secret: string) {
  const rawBody = Buffer.from(JSON.stringify(payload), 'utf8');
  const sig = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  return { rawBody, sig };
}

describe('SimulatedTestProvider — C1 (webhook fail-closed)', () => {
  const payload = {
    providerEventId: 'evt-1',
    type: 'payment_approved',
    sessionId: 'sim_1',
    userId: 'user-1',
    plan: 'pro',
    billingCycle: 'monthly',
  };

  it('rejeita qualquer webhook sem segredo configurado (fail-closed)', () => {
    const provider = providerWithSecret(undefined);
    const { rawBody, sig } = signedBody(payload, SECRET);
    expect(() => provider.parseWebhook(rawBody, sig)).toThrow(
      UnauthorizedException,
    );
    expect(() => provider.parseWebhook(rawBody, undefined)).toThrow(
      UnauthorizedException,
    );
  });

  it('rejeita webhook sem assinatura quando há segredo', () => {
    const provider = providerWithSecret(SECRET);
    const { rawBody } = signedBody(payload, SECRET);
    expect(() => provider.parseWebhook(rawBody, undefined)).toThrow(
      UnauthorizedException,
    );
    expect(() => provider.parseWebhook(rawBody, '')).toThrow(
      UnauthorizedException,
    );
  });

  it('rejeita assinatura HMAC errada', () => {
    const provider = providerWithSecret(SECRET);
    const { rawBody } = signedBody(payload, SECRET);
    const wrong = `sha256=${createHmac('sha256', 'outro-segredo-0123456789abcdef')
      .update(rawBody)
      .digest('hex')}`;
    expect(() => provider.parseWebhook(rawBody, wrong)).toThrow(
      UnauthorizedException,
    );
  });

  it('aceita assinatura HMAC válida e normaliza o evento', () => {
    const provider = providerWithSecret(SECRET);
    const { rawBody, sig } = signedBody(payload, SECRET);
    const event = provider.parseWebhook(rawBody, sig);
    expect(event).toEqual(
      expect.objectContaining({
        providerEventId: 'evt-1',
        type: 'payment_approved',
        providerSubscriptionId: 'sim_1',
        userId: 'user-1',
        plan: 'pro',
        billingCycle: 'monthly',
      }),
    );
  });

  it('aceita hex puro sem o prefixo sha256=', () => {
    const provider = providerWithSecret(SECRET);
    const { rawBody, sig } = signedBody(payload, SECRET);
    const event = provider.parseWebhook(rawBody, sig.replace('sha256=', ''));
    expect(event.type).toBe('payment_approved');
  });

  it('rejeita payload inválido mesmo com assinatura válida', () => {
    const provider = providerWithSecret(SECRET);
    const rawBody = Buffer.from('não-json', 'utf8');
    const sig = `sha256=${createHmac('sha256', SECRET).update(rawBody).digest('hex')}`;
    expect(() => provider.parseWebhook(rawBody, sig)).toThrow(
      UnauthorizedException,
    );
  });
});
