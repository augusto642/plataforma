import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../activities/activities.module';
import { CacheModule } from '../cache/cache.module';
import { GiteaModule } from '../gitea/gitea.module';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

@Module({
  imports: [ActivitiesModule, GiteaModule, CacheModule],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
