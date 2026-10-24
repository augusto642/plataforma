/**
 * Worker da fila 'research' (DESIGN §3.5): a coleta roda aqui, dentro da API,
 * porque o resultado vai para o serviço (não para o checkout em runtime).
 * Não há rota HTTP para importar nem para extrair: essas são CLIs do operador.
 */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { ResearchService } from './research.service';

@Processor('research')
export class ResearchProcessor extends WorkerHost {
  constructor(private readonly research: ResearchService) {
    super();
  }

  async process(job: Job<{ researchId: string; goal: string }>) {
    if (job.name === 'collect') {
      await this.research.collect(job.data.goal);
    }
    return { ok: true };
  }
}
