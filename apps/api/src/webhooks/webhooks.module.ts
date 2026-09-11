import { Module } from '@nestjs/common';
import { GiteaModule } from '../gitea/gitea.module';
import { SubmissionsModule } from '../submissions/submissions.module';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [SubmissionsModule, GiteaModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}

