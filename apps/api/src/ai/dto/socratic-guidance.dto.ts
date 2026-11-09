import { IsOptional, IsString, IsNotEmpty, MaxLength } from 'class-validator';

// M14 (Lote 4) — tetos de tamanho: `question` e `code` alimentam o LLM
// de orientação socrática; sem limite, viram custo e DoS.
export class SocraticGuidanceDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  challengeId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100000)
  code?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  question!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  starterName?: string;
}
