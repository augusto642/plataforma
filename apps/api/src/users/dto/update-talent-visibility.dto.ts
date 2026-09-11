import { IsBoolean } from 'class-validator';

export class UpdateTalentVisibilityDto {
  @IsBoolean()
  talentVisible!: boolean;
}
