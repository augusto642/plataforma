import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { MetricsController } from './metrics.controller';
import { MONITORED_QUEUE_NAMES, MetricsService } from './metrics.service';
import { CacheModule } from '../cache/cache.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    BullModule.registerQueue(...MONITORED_QUEUE_NAMES.map((name) => ({ name }))),
    CacheModule,
    PrismaModule,
    forwardRef(() => AiModule),
  ],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
