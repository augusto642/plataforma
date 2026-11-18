import { IsInt, IsString, MaxLength, Min } from 'class-validator';
import { MAX_SUBMISSION_CODE_LENGTH } from '../../submissions/dto/create-submission.dto';

export class SaveActivityDraftDto {
  @IsString()
  @MaxLength(MAX_SUBMISSION_CODE_LENGTH)
  code!: string;

  @IsInt()
  @Min(0)
  revision!: number;
}
