import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { GamificationModule } from '../gamification/gamification.module';
import { EvaluatorService } from './evaluator/evaluator.service';
import { PistonRunnerService } from './runner/runner.service';
import { SubmissionEventsService } from './submission-events.service';
import { SubmissionProcessor } from './submission.processor';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'submissions',
      defaultJobOptions: {
        removeOnComplete: { count: 100, age: 24 * 3600 },
        removeOnFail: { age: 24 * 3600 },
      },
    }),
    GamificationModule,
    CacheModule,
  ],
  controllers: [SubmissionsController],
  providers: [
    SubmissionsService,
    EvaluatorService,
    PistonRunnerService,
    SubmissionProcessor,
    SubmissionEventsService,
  ],
  exports: [SubmissionsService, EvaluatorService, PistonRunnerService, SubmissionEventsService],
})
export class SubmissionsModule {}
