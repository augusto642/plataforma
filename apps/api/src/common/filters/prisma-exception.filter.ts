import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Prisma } from '@prisma/client';
import { RequestContextService } from '../context/request-context.service';

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  constructor(private readonly contextService: RequestContextService) {}

  catch(
    exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = this.contextService.getCorrelationId();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno no banco de dados.';
    let errorType = 'DatabaseError';
    let logDetail: unknown = undefined;

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': {
          status = HttpStatus.CONFLICT;
          errorType = 'Conflict';
          // Finding BAIXA — AppSec: NÃO ecoar o campo único (target) no corpo
          // da resposta — isso revela o schema e facilita enumeração (ex.:
          // descobrir que 'email' é único). O detalhe vai só para o log.
          logDetail = exception.meta?.target;
          message = 'Conflito de unicidade: já existe um registro com os dados informados.';
          break;
        }
        case 'P2025': {
          status = HttpStatus.NOT_FOUND;
          errorType = 'NotFound';
          message = 'Registro solicitado não foi encontrado para atualização ou exclusão.';
          break;
        }
        case 'P2003': {
          status = HttpStatus.BAD_REQUEST;
          errorType = 'ForeignKeyConstraintViolation';
          message = 'Operação viola integridade referencial com outro registro dependente.';
          break;
        }
        case 'P2024': {
          status = HttpStatus.SERVICE_UNAVAILABLE;
          errorType = 'DatabaseConnectionTimeout';
          message = 'Tempo limite de conexão com o banco de dados excedido.';
          break;
        }
        default: {
          status = HttpStatus.BAD_REQUEST;
          errorType = 'DatabaseOperationError';
          message = `Falha na operação de banco de dados (Código ${exception.code}).`;
          break;
        }
      }
    } else {
      status = HttpStatus.BAD_REQUEST;
      errorType = 'ValidationError';
      message = 'Erro de validação nos dados fornecidos para o schema do banco.';
    }

    if (status >= 500) {
      this.logger.error(
        `[${correlationId}] ${errorType} em ${request.method} ${request.url}: ${exception.message}`,
      );
    } else {
      this.logger.warn(
        `[${correlationId}] ${errorType} em ${request.method} ${request.url}: ${message}${
          logDetail !== undefined ? ` (detalhe interno: ${JSON.stringify(logDetail)})` : ''
        }`,
      );
    }

    response.status(status).json({
      statusCode: status,
      error: errorType,
      message,
      correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
