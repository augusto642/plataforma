import { BadRequestException } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsIn, IsString,
  Matches, MaxLength, ValidateNested,
} from 'class-validator';
import { MAX_SUBMISSION_CODE_LENGTH } from './create-submission.dto';

export class ProjectFileDto {
  @IsString()
  @Matches(/^(?!.*\.\.)[a-zA-Z0-9][a-zA-Z0-9_.-]{0,80}$/)
  name!: string;

  @IsString()
  @MaxLength(MAX_SUBMISSION_CODE_LENGTH)
  content!: string;
}

export class ProjectFilesDto {
  @IsIn(['javascript', 'python'])
  language!: 'javascript' | 'python';

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ArrayUnique((file: ProjectFileDto | null) => file?.name)
  @ValidateNested({ each: true })
  @Type(() => ProjectFileDto)
  files!: ProjectFileDto[];
}

export function normalizeProjectFiles(dto: ProjectFilesDto): ProjectFileDto[] {
  const extension = dto.language === 'python' ? '.py' : '.js';
  const mainName = `main${extension}`;
  if (!dto.files.some((file) => file.name === mainName)) {
    throw new BadRequestException(`O projeto precisa de ${mainName}.`);
  }
  if (dto.files.some((file) => !file.name.endsWith(extension))) {
    throw new BadRequestException(`Todos os arquivos devem usar a extensão ${extension}.`);
  }
  if (dto.files.reduce((total, file) => total + file.content.length, 0) > MAX_SUBMISSION_CODE_LENGTH) {
    throw new BadRequestException('O tamanho total dos arquivos excede o limite.');
  }
  return [...dto.files].sort((a, b) => Number(b.name === mainName) - Number(a.name === mainName));
}
