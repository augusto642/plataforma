import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

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
}
