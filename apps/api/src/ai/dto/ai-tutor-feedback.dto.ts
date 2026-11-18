import { IsBoolean, IsIn, IsUUID, ValidateIf } from 'class-validator';

export const AI_TUTOR_FEEDBACK_CONCERNS = [
  'too_much_answer',
  'incorrect',
  'unclear',
] as const;

export class AiTutorFeedbackDto {
  @IsUUID()
  responseId!: string;

  @IsUUID()
  activityId!: string;

  @IsBoolean()
  helpful!: boolean;

  @ValidateIf((dto: AiTutorFeedbackDto) => !dto.helpful)
  @IsIn(AI_TUTOR_FEEDBACK_CONCERNS)
  concern?: (typeof AI_TUTOR_FEEDBACK_CONCERNS)[number];
}
