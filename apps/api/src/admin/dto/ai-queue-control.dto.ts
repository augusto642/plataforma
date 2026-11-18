import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { CONTROLLED_AI_QUEUE_NAMES } from '../../metrics/metrics.service';

export class AiQueueControlDto {
  @IsIn(CONTROLLED_AI_QUEUE_NAMES)
  queue!: (typeof CONTROLLED_AI_QUEUE_NAMES)[number];

  @IsIn(['pause', 'resume'])
  action!: 'pause' | 'resume';

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason!: string;
}
