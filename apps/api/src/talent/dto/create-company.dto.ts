import { IsString, Length } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @Length(2, 80)
  name!: string;
}
