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
      register: jest.fn().mockResolvedValue(tokens),
      login: jest.fn().mockResolvedValue(tokens),
      refresh: jest.fn().mockResolvedValue(tokens),
      logout: jest.fn().mockResolvedValue(undefined),
    };
    controller = new AuthController(auth as unknown as AuthService);
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

  it('register sets httpOnly cookies and returns ONLY the user profile', async () => {
    const body = await controller.register(
      { email: 'a@b.com', password: 'pass', name: 'A' } as any,
      res as any,
    );

    expect(body).toEqual({ user: tokens.user });
    expect(cookiesSet()[REFRESH_TOKEN_COOKIE].value).toBe(tokens.refreshToken);
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
