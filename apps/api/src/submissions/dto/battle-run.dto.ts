import { Language } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class BattleRunDto {
  @IsUUID()
  @IsNotEmpty()
  activityId!: string;

  @IsUUID()
  @IsNotEmpty()
  companionId!: string;

  // M14 (Lote 4) — teto de tamanho: o código vai para o Piston e para o
  // LLM de feedback; 100.000 caracteres é generoso para um exercício e
  // fica bem abaixo do limite de 1 MB do body parser.
  @IsString()
  @IsNotEmpty()
  @MaxLength(100000)
  code!: string;

  @IsEnum(Language)
  @IsNotEmpty()
  language!: Language;

  /**
   * C7: commit opcional usado na chave estável de dedupe do job
   * (`battle:{userId}:{activityId}:{commit}`). Sem ele, o dedupe usa o hash
   * SHA-256 do código enviado.
   */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  commitSha?: string;

  // currentBossHp/currentHeroHp foram REMOVIDOS: valores vindos do cliente
  // eram forjáveis (aluno podia forjar vitória e farmar XP/bits). O HP do boss
  // agora é derivado no servidor a partir das submissões reais do usuário.
}
