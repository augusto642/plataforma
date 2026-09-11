import { IsEmail, IsString, IsIn, IsOptional, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsIn(['student', 'instructor', 'admin'])
  role?: 'student' | 'instructor' | 'admin';

  @IsOptional()
  giteaUserId?: number;
}