import { IsEmail, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class EnrollStudentDto {
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}
