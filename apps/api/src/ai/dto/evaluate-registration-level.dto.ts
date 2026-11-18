import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

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
  @IsString()
  @MaxLength(2048)
  followUpToken?: string;

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
