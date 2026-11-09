import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * A6 — Pool de conexões Prisma (`@prisma/adapter-pg` / `pg.Pool`).
 *
 * MEDIÇÃO (estática, por leitura de código — não há banco ao vivo neste
 * ambiente para medir `pg_stat_activity`; declarado, não estimado):
 * - Processo ÚNICO: API HTTP + worker BullMQ + housekeeping compartilham
 *   ESTE `PrismaService` (um só `PrismaClient` no `AppModule`), então há
 *   UM pool por réplica da API — não um pool por módulo.
 * - Clientes concorrentes máximos por réplica:
 *   1. `AdminService.getMetrics`: `Promise.all` de 13 `count`s
 *      (`admin.service.ts:222-234`) — até 13 conexões TRANSIENTES;
 *   2. Worker de submissões: `concurrency: 4` (A3) — cada job faz queries
 *      sequenciais, ~1 conexão por job = 4;
 *   3. Requisições HTTP concorrentes: ~1 conexão por query em voo;
 *   4. Housekeeping periódico: 1 conexão (queries sequenciais, uma por
 *      vez — `housekeeping.service.ts` aguarda cada `deleteMany`/`updateMany`
 *      antes da próxima; roda a cada 15 min + 30 s pós-boot).
 *   Pico no pior caso (sobreposição total): 13 (métricas) + 4 (worker) +
 *   ~3 (HTTP em voo) + 1 (housekeeping) = ~21. Por isso
 *   `connection_limit=21`.
 * - `connection_limit` maior que 21 arriscaria o `max_connections=100`
 *   default do Postgres quando somado ao pool do Gitea, a migrations e a
 *   eventuais réplicas da API; menor que 21 faria o `Promise.all` de 13
 *   counts + worker + housekeeping estourar o teto e enfileirar até o
 *   `pool_timeout` (D1, follow-up Lote 2: a soma anterior, ~20, excluía o
 *   housekeeping da conta embora o listasse como consumidor).
 * - `pool_timeout=10` (s): espera máxima por uma conexão livre antes de
 *   erro — maior que a latência p95 das queries do piloto (< 100 ms),
 *   curto o bastante para falhar rápido em vez de enfileirar para sempre.
 * - `statement_timeout=30 s`: trava por query (1 query lenta não segura
 *   uma conexão do pool indefinidamente). Também fixado no servidor no
 *   `docker-compose.yml` (`postgres -c statement_timeout=30000`).
 *
 * COMO É APLICADO: com `adapter-pg` (Prisma 7, driver adapter), os
 * parâmetros `connection_limit`/`pool_timeout` na `DATABASE_URL` NÃO são
 * lidos pelo driver — o pool efetivo é o `pg.Pool` abaixo. A `DATABASE_URL`
 * continua carregando os valores (fonte única de verdade, mesmos nomes do
 * Prisma clássico) e este construtor os lê da URL (com override por env
 * `PG_POOL_MAX` / `PG_POOL_TIMEOUT_MS` / `PG_STATEMENT_TIMEOUT_MS`).
 * Troque os valores na URL (`.env.example` / compose) e o pool acompanha.
 */
const DEFAULT_CONNECTION_LIMIT = 21;
const DEFAULT_POOL_TIMEOUT_MS = 10_000;
const DEFAULT_STATEMENT_TIMEOUT_MS = 30_000;
const DEFAULT_IDLE_TIMEOUT_MS = 30_000;

function readInt(
  raw: string | undefined | null,
  fallback: number,
): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const databaseUrl = process.env.DATABASE_URL ?? '';
    let urlParams: URLSearchParams | undefined;
    try {
      urlParams = new URL(databaseUrl).searchParams;
    } catch {
      urlParams = undefined;
    }
    // pool_timeout na URL está em SEGUNDOS (convenção Prisma); em ms no pg.
    const max = readInt(
      process.env.PG_POOL_MAX ?? urlParams?.get('connection_limit'),
      DEFAULT_CONNECTION_LIMIT,
    );
    const connectionTimeoutMillis =
      readInt(
        process.env.PG_POOL_TIMEOUT_MS,
        readInt(urlParams?.get('pool_timeout'), 10) * 1000,
      ) || DEFAULT_POOL_TIMEOUT_MS;
    const statementTimeout = readInt(
      process.env.PG_STATEMENT_TIMEOUT_MS,
      DEFAULT_STATEMENT_TIMEOUT_MS,
    );
    super({
      adapter: new PrismaPg({
        connectionString: databaseUrl,
        max,
        connectionTimeoutMillis,
        statement_timeout: statementTimeout,
        idleTimeoutMillis: DEFAULT_IDLE_TIMEOUT_MS,
      }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
