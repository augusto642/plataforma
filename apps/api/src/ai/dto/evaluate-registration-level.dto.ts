import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class EvaluateRegistrationLevelDto {
  @IsBoolean()
  hasProgrammedBefore!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  challengeId?: string;

  @IsString()
  @MaxLength(2000)
  explanation!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  tabSwitchCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  followUpQuestion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  followUpAnswer?: string;
}

export class GenerateRegistrationFollowUpDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  challengeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  language?: string;

  @IsString()
  @MaxLength(2000)
  explanation!: string;
}
