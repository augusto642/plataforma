import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { ActivityAccessModule } from './activity-access.module';
import { ActivityDraftsService } from './activity-drafts.service';

@Module({
  imports: [ActivityAccessModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService, ActivityDraftsService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
