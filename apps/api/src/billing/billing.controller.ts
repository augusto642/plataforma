import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  BILLING_PROVIDER_TOKEN,
  type BillingProvider,
} from './billing-provider.interface';
import { BillingService } from './billing.service';
import { AlphaFreeBillingGuard } from './alpha-free.guard';
import {
  CreateCheckoutDto,
  ListSubscriptionsQueryDto,
  SimulatePaymentDto,
} from './dto/billing.dto';
import { TestModeGuard } from './test-mode.guard';

/**
 * Fase 1 premium (desenho §2.3) — rotas de billing.
 * Webhook com corpo bruto (`rawBody`, como o webhook do Gitea) para
 * verificação de assinatura — rota fora do JWT, com segredo próprio
 * do provedor. Nunca persiste dado de cartão (nenhum PAN em nenhuma
 * tabela: só plano, ciclo, status e período).
 */
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    @Inject(BILLING_PROVIDER_TOKEN) private readonly provider: BillingProvider,
    private readonly config: ConfigService,
  ) {}

  @Post('checkout')
  @UseGuards(AlphaFreeBillingGuard, TestModeGuard)
  createCheckout(@CurrentUser() user: JwtPayload, @Body() dto: CreateCheckoutDto) {
    return this.billing.createCheckout(user.sub, dto.plan, dto.billingCycle);
  }

  @Post('checkout/cancel')
  @UseGuards(TestModeGuard)
  cancelPendingCheckout(@CurrentUser() user: JwtPayload) {
    return this.billing.cancelPendingCheckout(user.sub);
  }

  @Get('subscription/me')
  getMySubscription(@CurrentUser() user: JwtPayload) {
    return this.billing.getMySubscription(user.sub);
  }

  @Post('cancel')
  @UseGuards(TestModeGuard)
  cancel(@CurrentUser() user: JwtPayload) {
    return this.billing.cancelMySubscription(user.sub);
  }

  /**
   * Simulação da confirmação do provedor (botão "Simular pagamento
   * aprovado" da UI). C1 (Lote 1 P0): o cliente NÃO chama o webhook
   * público — esta rota é autenticada (JWT) + TestModeGuard, recebe só
   * o `sessionId` e o service monta e assina o evento no servidor a
   * partir da sessão de checkout daquele usuário. O selo "Ambiente de
   * testes" da UI não muda: continua sendo só modo teste, sem cobrança.
   */
  @Post('simulate-payment')
  @UseGuards(AlphaFreeBillingGuard, TestModeGuard)
  simulatePayment(@CurrentUser() user: JwtPayload, @Body() dto: SimulatePaymentDto) {
    return this.billing.simulatePaymentApproval(user.sub, dto.sessionId);
  }

  /**
   * Webhook do provedor. Sem JWT; autenticado pela assinatura HMAC do
   * provedor (`BILLING_WEBHOOK_SECRET`, obrigatório no boot — sem ele
   * o evento é rejeitado com 401). Eventos que liberam plano ainda
   * precisam de uma sessão de checkout vinculada àquele usuário
   * (400 sem ela). Resposta 200 rápida; a aplicação é assíncrona via
   * fila `billing-events`. O adapter consulta a API do provedor antes de
   * aceitar o evento; o worker só libera acesso após validar o checkout.
   */
  @Public()
  @Post('webhooks/:provider')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Param('provider') providerName: string,
    @Req() req: Request,
  ) {
    if (providerName !== this.provider.name) {
      throw new ServiceUnavailableException(
        `Provedor '${providerName}' desativado ou desconhecido em modo teste.`,
      );
    }
    const rawBody = (req as unknown as { rawBody?: unknown }).rawBody;
    if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
      throw new BadRequestException('Corpo do webhook ausente');
    }
    const signatureHeader =
      req.headers['x-signature'] ?? req.headers['x-hub-signature-256'];
    const signature = Array.isArray(signatureHeader)
      ? signatureHeader[0]
      : signatureHeader;
    const requestIdHeader = req.headers['x-request-id'];
    const requestId = Array.isArray(requestIdHeader)
      ? requestIdHeader[0]
      : requestIdHeader;
    const query = (req.query ?? {}) as Record<string, unknown>;
    const queryDataId = query['data.id'] ?? query.id;
    const dataId =
      typeof queryDataId === 'string' || typeof queryDataId === 'number'
        ? String(queryDataId)
        : undefined;
    const event = await this.provider.parseWebhook(rawBody, signature, {
      requestId,
      dataId,
    });
    const result = await this.billing.recordWebhook(providerName, event, rawBody);
    return { received: true, ...result };
  }

  @Get('admin/subscriptions')
  @Roles(Role.admin)
  listAdmin(@Query() query: ListSubscriptionsQueryDto) {
    return this.billing.listAdminSubscriptions({
      status: query.status,
      plan: query.plan,
      userId: query.userId,
    });
  }

  @Get('admin/readiness')
  @Roles(Role.admin)
  getAdminReadiness() {
    const mode = this.config.get<string>('BILLING_MODE', 'test');
    const accessToken = this.config.get<string>('MP_TEST_ACCESS_TOKEN');
    const payerEmail = this.config.get<string>('MP_TEST_PAYER_EMAIL');
    const webhookSecret = this.config.get<string>('BILLING_WEBHOOK_SECRET');
    const publicWebUrl = this.config.get<string>('WEB_PUBLIC_URL');
    let returnUrlUsesHttps = false;

    if (publicWebUrl) {
      try {
        returnUrlUsesHttps = new URL(publicWebUrl).protocol === 'https:';
      } catch {
        returnUrlUsesHttps = false;
      }
    }

    const checks = [
      {
        key: 'test-mode',
        label: 'Cobrança permanece em modo de testes',
        status: mode === 'test' ? 'ready' : 'blocked',
      },
      {
        key: 'provider',
        label: 'Adaptador Mercado Pago sandbox selecionado',
        status: this.provider.name === 'mercadopago' ? 'ready' : 'blocked',
      },
      {
        key: 'test-token',
        label: 'Credencial de teste Mercado Pago configurada',
        status: accessToken?.startsWith('TEST-') ? 'ready' : 'blocked',
      },
      {
        key: 'test-payer',
        label: 'Comprador de teste configurado',
        status:
          payerEmail && /^[^\s@]+@testuser\.com$/i.test(payerEmail)
            ? 'ready'
            : 'blocked',
      },
      {
        key: 'webhook-secret',
        label: 'Segredo de assinatura do webhook configurado',
        status: webhookSecret ? 'ready' : 'blocked',
      },
      {
        key: 'return-url',
        label: 'URL de retorno HTTPS configurada',
        status: returnUrlUsesHttps ? 'ready' : 'blocked',
      },
      {
        key: 'provider-webhook',
        label: 'Notificações do provedor verificadas no painel externo',
        status: 'manual',
      },
    ] as const;
    const localConfigurationReady = checks
      .filter(({ status }) => status !== 'manual')
      .every(({ status }) => status === 'ready');

    return {
      mode,
      provider: this.provider.name,
      livePaymentsEnabled: false,
      localConfigurationReady,
      checks,
    };
  }
}
