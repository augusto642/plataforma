import {
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RequestContextService } from '../context/request-context.service';
import {
  ErrorCodes,
  withErrorCode,
} from '../errors/error-codes';
import { GlobalHttpExceptionFilter } from './http-exception.filter';
import { PrismaExceptionFilter } from './prisma-exception.filter';

/**
 * M9 (Lote 4) — filtro global de exceções.
 * O contrato: TODA resposta de erro tem `{ statusCode, errorCode, message,
 * correlationId, timestamp, path }`; `message` é preservada; em produção
 * erro genérico nunca vaza detalhe interno.
 */
describe('GlobalHttpExceptionFilter', () => {
  const contextStub = {
    getCorrelationId: () => 'test-correlation-id',
  } as unknown as RequestContextService;

  let filter: GlobalHttpExceptionFilter;
  let statusCode: number;
  let body: Record<string, unknown>;
  let host: any;

  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    filter = new GlobalHttpExceptionFilter(
      contextStub,
      new PrismaExceptionFilter(contextStub),
    );
    statusCode = 0;
    body = {};
    const res: any = {
      status: jest.fn((code: number) => {
        statusCode = code;
        return res;
      }),
      json: jest.fn((payload: Record<string, unknown>) => {
        body = payload;
        return res;
      }),
    };
    const req: any = { method: 'POST', url: '/auth/login' };
    host = { switchToHttp: () => ({ getResponse: () => res, getRequest: () => req }) };
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('preserva o errorCode explícito da exceção de domínio e a mensagem', () => {
    filter.catch(
      new UnauthorizedException(
        withErrorCode('Invalid credentials', ErrorCodes.AUTH_INVALID_CREDENTIALS),
      ),
      host,
    );
    expect(statusCode).toBe(401);
    expect(body).toMatchObject({
      statusCode: 401,
      errorCode: 'AUTH_INVALID_CREDENTIALS',
      message: 'Invalid credentials',
      correlationId: 'test-correlation-id',
      path: '/auth/login',
    });
    expect(typeof body.timestamp).toBe('string');
  });

  it('atribui o errorCode default por status quando a exceção não tem código', () => {
    filter.catch(new NotFoundException('Submission not found'), host);
    expect(statusCode).toBe(404);
    expect(body).toMatchObject({
      statusCode: 404,
      errorCode: 'NOT_FOUND',
      message: 'Submission not found',
    });
  });

  it('mapeia erro de validação (mensagem em array) para VALIDATION_ERROR e preserva o array', () => {
    const messages = ['message must be a string', 'message should not be empty'];
    filter.catch(
      new BadRequestException({ message: messages, error: 'Bad Request', statusCode: 400 }),
      host,
    );
    expect(statusCode).toBe(400);
    expect(body).toMatchObject({
      statusCode: 400,
      errorCode: 'VALIDATION_ERROR',
      message: messages,
    });
  });

  it('delega erro do Prisma ao PrismaExceptionFilter (mesmo formato, com errorCode)', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '7.9.1' },
    );
    filter.catch(prismaError, host);
    expect(statusCode).toBe(409);
    expect(body).toMatchObject({
      statusCode: 409,
      errorCode: 'DATABASE_CONFLICT',
      error: 'Conflict',
    });
    expect(typeof body.message).toBe('string');
  });

  it('erro genérico em produção vira 500 genérico, sem vazar detalhe interno', () => {
    process.env.NODE_ENV = 'production';
    filter.catch(new Error('segredo interno: DATABASE_URL=postgres://...'), host);
    expect(statusCode).toBe(500);
    expect(body).toMatchObject({
      statusCode: 500,
      errorCode: 'INTERNAL_ERROR',
      message: 'Erro interno do servidor.',
    });
    expect(JSON.stringify(body)).not.toContain('segredo interno');
    expect(JSON.stringify(body)).not.toContain('DATABASE_URL');
  });

  it('erro genérico fora de produção devolve a mensagem original (sem stack no corpo)', () => {
    process.env.NODE_ENV = 'test';
    filter.catch(new Error('falha no worker de teste'), host);
    expect(statusCode).toBe(500);
    expect(body).toMatchObject({
      statusCode: 500,
      errorCode: 'INTERNAL_ERROR',
      message: 'falha no worker de teste',
    });
    expect(body).not.toHaveProperty('stack');
  });

  it('HttpException genérica sem corpo estruturado ganha código default por status', () => {
    filter.catch(
      new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS),
      host,
    );
    expect(statusCode).toBe(429);
    expect(body).toMatchObject({
      statusCode: 429,
      errorCode: 'TOO_MANY_REQUESTS',
      message: 'Too Many Requests',
    });
  });
});
