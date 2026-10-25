import { Injectable } from '@nestjs/common';
import type {
  BillingProvider,
  CheckoutSession,
  CheckoutSessionInput,
  NormalizedBillingEvent,
} from '../billing-provider.interface';

/**
 * Fase 1 premium — adapter Mercado Pago, DESATIVADO.
 *
 * Este arquivo existe para que o segundo adapter já esteja atrás da
 * mesma interface (`BillingProvider`) quando o Augusto decidir, mas
 * NENHUM caminho de código o instancia hoje:
 * - `BillingModule` provê apenas o `SimulatedTestProvider`;
 * - a validação de segredos impede o boot com
 *   `BILLING_PROVIDER=mercadopago` (decisão pendente);
 * - todos os métodos abaixo lançam, para um uso acidental falhar alto
 *   em vez de processar um pagamento pela metade.
 *
 * Quando o Augusto escolher o Mercado Pago como provedor v1, a
 * implementação real (a escrever, com credenciais de TESTE):
 * - `createCheckoutSession`: preferência via API do Mercado Pago em
 *   sandbox (`MP_TEST_ACCESS_TOKEN`, `MP_TEST_PUBLIC_KEY`), com
 *   `back_urls` para /checkout/sucesso e /checkout/falha;
 * - `parseWebhook`: verificação `x-signature` (HMAC do `id;request-id;ts`)
 *   + busca do pagamento na API antes de normalizar (nunca confiar só
 *   no corpo do webhook);
 * - `cancelSubscription` / `refund`: chamadas à API de assinaturas e
 *   reembolsos do Mercado Pago, sempre em sandbox enquanto
 *   `BILLING_MODE=test`.
 * Sem credencial de teste decidida, nada disso é inventado aqui.
 */
@Injectable()
export class MercadoPagoTestProvider implements BillingProvider {
  readonly name = 'mercadopago';

  private disabled(): Error {
    return new Error(
      'Provedor Mercado Pago desativado: a escolha do provedor v1 e as credenciais de teste são decisão pendente do Augusto.',
    );
  }

  async createCheckoutSession(_input: CheckoutSessionInput): Promise<CheckoutSession> {
    throw this.disabled();
  }

  parseWebhook(_rawBody: Buffer, _signature: string | undefined): NormalizedBillingEvent {
    throw this.disabled();
  }

  async cancelSubscription(_providerSubscriptionId: string): Promise<void> {
    throw this.disabled();
  }

  async refund(_paymentId: string): Promise<void> {
    throw this.disabled();
  }
}
