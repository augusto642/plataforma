import { IsInt, Max, Min } from 'class-validator';

export class SubmitTowerObjectiveDto {
  @IsInt()
  @Min(0)
  @Max(3)
  choiceIndex!: number;
}
