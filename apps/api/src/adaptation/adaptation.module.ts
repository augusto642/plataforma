import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdaptationController } from './adaptation.controller';
import { AdaptationService } from './adaptation.service';
import { LearnerModelService } from './learner-model.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdaptationController],
  providers: [AdaptationService, LearnerModelService],
  exports: [AdaptationService, LearnerModelService],
})
export class AdaptationModule {}
