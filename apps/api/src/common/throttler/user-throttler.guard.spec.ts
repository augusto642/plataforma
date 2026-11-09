import 'reflect-metadata';
import {
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  Injectable,
} from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  GLOBAL_THROTTLER_NAME,
  buildThrottlerOptions,
  globalThrottleGenerateKey,
  globalThrottleGetTracker,
} from './throttle.config';
import { UserThrottlerGuard } from './user-throttler.guard';

/**
 * M6 (Lote 4) — throttle por usuário autenticado, não por IP.
 *
 * Antes: `ThrottlerGuard` padrão com chave `req.ip` — 30 alunos atrás
 * do NAT da escola compartilhavam a cota de 100 req/min por rota.
 * Agora: `user:<sub>` quando há JWT, `ip:<ip>` só para anônimos, mais
 * um teto global de segurança (1.000/min por IP, todas as rotas).
 */

@Controller('ping')
class PingController {
  @Get()
  ping() {
    return { ok: true };
  }
}

/**
 * Simula o JwtAuthGuard global: popula `req.user` a partir de um header
 * de teste. Na app real é o JWT (cookie httpOnly) que preenche `req.user`
 * — o que importa aqui é a ORDEM: o guard de auth roda ANTES do
 * throttle, exatamente como registrado em app.module.ts.
 */
@Injectable()
class FakeJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const userId = req.headers['x-test-user'];
    if (typeof userId === 'string' && userId.length > 0) {
      req.user = { sub: userId };
    }
    return true;
  }
}

describe('UserThrottlerGuard — M6 throttle por usuário', () => {
  describe('getTracker', () => {
    const guard = new UserThrottlerGuard({} as any, {} as any, {} as any);

    it('usa user:<sub> quando há usuário autenticado', async () => {
      expect(
        await (guard as any).getTracker({
          ip: '10.0.0.1',
          user: { sub: 'user-1' },
        }),
      ).toBe('user:user-1');
    });

    it('cai para ip:<ip> quando anônimo', async () => {
      expect(await (guard as any).getTracker({ ip: '10.0.0.1' })).toBe(
        'ip:10.0.0.1',
      );
    });

    it('cai para ip:unknown sem IP nem usuário', async () => {
      expect(await (guard as any).getTracker({})).toBe('ip:unknown');
    });
  });

  describe('buildThrottlerOptions', () => {
    const config = (values: Record<string, number>) =>
      ({
        get: (key: string, fallback: number) => values[key] ?? fallback,
      }) as any;

    it('default 100/min por usuário + global 1.000/min por IP', () => {
      const options = buildThrottlerOptions(config({})) as any;
      expect(options.throttlers).toHaveLength(2);
      expect(options.throttlers[0]).toMatchObject({
        name: 'default',
        ttl: 60_000,
        limit: 100,
      });
      expect(options.throttlers[1]).toMatchObject({
        name: GLOBAL_THROTTLER_NAME,
        ttl: 60_000,
        limit: 1000,
      });
    });

    it('respeita THROTTLE_LIMIT / THROTTLE_GLOBAL_LIMIT do ambiente', () => {
      const options = buildThrottlerOptions(
        config({ THROTTLE_LIMIT: 50, THROTTLE_GLOBAL_LIMIT: 500 }),
      ) as any;
      expect(options.throttlers[0].limit).toBe(50);
      expect(options.throttlers[1].limit).toBe(500);
    });

    it('teto global ignora o usuário (sempre por IP)', () => {
      expect(
        globalThrottleGetTracker(
          { ip: '10.0.0.1', user: { sub: 'user-1' } },
          {} as any,
        ),
      ).toBe('ip:10.0.0.1');
    });

    it('chave do teto global independe da rota e muda com o IP', () => {
      const ctxA = { getClass: () => ({ name: 'A' }), getHandler: () => ({ name: 'a' }) } as any;
      const ctxB = { getClass: () => ({ name: 'B' }), getHandler: () => ({ name: 'b' }) } as any;
      expect(globalThrottleGenerateKey(ctxA, 'ip:10.0.0.1', 'global')).toBe(
        globalThrottleGenerateKey(ctxB, 'ip:10.0.0.1', 'global'),
      );
      expect(globalThrottleGenerateKey(ctxA, 'ip:10.0.0.1', 'global')).not.toBe(
        globalThrottleGenerateKey(ctxA, 'ip:10.0.0.2', 'global'),
      );
    });
  });

  describe('ordem dos guards em AppModule (regressão)', () => {
    it('JwtAuthGuard vem antes do UserThrottlerGuard', () => {
      const providers = Reflect.getMetadata(
        MODULE_METADATA.PROVIDERS,
        AppModule,
      ) as Array<{ provide?: unknown; useClass?: unknown }>;
      const guardOrder = providers
        .filter((p) => p?.provide === APP_GUARD)
        .map((p) => p.useClass);
      expect(guardOrder).toContain(JwtAuthGuard);
      expect(guardOrder).toContain(UserThrottlerGuard);
      expect(guardOrder.indexOf(JwtAuthGuard)).toBeLessThan(
        guardOrder.indexOf(UserThrottlerGuard),
      );
    });
  });

  describe('integração (ThrottlerGuard real + storage em memória)', () => {
    let app: any;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [PingController],
        providers: [
          { provide: APP_GUARD, useClass: FakeJwtAuthGuard },
          { provide: APP_GUARD, useClass: UserThrottlerGuard },
        ],
        imports: [
          ThrottlerModule.forRoot({
            throttlers: [{ name: 'default', ttl: 60_000, limit: 3 }],
          }),
        ],
      }).compile();
      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app?.close();
    });

    it('dois usuários atrás do mesmo IP têm cotas independentes', async () => {
      // Usuário A: 3 ok, 4ª estoura.
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .get('/ping')
          .set('x-test-user', 'aluno-a')
          .expect(200);
      }
      await request(app.getHttpServer())
        .get('/ping')
        .set('x-test-user', 'aluno-a')
        .expect(429);

      // Usuário B, mesmo IP: cota intacta — 3 ok, 4ª estoura.
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .get('/ping')
          .set('x-test-user', 'aluno-b')
          .expect(200);
      }
      await request(app.getHttpServer())
        .get('/ping')
        .set('x-test-user', 'aluno-b')
        .expect(429);
    });

    it('anônimo usa a cota por IP (fallback)', async () => {
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer()).get('/ping').expect(200);
      }
      await request(app.getHttpServer()).get('/ping').expect(429);
    });
  });
});
