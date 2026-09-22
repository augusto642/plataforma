import { Language } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
} from 'class-validator';

export class BattleRunDto {
  @IsUUID()
  @IsNotEmpty()
  activityId!: string;

  @IsUUID()
  @IsNotEmpty()
  companionId!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsEnum(Language)
  @IsNotEmpty()
  language!: Language;

  // currentBossHp/currentHeroHp foram REMOVIDOS: valores vindos do cliente
  // eram forjáveis (aluno podia forjar vitória e farmar XP/bits). O HP do boss
  // agora é derivado no servidor a partir das submissões reais do usuário.
}
