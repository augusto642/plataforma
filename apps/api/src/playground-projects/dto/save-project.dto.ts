import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';
import { ProjectFilesDto } from '../../submissions/dto/project-files.dto';

export class CreateProjectDto extends ProjectFilesDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title!: string;
}

export class UpdateProjectDto extends CreateProjectDto {
  @IsInt()
  @Min(1)
  revision!: number;
}
