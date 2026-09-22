import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { LineFeedbackService } from './line-feedback.service';
import { LlmClient } from './llm-client';

import { SocraticCatService } from './socratic-cat.service';

@Module({
  imports: [CacheModule],
  controllers: [AiController],
  providers: [AiService, LineFeedbackService, SocraticCatService, LlmClient],
  exports: [AiService, LineFeedbackService, SocraticCatService, LlmClient],
})
export class AiModule {}
