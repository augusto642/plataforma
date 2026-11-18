import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UseTowerItemDto {
  @IsString()
  itemCode!: string;

  @IsOptional()
  @IsUUID()
  targetUserId?: string;
}
