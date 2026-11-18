import { forwardRef, Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { CacheModule } from '../cache/cache.module';
import { MetricsModule } from '../metrics/metrics.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { SubmissionsModule } from '../submissions/submissions.module';
import { RunnerDiagnosticsService } from './runner-diagnostics.service';
import { RunnerDiagnosticsScheduler } from './runner-diagnostics.scheduler';
import { KnowledgeReferencesService } from './knowledge-references.service';
import { ReferenceConnectorController } from './reference-connector.controller';
import { ReferenceConnectorGuard } from './reference-connector.guard';
import { JobResearchPreflightService } from './job-research-preflight.service';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    MetricsModule,
    KnowledgeModule,
    SubmissionsModule,
    forwardRef(() => AiModule),
  ],
  controllers: [AdminController, ReferenceConnectorController],
  providers: [AdminService, RunnerDiagnosticsService, RunnerDiagnosticsScheduler, KnowledgeReferencesService, ReferenceConnectorGuard, JobResearchPreflightService],
  exports: [AdminService],
})
export class AdminModule {}
