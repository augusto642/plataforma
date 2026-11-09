import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * M6 (Lote 4) — throttle por usuário autenticado, não por IP.
 *
 * Antes: o `ThrottlerGuard` padrão usa `req.ip` como chave — 30 alunos
 * atrás do NAT da escola compartilhavam a mesma cota de 100 req/min por
 * rota e se estrangulavam. Agora a chave é `user:<sub>` quando há JWT
 * válido, e só cai para `ip:<ip>` quando a requisição é anônima (login,
 * registro, etc.).
 *
 * ORDEM DOS GUARDS (app.module.ts): este guard PRECISA rodar depois do
 * `JwtAuthGuard` global — é ele quem popula `req.user` a partir do
 * cookie httpOnly. Se a ordem inverter, `req.user` estará vazio aqui e
 * todo mundo volta a cair na cota por IP, silenciosamente. Há um teste
 * de regressão para a ordem em `user-throttler.guard.spec.ts`.
 *
 * Efeito colateral conhecido: com o JWT antes do throttle, uma
 * requisição a rota protegida com token inválido/ausente recebe 401
 * ANTES de consumir cota. É o comportamento desejado — o custo de um
 * 401 é desprezível — e as rotas sensíveis a força bruta (login 5/min,
 * register 10/min, resend-code 5/min, refresh 20/min) são @Public() e
 * continuam limitadas por IP.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(
    req: Record<string, any>,
  ): Promise<string> {
    const userId = req?.user?.sub;
    if (typeof userId === 'string' && userId.length > 0) {
      return `user:${userId}`;
    }
    const ip =
      typeof req?.ip === 'string' && req.ip.length > 0 ? req.ip : 'unknown';
    return `ip:${ip}`;
  }
}
