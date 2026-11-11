import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

/**
 * A5 — push em-processo de conclusão de submissão.
 *
 * O worker (`SubmissionProcessor`) e o SSE (`SubmissionsController`) vivem
 * no MESMO processo Nest (um único `node dist/main.js` em dev e no compose
 * de produção), então um Subject em memória basta para acordar o stream no
 * instante em que o job termina — sem polling e sem infra nova.
 *
 * O push é só um "acorda e busca": o controller, ao receber o sinal, faz
 * `findProgress` no banco e emite o estado real. Se o sinal se perder
 * (reinício do processo, ou réplicas da API no futuro), o polling com
 * backoff do controller continua como fallback — o push nunca é o único
 * caminho. Follow-up documentado: com 2+ réplicas da API, trocar este
 * Subject por Redis pub-sub (`CacheService` não expõe publish hoje) ou
 * BullMQ `QueueEvents`; até lá, 1 réplica é o deployment suportado.
 *
 * Nota de escopo: os Subjects nunca são removidos do Map (uma entrada por
 * submissão acompanhada via SSE). No piloto (<= 30 alunos simultâneos) é
 * desprezível; a limpeza por expiração é follow-up, não bloqueador.
 */
@Injectable()
export class SubmissionEventsService {
  private readonly subjects = new Map<string, Subject<void>>();

  /** Acorda quem acompanha esta submissão via SSE (chamado pelo worker). */
  notify(submissionId: string): void {
    this.subjects.get(submissionId)?.next();
  }

  /** Stream de sinais de conclusão para uma submissão (usado pelo SSE). */
  eventsFor(submissionId: string): Observable<void> {
    let subject = this.subjects.get(submissionId);
    if (!subject) {
      subject = new Subject<void>();
      this.subjects.set(submissionId, subject);
    }
    return subject.asObservable();
  }
}
