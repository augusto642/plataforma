import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { AuthService } from './auth.service';
import { ErrorCodes } from '../common/errors/error-codes';
import { OAuthProfile } from './oauth.config';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

/**
 * OAuth — loginWithOAuth (criação/vínculo) + login por senha em conta
 * só-OAuth (passwordHash NULL).
 *
 * O Prisma é mockado: `$transaction` executa o callback com um `tx`
 * mockado (mesmo padrão dos specs de refresh-reuse do serviço).
 */
describe('AuthService — OAuth loginWithOAuth', () => {
  let auth: AuthService;
  let tx: any;
  let prisma: any;
  let jwt: { signAsync: jest.Mock };
  let config: { get: jest.Mock };
  let mailer: { sendVerificationCode: jest.Mock };

  const tokens = {
    accessToken: 'access.jwt.token',
    refreshToken: '***',
  };

  beforeEach(() => {
    tx = {
      oAuthAccount: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'oa-1' }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    prisma = {
      $transaction: jest.fn((cb: any) => cb(tx)),
      user: { findUnique: jest.fn() },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rt-1' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    jwt = { signAsync: jest.fn().mockResolvedValue(tokens.accessToken) };
    config = {
      get: jest.fn((key: string, def?: any) => {
        if (key === 'JWT_ACCESS_SECRET') return 'test-access-secret';
        return def;
      }),
    };
    mailer = { sendVerificationCode: jest.fn().mockResolvedValue(undefined) };
    auth = new AuthService(prisma as any, jwt as any, config as any, mailer as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function googleProfile(overrides: Partial<OAuthProfile> = {}): OAuthProfile {
    return {
      provider: 'google',
      providerId: 'google-123',
      email: 'Augusto@Example.com',
      emailVerified: true,
      name: 'Augusto Fortes',
      ...overrides,
    };
  }

  it('loga na conta já vinculada (provider + providerId), sem criar nada', async () => {
    const existingUser = {
      id: 'u1',
      email: 'augusto@example.com',
      name: 'Augusto Fortes',
      role: 'student',
    };
    tx.oAuthAccount.findUnique.mockResolvedValue({
      user: existingUser,
    });
    const result = await auth.loginWithOAuth(googleProfile());
    expect(result.user).toEqual(existingUser);
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.oAuthAccount.create).not.toHaveBeenCalled();
    expect(tx.user.findUnique).not.toHaveBeenCalled();
  });

  it('VINCULA o provedor à conta por senha com o mesmo e-mail (sem duplicata)', async () => {
    const byEmail = {
      id: 'u2',
      email: 'augusto@example.com',
      name: 'Augusto',
      role: 'student',
      emailVerifiedAt: null,
    };
    tx.user.findUnique.mockResolvedValue(byEmail);
    const result = await auth.loginWithOAuth(googleProfile());
    expect(result.user.id).toBe('u2');
    expect(tx.oAuthAccount.create).toHaveBeenCalledWith({
      data: { provider: 'google', providerId: 'google-123', userId: 'u2' },
    });
    // O provedor afirmou o e-mail: a conta vinculada passa a verificada.
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'u2' },
      data: { emailVerifiedAt: expect.any(Date) },
    });
    expect(tx.user.create).not.toHaveBeenCalled();
  });

  it('cria conta nova (sem senha, já verificada) + vínculo quando o e-mail é novo', async () => {
    const created = {
      id: 'u3',
      email: 'novo@example.com',
      name: 'Novo',
      role: 'student',
    };
    tx.user.create.mockResolvedValue(created);
    const result = await auth.loginWithOAuth(
      googleProfile({ email: 'novo@example.com', name: 'Novo' }),
    );
    expect(result.user.id).toBe('u3');
    expect(tx.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'novo@example.com',
        name: 'Novo',
        passwordHash: null,
        role: 'student',
        emailVerifiedAt: expect.any(Date),
        oAuthAccounts: {
          create: { provider: 'google', providerId: 'google-123' },
        },
      }),
    });
    // E-mail normalizado para minúsculas.
    expect(tx.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'novo@example.com' },
    });
  });

  it('recusa perfil sem e-mail verificado (segunda camada; a strategy já barra)', async () => {
    await expect(
      auth.loginWithOAuth(googleProfile({ emailVerified: false })),
    ).rejects.toThrow(BadRequestException);
    expect(tx.oAuthAccount.findUnique).not.toHaveBeenCalled();
  });

  it('recusa perfil sem e-mail (nunca inventa e-mail)', async () => {
    await expect(
      auth.loginWithOAuth(googleProfile({ email: null })),
    ).rejects.toThrow(BadRequestException);
    expect(tx.user.create).not.toHaveBeenCalled();
  });

  it('D2: corrida P2002 (dois callbacks simultâneos p/ usuário novo) vira Conflict account_conflict, sem 500', async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`email`)',
      { code: 'P2002', clientVersion: '7.9.1' },
    );
    tx.user.create.mockRejectedValue(p2002);
    await expect(
      auth.loginWithOAuth(googleProfile({ email: 'novo@example.com' })),
    ).rejects.toThrow(ConflictException);
    try {
      await auth.loginWithOAuth(googleProfile({ email: 'novo@example.com' }));
      throw new Error('deveria ter rejeitado');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ConflictException);
      expect(err.getResponse().errorCode).toBe(
        ErrorCodes.AUTH_OAUTH_ACCOUNT_CONFLICT,
      );
    }
  });

  it('D2: corrida P2002 no VÍNCULO (mesma conta por senha, dois callbacks) vira Conflict', async () => {
    const byEmail = {
      id: 'u2',
      email: 'augusto@example.com',
      name: 'Augusto',
      role: 'student',
      emailVerifiedAt: null,
    };
    tx.user.findUnique.mockResolvedValue(byEmail);
    tx.oAuthAccount.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`provider`, `providerId`)',
        { code: 'P2002', clientVersion: '7.9.1' },
      ),
    );
    await expect(auth.loginWithOAuth(googleProfile())).rejects.toThrow(
      ConflictException,
    );
  });

  it('erro de banco que não é P2002 continua sendo relançado (não vira Conflict)', async () => {
    tx.user.create.mockRejectedValue(new Error('connection refused'));
    await expect(
      auth.loginWithOAuth(googleProfile({ email: 'novo@example.com' })),
    ).rejects.toThrow('connection refused');
  });

  it('login por senha rejeita conta só-OAuth (passwordHash NULL) sem comparar hash', async () => {
    const oauthOnlyUser = {
      id: 'u9',
      email: 'oauth@example.com',
      name: 'OAuth Only',
      passwordHash: null,
      role: 'student',
      emailVerifiedAt: new Date(),
    };
    prisma.user.findUnique.mockResolvedValue(oauthOnlyUser);
    await expect(auth.login('oauth@example.com', 'qualquer')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });
});
