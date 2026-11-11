import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { PlansModule } from '../plans/plans.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ReviewsController } from './reviews.controller';
import { ReviewsProcessor } from './reviews.processor';
import { AI_REVIEWS_QUEUE, ReviewsService } from './reviews.service';

/** Fase 2 premium (desenho §3.2) — fila `ai-reviews` no mesmo Redis. */
@Module({
  imports: [
    AiModule,
    PlansModule,
    PrismaModule,
    BullModule.registerQueue({
      name: AI_REVIEWS_QUEUE,
      defaultJobOptions: {
        removeOnComplete: { count: 100, age: 24 * 3600 },
        removeOnFail: { age: 24 * 3600 },
      },
    }),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewsProcessor],
  exports: [ReviewsService],
})
export class ReviewsModule {}
