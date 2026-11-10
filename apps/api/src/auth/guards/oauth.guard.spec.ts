import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigError } from '../../config/secrets.validation';
import { ErrorCodes } from '../../common/errors/error-codes';
import { GitHubAuthGuard, GoogleAuthGuard } from './oauth.guard';
import { OAUTH_STATE_COOKIE } from '../oauth.state';

function configMock(vars: Record<string, string | undefined>) {
  return {
    get: jest.fn((key: string, def?: any) => vars[key] ?? def),
  } as any;
}

function configuredVars() {
  return {
    GOOGLE_CLIENT_ID: 'id',
    GOOGLE_CLIENT_SECRET: 'secret',
    GITHUB_CLIENT_ID: 'id',
    GITHUB_CLIENT_SECRET: 'secret',
  };
}

/** Contexto HTTP mockado: req com query + cookie, res com cookie/clearCookie. */
function httpContext(query: Record<string, string> = {}, cookie?: string) {
  const req = {
    query,
    headers: { cookie },
  } as any;
  const res = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as any;
  const context = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as any;
  return { context, req, res };
}

describe('OAuth guards (503 honesto quando não configurado)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Google: 503 quando nenhuma var está definida', () => {
    const guard = new GoogleAuthGuard(configMock({}));
    const { context } = httpContext();
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
    const { context } = httpContext();
    expect(() => guard.canActivate(context)).toThrow(
      ServiceUnavailableException,
    );
  });

  it('ConfigError quando só o client ID está definido (parcial = fail-closed)', () => {
    const guard = new GoogleAuthGuard(
      configMock({ GOOGLE_CLIENT_ID: 'id' }),
    );
    const { context } = httpContext();
    expect(() => guard.canActivate(context)).toThrow(ConfigError);
  });

  it('delega ao Passport quando o provedor está configurado', () => {
    const guard = new GoogleAuthGuard(
      configMock({
        GOOGLE_CLIENT_ID: 'id',
        GOOGLE_CLIENT_SECRET: 'secret',
      }),
    );
    const { context } = httpContext();
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

describe('OAuth guards — state anti-CSRF (D1)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function parentCanActivateSpy(guardClass: any) {
    const parentProto = Object.getPrototypeOf(guardClass.prototype);
    return jest
      .spyOn(parentProto, 'canActivate')
      .mockReturnValue(true as any);
  }

  it('início do fluxo: emite o state em cookie httpOnly e o entrega ao Passport', () => {
    const guard = new GoogleAuthGuard(configMock(configuredVars()));
    const { context, res } = httpContext();
    const options = guard.getAuthenticateOptions(context) as any;
    expect(typeof options.state).toBe('string');
    expect(options.state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(res.cookie).toHaveBeenCalledWith(
      OAUTH_STATE_COOKIE,
      options.state,
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('início do fluxo (GitHub): mesmo contrato', () => {
    const guard = new GitHubAuthGuard(configMock(configuredVars()));
    const { context, res } = httpContext();
    const options = guard.getAuthenticateOptions(context) as any;
    expect(typeof options.state).toBe('string');
    expect(res.cookie).toHaveBeenCalledWith(
      OAUTH_STATE_COOKIE,
      options.state,
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('callback: sem state válido → 401 invalid_state e NÃO delega ao Passport', () => {
    const guard = new GoogleAuthGuard(configMock(configuredVars()));
    const spy = parentCanActivateSpy(GoogleAuthGuard);
    // Callback do provedor sem cookie de state (URL forjada pelo atacante).
    const { context } = httpContext({ code: 'codigo-do-atacante' });
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    try {
      guard.canActivate(context);
    } catch (err: any) {
      expect(err.getResponse().errorCode).toBe(
        ErrorCodes.AUTH_OAUTH_INVALID_STATE,
      );
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it('callback: state divergente → 401 e NÃO delega ao Passport', () => {
    const guard = new GoogleAuthGuard(configMock(configuredVars()));
    const spy = parentCanActivateSpy(GoogleAuthGuard);
    const { context } = httpContext(
      { code: 'codigo-do-atacante', state: 'state-do-atacante' },
      `${OAUTH_STATE_COOKIE}=state-da-vitima`,
    );
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(spy).not.toHaveBeenCalled();
  });

  it('callback: state válido → valida, limpa o cookie e delega ao Passport', () => {
    const guard = new GoogleAuthGuard(configMock(configuredVars()));
    const spy = parentCanActivateSpy(GoogleAuthGuard);
    const { context, res } = httpContext(
      { code: 'codigo-legitimo', state: 'state-legitimo' },
      `${OAUTH_STATE_COOKIE}=state-legitimo`,
    );
    expect(guard.canActivate(context)).toBe(true);
    expect(spy).toHaveBeenCalledWith(context);
    expect(res.clearCookie).toHaveBeenCalledWith(OAUTH_STATE_COOKIE, {
      path: '/',
    });
  });

  it('callback: state válido não é reemitido (getAuthenticateOptions não gera novo state)', () => {
    const guard = new GoogleAuthGuard(configMock(configuredVars()));
    const { context, res } = httpContext(
      { code: 'codigo-legitimo', state: 'state-legitimo' },
      `${OAUTH_STATE_COOKIE}=state-legitimo`,
    );
    const options = guard.getAuthenticateOptions(context) as any;
    expect(options.state).toBeUndefined();
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('callback com error do provedor também exige state válido', () => {
    const guard = new GitHubAuthGuard(configMock(configuredVars()));
    const spy = parentCanActivateSpy(GitHubAuthGuard);
    const { context } = httpContext({ error: 'access_denied' });
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(spy).not.toHaveBeenCalled();
  });
});
