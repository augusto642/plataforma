import { Logger, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { hashToken } from './tokens.util';

jest.mock('bcrypt', () => ({ compare: jest.fn() }));

/**
 * A2 (Lote 2) — rotação com detecção de reuso do refresh token.
 *
 * Antes: o token rotacionado era APAGADO, então reutilizar um token roubado
 * só dava 401 — indistinguível de token desconhecido, sem revogar a família
 * nem alarmar. Agora o token rotacionado é marcado com `revokedAt` e a
 * reapresentação dele revoga TODOS os tokens do usuário + loga o evento.
 *
 * D2 (follow-up Lote 2) — rotação atômica: o token antigo é reclamado com
 * `updateMany` condicional (`revokedAt: null`) dentro da mesma transação
 * que cria o refresh novo; dois `refresh` concorrentes com o mesmo token —
 * só um vence (o outro cai no caminho de reuso).
 */
describe('AuthService — A2 refresh reuse detection', () => {
  let auth: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock };
    refreshToken: {
      findUnique: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    emailVerificationCode: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let jwt: { signAsync: jest.Mock };
  let config: { get: jest.Mock };
  let mailer: { sendVerificationCode: jest.Mock };
  let loggerError: jest.SpyInstance;

  const user = {
    id: 'user-1',
    email: 'student@example.com',
    name: 'Student',
    passwordHash: 'hash',
    role: 'student',
    emailVerifiedAt: new Date(),
  };

  const OLD_RAW = 'old-refresh-token';
  const NEW_RAW = 'new-refresh-token';

  function validRecord(overrides: Record<string, unknown> = {}) {
    return {
      id: 'rt-old',
      userId: 'user-1',
      tokenHash: hashToken(OLD_RAW),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revokedAt: null,
      user,
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(user) },
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'rt-new' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      emailVerificationCode: { findFirst: jest.fn() },
      // A transação mockada executa o callback com o próprio mock (tx === prisma),
      // como o Prisma real faria com o cliente transacional.
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') };
    config = {
      get: jest.fn((key: string, def?: any) => {
        if (key === 'JWT_ACCESS_SECRET') return 'configured-secret';
        if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return def;
      }),
    };
    mailer = { sendVerificationCode: jest.fn().mockResolvedValue(undefined) };
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    auth = new AuthService(prisma as any, jwt as any, config as any, mailer as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('normal refresh rotates: new token issued and old token claimed atomically (CAS, not deleted)', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(validRecord());

    const tokens = await auth.refresh(OLD_RAW);

    expect(tokens.accessToken).toBe('signed-token');
    expect(tokens.refreshToken).toBeDefined();
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    // O antigo é reclamado com CAS dentro da transação (só revoga se ainda
    // não estiver revogado) — é o que permite detectar o reuso e o que
    // torna a rotação atômica (D2).
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { id: 'rt-old', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    // Nada da família é revogado num refresh normal.
    expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
  });

  it('two concurrent refreshes with the same token: only one wins; the loser is treated as reuse (family revoked + 401)', async () => {
    // Ambos passam no cheque `revokedAt` (o registro ainda não foi
    // revogado quando os dois leem); a corrida é decidida pelo CAS:
    // o primeiro `updateMany` casa (count 1), o segundo não (count 0).
    prisma.refreshToken.findUnique.mockResolvedValue(validRecord());
    prisma.refreshToken.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const [first, second] = await Promise.allSettled([
      auth.refresh(OLD_RAW),
      auth.refresh(OLD_RAW),
    ]);

    const fulfilled = [first, second].filter((r) => r.status === 'fulfilled');
    const rejected = [first, second].filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(
      (rejected[0] as PromiseRejectedResult).reason,
    ).toBeInstanceOf(UnauthorizedException);
    // Só UM par de tokens foi emitido — o perdedor não criou refresh novo.
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    // O perdedor caiu no caminho de reuso: família inteira revogada + log.
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining('reuse'),
    );
  });

  it('reuse of a rotated token revokes the whole family, logs the event and returns 401', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(
      validRecord({ revokedAt: new Date(Date.now() - 1000) }),
    );

    await expect(auth.refresh(OLD_RAW)).rejects.toThrow(UnauthorizedException);

    // Família inteira revogada.
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    // Alerta de possível roubo logado (sem expor o valor do token).
    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining('reuse'),
    );
    expect(loggerError.mock.calls[0][0]).toContain('user-1');
    // Nenhum token novo é emitido no reuso.
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('unknown token is just 401 — no family revocation (cannot attribute to a user)', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(null);

    await expect(auth.refresh('forged-token')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
    expect(loggerError).not.toHaveBeenCalled();
  });

  it('expired (never revoked) token is just 401 — no family revocation', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(
      validRecord({ expiresAt: new Date(Date.now() - 1000) }),
    );

    await expect(auth.refresh(OLD_RAW)).rejects.toThrow(UnauthorizedException);
    expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
    expect(loggerError).not.toHaveBeenCalled();
  });

  it('revokeAllForUser deletes every refresh token of the user (logout-all)', async () => {
    await auth.revokeAllForUser('user-1');
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
  });

  it('logout still revokes only the presented token', async () => {
    await auth.logout(OLD_RAW);
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash: hashToken(OLD_RAW) },
    });
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledTimes(1);
  });

  it('normal login still works after the change', async () => {
    const tokens = await auth.login('student@example.com', 'pass');
    expect(tokens.accessToken).toBe('signed-token');
    expect(tokens.refreshToken).toBeDefined();
    expect(tokens.user.id).toBe('user-1');
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    void NEW_RAW;
  });
});
