import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { BillingService, BILLING_EVENTS_QUEUE, type BillingJobData } from './billing.service';

/**
 * Fase 1 premium — worker da fila `billing-events` (mesmo Redis/BullMQ
 * das demais filas). A rota de webhook responde 200 rápido; a
 * liberação do tier acontece aqui, de forma assíncrona e idempotente
 * (ver BillingService.applyPaymentEvent).
 * O job viaja serializado em JSON: `currentPeriodEnd` volta como string
 * e é reidratado para Date antes de aplicar.
 */
@Processor(BILLING_EVENTS_QUEUE)
export class BillingEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(BillingEventsProcessor.name);

  constructor(private readonly billing: BillingService) {
    super();
  }

  async process(job: Job<BillingJobData, unknown, string>): Promise<unknown> {
    const raw = job.data.event;
    const event = {
      ...raw,
      currentPeriodEnd:
        typeof raw.currentPeriodEnd === 'string'
          ? new Date(raw.currentPeriodEnd)
          : raw.currentPeriodEnd,
    };
    this.logger.log(
      `Aplicando evento de billing ${raw.providerEventId} (${raw.type})`,
    );
    await this.billing.applyPaymentEvent(event);
    return { applied: true, paymentEventId: job.data.paymentEventId };
  }
}
