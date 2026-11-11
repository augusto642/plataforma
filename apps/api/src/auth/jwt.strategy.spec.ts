import { ConfigError } from '../config/secrets.validation';
import {
  JwtStrategy,
  extractAccessTokenFromRequest,
} from './strategies/jwt.strategy';

const configStub = {
  get: jest.fn((key: string, def?: any) =>
    key === 'JWT_ACCESS_SECRET' ? undefined : def,
  ),
};

describe('JwtStrategy (fail-fast secret)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws a ConfigError when JWT_ACCESS_SECRET is missing', () => {
    expect(() => new JwtStrategy(configStub as any)).toThrow(ConfigError);
    expect(() => new JwtStrategy(configStub as any)).toThrow(
      /JWT_ACCESS_SECRET/,
    );
  });

  it('is constructed when the secret is configured and resolves the payload', async () => {
    configStub.get.mockImplementation((key: string, def?: any) =>
      key === 'JWT_ACCESS_SECRET' ? 'configured-secret' : def,
    );

    const strategy = new JwtStrategy(configStub as any);
    expect(strategy).toBeDefined();

    // Regressão: antes este teste era fire-and-forget (.then() sem await),
    // passando mesmo que validate() rejeitasse ou a asserção falhasse.
    const result = await strategy.validate({
      sub: 'user-1',
      email: 'a@b.com',
      role: 'student',
    });
    expect(result).toEqual({
      id: 'user-1',
      sub: 'user-1',
      email: 'a@b.com',
      role: 'student',
    });
  });
});

describe('extractAccessTokenFromRequest (M15 — cookie-only)', () => {
  it('extrai o token do cookie httpOnly access_token', () => {
    expect(
      extractAccessTokenFromRequest({
        headers: { cookie: 'other=x; access_token=tok-123; foo=bar' },
      }),
    ).toBe('tok-123');
  });

  it('REJEITA Authorization: Bearer sem cookie (401 no guard)', () => {
    // O extrator nem lê o header Authorization: Bearer sozinho não autentica.
    expect(
      extractAccessTokenFromRequest({
        headers: { authorization: 'Bearer tok-roubado' },
      } as any),
    ).toBeNull();
    expect(
      extractAccessTokenFromRequest({
        headers: { cookie: 'other=x', authorization: 'Bearer tok-roubado' },
      } as any),
    ).toBeNull();
  });

  it('prefere o cookie mesmo quando um Bearer é enviado junto', () => {
    expect(
      extractAccessTokenFromRequest({
        headers: {
          cookie: 'access_token=cookie-tok',
          authorization: 'Bearer outro-tok',
        },
      } as any),
    ).toBe('cookie-tok');
  });

  it('retorna null sem request/headers/cookie', () => {
    expect(extractAccessTokenFromRequest(undefined)).toBeNull();
    expect(extractAccessTokenFromRequest(null)).toBeNull();
    expect(extractAccessTokenFromRequest({})).toBeNull();
    expect(extractAccessTokenFromRequest({ headers: {} })).toBeNull();
  });
});