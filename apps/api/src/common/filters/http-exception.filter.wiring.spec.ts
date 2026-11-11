import 'reflect-metadata';
import { Controller, Get, INestApplication, UnauthorizedException } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CommonModule } from '../common.module';
import { GlobalHttpExceptionFilter } from '../filters/http-exception.filter';
import { PrismaExceptionFilter } from '../filters/prisma-exception.filter';
import { ErrorCodes, withErrorCode } from '../errors/error-codes';

/**
 * M9 (Lote 4) — prova de wiring: os dois APP_FILTERs resolvem suas
 * dependências por DI (o filtro global injeta o PrismaExceptionFilter) e
 * uma HttpException com errorCode sai com o corpo padronizado num app
 * Nest real — não só na chamada direta ao `catch()`.
 */
@Controller('probe')
class ProbeController {
  @Get('domain-error')
  domainError() {
    throw new UnauthorizedException(
      withErrorCode('Invalid credentials', ErrorCodes.AUTH_INVALID_CREDENTIALS),
    );
  }

  @Get('plain-error')
  plainError() {
    throw new UnauthorizedException('Sem código explícito');
  }
}

describe('GlobalHttpExceptionFilter — wiring no app Nest', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CommonModule],
      controllers: [ProbeController],
      providers: [
        { provide: APP_FILTER, useClass: GlobalHttpExceptionFilter },
        { provide: APP_FILTER, useClass: PrismaExceptionFilter },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('erro de domínio sai com errorCode e message preservada', async () => {
    const res = await request(app.getHttpServer()).get('/probe/domain-error');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      statusCode: 401,
      errorCode: 'AUTH_INVALID_CREDENTIALS',
      message: 'Invalid credentials',
    });
    expect(typeof res.body.correlationId).toBe('string');
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('erro sem código explícito ganha o código default por status', async () => {
    const res = await request(app.getHttpServer()).get('/probe/plain-error');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      statusCode: 401,
      errorCode: 'UNAUTHORIZED',
      message: 'Sem código explícito',
    });
  });
});
