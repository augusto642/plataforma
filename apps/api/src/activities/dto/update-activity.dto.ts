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
  Min,
} from 'class-validator';

export class UpdateActivityDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsEnum(Language)
  @IsOptional()
  language?: Language;

  @IsString()
  @IsOptional()
  initialCode?: string;

  @IsString()
  @IsOptional()
  testCode?: string;

  @IsString()
  @IsOptional()
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
  referenceSolution?: string;

  @IsArray()
  @ArrayMaxSize(6, { message: 'Máximo de 6 tags de conceito por atividade' })
  @IsString({ each: true })
  @IsOptional()
  conceptTags?: string[];

  @IsString()
  @IsOptional()
  giteaTemplateRepo?: string;
}
