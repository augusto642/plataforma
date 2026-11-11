import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { MetricsModule } from '../metrics/metrics.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [PrismaModule, CacheModule, MetricsModule, KnowledgeModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
