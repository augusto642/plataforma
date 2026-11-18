import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { SubmissionsModule } from '../submissions/submissions.module';
import { DynamicTrackService, TRACK_INVESTIGATION_QUEUE } from './dynamic-track.service';
import { DynamicTrackProcessor } from './dynamic-track.processor';
import { DynamicTrackController } from './dynamic-track.controller';
import { SkillEvidenceService } from './skill-evidence.service';
import { TransferController } from './transfer.controller';
import { TransferService } from './transfer.service';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    // ResearchService.collect é a fonte de sinais de mercado (DESIGN D2).
    KnowledgeModule,
    SubmissionsModule,
    BullModule.registerQueue({ name: TRACK_INVESTIGATION_QUEUE }),
  ],
  controllers: [DynamicTrackController, TransferController],
  providers: [DynamicTrackService, DynamicTrackProcessor, SkillEvidenceService, TransferService],
  exports: [DynamicTrackService, SkillEvidenceService],
})
export class DynamicTrackModule {}
