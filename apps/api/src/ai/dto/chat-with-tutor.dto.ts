import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// M14 (Lote 4) — tetos de tamanho: cada caractere do histórico e do código
// vira custo de LLM (o serviço mapeia `messages` integralmente para o
// provedor, sem truncar) e payload sem limite é vetor de DoS. Tetos
// generosos para uso real de sala de aula, mas finitos: mensagem 8.000
// caracteres, código 100.000, histórico 50 mensagens. O ValidationPipe
// global (whitelist + forbidNonWhitelisted + transform, main.ts) rejeita
// o que exceder com 400 antes de chegar ao serviço.
export class ChatMessageDto {
  /**
   * A1 (Lote 2) — camada 1: só 'user' | 'assistant' são aceitos. Sem o
   * @IsIn, o tipo TS não é validado em runtime e um `role: "system"` do
   * cliente chegava ao provedor LLM como systemInstruction, sobrescrevendo
   * o prompt do sistema do tutor. Com o ValidationPipe global, outro valor
   * é rejeitado com 400 antes de chegar ao serviço (a camada 2, no serviço,
   * normaliza qualquer papel que escape por outra via).
   */
  @IsString()
  @IsNotEmpty()
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  content!: string;
}

export class ChatWithTutorDto {
  @IsUUID()
  @IsNotEmpty()
  activityId!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100000)
  code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(8000)
  testFailure?: string;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];
}
