import { Language } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// M14 (Lote 4) — mesmos tetos do CreateActivityDto.
export class UpdateActivityDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50000)
  instructions?: string;

  @IsEnum(Language)
  @IsOptional()
  language?: Language;

  @IsString()
  @IsOptional()
  @MaxLength(200000)
  initialCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200000)
  testCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200000)
  hiddenTests?: string;

  @IsInt()
  @Min(500)
  @Max(60000)
  @IsOptional()
  timeLimitMs?: number;

  @IsInt()
  @Min(64)
  @Max(1024)
  @IsOptional()
  memoryLimitMb?: number;

  @IsInt()
  @IsOptional()
  order?: number;

  @IsString()
  @IsOptional()
  @MaxLength(200000)
  referenceSolution?: string;

  @IsArray()
  @ArrayMaxSize(6, { message: 'Máximo de 6 tags de conceito por atividade' })
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  @IsOptional()
  conceptTags?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(200)
  giteaTemplateRepo?: string;
}
