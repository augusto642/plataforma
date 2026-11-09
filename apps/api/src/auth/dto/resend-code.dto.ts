import { IsEmail, MaxLength } from 'class-validator';

export class ResendCodeDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;
}
