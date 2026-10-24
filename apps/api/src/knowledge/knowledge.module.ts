import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { KnowledgeService } from './knowledge.service';
import { ResearchService } from './research/research.service';
import { ResearchProcessor } from './research/research.processor';

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: 'research' })],
  providers: [KnowledgeService, ResearchService, ResearchProcessor],
  exports: [KnowledgeService, ResearchService],
})
export class KnowledgeModule {}
