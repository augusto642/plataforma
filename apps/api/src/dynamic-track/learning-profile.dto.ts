import {
  CAREER_GOALS,
  EXPERIENCE_LEVELS,
  WEEKLY_TIME_COMMITMENTS,
  type CareerGoal,
  type ExperienceLevel,
  type WeeklyTimeCommitment,
} from '@plataforma/contracts';
import { IsBoolean, IsIn, ValidateIf } from 'class-validator';

export class LearningProfileDto {
  @ValidateIf((value: LearningProfileDto) => value.skipped !== undefined)
  @IsBoolean()
  skipped?: boolean;

  @ValidateIf((value: LearningProfileDto) => value.skipped !== true || value.experienceLevel !== undefined)
  @IsIn(EXPERIENCE_LEVELS)
  experienceLevel?: ExperienceLevel;

  @ValidateIf((value: LearningProfileDto) => value.skipped !== true || value.careerGoal !== undefined)
  @IsIn(CAREER_GOALS)
  careerGoal?: CareerGoal;

  @ValidateIf((value: LearningProfileDto) => value.skipped !== true || value.weeklyTimeCommitment !== undefined)
  @IsIn(WEEKLY_TIME_COMMITMENTS)
  weeklyTimeCommitment?: WeeklyTimeCommitment;
}
