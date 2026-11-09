import { IsEmail, IsString, IsIn, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsIn(['student', 'instructor', 'admin'])
  role?: 'student' | 'instructor' | 'admin';

  @IsOptional()
  giteaUserId?: number;
}