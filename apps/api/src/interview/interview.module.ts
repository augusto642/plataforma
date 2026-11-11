import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { PlansModule } from '../plans/plans.module';
import { PrismaModule } from '../prisma/prisma.module';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';

/** Fase 2 premium (desenho §3.1) — importa AiModule (LlmClient + AiUsageService). */
@Module({
  imports: [AiModule, PlansModule, PrismaModule],
  controllers: [InterviewController],
  providers: [InterviewService],
  exports: [InterviewService],
})
export class InterviewModule {}
