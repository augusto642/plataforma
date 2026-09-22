import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisLockService } from '../cache/redis-lock.service';

@Injectable()
export class HousekeepingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HousekeepingService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly lockService: RedisLockService,
    @InjectQueue('submissions') private readonly submissionsQueue: Queue,
  ) {}

  onModuleInit() {
    // Agenda execução periódica a cada 15 minutos (900.000 ms)
    this.timer = setInterval(() => {
      this.runHousekeeping().catch((err) => {
        this.logger.error(`Housekeeping cycle failed: ${err.message}`);
      });
    }, 15 * 60 * 1000);

    // Executa uma rodada inicial após 30 segundos de boot
    setTimeout(() => {
      this.runHousekeeping().catch(() => {});
    }, 30 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async runHousekeeping() {
    const lockKey = 'lock:cron:housekeeping';
    // Protege com distributed lock de 5 minutos (com renovação via watchdog do
    // RedisLockService) para que apenas uma réplica da API execute a limpeza
    await this.lockService.usingLock(
      lockKey,
      5 * 60 * 1000,
      async () => {
        this.logger.log('Iniciando rotina de limpeza e manutenção do banco...');
        // 1. Expurgar refresh tokens expirados
        const deletedTokens = await this.prisma.refreshToken.deleteMany({
          where: {
            expiresAt: { lt: new Date() },
          },
        });

        // 2. Expurgar entregas de webhook com mais de 14 dias
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        const deletedWebhooks = await this.prisma.webhookDelivery.deleteMany({
          where: {
            receivedAt: { lt: fourteenDaysAgo },
          },
        });

        // 3. Watchdog de submissões zumbis (em running ou queued há mais de 30
        // minutos): re-enqueue UMA vez (requeueCount 0 -> 1) antes de marcar
        // erro; só marca 'error' quem já foi re-enfileirado e voltou a travar.
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        const zombieWhere = {
          status: { in: [SubmissionStatus.queued, SubmissionStatus.running] },
          updatedAt: { lt: thirtyMinutesAgo },
        };

        const zombies = await this.prisma.submission.findMany({
          where: zombieWhere,
          select: { id: true, requeueCount: true },
        });

        let requeued = 0;
        let errored = 0;

        for (const zombie of zombies) {
          if (zombie.requeueCount < 1) {
            // CAS: incrementa requeueCount condicional para evitar que duas
            // réplicas re-enfileirem a mesma submissão.
            const claimed = await this.prisma.submission.updateMany({
              where: { id: zombie.id, requeueCount: zombie.requeueCount },
              data: { requeueCount: { increment: 1 } },
            });
            if (claimed.count !== 1) continue;
            try {
              await this.submissionsQueue.add(
                'evaluate',
                { submissionId: zombie.id },
                { jobId: zombie.id, attempts: 2, backoff: { type: 'exponential', delay: 1000 } },
              );
              requeued += 1;
              continue;
            } catch (err: any) {
              this.logger.warn(
                `Could not re-enqueue zombie submission ${zombie.id}: ${err.message}`,
              );
            }
          }
          await this.prisma.submission.updateMany({
            where: { id: zombie.id, status: { in: ['queued', 'running'] } },
            data: {
              status: 'error',
              errorMessage:
                'Tempo limite de execução excedido ou serviço de sandbox reiniciado.',
            },
          });
          errored += 1;
        }

        this.logger.log(
          `Limpeza concluída: ${deletedTokens.count} tokens expirados, ` +
            `${deletedWebhooks.count} webhooks antigos expurgados, ` +
            `${requeued} submissões zumbis re-enfileiradas, ${errored} marcadas como erro.`,
        );
      },
      async () => {
        // Outra réplica já está executando ou executou recentemente
        this.logger.debug('Housekeeping ignorado: lock em uso por outra réplica.');
      },
    );
  }
}
