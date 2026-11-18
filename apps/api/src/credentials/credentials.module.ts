import { Module } from '@nestjs/common';
import { DynamicTrackModule } from '../dynamic-track/dynamic-track.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CredentialsController } from './credentials.controller';
import { CredentialsService } from './credentials.service';

@Module({
  imports: [DynamicTrackModule, PrismaModule],
  controllers: [CredentialsController],
  providers: [CredentialsService],
})
export class CredentialsModule {}
