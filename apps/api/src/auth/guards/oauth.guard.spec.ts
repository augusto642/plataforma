import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigError } from '../../config/secrets.validation';
import { GitHubAuthGuard, GoogleAuthGuard } from './oauth.guard';

function configMock(vars: Record<string, string | undefined>) {
  return {
    get: jest.fn((key: string, def?: any) => vars[key] ?? def),
  } as any;
}

describe('OAuth guards (503 honesto quando não configurado)', () => {
  const context = {} as any;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Google: 503 quando nenhuma var está definida', () => {
    const guard = new GoogleAuthGuard(configMock({}));
    expect(() => guard.canActivate(context)).toThrow(
      ServiceUnavailableException,
    );
    try {
      guard.canActivate(context);
    } catch (err: any) {
      expect(err.message).toMatch(/ainda não está configurado/);
    }
  });

  it('GitHub: 503 quando nenhuma var está definida', () => {
    const guard = new GitHubAuthGuard(configMock({}));
    expect(() => guard.canActivate(context)).toThrow(
      ServiceUnavailableException,
    );
  });

  it('ConfigError quando só o client ID está definido (parcial = fail-closed)', () => {
    const guard = new GoogleAuthGuard(
      configMock({ GOOGLE_CLIENT_ID: 'id' }),
    );
    expect(() => guard.canActivate(context)).toThrow(ConfigError);
  });

  it('delega ao Passport quando o provedor está configurado', () => {
    const guard = new GoogleAuthGuard(
      configMock({
        GOOGLE_CLIENT_ID: 'id',
        GOOGLE_CLIENT_SECRET: 'secret',
      }),
    );
    // O super.canActivate é o AuthGuard('google') do Passport: aqui ele é
    // stubado para provar só a delegação (o fluxo real é coberto pelo
    // teste de integração manual com o provedor — ver docs/oauth-setup.md).
    const parentProto = Object.getPrototypeOf(GoogleAuthGuard.prototype);
    const spy = jest
      .spyOn(parentProto, 'canActivate')
      .mockReturnValue(true as any);
    expect(guard.canActivate(context)).toBe(true);
    expect(spy).toHaveBeenCalledWith(context);
  });
});
