import { IsEmail, IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

/** Fase 4 premium (desenho §5.2) — DTOs do enabler B2B (sem venda, sem SLA). */

export class CreateOrganizationDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsInt()
  @Min(0)
  seats!: number;

  @IsOptional()
  @IsString()
  companyId?: string;
}

export class AddOrgMemberDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsIn(['admin', 'member'])
  role?: 'admin' | 'member';
}
