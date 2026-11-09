import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import type {
  ThrottlerGenerateKeyFunction,
  ThrottlerGetTrackerFunction,
  ThrottlerModuleOptions,
} from '@nestjs/throttler';

export const GLOBAL_THROTTLER_NAME = 'global';

/**
 * M6 (Lote 4) — números do throttle (ver também .env.example).
 *
 * - `default`: 100 req/min POR USUÁRIO AUTENTICADO e por rota (a chave
 *   default do guard inclui classe+handler). Antes era 100/min por IP —
 *   30 alunos atrás do NAT da escola compartilhavam a cota. Anônimos
 *   continuam por IP. Tetos por rota (@Throttle nos controllers: login
 *   5, register 10, chat IA 30, battle-run 20, submissão 15/min)
 *   continuam valendo por cima deste, por usuário quando autenticado.
 * - `global`: 1.000 req/min POR IP em TODAS as rotas somadas — rede de
 *   segurança só contra abuso massivo. Uso normal de uma turma inteira
 *   fica muito abaixo disso.
 */

// Rede de segurança contra abuso massivo: sempre por IP, mesmo quando
// há usuário autenticado — um atacante com muitas contas não ganha uma
// cota global por conta.
export const globalThrottleGetTracker: ThrottlerGetTrackerFunction = (req) => {
  const ip =
    typeof req?.ip === 'string' && req.ip.length > 0 ? req.ip : 'unknown';
  return `ip:${ip}`;
};

// Chave do teto global: só o IP entra — a rota NÃO entra (diferente da
// chave default, que inclui classe+handler e por isso é por-rota).
export const globalThrottleGenerateKey: ThrottlerGenerateKeyFunction = (
  _context,
  tracker,
) =>
  createHash('sha256')
    .update(`nexus-global-throttle-${tracker}`)
    .digest('hex');

export function buildThrottlerOptions(
  config: ConfigService,
): ThrottlerModuleOptions {
  return {
    throttlers: [
      {
        name: 'default',
        ttl: Number(config.get('THROTTLE_TTL_MS', 60_000)),
        limit: Number(config.get('THROTTLE_LIMIT', 100)),
      },
      {
        name: GLOBAL_THROTTLER_NAME,
        ttl: Number(config.get('THROTTLE_GLOBAL_TTL_MS', 60_000)),
        limit: Number(config.get('THROTTLE_GLOBAL_LIMIT', 1000)),
        getTracker: globalThrottleGetTracker,
        generateKey: globalThrottleGenerateKey,
      },
    ],
  };
}
