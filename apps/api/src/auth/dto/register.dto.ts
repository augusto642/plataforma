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
}
