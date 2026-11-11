import { IsOptional, IsString, MaxLength } from 'class-validator';

// M14 (Lote 4) — mesmos tetos do CreateCourseDto.
export class UpdateCourseDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20000)
  description?: string;
}
