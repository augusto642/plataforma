import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

// Auto-registro só permite o papel de estudante. 'instructor' e 'admin' NUNCA
// podem ser escolhidos publicamente (prevenção de escalada de privilégio).
export const SELF_SERVICE_ROLES: Role[] = [Role.student];

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(8)
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
  @IsOptional()
  @IsIn(['web3', 'backend', 'frontend', 'ai'])
  preferredTrack?: string;

  @IsOptional()
  @IsIn(['junior', 'mid', 'senior'])
  experienceLevel?: string;

  @IsOptional()
  @IsIn(['5h', '10h', '20h'])
  weeklyTimeCommitment?: string;

  @IsOptional()
  @IsIn(['global', 'lead', 'startup', 'hackathons'])
  careerGoal?: string;
}
