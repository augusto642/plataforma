import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { LineFeedbackService } from './line-feedback.service';

@Module({
  controllers: [AiController],
  providers: [AiService, LineFeedbackService],
  exports: [AiService, LineFeedbackService],
})
export class AiModule {}
