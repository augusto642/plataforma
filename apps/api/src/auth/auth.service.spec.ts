import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigError } from '../config/secrets.validation';
import { AuthService } from './auth.service';
import { AGE_ELIGIBILITY_POLICY_VERSION } from '@plataforma/contracts';

const LEGAL_ACCEPTANCE = {
  adultConfirmed: true,
  termsAccepted: true,
  privacyAcknowledged: true,
};

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('AuthService (no secret defaults)', () => {
  let auth: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    refreshToken: { create: jest.Mock; deleteMany: jest.Mock };
    refreshTokenDelete: jest.Mock;
  };
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let config: { get: jest.Mock };
  let mailer: { sendVerificationCode: jest.Mock };
  let bcryptCompare: jest.SpyInstance;

  const user = {
    id: 'user-1',
    email: 'student@example.com',
    name: 'Student',
    passwordHash: 'hash',
    role: 'student',
    emailVerifiedAt: new Date(),
    adultEligibilityVersion: AGE_ELIGIBILITY_POLICY_VERSION,
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn().mockResolvedValue(user),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rt-1' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      refreshTokenDelete: jest.fn(),
    };
    jwt = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
      verifyAsync: jest.fn(),
    };
    config = {
      get: jest.fn((key: string, def?: any) => {
        if (key === 'JWT_ACCESS_SECRET') return undefined;
        return def;
      }),
    };
    bcryptCompare = bcrypt.compare as jest.Mock;
    bcryptCompare.mockResolvedValue(true);
    mailer = { sendVerificationCode: jest.fn().mockResolvedValue(undefined) };
    auth = new AuthService(prisma as any, jwt as any, config as any, mailer as any);
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
      expect.objectContaining({
        sub: 'user-1',
        email: 'student@example.com',
        ageEligibilityVersion: AGE_ELIGIBILITY_POLICY_VERSION,
      }),
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

  it('issues and verifies a guest age token only for a current affirmative confirmation', async () => {
    const token = await auth.createGuestAgeEligibilityToken(true);

    expect(token).toBe('signed-token');
    expect(jwt.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: 'guest-age-eligibility',
        ageEligibilityVersion: AGE_ELIGIBILITY_POLICY_VERSION,
        acceptedAt: expect.any(String),
      }),
      expect.objectContaining({
        expiresIn: '12h',
        audience: 'nexus-guest-age-eligibility',
        issuer: 'nexus-api',
      }),
    );
    await expect(auth.createGuestAgeEligibilityToken(false)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    jwt.verifyAsync.mockResolvedValue({
      purpose: 'guest-age-eligibility',
      ageEligibilityVersion: AGE_ELIGIBILITY_POLICY_VERSION,
      acceptedAt: new Date().toISOString(),
    });
    await expect(auth.verifyGuestAgeEligibilityToken(token)).resolves.toBe(true);
    expect(jwt.verifyAsync).toHaveBeenCalledWith(token, {
      audience: 'nexus-guest-age-eligibility',
      issuer: 'nexus-api',
    });
  });

  it('rejects missing and invalid guest age tokens', async () => {
    await expect(auth.verifyGuestAgeEligibilityToken()).resolves.toBe(false);
    jwt.verifyAsync.mockRejectedValue(new Error('invalid token'));
    await expect(auth.verifyGuestAgeEligibilityToken('invalid')).resolves.toBe(false);
  });

  it('still rejects invalid credentials', async () => {
    bcryptCompare.mockResolvedValue(false);
    await expect(auth.login('student@example.com', 'wrong')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('requires and records adult eligibility for accounts without a current confirmation', async () => {
    const outdatedUser = { ...user, adultEligibilityVersion: null };
    prisma.user.findUnique.mockResolvedValue(outdatedUser);
    config.get.mockImplementation((key: string, def?: any) => {
      if (key === 'JWT_ACCESS_SECRET') return 'configured-secret';
      return def;
    });

    await expect(auth.login('student@example.com', 'pass')).rejects.toThrow(
      'confirme que você tem 18 anos ou mais',
    );
    expect(prisma.user.update).not.toHaveBeenCalled();

    await auth.login('student@example.com', 'pass', true);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        adultEligibilityAcceptedAt: expect.any(Date),
        adultEligibilityVersion: AGE_ELIGIBILITY_POLICY_VERSION,
      },
    });
  });
});

