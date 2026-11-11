import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// M14 (Lote 4) — teto de tamanho: `code` alimenta análise de LLM; sem
// limite, um payload gigante vira custo e DoS. 100.000 caracteres é
// generoso para um arquivo de exercício.
export class ComplexityAnalysisDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  activityId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100000)
  code!: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  language?: string;
}
