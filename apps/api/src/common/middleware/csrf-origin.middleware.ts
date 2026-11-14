import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

/**
 * M15 (Lote 4) — defesa CSRF por Origin/Referer nas mutações.
 *
 * O cookie de sessão é `SameSite=lax`: isso já bloqueia o envio do cookie
 * em POSTs cross-site vindos de outro site, mas é UMA camada só — e ela
 * some quando o deploy usa `COOKIE_SAME_SITE=none` (web e API em domínios
 * diferentes em produção, caso em que o cookie passa a ser None+Secure).
 * Segunda camada: toda mutação precisa vir de uma origem conhecida.
 *
 * Regras:
 * - Só vale para mutações (POST/PUT/PATCH/DELETE). GET/SSE não mudam estado.
 * - Se `Origin` estiver presente, precisa estar na lista de origens CORS
 *   (`CORS_ORIGIN`, mesma lista do `main.ts`); senão 403 `CSRF_ORIGIN_MISMATCH`.
 * - Sem `Origin` mas com `Referer`, vale a origem do `Referer`.
 * - Sem `Origin` nem `Referer`, PERMITE: clientes não-navegador (curl,
 *   scripts, e o webhook do Gitea — que tem autenticação própria por HMAC
 *   e não envia Origin) não mandam esses headers. Um navegador SEMPRE manda
 *   `Origin` em POST (same-site ou cross-site), então um ataque CSRF vindo
 *   de navegador é barrado aqui.
 * - A origem permitida é a do WEB APP: em produção ela precisa estar no
 *   `CORS_ORIGIN` (o mesmo requisito do CORS — nada novo para o operador).
 */
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function parseAllowedOrigins(value: string | undefined): string[] {
  const raw = value ?? 'http://localhost:3001';
  return raw
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

@Injectable()
export class CsrfOriginMiddleware implements NestMiddleware {
  private readonly allowedOrigins: string[];

  constructor(config: ConfigService) {
    this.allowedOrigins = parseAllowedOrigins(
      config.get<string>('CORS_ORIGIN'),
    );
  }

  use(req: Request, res: Response, next: NextFunction): void {
    if (!MUTATING_METHODS.has(req.method)) {
      next();
      return;
    }

    const origin = req.headers.origin;
    if (typeof origin === 'string' && origin.length > 0) {
      if (!this.allowedOrigins.includes(origin.replace(/\/+$/, ''))) {
        this.reject(res);
        return;
      }
      next();
      return;
    }

    const referer = req.headers.referer;
    if (typeof referer === 'string' && referer.length > 0) {
      try {
        const refererOrigin = new URL(referer).origin;
        if (!this.allowedOrigins.includes(refererOrigin)) {
          this.reject(res);
          return;
        }
      } catch {
        // Referer malformado: se o cabeçalho foi enviado mas não é uma URL válida,
        // rejeita por segurança (fail-closed) para evitar evasão de CSRF.
        this.reject(res);
        return;
      }
    }

    next();
  }

  private reject(res: Response): void {
    res.status(HttpStatus.FORBIDDEN).json({
      statusCode: HttpStatus.FORBIDDEN,
      errorCode: 'CSRF_ORIGIN_MISMATCH',
      message: 'Origem da requisição não permitida.',
    });
  }
}
