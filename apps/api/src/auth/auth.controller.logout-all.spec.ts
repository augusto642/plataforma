import 'reflect-metadata';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from './cookies.util';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

/**
 * A2 (Lote 2) — POST /auth/logout-all: revoga todos os refresh tokens do
 * usuário autenticado e limpa os cookies da sessão atual.
 */
describe('AuthController — A2 POST /auth/logout-all', () => {
  let controller: AuthController;
  let auth: { revokeAllForUser: jest.Mock; logout: jest.Mock };
  let res: { cookie: jest.Mock; clearCookie: jest.Mock };

  beforeEach(() => {
    auth = {
      revokeAllForUser: jest.fn().mockResolvedValue(undefined),
      logout: jest.fn().mockResolvedValue(undefined),
    };
    controller = new AuthController(
      auth as unknown as AuthService,
      { get: jest.fn() } as any,
    );
    res = { cookie: jest.fn(), clearCookie: jest.fn() };
  });

  it('revokes all refresh tokens of the authenticated user and clears both cookies', async () => {
    const body = await controller.logoutAll(
      { sub: 'u1', email: 'a@b.com', role: 'student' } as any,
      res as any,
    );

    expect(body).toBeNull();
    expect(auth.revokeAllForUser).toHaveBeenCalledWith('u1');
    expect(auth.revokeAllForUser).toHaveBeenCalledTimes(1);
    expect(res.clearCookie).toHaveBeenCalledWith(ACCESS_TOKEN_COOKIE, {
      path: '/',
    });
    expect(res.clearCookie).toHaveBeenCalledWith(REFRESH_TOKEN_COOKIE, {
      path: '/',
    });
  });

  it('is NOT public: the handler overrides the class-level @Public() so the JwtAuthGuard requires a JWT', () => {
    // JwtAuthGuard usa getAllAndOverride(handler, class): o metadado do
    // método (false) vence o da classe (true).
    const flag = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      AuthController.prototype.logoutAll,
    );
    expect(flag).toBe(false);
  });
});
