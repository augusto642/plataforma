import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from './cookies.util';
import { OAuthProfile } from './oauth.config';

/**
 * OAuth — callback do controller: emite os MESMOS cookies do login por
 * senha e redireciona para o web app. Sem `req.user`, volta ao login com
 * erro genérico (sem 500).
 */
describe('AuthController — OAuth callbacks', () => {
  let controller: AuthController;
  let auth: { loginWithOAuth: jest.Mock };
  let res: {
    cookie: jest.Mock;
    redirect: jest.Mock;
  };

  const tokens = {
    accessToken: 'access.jwt.token',
    refreshToken: '***',
    user: { id: 'u1', email: 'a@b.com', name: 'A', role: 'student' },
  };

  const profile: OAuthProfile = {
    provider: 'google',
    providerId: 'google-123',
    email: 'a@b.com',
    emailVerified: true,
    name: 'A',
  };

  beforeEach(() => {
    auth = { loginWithOAuth: jest.fn().mockResolvedValue(tokens) };
    controller = new AuthController(
      auth as unknown as AuthService,
      { get: jest.fn() } as any,
    );
    res = { cookie: jest.fn(), redirect: jest.fn() };
  });

  it('callback Google: grava os cookies httpOnly e redireciona ao /dashboard', async () => {
    await controller.googleCallback({ user: profile } as any, res as any);
    expect(auth.loginWithOAuth).toHaveBeenCalledWith(profile);
    expect(res.cookie).toHaveBeenCalledWith(
      ACCESS_TOKEN_COOKIE,
      tokens.accessToken,
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      REFRESH_TOKEN_COOKIE,
      tokens.refreshToken,
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.redirect).toHaveBeenCalledWith(
      'http://localhost:3001/dashboard',
    );
  });

  it('callback GitHub: mesmo contrato (cookies + redirect)', async () => {
    const ghProfile: OAuthProfile = { ...profile, provider: 'github', providerId: 'gh-9' };
    await controller.githubCallback({ user: ghProfile } as any, res as any);
    expect(auth.loginWithOAuth).toHaveBeenCalledWith(ghProfile);
    expect(res.redirect).toHaveBeenCalledWith(
      'http://localhost:3001/dashboard',
    );
  });

  it('sem req.user, volta ao login com oauth_failed (sem 500, sem cookie)', async () => {
    await controller.googleCallback({} as any, res as any);
    expect(auth.loginWithOAuth).not.toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(
      'http://localhost:3001/login?oauth_error=oauth_failed',
    );
  });
});
