import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class DiagnosticAnswerDto {
  @IsString()
  @MaxLength(16)
  questionId!: string;

  @IsString()
  @MaxLength(16)
  optionId!: string;
}

export class SubmitDiagnosticDto {
  // Validação estrutural aqui; a validação semântica (questão existe, opção
  // pertence à questão, quiz completo, sem duplicadas) é do service, que
  // conhece o banco de questões versionado.
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(64)
  @ValidateNested({ each: true })
  @Type(() => DiagnosticAnswerDto)
  answers!: DiagnosticAnswerDto[];

  /** Token de uma sessão anterior (retomada/refazer). Ausente = gera um novo. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sessionToken?: string;
}
