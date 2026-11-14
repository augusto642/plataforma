import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';
import { CAREER_GOALS } from '../../dynamic-track/dynamic-track.rules';

// Auto-registro só permite o papel de estudante. 'instructor' e 'admin' NUNCA
// podem ser escolhidos publicamente (prevenção de escalada de privilégio).
export const SELF_SERVICE_ROLES: Role[] = [Role.student];

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsIn(SELF_SERVICE_ROLES)
  role?: Role;

  // Origem de aquisição (B07): o front captura os UTMs da URL/sessão e os
  // envia no cadastro para sabermos de qual canal cada aluno veio. São
  // dados internos de atribuição — nunca entram em respostas públicas.
  @IsOptional()
  @IsString()
  @MaxLength(255)
  utmSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  utmMedium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  utmCampaign?: string;

  // Quiz diagnóstico (B09): quem fez o quiz anônimo antes de se cadastrar
  // envia o sessionToken; o AuthService vincula o DiagnosticResult daquela
  // sessão à conta recém-criada (se existir e ainda estiver sem dono).
  @IsOptional()
  @IsString()
  @MaxLength(64)
  diagnosticSessionToken?: string;

  // Porta fria (Sprint 8): as escolhas das etapas 2–3 do /register
  // (trilha, nível, tempo, objetivo) eram coletadas e DESCARTADAS —
  // fricção morta apontada pelo Growth. Agora viajam no payload:
  // o nível declarado persiste como careerTier da conta (o enum do
  // modelo fala a mesma língua); trilha/tempo/objetivo não têm coluna
  // no User e seguem aceitos aqui (não quebram o ValidationPipe) e
  // analisáveis nas props dos eventos signup_* do funil.
  //
  // Trilha dinâmica v1 (Central 209 — DESIGN §2 item 5): `preferredTrack`
  // é DEPRECIADO — segue aceito (não quebrar clientes antigos) mas é
  // IGNORADO para atribuição: o aluno NÃO escolhe a trilha; a IA sugere.
  // A API NUNCA persiste trilha escolhida. O hint da landing (?track=)
  // viaja em `sourceTrack` e entra no snapshot da investigação como
  // interesse declarado, não como escolha.
  /**
   * @deprecated Trilha dinâmica v1: ignorado para atribuição. Use
   * `sourceTrack` (hint da landing) — a trilha é sugerida, não escolhida.
   */
  @IsOptional()
  @IsIn(['web3', 'backend', 'frontend', 'ai'])
  preferredTrack?: string;

  // Trilha dinâmica v1: hint da landing (?track=) — interesse declarado
  // do aluno ao clicar numa trilha na landing. NÃO é escolha: entra no
  // snapshot da TrackInvestigation e pesa na sugestão (precedência
  // abaixo do diagnóstico, acima do objetivo — ver dynamic-track.rules).
  @IsOptional()
  @IsIn(['web3', 'backend', 'frontend', 'ai'])
  sourceTrack?: string;

  @IsOptional()
  @IsIn(['beginner', 'junior', 'mid', 'senior'])
  experienceLevel?: string;

  @IsOptional()
  @IsIn(['5h', '10h', '20h'])
  weeklyTimeCommitment?: string;

  @IsOptional()
  @IsIn(CAREER_GOALS)
  careerGoal?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(25)
  @IsIn(CAREER_GOALS, { each: true })
  careerGoals?: string[];

  @IsOptional()
  @IsBoolean()
  hasProgrammedBefore?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  priorLanguage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  challengeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  challengeExplanation?: string;

  @IsOptional()
  @IsIn(['beginner', 'junior', 'mid', 'senior'])
  detectedLevel?: 'beginner' | 'junior' | 'mid' | 'senior';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  primaryTechnology?: string;
}
