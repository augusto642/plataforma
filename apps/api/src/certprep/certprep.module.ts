import { Module } from '@nestjs/common';
import { PlansModule } from '../plans/plans.module';
import { CertprepController } from './certprep.controller';
import { CertprepService } from './certprep.service';

@Module({
  imports: [PlansModule],
  controllers: [CertprepController],
  providers: [CertprepService],
  exports: [CertprepService],
})
export class CertprepModule {}
