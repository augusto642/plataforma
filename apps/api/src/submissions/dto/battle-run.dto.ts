import { Language } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { MAX_COMMIT_SHA_LENGTH, MAX_SUBMISSION_CODE_LENGTH } from './create-submission.dto';

export class BattleRunDto {
  @IsUUID()
  @IsNotEmpty()
  activityId!: string;

  @IsUUID()
  @IsNotEmpty()
  companionId!: string;

  // Mesmo teto da submissão clássica: o código vai ao sandbox e é persistido
  // como codeSnapshot da submissão da batalha.
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_SUBMISSION_CODE_LENGTH)
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
  @MaxLength(MAX_COMMIT_SHA_LENGTH)
  commitSha?: string;

  // currentBossHp/currentHeroHp foram REMOVIDOS: valores vindos do cliente
  // eram forjáveis (aluno podia forjar vitória e farmar XP/bits). O HP do boss
  // agora é derivado no servidor a partir das submissões reais do usuário.
}
