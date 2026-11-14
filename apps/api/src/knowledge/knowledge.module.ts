import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { KnowledgeService } from './knowledge.service';
import { KmsService } from './kms.service';
import { ResearchService } from './research/research.service';
import { ResearchProcessor } from './research/research.processor';
import { JobsMarketProvider } from './research/jobs-market.provider';
import { TrackGenerationService } from './track-generation/track-generation.service';
import { TrackGenerationProcessor } from './track-generation/track-generation.processor';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: 'research' }, { name: 'track-generation' }),
    // forwardRef nos DOIS lados (AiModule idem): AiModule importa
    // KnowledgeModule (tutora consulta a base) e o TrackGenerationService
    // precisa do LlmClient da AiModule (Sprint 22). O forwardRef quebra o
    // ciclo sem criar módulo paralelo — a diretriz "nada ao lado da Nexus"
    // vale também para módulos.
    forwardRef(() => AiModule),
  ],
  providers: [
    KnowledgeService,
    KmsService,
    ResearchService,
    ResearchProcessor,
    JobsMarketProvider,
    TrackGenerationService,
    TrackGenerationProcessor,
  ],
  exports: [KnowledgeService, KmsService, ResearchService, JobsMarketProvider, TrackGenerationService],
})
export class KnowledgeModule {}
