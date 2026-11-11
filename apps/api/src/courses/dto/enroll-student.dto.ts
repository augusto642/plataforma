import { IsEmail, IsNotEmpty, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class EnrollStudentDto {
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(254)
  email?: string;
}
