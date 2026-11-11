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
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { BILLING_PROVIDER_TOKEN, type BillingProvider } from './billing-provider.interface';
import { BillingService } from './billing.service';
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
  ) {}

  @Post('checkout')
  @UseGuards(TestModeGuard)
  createCheckout(@CurrentUser() user: JwtPayload, @Body() dto: CreateCheckoutDto) {
    return this.billing.createCheckout(user.sub, dto.plan, dto.billingCycle);
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
  @UseGuards(TestModeGuard)
  simulatePayment(@CurrentUser() user: JwtPayload, @Body() dto: SimulatePaymentDto) {
    return this.billing.simulatePaymentApproval(user.sub, dto.sessionId);
  }

  /**
   * Webhook do provedor. Sem JWT; autenticado pela assinatura HMAC do
   * provedor (`BILLING_WEBHOOK_SECRET`, obrigatório no boot — sem ele
   * o evento é rejeitado com 401). Eventos que liberam plano ainda
   * precisam de uma sessão de checkout vinculada àquele usuário
   * (400 sem ela). Resposta 200 rápida; a aplicação é assíncrona via
   * fila `billing-events`. Provedor desativado (ex.: mercadopago)
   * responde 503 — nunca processa pela metade.
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
    const signature =
      (req.headers['x-signature'] as string | undefined) ??
      (req.headers['x-hub-signature-256'] as string | undefined);
    const event = this.provider.parseWebhook(rawBody, signature);
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
}
