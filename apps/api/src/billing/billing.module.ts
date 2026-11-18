import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PlansModule } from '../plans/plans.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BILLING_PROVIDER_TOKEN } from './billing-provider.interface';
import { BillingController } from './billing.controller';
import { BillingEventsProcessor } from './billing-events.processor';
import { BillingService, BILLING_EVENTS_QUEUE } from './billing.service';
import { MercadoPagoTestProvider } from './providers/mercadopago-test.provider';
import { SimulatedTestProvider } from './providers/simulated-test.provider';
import { TestModeGuard } from './test-mode.guard';
import { AlphaFreeBillingGuard } from './alpha-free.guard';

/**
 * Fase 1 premium (desenho §2.1) — módulo de billing.
 * `BILLING_PROVIDER` escolhe entre simulação e Mercado Pago sandbox;
 * a validação de configuração impede qualquer chave live.
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
    AlphaFreeBillingGuard,
    SimulatedTestProvider,
    MercadoPagoTestProvider,
    {
      provide: BILLING_PROVIDER_TOKEN,
      inject: [ConfigService, SimulatedTestProvider, MercadoPagoTestProvider],
      useFactory: (
        config: ConfigService,
        simulated: SimulatedTestProvider,
        mercadopago: MercadoPagoTestProvider,
      ) =>
        config.get<string>('BILLING_PROVIDER', 'simulated') === 'mercadopago'
          ? mercadopago
          : simulated,
    },
  ],
  exports: [BillingService],
})
export class BillingModule {}
