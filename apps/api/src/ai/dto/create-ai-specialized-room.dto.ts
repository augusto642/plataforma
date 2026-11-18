import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAiSpecializedRoomDto {
  @IsUUID()
  activityId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(80)
  slug!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(8000)
  systemInstructions!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  model!: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
