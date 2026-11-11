import { ConfigError } from '../config/secrets.validation';
import {
  assertOAuthEnvComplete,
  isOAuthConfigured,
  oauthCallbackUrl,
} from './oauth.config';

function configMock(vars: Record<string, string | undefined>) {
  return {
    get: jest.fn((key: string, def?: any) => vars[key] ?? def),
  } as any;
}

describe('oauth.config', () => {
  describe('isOAuthConfigured', () => {
    it('false quando nenhuma var está definida (OAuth desabilitado)', () => {
      const config = configMock({});
      expect(isOAuthConfigured('google', config)).toBe(false);
      expect(isOAuthConfigured('github', config)).toBe(false);
    });

    it('true quando ID + secret estão definidos', () => {
      const config = configMock({
        GOOGLE_CLIENT_ID: 'id',
        GOOGLE_CLIENT_SECRET: 'secret',
        GITHUB_CLIENT_ID: 'id',
        GITHUB_CLIENT_SECRET: 'secret',
      });
      expect(isOAuthConfigured('google', config)).toBe(true);
      expect(isOAuthConfigured('github', config)).toBe(true);
    });

    it('false quando só uma das vars está definida (parcial)', () => {
      const config = configMock({ GOOGLE_CLIENT_ID: 'id' });
      expect(isOAuthConfigured('google', config)).toBe(false);
    });
  });

  describe('assertOAuthEnvComplete (fail-closed no boot)', () => {
    it('não lança quando nenhuma var está definida', () => {
      expect(() =>
        assertOAuthEnvComplete('google', configMock({})),
      ).not.toThrow();
    });

    it('não lança quando as duas vars estão definidas', () => {
      expect(() =>
        assertOAuthEnvComplete('github', configMock({
          GITHUB_CLIENT_ID: 'id',
          GITHUB_CLIENT_SECRET: 'secret',
        })),
      ).not.toThrow();
    });

    it('lança ConfigError nomeando o secret quando só o ID está definido', () => {
      expect(() =>
        assertOAuthEnvComplete('google', configMock({ GOOGLE_CLIENT_ID: 'id' })),
      ).toThrow(ConfigError);
      expect(() =>
        assertOAuthEnvComplete('google', configMock({ GOOGLE_CLIENT_ID: 'id' })),
      ).toThrow('GOOGLE_CLIENT_SECRET');
    });

    it('lança ConfigError nomeando o ID quando só o secret está definido', () => {
      expect(() =>
        assertOAuthEnvComplete('github', configMock({ GITHUB_CLIENT_SECRET: 's' })),
      ).toThrow('GITHUB_CLIENT_ID');
    });
  });

  describe('oauthCallbackUrl', () => {
    it('usa o default de dev quando a var não está definida', () => {
      const config = configMock({});
      expect(oauthCallbackUrl('google', config)).toBe(
        'http://localhost:3000/auth/google/callback',
      );
      expect(oauthCallbackUrl('github', config)).toBe(
        'http://localhost:3000/auth/github/callback',
      );
    });

    it('usa a URL explícita quando definida (produção HTTPS)', () => {
      const config = configMock({
        GOOGLE_CALLBACK_URL: 'https://nexus.exemplo.com/auth/google/callback',
      });
      expect(oauthCallbackUrl('google', config)).toBe(
        'https://nexus.exemplo.com/auth/google/callback',
      );
    });
  });
});
