import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ComplexityAnalysisDto {
  @IsString()
  @IsNotEmpty()
  activityId!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsOptional()
  language?: string;
}
