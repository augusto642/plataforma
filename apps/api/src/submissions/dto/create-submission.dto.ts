import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateSubmissionDto {
  @IsUUID()
  @IsNotEmpty()
  activityId!: string;

  // M14 (Lote 4) — teto de tamanho: o código vai para o Piston; 100.000
  // caracteres é generoso para um exercício e fica bem abaixo do limite
  // de 1 MB do body parser.
  @IsString()
  @IsOptional()
  @MaxLength(100000)
  code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  commitSha?: string;
}
