import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import type {
  BillingProvider,
  BillingWebhookContext,
  CheckoutSession,
  CheckoutSessionInput,
  NormalizedBillingEvent,
} from '../billing-provider.interface';

const API_BASE_URL = 'https://api.mercadopago.com';
const REQUEST_TIMEOUT_MS = 10_000;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function amountInCents(value: unknown): number | undefined {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) && amount > 0
    ? Math.round(amount * 100)
    : undefined;
}

function validDate(value: unknown): Date | undefined {
  if (typeof value !== 'string') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

@Injectable()
export class MercadoPagoTestProvider implements BillingProvider {
  readonly name = 'mercadopago';
  private readonly accessToken: string | undefined;
  private readonly payerEmail: string | undefined;
  private readonly webhookSecret: string | undefined;

  constructor(config: ConfigService) {
    this.accessToken = config.get<string>('MP_TEST_ACCESS_TOKEN') || undefined;
    this.payerEmail = config.get<string>('MP_TEST_PAYER_EMAIL') || undefined;
    this.webhookSecret = config.get<string>('BILLING_WEBHOOK_SECRET') || undefined;
  }

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession> {
    const sessionId = randomUUID();
    const frequency = input.billingCycle === 'annual' ? 12 : 1;
    const backUrl = new URL(input.successUrl);
    backUrl.searchParams.set('session', sessionId);
    backUrl.searchParams.set('provider', this.name);
    const response = await this.apiRequest('/preapproval', {
      method: 'POST',
      headers: { 'x-idempotency-key': sessionId },
      body: JSON.stringify({
        reason: `Plano Pro - ${input.billingCycle === 'annual' ? 'anual' : 'mensal'}`,
        external_reference: sessionId,
        payer_email: this.requirePayerEmail(),
        auto_recurring: {
          frequency,
          frequency_type: 'months',
          transaction_amount: input.amountCents / 100,
          currency_id: 'BRL',
        },
        back_url: backUrl.toString(),
        status: 'pending',
      }),
    });

    const providerSubscriptionId = stringValue(response.id);
    const checkoutUrl = stringValue(response.init_point);
    if (
      !providerSubscriptionId ||
      response.external_reference !== sessionId ||
      !checkoutUrl ||
      !this.isMercadoPagoUrl(checkoutUrl)
    ) {
      throw new ServiceUnavailableException(
        'Resposta de checkout inválida do Mercado Pago.',
      );
    }

    return { sessionId, checkoutUrl, providerSubscriptionId };
  }

  async parseWebhook(
    rawBody: Buffer,
    signature: string | undefined,
    context: BillingWebhookContext = {},
  ): Promise<NormalizedBillingEvent> {
    if (!this.webhookSecret) {
      throw new UnauthorizedException(
        'BILLING_WEBHOOK_SECRET não configurado: webhook rejeitado',
      );
    }

    let payload: JsonRecord;
    try {
      const parsed: unknown = JSON.parse(rawBody.toString('utf8'));
      if (!isRecord(parsed)) throw new Error('Invalid payload');
      payload = parsed;
    } catch {
      throw new BadRequestException('Payload do webhook inválido');
    }

    const data = isRecord(payload.data) ? payload.data : {};
    const dataId = context.dataId ?? stringValue(data.id);
    const requestId = context.requestId;
    if (
      !dataId ||
      !/^[A-Za-z0-9._-]+$/.test(dataId) ||
      !requestId ||
      !/^[A-Za-z0-9._-]+$/.test(requestId)
    ) {
      throw new UnauthorizedException('Contexto de assinatura do webhook inválido');
    }
    if (stringValue(data.id) && stringValue(data.id) !== dataId) {
      throw new UnauthorizedException('ID do recurso diverge da assinatura');
    }
    this.verifySignature(signature, dataId, requestId);

    const topic = stringValue(payload.type) ?? stringValue(payload.topic);
    if (!topic) throw new BadRequestException('Tipo de evento ausente');

    if (this.isSubscriptionTopic(topic)) {
      return this.parseSubscriptionEvent(payload, dataId);
    }
    if (this.isPaymentTopic(topic)) {
      return this.parsePaymentEvent(payload, dataId);
    }
    throw new BadRequestException(`Tipo de webhook não suportado: ${topic}`);
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    this.assertResourceId(providerSubscriptionId);
    const response = await this.apiRequest(
      `/preapproval/${encodeURIComponent(providerSubscriptionId)}`,
      { method: 'PUT', body: JSON.stringify({ status: 'canceled' }) },
    );
    if (response.status !== 'canceled' && response.status !== 'cancelled') {
      throw new ServiceUnavailableException(
        'O Mercado Pago não confirmou o cancelamento da assinatura.',
      );
    }
  }

  async refund(paymentId: string): Promise<void> {
    this.assertResourceId(paymentId);
    await this.apiRequest(
      `/v1/payments/${encodeURIComponent(paymentId)}/refunds`,
      {
        method: 'POST',
        headers: { 'x-idempotency-key': `refund-${paymentId}` },
        body: JSON.stringify({}),
      },
    );
  }

  private async parseSubscriptionEvent(
    payload: JsonRecord,
    dataId: string,
  ): Promise<NormalizedBillingEvent> {
    const subscription = await this.apiRequest(
      `/preapproval/${encodeURIComponent(dataId)}`,
      { method: 'GET' },
    );
    if (
      stringValue(subscription.id) !== dataId ||
      !stringValue(subscription.external_reference)
    ) {
      throw new BadRequestException(
        'Assinatura do Mercado Pago não corresponde a um checkout.',
      );
    }

    const status = stringValue(subscription.status)?.toLowerCase();
    const autoRecurring = isRecord(subscription.auto_recurring)
      ? subscription.auto_recurring
      : {};
    let type: NormalizedBillingEvent['type'] = 'payment_pending';
    if (status === 'authorized') type = 'subscription_active';
    else if (status === 'canceled' || status === 'cancelled') {
      type = 'subscription_canceled';
    } else if (status === 'paused') type = 'subscription_expired';

    return {
      providerEventId: this.eventId(payload, 'subscription', dataId, status),
      type,
      providerSubscriptionId: dataId,
      currentPeriodEnd: validDate(subscription.next_payment_date),
      amountCents: amountInCents(autoRecurring.transaction_amount),
      currencyId: stringValue(autoRecurring.currency_id),
    };
  }

  private async parsePaymentEvent(
    payload: JsonRecord,
    dataId: string,
  ): Promise<NormalizedBillingEvent> {
    const payment = await this.apiRequest(
      `/v1/payments/${encodeURIComponent(dataId)}`,
      { method: 'GET' },
    );
    if (stringValue(payment.id) !== dataId) {
      throw new BadRequestException(
        'Pagamento do Mercado Pago não corresponde à notificação.',
      );
    }

    const status = stringValue(payment.status)?.toLowerCase();
    let type: NormalizedBillingEvent['type'] = 'payment_pending';
    if (status === 'approved') type = 'payment_approved';
    else if (status === 'rejected' || status === 'cancelled') {
      type = 'payment_rejected';
    } else if (status === 'refunded') type = 'payment_refunded';

    return {
      providerEventId: this.eventId(payload, 'payment', dataId, status),
      type,
      providerSubscriptionId: stringValue(payment.preapproval_id),
      amountCents: amountInCents(payment.transaction_amount),
      currencyId: stringValue(payment.currency_id),
    };
  }

  private verifySignature(
    signature: string | undefined,
    dataId: string,
    requestId: string,
  ): void {
    const parts = new Map<string, string>();
    for (const part of (signature ?? '').split(',')) {
      const separator = part.indexOf('=');
      if (separator < 0) continue;
      parts.set(part.slice(0, separator).trim(), part.slice(separator + 1).trim());
    }
    const timestamp = parts.get('ts');
    const provided = parts.get('v1') ?? '';
    if (!timestamp || !/^\d+$/.test(timestamp) || !/^[a-f0-9]{64}$/i.test(provided)) {
      throw new UnauthorizedException('Assinatura do webhook inválida');
    }
    const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
    const expected = createHmac('sha256', this.webhookSecret as string)
      .update(manifest)
      .digest();
    const actual = Buffer.from(provided, 'hex');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new UnauthorizedException('Assinatura do webhook inválida');
    }
  }

  private async apiRequest(path: string, init: RequestInit): Promise<JsonRecord> {
    if (!this.accessToken) {
      throw new ServiceUnavailableException(
        'Mercado Pago sandbox requer MP_TEST_ACCESS_TOKEN.',
      );
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          ...init.headers,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Não foi possível comunicar com o Mercado Pago.',
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = {};
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Mercado Pago respondeu com HTTP ${response.status}.`,
      );
    }
    if (!isRecord(body)) {
      throw new ServiceUnavailableException(
        'Resposta inválida da API do Mercado Pago.',
      );
    }
    return body;
  }

  private requirePayerEmail(): string {
    if (!this.payerEmail) {
      throw new ServiceUnavailableException(
        'Mercado Pago sandbox requer MP_TEST_PAYER_EMAIL.',
      );
    }
    return this.payerEmail;
  }

  private isMercadoPagoUrl(value: string): boolean {
    try {
      const url = new URL(value);
      const host = url.hostname.toLowerCase();
      return (
        url.protocol === 'https:' &&
        (host === 'mercadopago.com.br' ||
          host.endsWith('.mercadopago.com.br') ||
          host === 'mercadopago.com' ||
          host.endsWith('.mercadopago.com'))
      );
    } catch {
      return false;
    }
  }

  private isSubscriptionTopic(topic: string): boolean {
    return (
      topic === 'subscription' ||
      topic === 'subscription_preapproval' ||
      topic.startsWith('subscription_preapproval.')
    );
  }

  private isPaymentTopic(topic: string): boolean {
    return (
      topic === 'payment' ||
      topic === 'subscription_authorized_payment' ||
      topic.startsWith('subscription_authorized_payment.')
    );
  }

  private eventId(
    payload: JsonRecord,
    topic: string,
    resourceId: string,
    status?: string,
  ): string {
    const notificationId = stringValue(payload.id);
    const action = stringValue(payload.action);
    return notificationId
      ? `${topic}:${notificationId}${action ? `:${action}` : ''}`
      : `${topic}:${resourceId}:${status ?? 'unknown'}`;
  }

  private assertResourceId(id: string): void {
    if (!/^[A-Za-z0-9._-]+$/.test(id)) {
      throw new BadRequestException('ID de recurso do Mercado Pago inválido.');
    }
  }
}
