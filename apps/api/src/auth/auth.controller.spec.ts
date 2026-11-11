import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from './cookies.util';

/**
 * Regressão do finding ALTA — AppSec (tokens no body + localStorage):
 * o fluxo é 100% por cookies httpOnly. Nenhuma resposta de auth pode
 * conter accessToken/refreshToken no corpo.
 */
describe('AuthController (cookie-only auth)', () => {
  const REFRESH_VALUE = '***';
  let controller: AuthController;
  let auth: {
    register: jest.Mock;
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
    verifyEmail: jest.Mock;
    resendCode: jest.Mock;
  };
  let res: { cookie: jest.Mock; clearCookie: jest.Mock };
  let req: { headers: Record<string, string | undefined> };

  const tokens = {
    accessToken: 'access.jwt.token',
    refreshToken: REFRESH_VALUE,
    user: { id: 'u1', email: 'a@b.com', name: 'A', role: 'student' },
  };

  beforeEach(() => {
    auth = {
      register: jest
        .fn()
        .mockResolvedValue({ user: tokens.user, emailVerificationRequired: true }),
      login: jest.fn().mockResolvedValue(tokens),
      refresh: jest.fn().mockResolvedValue(tokens),
      logout: jest.fn().mockResolvedValue(undefined),
      verifyEmail: jest.fn().mockResolvedValue(tokens),
      resendCode: jest.fn().mockResolvedValue({ message: 'ok' }),
    };
    controller = new AuthController(
      auth as unknown as AuthService,
      { get: jest.fn() } as any,
    );
    res = { cookie: jest.fn(), clearCookie: jest.fn() };
    req = { headers: {} };
  });

  function cookiesSet(): Record<string, { value: string; options: any }> {
    const out: Record<string, { value: string; options: any }> = {};
    for (const [name, value, options] of res.cookie.mock.calls) {
      out[name] = { value, options };
    }
    return out;
  }

  it('login sets httpOnly cookies and returns ONLY the user profile in the body', async () => {
    const body = await controller.login(
      { email: 'a@b.com', password: 'pass' } as any,
      res as any,
    );

    expect(body).toEqual({ user: tokens.user });
    expect(JSON.stringify(body)).not.toContain(tokens.accessToken);
    expect(JSON.stringify(body)).not.toContain(tokens.refreshToken);

    const cookies = cookiesSet();
    expect(cookies[ACCESS_TOKEN_COOKIE].value).toBe(tokens.accessToken);
    expect(cookies[REFRESH_TOKEN_COOKIE].value).toBe(tokens.refreshToken);
    expect(cookies[ACCESS_TOKEN_COOKIE].options.httpOnly).toBe(true);
    expect(cookies[REFRESH_TOKEN_COOKIE].options.httpOnly).toBe(true);
    expect(cookies[ACCESS_TOKEN_COOKIE].options.sameSite).toBeDefined();
  });

  /**
   * C5: o cadastro NÃO cria sessão — nenhum cookie é emitido e o corpo traz
   * emailVerificationRequired. A sessão só nasce em POST /auth/verify-email.
   */
  it('register returns NO cookies and flags emailVerificationRequired', async () => {
    const body = await controller.register(
      { email: 'a@b.com', password: 'pass', name: 'A' } as any,
    );

    expect(body).toEqual({ user: tokens.user, emailVerificationRequired: true });
    expect(res.cookie).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain(tokens.accessToken);
  });

  it('verify-email sets httpOnly cookies and returns ONLY the user profile', async () => {
    const body = await controller.verifyEmail(
      { email: 'a@b.com', code: '123456' } as any,
      res as any,
    );

    expect(auth.verifyEmail).toHaveBeenCalledWith('a@b.com', '123456');
    expect(body).toEqual({ user: tokens.user });
    expect(cookiesSet()[REFRESH_TOKEN_COOKIE].value).toBe(tokens.refreshToken);
    expect(cookiesSet()[ACCESS_TOKEN_COOKIE].options.httpOnly).toBe(true);
    expect(JSON.stringify(body)).not.toContain(tokens.accessToken);
  });

  it('resend-code returns the service message and sets no cookies', async () => {
    const body = await controller.resendCode({ email: 'a@b.com' } as any);

    expect(auth.resendCode).toHaveBeenCalledWith('a@b.com');
    expect(body).toEqual({ message: 'ok' });
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('refresh reads the token from the cookie, not from the body', async () => {
    req.headers.cookie = `${REFRESH_TOKEN_COOKIE}=${REFRESH_VALUE}; other=1`;
    const body = await controller.refresh(req as any, res as any);

    expect(auth.refresh).toHaveBeenCalledWith(REFRESH_VALUE);
    expect(body).toEqual({ user: tokens.user });
    expect(cookiesSet()[ACCESS_TOKEN_COOKIE].value).toBe(tokens.accessToken);
  });

  it('refresh without the cookie fails with 401 and never rotates tokens', async () => {
    await expect(controller.refresh(req as any, res as any)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(auth.refresh).not.toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('logout revokes the cookie token server-side and clears both cookies', async () => {
    req.headers.cookie = `${REFRESH_TOKEN_COOKIE}=${REFRESH_VALUE}`;
    const body = await controller.logout(req as any, res as any);

    expect(auth.logout).toHaveBeenCalledWith(REFRESH_VALUE);
    expect(res.clearCookie).toHaveBeenCalledWith(ACCESS_TOKEN_COOKIE, { path: '/' });
    expect(res.clearCookie).toHaveBeenCalledWith(REFRESH_TOKEN_COOKIE, { path: '/' });
    expect(body).toBeNull();
  });

  it('logout without cookie still clears the client cookies (best effort)', async () => {
    await controller.logout(req as any, res as any);
    expect(auth.logout).not.toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledTimes(2);
  });
});
