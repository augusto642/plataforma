import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PlansModule } from '../plans/plans.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BILLING_PROVIDER_TOKEN } from './billing-provider.interface';
import { BillingController } from './billing.controller';
import { BillingEventsProcessor } from './billing-events.processor';
import { BillingService, BILLING_EVENTS_QUEUE } from './billing.service';
import { SimulatedTestProvider } from './providers/simulated-test.provider';
import { TestModeGuard } from './test-mode.guard';

/**
 * Fase 1 premium (desenho §2.1) — módulo de billing.
 * Provedor ativo: `SimulatedTestProvider` (sandbox simulado, sem
 * credencial, sem rede de pagamento real). O adapter Mercado Pago
 * existe no código mas NÃO é registrado aqui — está desativado até
 * decisão do Augusto (e o boot falha com BILLING_PROVIDER != simulated).
 * Registrado no AppModule; força o registro explícito do PlansModule
 * (hoje só entra via AiModule).
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    PlansModule,
    BullModule.registerQueue({ name: BILLING_EVENTS_QUEUE }),
  ],
  controllers: [BillingController],
  providers: [
    BillingService,
    BillingEventsProcessor,
    TestModeGuard,
    SimulatedTestProvider,
    {
      provide: BILLING_PROVIDER_TOKEN,
      useExisting: SimulatedTestProvider,
    },
  ],
  exports: [BillingService],
})
export class BillingModule {}
