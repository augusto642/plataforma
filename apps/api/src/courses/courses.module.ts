import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../activities/activities.module';
import { ActivityAccessModule } from '../activities/activity-access.module';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../cache/cache.module';
import { GiteaModule } from '../gitea/gitea.module';
import { CertificatesController } from './certificates.controller';
import { CertificateService } from './certificate.service';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

@Module({
  imports: [ActivitiesModule, ActivityAccessModule, AuthModule, GiteaModule, CacheModule],
  controllers: [CoursesController, CertificatesController],
  providers: [CoursesService, CertificateService],
  exports: [CoursesService, CertificateService],
})
export class CoursesModule {}
