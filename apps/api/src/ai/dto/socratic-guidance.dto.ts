import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class SocraticGuidanceDto {
  @IsString()
  @IsOptional()
  challengeId?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsNotEmpty()
  question!: string;

  @IsString()
  @IsOptional()
  starterName?: string;
}
