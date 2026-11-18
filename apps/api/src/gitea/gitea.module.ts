import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GiteaDeletionService } from './gitea-deletion.service';
import { GiteaService } from './gitea.service';

@Module({
  imports: [PrismaModule],
  providers: [GiteaService, GiteaDeletionService],
  exports: [GiteaService, GiteaDeletionService],
})
export class GiteaModule {}
