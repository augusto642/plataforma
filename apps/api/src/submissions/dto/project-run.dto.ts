import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ProjectFilesDto } from './project-files.dto';

export class ProjectRunDto extends ProjectFilesDto {
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  stdin?: string;
}
