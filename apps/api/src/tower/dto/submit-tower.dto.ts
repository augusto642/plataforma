import { IsNotEmpty, IsString } from 'class-validator';

/** Código-fonte da tentativa no desafio pendente da torre. */
export class SubmitTowerDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}
