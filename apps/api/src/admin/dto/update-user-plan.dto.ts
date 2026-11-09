import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { Plan } from '@prisma/client';

export class UpdateUserPlanDto {
  @IsString()
  @IsNotEmpty()
  @IsIn([Plan.free, Plan.pro])
  plan!: Plan;
}