describe('AuthService register — UTMs (B07)', () => {
  it('rejects registration without legal acceptance before creating a user', async () => {
    const create = jest.fn();
    const svc = new AuthService(
      { user: { create } } as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await expect(
      svc.register({
        email: 'novo@example.com',
        name: 'Novo',
        password: '12345678',
      } as any),
    ).rejects.toThrow('aceitar os Termos de Uso');
    expect(create).not.toHaveBeenCalled();
  });

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
    const mailerReg: any = { sendVerificationCode: jest.fn().mockResolvedValue(undefined) };
    prismaReg.$transaction = jest.fn(async (fn: any) =>
      fn({
        emailVerificationCode: {
          deleteMany: jest.fn().mockResolvedValue({}),
          create: jest.fn().mockResolvedValue({}),
        },
      }),
    );
    const svc = new AuthService(prismaReg, jwtReg, configReg, mailerReg);
    const res = await svc.register({
      ...LEGAL_ACCEPTANCE,
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
        termsAcceptedAt: expect.any(Date),
        termsVersion: expect.any(String),
        privacyAcknowledgedAt: expect.any(Date),
        privacyVersion: expect.any(String),
        adultEligibilityAcceptedAt: expect.any(Date),
        adultEligibilityVersion: AGE_ELIGIBILITY_POLICY_VERSION,
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
    const mailerReg: any = { sendVerificationCode: jest.fn().mockResolvedValue(undefined) };
    prismaReg.$transaction = jest.fn(async (fn: any) =>
      fn({
        emailVerificationCode: {
          deleteMany: jest.fn().mockResolvedValue({}),
          create: jest.fn().mockResolvedValue({}),
        },
      }),
    );
    return { svc: new AuthService(prismaReg, jwtReg, configReg, mailerReg), create };
  }

  const dto = {
    ...LEGAL_ACCEPTANCE,
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
      ...LEGAL_ACCEPTANCE,
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
    const mailerReg: any = { sendVerificationCode: jest.fn().mockResolvedValue(undefined) };
    prismaReg.$transaction = jest.fn(async (fn: any) =>
      fn({
        emailVerificationCode: {
          deleteMany: jest.fn().mockResolvedValue({}),
          create: jest.fn().mockResolvedValue({}),
        },
      }),
    );
    return { svc: new AuthService(prismaReg, jwtReg, configReg, mailerReg), create };
  }

  it('persiste o nível declarado como careerTier da conta', async () => {
    const { svc, create } = makeRegisterService();

    await svc.register({
      ...LEGAL_ACCEPTANCE,
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
      ...LEGAL_ACCEPTANCE,
      email: 'fria2@example.com',
      name: 'Sem Nivel',
      password: '12345678',
    } as any);

    expect(create.mock.calls[0][0].data.careerTier).toBeUndefined();
  });
});

describe('AuthService register — diagnóstico aberto e trilha dinâmica', () => {
  function makeExtendedService(opts: {
    evaluateExplanation?: jest.Mock;
    createForUser?: jest.Mock;
  } = {}) {
    const create = jest.fn().mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'user-22', ...data }),
    );
    const prismaReg: any = {
      user: { create, findUnique: jest.fn() },
      refreshToken: { create: jest.fn().mockResolvedValue({ id: 'rt-22' }) },
      $transaction: jest.fn(async (fn: any) =>
        fn({
          emailVerificationCode: {
            deleteMany: jest.fn().mockResolvedValue({}),
            create: jest.fn().mockResolvedValue({}),
          },
        }),
      ),
    };
    const jwtReg: any = { signAsync: jest.fn().mockResolvedValue('signed-token') };
    const configReg: any = {
      get: jest.fn((key: string, def?: any) => {
        if (key === 'JWT_ACCESS_SECRET') return 'configured-secret';
        return def;
      }),
    };
    const mailerReg: any = { sendVerificationCode: jest.fn().mockResolvedValue(undefined) };
    const dynamicTrack = {
      createForUser: opts.createForUser ?? jest.fn().mockResolvedValue({}),
    };
    const registrationLevel = {
      evaluateExplanation:
        opts.evaluateExplanation ??
        jest.fn().mockResolvedValue({
          detectedLevel: 'mid',
          levelLabel: 'Pleno',
          confidence: 'high',
          feedback: 'Ótima leitura!',
          detectedConcepts: ['Prepared statements'],
          source: 'llm',
        }),
    };
    const svc = new AuthService(
      prismaReg,
      jwtReg,
      configReg,
      mailerReg,
      dynamicTrack as any,
      registrationLevel as any,
    );
    return { svc, create, dynamicTrack, registrationLevel };
  }

  it('avalia challengeExplanation no servidor, grava careerTier e envia snapshot completo ao dynamicTrack', async () => {
    const { svc, create, dynamicTrack, registrationLevel } = makeExtendedService();

    await svc.register({
      ...LEGAL_ACCEPTANCE,
      email: 'diag@example.com',
      name: 'Aluna Diagnostico',
      password: '12345678',
      hasProgrammedBefore: true,
      priorLanguage: 'php',
      challengeId: 'reg-php-v1',
      challengeExplanation: 'Usa prepared statement para evitar SQL injection.',
      detectedLevel: 'junior',
      primaryTechnology: 'Laravel',
      careerGoal: 'backend',
      weeklyTimeCommitment: '10h',
    } as any);

    expect(registrationLevel.evaluateExplanation).toHaveBeenCalledWith({
      hasProgrammedBefore: true,
      language: 'php',
      challengeId: 'reg-php-v1',
      explanation: 'Usa prepared statement para evitar SQL injection.',
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ careerTier: 'mid' }),
    });
    expect(dynamicTrack.createForUser).toHaveBeenCalledWith('user-22', {
      expLevel: 'mid',
      timeCommitment: '10h',
      careerGoal: 'backend',
      careerGoals: ['backend'],
      sourceTrack: null,
      diagnosticTrackId: null,
      primaryTechnology: 'Laravel',
      hasProgrammedBefore: true,
      priorLanguage: 'php',
      challengeId: 'reg-php-v1',
      assessmentSource: 'llm',
    });
  });

  it('normaliza múltiplos careerGoals sem careerGoal usando careerGoals[0] como objetivo principal', async () => {
    const { svc, dynamicTrack } = makeExtendedService();

    await svc.register({
      ...LEGAL_ACCEPTANCE,
      email: 'multigoals@example.com',
      name: 'Multi Objetivos',
      password: '12345678',
      careerGoals: ['mlops', 'cloud_architect', 'mlops'],
    } as any);

    expect(dynamicTrack.createForUser).toHaveBeenCalledWith(
      'user-22',
      expect.objectContaining({
        careerGoal: 'mlops',
        careerGoals: ['mlops', 'cloud_architect'],
      }),
    );
  });

  it('combina careerGoal e careerGoals preservando primaryGoal na lista normalizada', async () => {
    const { svc, dynamicTrack } = makeExtendedService();

    await svc.register({
      ...LEGAL_ACCEPTANCE,
      email: 'bothgoals@example.com',
      name: 'Ambos Objetivos',
      password: '12345678',
      careerGoal: 'blockchain',
      careerGoals: ['embedded_iot', 'automation_rpa'],
    } as any);

    expect(dynamicTrack.createForUser).toHaveBeenCalledWith(
      'user-22',
      expect.objectContaining({
        careerGoal: 'blockchain',
        careerGoals: ['blockchain', 'embedded_iot', 'automation_rpa'],
      }),
    );
  });

  it('ignora nível calculado pelo cliente quando registrationLevel falha', async () => {
    const { svc, create, dynamicTrack } = makeExtendedService({
      evaluateExplanation: jest.fn().mockRejectedValue(new Error('erro inesperado')),
    });

    await svc.register({
      ...LEGAL_ACCEPTANCE,
      email: 'fallback@example.com',
      name: 'Fallback',
      password: '12345678',
      hasProgrammedBefore: true,
      challengeExplanation: 'Percorre a lista.',
      detectedLevel: 'junior',
      careerGoal: 'qa',
    } as any);

    expect(create.mock.calls[0][0].data.careerTier).toBeUndefined();
    expect(dynamicTrack.createForUser).toHaveBeenCalledWith(
      'user-22',
      expect.objectContaining({
        expLevel: null,
        careerGoal: 'qa',
        assessmentSource: 'fallback',
      }),
    );
  });

  it('grava beginner quando hasProgrammedBefore=false sem explicação', async () => {
    const { svc, create, dynamicTrack } = makeExtendedService({
      evaluateExplanation: jest.fn().mockResolvedValue({
        detectedLevel: 'beginner',
        levelLabel: 'Iniciante',
        confidence: 'high',
        feedback: 'Bem-vindo!',
        detectedConcepts: [],
        source: 'heuristic',
      }),
    });

    await svc.register({
      ...LEGAL_ACCEPTANCE,
      email: 'zero@example.com',
      name: 'Iniciante',
      password: '12345678',
      hasProgrammedBefore: false,
      careerGoal: 'frontend',
      primaryTechnology: 'React',
    } as any);

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ careerTier: 'beginner' }),
    });
    expect(dynamicTrack.createForUser).toHaveBeenCalledWith(
      'user-22',
      expect.objectContaining({
        expLevel: 'beginner',
        careerGoal: 'frontend',
        primaryTechnology: 'React',
        hasProgrammedBefore: false,
        assessmentSource: 'heuristic',
      }),
    );
  });
});