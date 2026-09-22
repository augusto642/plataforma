import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { HousekeepingService } from './housekeeping.service';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    // Necessário para o re-enqueue de submissões zumbis no watchdog.
    BullModule.registerQueue({ name: 'submissions' }),
  ],
  providers: [HousekeepingService],
  exports: [HousekeepingService],
})
export class HousekeepingModule {}
