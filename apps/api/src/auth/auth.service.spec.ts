import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigError } from '../config/secrets.validation';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('AuthService (no secret defaults)', () => {
  let auth: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock };
    refreshToken: { create: jest.Mock; deleteMany: jest.Mock };
    refreshTokenDelete: jest.Mock;
  };
  let jwt: { signAsync: jest.Mock };
  let config: { get: jest.Mock };
  let bcryptCompare: jest.SpyInstance;

  const user = {
    id: 'user-1',
    email: 'student@example.com',
    name: 'Student',
    passwordHash: 'hash',
    role: 'student',
  };

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(user) },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rt-1' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      refreshTokenDelete: jest.fn(),
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') };
    config = {
      get: jest.fn((key: string, def?: any) => {
        if (key === 'JWT_ACCESS_SECRET') return undefined;
        return def;
      }),
    };
    bcryptCompare = bcrypt.compare as jest.Mock;
    bcryptCompare.mockResolvedValue(true);
    auth = new AuthService(prisma as any, jwt as any, config as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('throws a ConfigError naming the variable when JWT_ACCESS_SECRET is missing', async () => {
    await expect(auth.login('student@example.com', 'pass')).rejects.toThrow(
      ConfigError,
    );
    await expect(auth.login('student@example.com', 'pass')).rejects.toThrow(
      /JWT_ACCESS_SECRET/,
    );
  });

  it('signs the access token with the configured secret (no default)', async () => {
    config.get.mockImplementation((key: string, def?: any) => {
      if (key === 'JWT_ACCESS_SECRET') return 'configured-secret';
      if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
      return def;
    });

    const tokens = await auth.login('student@example.com', 'pass');

    expect(tokens.accessToken).toBe('signed-token');
    expect(tokens.refreshToken).toBeDefined();
    expect(jwt.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'user-1', email: 'student@example.com' }),
      expect.objectContaining({ secret: 'configured-secret' }),
    );
  });

  it('does not hardcode any default secret into issued tokens', async () => {
    config.get.mockImplementation((key: string, def?: any) => {
      if (key === 'JWT_ACCESS_SECRET') return 'configured-secret';
      if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
      return def;
    });

    await auth.login('student@example.com', 'pass');

    const signArgs = jwt.signAsync.mock.calls[0][1] as { secret: string };
    expect(signArgs.secret).not.toContain('change_me');
    expect(signArgs.secret).toBe('configured-secret');
  });

  it('still rejects invalid credentials', async () => {
    bcryptCompare.mockResolvedValue(false);
    await expect(auth.login('student@example.com', 'wrong')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('AuthService register — UTMs (B07)', () => {
  it('persists trimmed UTMs on signup and never returns them in the response', async () => {
    const create = jest.fn().mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'user-9', ...data }),
    );
    const prismaReg: any = {
      user: { create, findUnique: jest.fn() },
      refreshToken: { create: jest.fn().mockResolvedValue({ id: 'rt-9' }) },
    };
    const jwtReg: any = { signAsync: jest.fn().mockResolvedValue('signed-token') };
    const configReg: any = {
      get: jest.fn((key: string, def?: any) => {
        if (key === 'JWT_ACCESS_SECRET') return 'configured-secret';
        return def;
      }),
    };
    const svc = new AuthService(prismaReg, jwtReg, configReg);
    const res = await svc.register({
      email: 'Novo@Example.com',
      name: ' Novo Aluno ',
      password: '12345678',
      utmSource: ' google ',
      utmMedium: 'cpc',
      // utmCampaign ausente de propósito -> deve persistir null
    } as any);

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'novo@example.com',
        name: 'Novo Aluno',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: null,
      }),
    });
    // Resposta pública do cadastro: só id/email/name/role — nada de UTM.
    expect(res.user).toEqual({
      id: 'user-9',
      email: 'novo@example.com',
      name: 'Novo Aluno',
      role: 'student',
    });
    expect(JSON.stringify(res)).not.toContain('google');
    expect(JSON.stringify(res)).not.toContain('utm');
  });
});

