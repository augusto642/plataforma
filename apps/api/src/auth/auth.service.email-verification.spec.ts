import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));

/**
 * C5 (Lote 1) — Verificação de e-mail por código de confirmação.
 * Harness com "banco" em memória que reproduz a semântica usada pelo
 * AuthService: hash SHA-256 do código, expiração, tentativas, consumo e
 * invalidação de códigos antigos no reenvio.
 */
describe('AuthService - email verification (C5)', () => {
  let auth: AuthService;
  let db: { users: any[]; codes: any[] };
  let prisma: any;
  let jwt: { signAsync: jest.Mock };
  let config: { get: jest.Mock };
  let mailer: { sendVerificationCode: jest.Mock };
  let codeSeq: number;

  const hashCode = (code: string) =>
    createHash('sha256').update(code).digest('hex');

  function seedCode(overrides: Record<string, unknown> = {}) {
    const code = {
      id: `code-${++codeSeq}`,
      userId: 'user-1',
      codeHash: hashCode('123456'),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      attempts: 0,
      consumedAt: null,
      createdAt: new Date(),
      ...overrides,
    };
    db.codes.push(code);
    return code;
  }

  beforeEach(() => {
    codeSeq = 0;
    db = { users: [], codes: [] };
    prisma = {
      user: {
        create: jest.fn(async ({ data }: any) => {
          const user = {
            id: 'user-1',
            email: data.email,
            name: data.name,
            role: data.role,
            passwordHash: data.passwordHash,
            emailVerifiedAt: null,
          };
          db.users.push(user);
          return user;
        }),
        findUnique: jest.fn(async ({ where }: any) =>
          db.users.find((u) => u.email === where.email) ?? null,
        ),
        update: jest.fn(async ({ where, data }: any) => {
          const user = db.users.find((u) => u.id === where.id);
          Object.assign(user, data);
          return user;
        }),
      },
      emailVerificationCode: {
        create: jest.fn(async ({ data }: any) => {
          const code = {
            id: `code-${++codeSeq}`,
            ...data,
            attempts: 0,
            consumedAt: null,
            createdAt: new Date(),
          };
          db.codes.push(code);
          return code;
        }),
        deleteMany: jest.fn(async ({ where }: any) => {
          const before = db.codes.length;
          db.codes = db.codes.filter(
            (c) =>
              !(
                c.userId === where.userId &&
                (where.consumedAt === null ? c.consumedAt === null : true)
              ),
          );
          return { count: before - db.codes.length };
        }),
        findFirst: jest.fn(async ({ where }: any) => {
          const rows = db.codes
            .filter(
              (c) =>
                c.userId === where.userId &&
                (where.consumedAt === null ? c.consumedAt === null : true),
            )
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          return rows[0] ?? null;
        }),
        count: jest.fn(async ({ where }: any) =>
          db.codes.filter(
            (c) =>
              c.userId === where.userId &&
              (!where.createdAt?.gte || c.createdAt >= where.createdAt.gte),
          ).length,
        ),
        update: jest.fn(async ({ where, data }: any) => {
          const code = db.codes.find((c) => c.id === where.id);
          if (data.attempts?.increment) code.attempts += data.attempts.increment;
          if (data.consumedAt) code.consumedAt = data.consumedAt;
          return code;
        }),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rt-1' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
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
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    auth = new AuthService(prisma as any, jwt as any, config as any, mailer as any);
  });

  const register = () =>
    auth.register({ email: 'novo@exemplo.com', name: 'Novo', password: 'senha123' } as any);

  it('register cria usuário NÃO verificado, sem tokens, e envia o código', async () => {
    const result = await register();

    expect(result.emailVerificationRequired).toBe(true);
    expect(result.user.email).toBe('novo@exemplo.com');
    // Nenhum token emitido no cadastro: sem sessão antes da verificação.
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    expect(db.users[0].emailVerifiedAt).toBeNull();
    expect(mailer.sendVerificationCode).toHaveBeenCalledTimes(1);
    const [email, , code] = mailer.sendVerificationCode.mock.calls[0];
    expect(email).toBe('novo@exemplo.com');
    expect(code).toMatch(/^\d{6}$/);
    // Só o hash vai para o banco — o código em claro nunca é persistido.
    expect(db.codes[0].codeHash).toBe(hashCode(code));
    expect(db.codes[0].codeHash).not.toContain(code);
  });

  it('login antes de verificar retorna 403 honesto em pt-BR', async () => {
    await register();

    await expect(
      auth.login('novo@exemplo.com', 'senha123'),
    ).rejects.toThrow(ForbiddenException);
    await expect(auth.login('novo@exemplo.com', 'senha123')).rejects.toThrow(
      /confirmar seu e-mail/,
    );
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('código correto verifica o usuário e libera o login', async () => {
    await register();
    const sentCode = mailer.sendVerificationCode.mock.calls[0][2];

    const tokens = await auth.verifyEmail('novo@exemplo.com', sentCode);

    expect(tokens.accessToken).toBe('signed-token');
    expect(db.users[0].emailVerifiedAt).not.toBeNull();
    expect(db.codes[0].consumedAt).not.toBeNull();
    // Login passa após a verificação.
    const after = await auth.login('novo@exemplo.com', 'senha123');
    expect(after.accessToken).toBe('signed-token');
  });

  it('D1 (regressão): conta já verificada + código errado é rejeitada, sem tokens', async () => {
    await register();
    // Conta legada backfillada como verificada pela migration do lote.
    db.users[0].emailVerifiedAt = new Date();

    await expect(
      auth.verifyEmail('novo@exemplo.com', '000000'),
    ).rejects.toThrow(BadRequestException);
    // Nenhuma sessão emitida e a tentativa foi contabilizada no código.
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    expect(db.codes[0].attempts).toBe(1);
  });

  it('D1 (regressão): conta já verificada + zero códigos emitidos é rejeitada, sem tokens', async () => {
    await register();
    db.users[0].emailVerifiedAt = new Date();
    db.codes = []; // reprodução exata do laudo QA: nenhum código emitido

    await expect(
      auth.verifyEmail('novo@exemplo.com', '000000'),
    ).rejects.toThrow(/Código inválido ou expirado/);
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('D1: conta já verificada + código válido ainda não consumido é aceita e consome o código', async () => {
    await register();
    const sentCode = mailer.sendVerificationCode.mock.calls[0][2];
    db.users[0].emailVerifiedAt = new Date();

    const tokens = await auth.verifyEmail('novo@exemplo.com', sentCode);

    expect(tokens.accessToken).toBe('signed-token');
    expect(db.codes[0].consumedAt).not.toBeNull();
  });

  it('código errado é rejeitado e conta tentativa; após 5 tentativas bloqueia o código', async () => {
    await register();

    for (let i = 0; i < 5; i++) {
      await expect(
        auth.verifyEmail('novo@exemplo.com', '000000'),
      ).rejects.toThrow(BadRequestException);
    }
    expect(db.codes[0].attempts).toBe(5);

    await expect(
      auth.verifyEmail('novo@exemplo.com', '000000'),
    ).rejects.toThrow(/Muitas tentativas/);
    expect(db.users[0].emailVerifiedAt).toBeNull();
  });

  it('código expirado é rejeitado', async () => {
    await register();
    const sentCode = mailer.sendVerificationCode.mock.calls[0][2];
    db.codes[0].expiresAt = new Date(Date.now() - 1000);

    await expect(
      auth.verifyEmail('novo@exemplo.com', sentCode),
    ).rejects.toThrow(/expirou/);
    expect(db.users[0].emailVerifiedAt).toBeNull();
  });

  it('e-mail desconhecido responde igual a código errado (anti-enumeração)', async () => {
    await expect(
      auth.verifyEmail('ninguem@exemplo.com', '123456'),
    ).rejects.toThrow(/Código inválido ou expirado/);
  });

  it('resend imediato respeita o cooldown de 60s', async () => {
    await register();

    await expect(auth.resendCode('novo@exemplo.com')).rejects.toThrow(
      HttpException,
    );
    try {
      await auth.resendCode('novo@exemplo.com');
      throw new Error('should have thrown 429');
    } catch (err: any) {
      expect(err.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
    expect(mailer.sendVerificationCode).toHaveBeenCalledTimes(1);
  });

  it('resend após o cooldown invalida o código antigo e envia um novo', async () => {
    await register();
    const oldCode = mailer.sendVerificationCode.mock.calls[0][2];
    db.codes[0].createdAt = new Date(Date.now() - 61 * 1000);

    const res = await auth.resendCode('novo@exemplo.com');

    expect(res.message).toMatch(/novo código foi enviado/);
    expect(mailer.sendVerificationCode).toHaveBeenCalledTimes(2);
    const newCode = mailer.sendVerificationCode.mock.calls[1][2];
    expect(newCode).toMatch(/^\d{6}$/);
    // Código antigo não vale mais (foi invalidado na emissão do novo).
    await expect(
      auth.verifyEmail('novo@exemplo.com', oldCode),
    ).rejects.toThrow(BadRequestException);
    // O novo verifica.
    await auth.verifyEmail('novo@exemplo.com', newCode);
    expect(db.users[0].emailVerifiedAt).not.toBeNull();
  });

  it('resend respeita o limite de 5 envios por hora', async () => {
    await register();
    // Planta 5 códigos na última hora (o do register + 4), todos com mais de
    // 60 s (fora do cooldown) para alcançar o teto horário.
    for (let i = 0; i < 4; i++)
      seedCode({ createdAt: new Date(Date.now() - 61 * 1000) });
    db.codes[0].createdAt = new Date(Date.now() - 61 * 1000);

    await expect(auth.resendCode('novo@exemplo.com')).rejects.toThrow(
      /Limite de reenvios/,
    );
  });

  it('register com e-mail duplicado mantém a mensagem genérica anti-enumeração', async () => {
    prisma.user.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.9.1',
      }),
    );

    await expect(register()).rejects.toThrow(
      /Não foi possível concluir o cadastro/,
    );
  });
});
