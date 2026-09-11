import { IsNotEmpty, IsUUID } from 'class-validator';

export class LineFeedbackDto {
  @IsUUID()
  @IsNotEmpty()
  submissionId!: string;
}
