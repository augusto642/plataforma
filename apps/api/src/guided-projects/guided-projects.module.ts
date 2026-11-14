import { Module } from '@nestjs/common';
import { GiteaModule } from '../gitea/gitea.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GuidedProjectsController } from './guided-projects.controller';
import { GuidedProjectsService } from './guided-projects.service';

@Module({
  imports: [PrismaModule, GiteaModule],
  controllers: [GuidedProjectsController],
  providers: [GuidedProjectsService],
  exports: [GuidedProjectsService],
})
export class GuidedProjectsModule {}
