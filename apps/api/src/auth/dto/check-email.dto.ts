import { IsEmail, MaxLength } from 'class-validator';

export class CheckEmailDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;
}
