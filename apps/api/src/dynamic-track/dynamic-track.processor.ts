/**
 * Worker da fila `track-investigation` (DESIGN D3).
 * Concorrência 1 (uma investigação por vez, mesmo padrão da fila
 * `track-generation`). O trabalho pesado vive no DynamicTrackService:
 * aqui só orquestramos retry × falha terminal.
 *
 * - Erro transitório (ex.: banco fora): o job falha e o BullMQ tenta
 *   de novo (attempts 3, backoff exponencial, como `track-generation`).
 * - Última tentativa esgotada: a investigação vira `failed` com motivo
 *   honesto e o job NÃO é re-enfileirado — o aluno tenta de novo pelo
 *   botão (rate-limit 1/24h) ou o admin re-enfileira.
 * - Pesquisa indisponível e e-mail falho NÃO chegam aqui como erro:
 *   o service os trata fail-closed (profile-only / pending-smtp).
 */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import {
  DynamicTrackService,
  TRACK_INVESTIGATION_JOB_NAME,
  TRACK_INVESTIGATION_MAX_ATTEMPTS,
  TRACK_INVESTIGATION_QUEUE,
} from './dynamic-track.service';

export interface TrackInvestigationJobData {
  userId: string;
}

@Processor(TRACK_INVESTIGATION_QUEUE, { concurrency: 1 })
export class DynamicTrackProcessor extends WorkerHost {
  constructor(private readonly dynamicTrack: DynamicTrackService) {
    super();
  }

  async process(
    job: Job<TrackInvestigationJobData>,
  ): Promise<{ ok: boolean; action: string; track?: string }> {
    if (job.name !== TRACK_INVESTIGATION_JOB_NAME) {
      throw new Error(
        `job desconhecido na fila ${TRACK_INVESTIGATION_QUEUE}: ${job.name}`,
      );
    }
    const { userId } = job.data;
    try {
      const result = await this.dynamicTrack.runInvestigation(userId);
      return { ok: true, action: result.action, track: result.track };
    } catch (err) {
      const attemptsMade = job.attemptsMade ?? 0;
      if (attemptsMade >= TRACK_INVESTIGATION_MAX_ATTEMPTS - 1) {
        // Última tentativa: falha terminal honesta, sem rethrow
        // (rethrow aqui geraria uma 4ª tentativa fantasma fora do
        // attempts configurado — o BullMQ marcaria o job como falho
        // mas a investigação ficaria `investigating` para sempre).
        const reason = (err as Error).message || 'erro desconhecido na investigação';
        await this.dynamicTrack.markFailed(userId, reason);
        return { ok: false, action: 'failed' };
      }
      throw err;
    }
  }
}
