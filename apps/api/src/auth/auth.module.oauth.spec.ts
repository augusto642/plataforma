import { Global, Module } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { ConfigError } from '../config/secrets.validation';
import { TRACK_INVESTIGATION_QUEUE } from '../dynamic-track/dynamic-track.service';
import { AuthModule } from './auth.module';
import { PrismaService } from '../prisma/prisma.service';
import { GitHubStrategy } from './strategies/github.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

/**
 * OAuth — registro condicional das strategies no boot do AuthModule.
 * - Sem vars: o módulo sobe e as strategies resolvem `null` (guard 503).
 * - Parcial (só ID): o boot RECUSA com ConfigError (fail-closed).
 * - Completo: as strategies são instanciadas e registradas no Passport.
 *
 * O ConfigService e o PrismaService vêm de módulos @Global de teste (no
 * app real são o ConfigModule global e o PrismaModule global); o Prisma é
 * mockado — o boot real com banco é outro teste. Aqui só importa a
 * decisão de registrar ou não as strategies.
 */
describe('AuthModule — OAuth condicional no boot', () => {
  const prismaMock = {
    user: {},
    oAuthAccount: {},
    refreshToken: {},
    $transaction: jest.fn(),
  };

  function configMock(vars: Record<string, string | undefined>) {
    return {
      get: jest.fn((key: string, def?: any) => {
        if (key === 'JWT_ACCESS_SECRET') return 'test-access-secret';
        return vars[key] ?? def;
      }),
    };
  }

  async function compileWith(vars: Record<string, string | undefined>) {
    @Global()
    @Module({
      providers: [{ provide: ConfigService, useValue: configMock(vars) }],
      exports: [ConfigService],
    })
    class TestConfigModule {}

    @Global()
    @Module({
      providers: [{ provide: PrismaService, useValue: prismaMock }],
      exports: [PrismaService],
    })
    class TestPrismaModule {}

    const noopQueue = { add: jest.fn(), close: jest.fn() };
    const noopCache = { get: jest.fn(), set: jest.fn(), del: jest.fn(), increment: jest.fn() };

    return Test.createTestingModule({
      imports: [TestConfigModule, TestPrismaModule, AuthModule],
    })
      .overrideProvider(CacheService)
      .useValue(noopCache)
      .overrideProvider(getQueueToken(TRACK_INVESTIGATION_QUEUE))
      .useValue(noopQueue)
      .overrideProvider(getQueueToken('research'))
      .useValue(noopQueue)
      .overrideProvider(getQueueToken('track-generation'))
      .useValue(noopQueue)
      .compile();
  }

  it('sem vars OAuth: sobe e as strategies resolvem null (desabilitadas)', async () => {
    const app = await compileWith({});
    expect(app.get(GoogleStrategy)).toBeNull();
    expect(app.get(GitHubStrategy)).toBeNull();
    await app.close();
  });

  it('Google parcial (só ID): o boot recusa com ConfigError', async () => {
    await expect(
      compileWith({ GOOGLE_CLIENT_ID: 'id' }),
    ).rejects.toThrow(ConfigError);
  });

  it('GitHub parcial (só secret): o boot recusa com ConfigError', async () => {
    await expect(
      compileWith({ GITHUB_CLIENT_SECRET: 'secret' }),
    ).rejects.toThrow(ConfigError);
  });

  it('configurado: as strategies são instanciadas', async () => {
    const app = await compileWith({
      GOOGLE_CLIENT_ID: 'google-id',
      GOOGLE_CLIENT_SECRET: 'google-secret',
      GITHUB_CLIENT_ID: 'github-id',
      GITHUB_CLIENT_SECRET: 'github-secret',
    });
    expect(app.get(GoogleStrategy)).toBeInstanceOf(GoogleStrategy);
    expect(app.get(GitHubStrategy)).toBeInstanceOf(GitHubStrategy);
    await app.close();
  });
});
