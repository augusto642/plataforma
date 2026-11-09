import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Prisma } from '@prisma/client';
import { RequestContextService } from '../context/request-context.service';
import { PrismaExceptionFilter } from './prisma-exception.filter';
import {
  ErrorCodes,
  defaultErrorCodeForStatus,
} from '../errors/error-codes';

/**
 * M9 (Lote 4) — filtro GLOBAL de exceções (APP_FILTER).
 *
 * Antes só existia o `PrismaExceptionFilter` como APP_FILTER: qualquer
 * `HttpException` caía no handler default do Nest (corpo sem `errorCode`,
 * sem `correlationId`, e erro genérico com a mensagem interna). Agora TODA
 * resposta de erro da API tem o mesmo formato:
 *   `{ statusCode, errorCode, message, correlationId, timestamp, path }`
 * - `message` é preservada exatamente como lançada (o front a exibe); em
 *   validação ela pode ser um array de strings (contrato do ValidationPipe).
 * - `errorCode` vem da exceção quando ela carrega um (ver
 *   `common/errors/error-codes.ts` + `withErrorCode` nos serviços de
 *   domínio); senão, é o default por status HTTP.
 * - Erro genérico (não-HttpException) vira 500 com mensagem genérica em
 *   pt-BR. Em produção NUNCA vaza detalhe interno nem stack (o detalhe vai
 *   só para o log do servidor); fora de produção a mensagem original é
 *   devolvida para facilitar o debug local (ainda sem stack no corpo).
 * - Erros do Prisma NÃO são tratados aqui: são delegados ao
 *   `PrismaExceptionFilter` (que já mapeia P2002/P2025/...), para que a
 *   ordem de registro dos dois APP_FILTERs não importe.
 */
@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  constructor(
    private readonly contextService: RequestContextService,
    private readonly prismaFilter: PrismaExceptionFilter,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = this.contextService.getCorrelationId();

    // Prisma: delega ao filtro especializado (mesmo corpo padronizado,
    // com errorCode — ver prisma-exception.filter.ts).
    if (
      exception instanceof Prisma.PrismaClientKnownRequestError ||
      exception instanceof Prisma.PrismaClientValidationError
    ) {
      this.prismaFilter.catch(exception, host);
      return;
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Erro interno do servidor.';
    let errorCode: string = ErrorCodes.INTERNAL_ERROR;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
        errorCode = defaultErrorCodeForStatus(status, res);
      } else if (res && typeof res === 'object') {
        const body = res as Record<string, unknown>;
        if (typeof body.message === 'string' || Array.isArray(body.message)) {
          message = body.message as string | string[];
        }
        errorCode =
          typeof body.errorCode === 'string'
            ? body.errorCode
            : defaultErrorCodeForStatus(status, body.message);
      }
    } else if (exception instanceof Error) {
      // Fora de produção, devolver a mensagem original ajuda o debug local;
      // em produção, mensagem genérica (sem vazar detalhe interno).
      if (process.env.NODE_ENV !== 'production') {
        message = exception.message || message;
      }
      errorCode = ErrorCodes.INTERNAL_ERROR;
    }

    if (status >= 500) {
      const detail =
        exception instanceof Error
          ? exception.stack || exception.message
          : String(exception);
      this.logger.error(
        `[${correlationId}] ${errorCode} em ${request.method} ${request.url}: ${detail}`,
      );
    } else {
      this.logger.warn(
        `[${correlationId}] ${errorCode} em ${request.method} ${request.url}: ${JSON.stringify(message)}`,
      );
    }

    response.status(status).json({
      statusCode: status,
      errorCode,
      message,
      correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
