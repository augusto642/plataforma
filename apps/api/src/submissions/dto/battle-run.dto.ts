import { Language } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { MAX_SUBMISSION_CODE_LENGTH } from './create-submission.dto';

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

  // currentBossHp/currentHeroHp foram REMOVIDOS: valores vindos do cliente
  // eram forjáveis (aluno podia forjar vitória e farmar XP/bits). O HP do boss
  // agora é derivado no servidor a partir das submissões reais do usuário.
}
