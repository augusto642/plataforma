import { ConfigError } from '../config/secrets.validation';
import { JwtStrategy } from './strategies/jwt.strategy';

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