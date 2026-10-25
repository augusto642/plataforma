import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Fase 4 premium (desenho §5.1) — DTOs de vagas, perfil, match e introdução. */

export const JOB_LEVELS = ['junior', 'mid', 'senior'] as const;
export type JobLevel = (typeof JOB_LEVELS)[number];

export class CreateJobPostingDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsArray()
  @IsString({ each: true })
  skills!: string[];

  @IsIn(JOB_LEVELS)
  level!: JobLevel;

  @IsOptional()
  @IsUrl()
  externalUrl?: string;

  @IsOptional()
  @IsDateString()
  postedAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UpdateTalentProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  headline?: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  projectUrls?: string[];

  /**
   * Consentimento opt-in explícito. `visible` aqui espelha
   * `User.talentVisible`: ligar/desligar um desliga/liga o outro, e a
   * listagem de candidatos exige os dois — desligar tem efeito imediato.
   * `skillsProven` NÃO aceito aqui: é derivado, nunca autodeclarado.
   */
  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  /** Destaque Carreira (matriz §1.1) — sem promessa de contratação. */
  @IsOptional()
  @IsBoolean()
  spotlight?: boolean;
}

export class RequestIntroductionDto {
  /** Identificador anonimizado do candidato (`cand_<8 chars>`). */
  @IsString()
  @MinLength(5)
  candidateId!: string;

  @IsOptional()
  @IsString()
  jobPostingId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
