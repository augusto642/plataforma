import { Module, forwardRef } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { PlansModule } from '../plans/plans.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { AdaptationModule } from '../adaptation/adaptation.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { LineFeedbackService } from './line-feedback.service';
import { LlmClient } from './llm-client';
import { AiUsageService } from './llm/ai-usage.service';

import { SocraticCatService } from './socratic-cat.service';
import { PromptSafetyService } from './prompt-safety.service';
import { SocraticTierService } from './socratic-tier.service';
import { HeuristicTutorService } from './heuristic-tutor.service';
import { TutorKnowledgeService } from './tutor-knowledge.service';
import { PedagogicalHintService } from './pedagogical-hint.service';
import { TutorChatService } from './tutor-chat.service';
import { ComplexityAnalysisService } from './complexity-analysis.service';
import { SocraticGuidanceService } from './socratic-guidance.service';
import { RegistrationLevelService } from './registration-level.service';

@Module({
  imports: [CacheModule, PlansModule, forwardRef(() => KnowledgeModule), AdaptationModule],
  controllers: [AiController],
  providers: [
    AiService,
    LineFeedbackService,
    SocraticCatService,
    LlmClient,
    AiUsageService,
    // M12 — serviços extraídos do AiService god service (a fachada
    // AiService os compõe; podem ser injetados diretamente).
    PromptSafetyService,
    SocraticTierService,
    HeuristicTutorService,
    TutorKnowledgeService,
    PedagogicalHintService,
    TutorChatService,
    ComplexityAnalysisService,
    SocraticGuidanceService,
    RegistrationLevelService,
  ],
  exports: [
    AiService,
    LineFeedbackService,
    SocraticCatService,
    LlmClient,
    AiUsageService,
    PromptSafetyService,
    SocraticTierService,
    HeuristicTutorService,
    TutorKnowledgeService,
    PedagogicalHintService,
    TutorChatService,
    ComplexityAnalysisService,
    SocraticGuidanceService,
    RegistrationLevelService,
  ],
})
export class AiModule {}
