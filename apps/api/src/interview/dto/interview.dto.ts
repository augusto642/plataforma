import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateInterviewSessionDto {
  @IsEnum(['technical', 'behavioral'])
  mode!: 'technical' | 'behavioral';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  track?: string;
}

export class AnswerInterviewDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  content!: string;
}
