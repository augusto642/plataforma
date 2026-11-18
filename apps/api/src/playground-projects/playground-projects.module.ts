import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlaygroundProjectsController } from './playground-projects.controller';
import { PlaygroundProjectsService } from './playground-projects.service';
import { PlaygroundDraftsService } from './playground-drafts.service';

@Module({
  imports: [PrismaModule],
  controllers: [PlaygroundProjectsController],
  providers: [PlaygroundProjectsService, PlaygroundDraftsService],
})
export class PlaygroundProjectsModule {}
