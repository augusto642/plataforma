import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { PlansModule } from '../plans/plans.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { LineFeedbackService } from './line-feedback.service';
import { LlmClient } from './llm-client';
import { AiUsageService } from './llm/ai-usage.service';

import { SocraticCatService } from './socratic-cat.service';

@Module({
  imports: [CacheModule, PlansModule, KnowledgeModule],
  controllers: [AiController],
  providers: [AiService, LineFeedbackService, SocraticCatService, LlmClient, AiUsageService],
  exports: [AiService, LineFeedbackService, SocraticCatService, LlmClient, AiUsageService],
})
export class AiModule {}
