import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Sse,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  Observable,
  expand,
  from,
  map,
  merge,
  switchMap,
  takeUntil,
  takeWhile,
  timer,
} from 'rxjs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { BattleRunDto } from './dto/battle-run.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionEventsService } from './submission-events.service';
import { SubmissionsService } from './submissions.service';

/**
 * A5 — SSE de progresso (`GET /submissions/:id/events`).
 *
 * Antes: `interval(600)` com `findProgress` a cada tick e nenhum fim para
 * submissão travada em `queued` — 30 alunos = ~50 queries/s para sempre.
 *
 * Agora, 3 camadas:
 * 1. PUSH: o worker avisa a conclusão (`SubmissionEventsService.notify`,
 *    chamado no `finally` do `SubmissionProcessor.process`); o controller
 *    re-busca o progresso na hora e emite o estado final. É o caminho
 *    rápido no deployment atual (worker + API no mesmo processo).
 * 2. POLLING COM BACKOFF (fallback): 2 s, 3 s, 4,5 s, 6,75 s... com teto
 *    de 10 s entre ticks. Cobre sinal perdido e réplica sem o evento.
 *    ~30 alunos = ~15 queries/s no pior caso, caindo para ~3/s com o
 *    backoff no teto — contra ~50/s antes.
 * 3. TIMEOUT MÁXIMO: o stream encerra sozinho após 5 min mesmo que a
 *    submissão siga em `queued` (o front reconecta se quiser continuar).
 */
const SSE_BASE_INTERVAL_MS = 2000;
const SSE_MAX_INTERVAL_MS = 10_000;
const SSE_BACKOFF_FACTOR = 1.5;
const SSE_MAX_STREAM_MS = 5 * 60 * 1000;

const TERMINAL_STATUSES = new Set(['passed', 'failed', 'error']);

function isTerminalStatus(status?: string): boolean {
  return status !== undefined && TERMINAL_STATUSES.has(status);
}

@Controller('submissions')
export class SubmissionsController {
  constructor(
    private readonly submissions: SubmissionsService,
    private readonly events: SubmissionEventsService,
  ) {}

  /**
   * C7 (Lote 1): battle-run é ASSÍNCRONO — 202 com { submissionId, status,
   * jobId }. O resultado sai por SSE (:id/events) ou GET :id/battle.
   * (Antes: 200 com o resultado do combate na própria resposta.)
   */
  @Post('battle-run')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  battleRun(
    @CurrentUser() user: JwtPayload,
    @Body() dto: BattleRunDto,
  ) {
    return this.submissions.battleRun(user.sub, dto);
  }

  @Post()
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSubmissionDto,
  ) {
    return this.submissions.create(user.sub, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('activityId') activityId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.submissions.findAll(user.sub, user.role, activityId, limit, offset);
  }

  /**
   * IMPORTANTE: este handler precisa vir ANTES de @Get(':id') — caso contrário
   * 'count' casaria como :id e cairia no ParseUUIDPipe (400) em vez de chegar
   * aqui.
   */
  @Get('count')
  countMine(@CurrentUser() user: JwtPayload) {
    return this.submissions.countMine(user.sub, user.role);
  }

  /**
   * C7: resultado do battle-run. `result` é null enquanto o job não termina
   * (o front aguarda via SSE :id/events e então busca aqui). Também precisa
   * vir antes de @Get(':id').
   */
  @Get(':id/battle')
  getBattleResult(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.submissions.getBattleResult(id, user.sub, user.role);
  }

  @Get(':id')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.submissions.findById(id, user.sub, user.role);
  }

  @Sse(':id/events')
  streamEvents(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Observable<MessageEvent> {
    const fetchProgress = () =>
      from(this.submissions.findProgress(id, user.sub, user.role));

    // Polling com backoff: 1º tick imediato, depois 2 s, 3 s, 4,5 s, 6,75 s,
    // ... até o teto de 10 s. `expand` re-agenda a cada tick com o delay
    // corrente; `switchMap` cancela um fetch em voo se o próximo tick
    // chegar antes (não acontece na prática: fetch << 2 s).
    let tick = 0;
    const poll$ = timer(0).pipe(
      expand(() => {
        const delayMs = Math.min(
          SSE_MAX_INTERVAL_MS,
          Math.round(
            SSE_BASE_INTERVAL_MS * Math.pow(SSE_BACKOFF_FACTOR, tick),
          ),
        );
        tick++;
        return timer(delayMs);
      }),
      switchMap(() => fetchProgress()),
    );

    // Push: o worker sinaliza a conclusão; re-buscamos o estado real no
    // banco (o sinal não carrega dados — nunca emite estado defasado).
    const push$ = this.events
      .eventsFor(id)
      .pipe(switchMap(() => fetchProgress()));

    return merge(poll$, push$).pipe(
      // findProgress: projeção leve (status/score/testResults resumidos) em vez
      // da submissão completa (sem codeSnapshot/logs/aiFeedback) por tick.
      map((sub) => ({ data: sub } as MessageEvent)),
      // Encerra (emitindo o estado final) quando o status é terminal.
      takeWhile((event: MessageEvent) => {
        const data = event.data as { status?: string } | undefined;
        return !isTerminalStatus(data?.status);
      }, true), // inclusive of final state
      // Trava de segurança: submissão presa em `queued` não mantém o
      // stream (e as queries) para sempre — 5 min e o stream fecha; o
      // front reconecta se quiser continuar acompanhando.
      takeUntil(timer(SSE_MAX_STREAM_MS)),
    );
  }
}
