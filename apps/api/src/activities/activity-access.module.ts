import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ActivityAccessService } from './activity-access.service';

@Module({
  imports: [PrismaModule],
  providers: [ActivityAccessService],
  exports: [ActivityAccessService],
})
export class ActivityAccessModule {}
