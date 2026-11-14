import { Module } from '@nestjs/common';
import { GamificationModule } from '../gamification/gamification.module';
import { GiteaModule } from '../gitea/gitea.module';
import { SonarModule } from '../sonar/sonar.module';
import { SubmissionsModule } from '../submissions/submissions.module';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [SubmissionsModule, GiteaModule, SonarModule, GamificationModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}

