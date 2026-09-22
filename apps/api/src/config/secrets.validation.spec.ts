import { ConfigError, validateRequiredSecrets } from './secrets.validation';

const STRONG = (prefix: string) => `${prefix}_0123456789abcdef0123456789abcdef`; // >= 32 chars

describe('validateRequiredSecrets', () => {
  it('throws when no secrets are provided', () => {
    expect(() => validateRequiredSecrets({})).toThrow(ConfigError);
  });

  it('names the missing variables in the error', () => {
    let message = '';
    try {
      validateRequiredSecrets({});
    } catch (e: any) {
      message = e.message;
    }
    expect(message).toContain('JWT_ACCESS_SECRET');
    expect(message).toContain('JWT_REFRESH_SECRET');
    expect(message).toContain('GITEA_TOKEN');
    expect(message).toContain('GITEA_WEBHOOK_SECRET');
  });

  it('throws with only JWT_ACCESS_SECRET set', () => {
    expect(() =>
      validateRequiredSecrets({ JWT_ACCESS_SECRET: STRONG('access') }),
    ).toThrow(ConfigError);
  });

  it('throws when GITEA is enabled and Gitea secrets are missing', () => {
    expect(() =>
      validateRequiredSecrets({
        JWT_ACCESS_SECRET: STRONG('access'),
        JWT_REFRESH_SECRET: STRONG('refresh'),
      }),
    ).toThrow(/GITEA_TOKEN/);
  });

  it('passes with all secrets and GITEA disabled', () => {
    const env = {
      JWT_ACCESS_SECRET: STRONG('access'),
      JWT_REFRESH_SECRET: STRONG('refresh'),
      GITEA_ENABLED: 'false',
    };
    expect(validateRequiredSecrets(env)).toBe(env);
  });

  it('passes with all required secrets and GITEA enabled', () => {
    const env = {
      JWT_ACCESS_SECRET: STRONG('access'),
      JWT_REFRESH_SECRET: STRONG('refresh'),
      GITEA_TOKEN: 'tok',
      GITEA_WEBHOOK_SECRET: STRONG('whsec'),
    };
    expect(validateRequiredSecrets(env)).toBe(env);
  });

  it('passes with NODE_ENV=test even without secrets', () => {
    expect(validateRequiredSecrets({ NODE_ENV: 'test' })).toEqual({
      NODE_ENV: 'test',
    });
  });

  it('rejects placeholder secrets containing change_me (A2 regression)', () => {
    const env = {
      JWT_ACCESS_SECRET: `change_me_access_secret_${'0123456789abcdef'.repeat(3)}`,
      JWT_REFRESH_SECRET: STRONG('refresh'),
      GITEA_TOKEN: 'tok',
      GITEA_WEBHOOK_SECRET: STRONG('whsec'),
    };
    expect(() => validateRequiredSecrets(env)).toThrow(
      /JWT_ACCESS_SECRET.*placeholder|placeholder.*JWT_ACCESS_SECRET/is,
    );
    expect(() => validateRequiredSecrets(env)).toThrow(/Gere segredos reais/);
  });

  it('rejects CHANGE_ME case-insensitively on webhook secret', () => {
    expect(() =>
      validateRequiredSecrets({
        JWT_ACCESS_SECRET: STRONG('access'),
        JWT_REFRESH_SECRET: STRONG('refresh'),
        GITEA_TOKEN: 'tok',
        GITEA_WEBHOOK_SECRET: `CHANGE_ME_${'0123456789abcdef'.repeat(3)}`,
      }),
    ).toThrow(ConfigError);
  });

  // Regressão do finding BAIXA — AppSec: segredos fracos/curtos ('123456')
  // passavam pela validação anterior (só 'change_me' era bloqueado).
  describe('weak secret length enforcement (>= 32 chars)', () => {
    it("rejects short secrets like '123456'", () => {
      expect(() =>
        validateRequiredSecrets({
          JWT_ACCESS_SECRET: '123456',
          JWT_REFRESH_SECRET: STRONG('refresh'),
          GITEA_TOKEN: 'tok',
          GITEA_WEBHOOK_SECRET: STRONG('whsec'),
        }),
      ).toThrow(/Weak secret value.*JWT_ACCESS_SECRET/s);
    });

    it('rejects weak GITEA_WEBHOOK_SECRET even when JWT secrets are strong', () => {
      expect(() =>
        validateRequiredSecrets({
          JWT_ACCESS_SECRET: STRONG('access'),
          JWT_REFRESH_SECRET: STRONG('refresh'),
          GITEA_TOKEN: 'tok',
          GITEA_WEBHOOK_SECRET: 'shortwebhook',
        }),
      ).toThrow(/Weak secret value.*GITEA_WEBHOOK_SECRET/s);
    });

    it('rejects secrets with exactly 31 chars and accepts 32', () => {
      const base = {
        GITEA_TOKEN: 'tok',
        GITEA_ENABLED: 'false',
      };
      expect(() =>
        validateRequiredSecrets({
          ...base,
          JWT_ACCESS_SECRET: 'a'.repeat(31),
          JWT_REFRESH_SECRET: 'b'.repeat(32),
        }),
      ).toThrow(/Weak secret/);

      expect(
        validateRequiredSecrets({
          ...base,
          JWT_ACCESS_SECRET: 'a'.repeat(32),
          JWT_REFRESH_SECRET: 'b'.repeat(32),
        }),
      ).toBeDefined();
    });

    it('names every weak secret in the error message', () => {
      let message = '';
      try {
        validateRequiredSecrets({
          JWT_ACCESS_SECRET: '123456',
          JWT_REFRESH_SECRET: 'abc',
          GITEA_TOKEN: 'tok',
          GITEA_WEBHOOK_SECRET: 'xyz',
        });
      } catch (e: any) {
        message = e.message;
      }
      expect(message).toContain('JWT_ACCESS_SECRET');
      expect(message).toContain('JWT_REFRESH_SECRET');
      expect(message).toContain('GITEA_WEBHOOK_SECRET');
      expect(message).toContain('mínimo de 32');
    });

    it('still bypasses length checks with NODE_ENV=test', () => {
      expect(
        validateRequiredSecrets({
          NODE_ENV: 'test',
          JWT_ACCESS_SECRET: '123456',
        }),
      ).toBeDefined();
    });
  });
});
