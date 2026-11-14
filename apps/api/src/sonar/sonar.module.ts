import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SonarService } from './sonar.service';

@Module({
  imports: [ConfigModule],
  providers: [SonarService],
  exports: [SonarService],
})
export class SonarModule {}
