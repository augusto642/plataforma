import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

// Sprint 6 — formulário público /contato (destino do CTA Staff).
// Limites fechados no DTO: o ValidationPipe global (whitelist +
// forbidNonWhitelisted) rejeita qualquer campo fora destes três.
export class CreateContactDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message!: string;
}
