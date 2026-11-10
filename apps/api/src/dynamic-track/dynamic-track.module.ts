import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { DynamicTrackService, TRACK_INVESTIGATION_QUEUE } from './dynamic-track.service';
import { DynamicTrackProcessor } from './dynamic-track.processor';
import { DynamicTrackController } from './dynamic-track.controller';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    // ResearchService.collect é a fonte de sinais de mercado (DESIGN D2).
    KnowledgeModule,
    BullModule.registerQueue({ name: TRACK_INVESTIGATION_QUEUE }),
  ],
  controllers: [DynamicTrackController],
  providers: [DynamicTrackService, DynamicTrackProcessor],
  exports: [DynamicTrackService],
})
export class DynamicTrackModule {}
