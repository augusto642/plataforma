import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserRoleDto {
  @IsString()
  @IsNotEmpty()
  @IsIn([Role.student, Role.instructor, Role.admin])
  role!: Role;
}
