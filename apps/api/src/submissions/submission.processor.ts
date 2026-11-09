import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EvaluatorService } from './evaluator/evaluator.service';
import { SubmissionEventsService } from './submission-events.service';
import { BattleRunJobData, SubmissionsService } from './submissions.service';

export interface SubmissionJobData {
  submissionId: string;
}

@Processor('submissions', {
  // A3 — CONCORRÊNCIA 4: o default do BullMQ é 1 job por vez; com 1, uma
  // atividade de 5 testes x 1-3 s/job faz o 30º aluno esperar ~2,5-7,5 min.
  // 4 jobs em paralelo ~= 4x vazão no piloto (30 alunos). O número é CASADO
  // com o semáforo do Piston (`PISTON_MAX_CONCURRENT`, default 4, em
  // runner/runner.service.ts): 4 jobs x 1 execução Piston por vez cada =
  // no máximo 4 HTTPs simultâneos no Piston. Para mudar, troque os DOIS.
  // O `limiter` (10 jobs/s) continua como teto de admissão na fila.
  concurrency: 4,
  limiter: {
    max: 10,
    duration: 1000,
  },
})
export class SubmissionProcessor extends WorkerHost {
  private readonly logger = new Logger(SubmissionProcessor.name);

  constructor(
    private readonly evaluator: EvaluatorService,
    private readonly submissions: SubmissionsService,
    private readonly events: SubmissionEventsService,
  ) {
    super();
  }

  async process(
    job: Job<SubmissionJobData | BattleRunJobData, any, string>,
  ): Promise<any> {
    const submissionId = (job.data as SubmissionJobData).submissionId;
    try {
      // C7 (Lote 1): o battle-run roda no worker, não na requisição — o job
      // 'battle-run' tem jobId estável e CAS próprio em executeBattleRun.
      if (job.name === 'battle-run') {
        const data = job.data as BattleRunJobData;
        this.logger.log(
          `Processing battle-run job ${job.id} for submission ${data.submissionId}`,
        );
        try {
          return await this.submissions.executeBattleRun(data);
        } catch (err: any) {
          this.logger.error(`Battle job ${job.id} failed: ${err.message}`);
          throw err;
        }
      }

      this.logger.log(`Processing submission job ${job.id} for submission ${submissionId}`);
      try {
        await this.evaluator.processSubmission(submissionId);
        return { completed: true };
      } catch (err: any) {
        this.logger.error(`Job ${job.id} failed: ${err.message}`);
        throw err;
      }
    } finally {
      // A5 — push: acorda o SSE de quem acompanha esta submissão. O estado
      // já foi persistido (ou marcado 'error') quando chegamos aqui; o
      // controller busca o estado real no banco ao receber o sinal. O
      // `finally` cobre também a falha: o SSE re-busca e, se o status ainda
      // for não-terminal (retry do BullMQ a caminho), segue no polling.
      this.events.notify(submissionId);
    }
  }
}
