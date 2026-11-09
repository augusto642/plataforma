import { IsEmail, IsString, Matches, MaxLength } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'O código deve ter 6 dígitos.' })
  code!: string;
}
