import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

// M14 (Lote 4) — tetos de tamanho (título curto, descrição com folga).
export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug!: string;

  @IsString()
  @IsOptional()
  @MaxLength(20000)
  description?: string;
}
