import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { CompanyTokenGuard } from './company-token.guard';
import { TalentController } from './talent.controller';
import { TalentService } from './talent.service';

@Module({
  imports: [CoursesModule],
  controllers: [TalentController],
  providers: [TalentService, CompanyTokenGuard],
})
export class TalentModule {}
