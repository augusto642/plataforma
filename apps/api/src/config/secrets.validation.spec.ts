import { ConfigError, validateRequiredSecrets } from './secrets.validation';

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
      validateRequiredSecrets({ JWT_ACCESS_SECRET: 's3cret' }),
    ).toThrow(ConfigError);
  });

  it('throws when GITEA is enabled and Gitea secrets are missing', () => {
    expect(() =>
      validateRequiredSecrets({
        JWT_ACCESS_SECRET: 'a',
        JWT_REFRESH_SECRET: 'b',
      }),
    ).toThrow(/GITEA_TOKEN/);
  });

  it('passes with all secrets and GITEA disabled', () => {
    const env = {
      JWT_ACCESS_SECRET: 'a',
      JWT_REFRESH_SECRET: 'b',
      GITEA_ENABLED: 'false',
    };
    expect(validateRequiredSecrets(env)).toBe(env);
  });

  it('passes with all required secrets and GITEA enabled', () => {
    const env = {
      JWT_ACCESS_SECRET: 'a',
      JWT_REFRESH_SECRET: 'b',
      GITEA_TOKEN: 'tok',
      GITEA_WEBHOOK_SECRET: 'whsec',
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
      JWT_ACCESS_SECRET: 'change_me_access_secret',
      JWT_REFRESH_SECRET: 'real-secret-value',
      GITEA_TOKEN: 'tok',
      GITEA_WEBHOOK_SECRET: 'whsec',
    };
    expect(() => validateRequiredSecrets(env)).toThrow(
      /JWT_ACCESS_SECRET.*placeholder|placeholder.*JWT_ACCESS_SECRET/is,
    );
    expect(() => validateRequiredSecrets(env)).toThrow(/Gere segredos reais/);
  });

  it('rejects CHANGE_ME case-insensitively on webhook secret', () => {
    expect(() =>
      validateRequiredSecrets({
        JWT_ACCESS_SECRET: 'a',
        JWT_REFRESH_SECRET: 'b',
        GITEA_TOKEN: 'tok',
        GITEA_WEBHOOK_SECRET: 'CHANGE_ME',
      }),
    ).toThrow(ConfigError);
  });
});