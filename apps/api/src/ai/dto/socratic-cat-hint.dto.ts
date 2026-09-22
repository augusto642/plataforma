import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class SocraticCatHintDto {
  @IsString()
  @IsOptional()
  challengeId?: string;

  @IsString()
  @IsOptional()
  activityTitle?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  errorMessage?: string;

  @IsString()
  @IsOptional()
  starterName?: string;

  @IsString()
  @IsOptional()
  language?: 'python' | 'javascript' | 'java';

  @IsInt()
  @Min(1)
  @Max(3)
  @IsOptional()
  hintLevel?: 1 | 2 | 3; // 1: Pista conceitual sutil, 2: Localização do raciocínio, 3: Analogia direta
}
