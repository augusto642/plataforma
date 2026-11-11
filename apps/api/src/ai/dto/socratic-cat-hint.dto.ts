import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

// M14 (Lote 4) — tetos de tamanho: `code` e `errorMessage` alimentam o
// LLM de dicas; sem limite, viram custo e DoS.
export class SocraticCatHintDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  challengeId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  activityTitle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100000)
  code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20000)
  errorMessage?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  starterName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  language?: 'python' | 'javascript' | 'java';

  @IsInt()
  @Min(1)
  @Max(3)
  @IsOptional()
  hintLevel?: 1 | 2 | 3; // 1: Pista conceitual sutil, 2: Localização do raciocínio, 3: Analogia direta
}
