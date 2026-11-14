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
}
