/**
 * M7 (Lote 4) — circuit breaker mínimo para o Piston.
 *
 * Sem ele, cada submissão de uma turma de 30 alunos batia num Piston
 * fora do ar e esperava o timeout cheio (30 s) — N vezes seguidas, sem
 * aprender com as falhas. Com o breaker, após N falhas consecutivas de
 * transporte o circuito abre por T segundos e as chamadas falham rápido
 * (sem nem chamar o Piston), com erro explícito; decorrido T, uma única
 * chamada de teste (half-open) decide se o circuito fecha ou reabre.
 *
 * O que conta como falha: erro de transporte (fetch lança, incl. abort
 * por timeout) ou HTTP 5xx do Piston. HTTP 4xx NÃO conta — o Piston
 * respondeu, está no ar (ex.: runtime não encontrado vira `unsupported`,
 * não indisponibilidade). Qualquer resposta não-5xx zera o contador.
 *
 * Estados:
 * - closed: chamadas passam; N falhas consecutivas -> open.
 * - open: `allowRequest()` recusa tudo até `openedAt + openMs`.
 * - half-open: decorrido o cooldown, UMA chamada de teste passa
 *   (`trialInFlight` barra as demais enquanto ela voa); sucesso fecha
 *   o circuito, falha reabre por mais `openMs`.
 *
 * Em-processo, como o semáforo de concorrência (A3): com 2+ réplicas
 * da API, cada processo tem seu próprio breaker. Estado exposto via
 * `state`/`failureCount` para testes e monitoramento.
 */
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export class PistonCircuitBreaker {
  private consecutiveFailures = 0;
  private openedAt: number | null = null;
  private trialInFlight = false;

  constructor(
    private readonly failureThreshold: number,
    private readonly openMs: number,
  ) {}

  get state(): CircuitBreakerState {
    return this.stateAt(Date.now());
  }

  stateAt(now: number): CircuitBreakerState {
    if (this.openedAt === null) return 'closed';
    return now >= this.openedAt + this.openMs ? 'half-open' : 'open';
  }

  get failureCount(): number {
    return this.consecutiveFailures;
  }

  /**
   * Decide se a chamada pode prosseguir. Em half-open, só a chamada de
   * teste passa; as demais falham rápido enquanto ela voa.
   */
  allowRequest(now: number = Date.now()): boolean {
    if (this.openedAt === null) return true;
    if (now < this.openedAt + this.openMs) return false;
    if (this.trialInFlight) return false;
    this.trialInFlight = true;
    return true;
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.openedAt = null;
    this.trialInFlight = false;
  }

  recordFailure(now: number = Date.now()): void {
    this.trialInFlight = false;
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.openedAt = now;
    }
  }
}
