import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdaptationController } from './adaptation.controller';
import { AdaptationService } from './adaptation.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdaptationController],
  providers: [AdaptationService],
  exports: [AdaptationService],
})
export class AdaptationModule {}
