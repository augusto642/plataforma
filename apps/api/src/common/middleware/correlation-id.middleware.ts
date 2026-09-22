import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { RequestContextService } from '../context/request-context.service';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(private readonly contextService: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const rawHeader = req.headers[CORRELATION_ID_HEADER] || req.headers['x-request-id'];
    const correlationId = (Array.isArray(rawHeader) ? rawHeader[0] : rawHeader) || randomUUID();

    // Propaga de volta para o cliente no response header
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    // Inicializa o contexto assíncrono para o ciclo de vida da requisição
    this.contextService.run(
      {
        correlationId,
        timestamp: Date.now(),
      },
      () => next(),
    );
  }
}
