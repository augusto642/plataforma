import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * Teto do código de uma submissão: 100 mil caracteres (~100 KB). Exercícios
 * são programas curtos — o teto fica ordens de grandeza acima de qualquer
 * solução legítima, mas impede inflar banco (codeSnapshot), fila e sandbox
 * com payloads gigantes. Defesa em profundidade com o limite de body JSON
 * de 1 MB em main.ts (que precisa acomodar código + envelope + pushes do
 * Gitea).
 */
export const MAX_SUBMISSION_CODE_LENGTH = 100_000;

/**
 * Teto do commitSha: SHA-1 tem 40 caracteres hex e SHA-256 tem 64. O teto de
 * 64 cobre os dois formatos sem folga para lixo arbitrário.
 */
export const MAX_COMMIT_SHA_LENGTH = 64;

export class CreateSubmissionDto {
  @IsUUID()
  @IsNotEmpty()
  activityId!: string;

  @IsString()
  @IsOptional()
  @MaxLength(MAX_SUBMISSION_CODE_LENGTH)
  code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(MAX_COMMIT_SHA_LENGTH)
  commitSha?: string;
}
