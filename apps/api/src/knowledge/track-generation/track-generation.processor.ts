/**
 * Worker da fila `track-generation` (DESIGN §4.5 / delta §I2.2 — H2).
 * Concorrência 1 (um segmento por vez: bound de gasto LLM, §I9.2).
 * Encadeamento: o job REUSA a fila `research` para a coleta fresca
 * (enfileira a coleta lá e aguarda o documento por polling, sem bloquear
 * o worker de research com sleep longo — o polling é curto e com timeout;
 * sem fila research injetada, coleta direta pelo mesmo ResearchService,
 * que é o código que o worker da fila research executa).
 * Falha de validação ⇒ job falha, segmento continua `planned`, NADA é
 * publicado (o draft só é escrito após passar no piso + gates).
 * Retry: até 3 tentativas com backoff (BullMQ attempts); após isso, o
 * segmento fica `planned` + erro registrado no job (nunca some em silêncio).
 */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { TrackGenerationService, type SegmentJobData } from './track-generation.service';

@Processor('track-generation', { concurrency: 1 })
export class TrackGenerationProcessor extends WorkerHost {
  constructor(private readonly trackGeneration: TrackGenerationService) {
    super();
  }

  async process(job: Job<SegmentJobData>): Promise<{ ok: boolean; stageSlug: string; activities: number; marketAligned: boolean }> {
    const data = job.data;
    if (job.name !== 'generate-segment') throw new Error(`job desconhecido na fila track-generation: ${job.name}`);
    // 1. Pesquisa fresca do segmento (vagas sempre novas, §I2.3), via fila
    // research. Se a coleta falhar, o job falha e o segmento fica planned —
    // nunca gera com pesquisa velha fingida de fresca.
    const research = await this.trackGeneration.collectFreshResearch(data.goal);
    // 2. Draft determinístico + gates (piso; tópicos do estágio são o
    // roadmap da etapa — sem eles, buildSegmentDraft falha explícito).
    const { segment, report } = this.trackGeneration.buildSegmentDraft(data, research);
    // 3. Redação por LLM (opcional): sem LLM, o draft templateado segue
    //    válido; com LLM, a redação validada substitui descrições.
    if (this.trackGeneration.hasLlm()) {
      await this.trackGeneration.redactSegmentWithLlm(segment as never);
    }
    // 4. Só agora escreve: draft + relatório + esqueleto atualizado.
    this.trackGeneration.writeSegmentFiles(segment as Record<string, unknown>, report as Record<string, unknown>);
    return {
      ok: true,
      stageSlug: data.stageSlug,
      activities: (segment.activities as unknown[]).length,
      marketAligned: report.marketAligned as boolean,
    };
  }
}
