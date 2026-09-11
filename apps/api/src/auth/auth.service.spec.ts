import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigError } from '../config/secrets.validation';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({ compare: jest.fn() }));

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