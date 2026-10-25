import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

/** Fase 3 premium (desenho §4.2) — DTOs do fórum, galeria e pares. */
export class CreateThreadDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsUUID()
  activityId?: string;
}

export class CreatePostDto {
  @IsString()
  @MinLength(1)
  body!: string;
}

export class SubmitPeerReviewDto {
  @IsObject()
  rubric!: Record<string, { score: number; comment: string }>;

  @IsString()
  @MinLength(1)
  summary!: string;

  @IsArray()
  @IsString({ each: true })
  suggestions!: string[];
}
