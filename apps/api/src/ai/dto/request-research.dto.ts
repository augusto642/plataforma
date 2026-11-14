import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RequestResearchDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  goal!: string;
}