describe('AuthService register — vínculo do quiz diagnóstico (B09)', () => {
  function makeService(diagnosticResult: any) {
    const create = jest.fn().mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'user-10', ...data }),
    );
    const prismaReg: any = {
      user: { create, findUnique: jest.fn() },
      refreshToken: { create: jest.fn().mockResolvedValue({ id: 'rt-10' }) },
      diagnosticResult,
    };
    const jwtReg: any = { signAsync: jest.fn().mockResolvedValue('signed-token') };
    const configReg: any = {
      get: jest.fn((key: string, def?: any) => {
        if (key === 'JWT_ACCESS_SECRET') return 'configured-secret';
        return def;
      }),
    };
    return { svc: new AuthService(prismaReg, jwtReg, configReg), create };
  }

  const dto = {
    email: 'quiz@example.com',
    name: 'Aluna Quiz',
    password: '12345678',
    diagnosticSessionToken: 'token-da-sessao',
  } as any;

  it('vincula o DiagnosticResult sem dono à conta recém-criada', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ id: 'diag-1', userId: null, sessionToken: 'token-da-sessao' });
    const update = jest.fn().mockResolvedValue({});
    const { svc } = makeService({ findUnique, update });

    const res = await svc.register(dto);

    expect(findUnique).toHaveBeenCalledWith({
      where: { sessionToken: 'token-da-sessao' },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'diag-1' },
      data: { userId: 'user-10' },
    });
    expect(res.user.id).toBe('user-10');
  });

  it('não sobrescreve resultado já vinculado a outra conta', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ id: 'diag-2', userId: 'outro-user', sessionToken: 'token-da-sessao' });
    const update = jest.fn();
    const { svc } = makeService({ findUnique, update });

    await svc.register(dto);
    expect(update).not.toHaveBeenCalled();
  });

  it('token inexistente ou erro no vínculo NÃO quebram o cadastro', async () => {
    const findUnique = jest.fn().mockRejectedValue(new Error('db down'));
    const update = jest.fn();
    const { svc } = makeService({ findUnique, update });

    const res = await svc.register(dto);
    expect(res.user.email).toBe('quiz@example.com');
  });

  it('sem diagnosticSessionToken, nem consulta a tabela de diagnóstico', async () => {
    const findUnique = jest.fn();
    const { svc } = makeService({ findUnique, update: jest.fn() });

    await svc.register({
      email: 'semquiz@example.com',
      name: 'Sem Quiz',
      password: '12345678',
    } as any);
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe('AuthService register — escolhas da porta fria (Sprint 8)', () => {
  function makeRegisterService() {
    const create = jest.fn().mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'user-11', ...data }),
    );
    const prismaReg: any = {
      user: { create, findUnique: jest.fn() },
      refreshToken: { create: jest.fn().mockResolvedValue({ id: 'rt-11' }) },
    };
    const jwtReg: any = { signAsync: jest.fn().mockResolvedValue('signed-token') };
    const configReg: any = {
      get: jest.fn((key: string, def?: any) => {
        if (key === 'JWT_ACCESS_SECRET') return 'configured-secret';
        return def;
      }),
    };
    return { svc: new AuthService(prismaReg, jwtReg, configReg), create };
  }

  it('persiste o nível declarado como careerTier da conta', async () => {
    const { svc, create } = makeRegisterService();

    await svc.register({
      email: 'fria@example.com',
      name: 'Porta Fria',
      password: '12345678',
      preferredTrack: 'backend',
      experienceLevel: 'mid',
      weeklyTimeCommitment: '10h',
      careerGoal: 'lead',
    } as any);

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ careerTier: 'mid' }),
    });
  });

  it('sem nível declarado, não força careerTier (default beginner do modelo)', async () => {
    const { svc, create } = makeRegisterService();

    await svc.register({
      email: 'fria2@example.com',
      name: 'Sem Nivel',
      password: '12345678',
    } as any);

    expect(create.mock.calls[0][0].data.careerTier).toBeUndefined();
  });
});