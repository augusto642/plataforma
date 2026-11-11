import { IsBoolean, IsDateString, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

/** Fase 3 premium (desenho §4.1) — criação do desafio semanal (admin). */
export class CreateChallengeDto {
  @IsUUID()
  activityId!: string;

  @IsString()
  @MinLength(3)
  title!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsBoolean()
  optIn?: boolean;
}
