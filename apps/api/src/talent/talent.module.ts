import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { PlansModule } from '../plans/plans.module';
import { CompanyTokenGuard } from './company-token.guard';
import { IntroductionService } from './introduction.service';
import { JobPostingService } from './job-posting.service';
import { MatchService } from './match.service';
import { TalentController } from './talent.controller';
import { TalentProfileService } from './talent-profile.service';
import { TalentService } from './talent.service';

@Module({
  imports: [CoursesModule, KnowledgeModule, PlansModule],
  controllers: [TalentController],
  providers: [
    TalentService,
    JobPostingService,
    TalentProfileService,
    MatchService,
    IntroductionService,
    CompanyTokenGuard,
  ],
  exports: [JobPostingService, TalentProfileService, MatchService, IntroductionService],
})
export class TalentModule {}
