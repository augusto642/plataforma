import { Language } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateActivityDto {
  @IsUUID()
  @IsNotEmpty()
  courseId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsEnum(Language)
  @IsOptional()
  language?: Language;

  @IsString()
  @IsNotEmpty()
  initialCode!: string;

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
