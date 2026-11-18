import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { MAX_SUBMISSION_CODE_LENGTH } from './create-submission.dto';

export class PlaygroundRunDto {
  @IsIn(['javascript', 'python', 'portugol'])
  language!: 'javascript' | 'python' | 'portugol';

  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_SUBMISSION_CODE_LENGTH)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  stdin?: string;
}
