import { Module } from '@nestjs/common';
import { PlanInterestController } from './plan-interest.controller';
import { PlanInterestService } from './plan-interest.service';

@Module({
  controllers: [PlanInterestController],
  providers: [PlanInterestService],
  exports: [PlanInterestService],
})
export class PlanInterestModule {}
