import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { MAX_SUBMISSION_CODE_LENGTH } from './create-submission.dto';

export class PracticeRunDto {
  @IsUUID()
  activityId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_SUBMISSION_CODE_LENGTH)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  stdin?: string;
}
