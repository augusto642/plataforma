import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EvaluatorService } from './evaluator/evaluator.service';

export interface SubmissionJobData {
  submissionId: string;
}

@Processor('submissions', {
  limiter: {
    max: 10,
    duration: 1000,
  },
})
export class SubmissionProcessor extends WorkerHost {
  private readonly logger = new Logger(SubmissionProcessor.name);

  constructor(private readonly evaluator: EvaluatorService) {
    super();
  }

  async process(job: Job<SubmissionJobData, any, string>): Promise<any> {
    this.logger.log(`Processing submission job ${job.id} for submission ${job.data.submissionId}`);
    try {
      await this.evaluator.processSubmission(job.data.submissionId);
      return { completed: true };
    } catch (err: any) {
      this.logger.error(`Job ${job.id} failed: ${err.message}`);
      throw err;
    }
  }
}
