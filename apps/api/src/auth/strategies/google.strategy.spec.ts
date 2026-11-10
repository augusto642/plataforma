import { UnauthorizedException } from '@nestjs/common';
import { normalizeGoogleProfile } from './google.strategy';

function googleProfile(overrides: Record<string, any> = {}): any {
  return {
    id: 'google-123',
    displayName: 'Augusto Fortes',
    emails: [{ value: 'augusto@example.com', verified: true }],
    photos: [{ value: 'https://example.com/photo.jpg' }],
    _json: { email: 'augusto@example.com', email_verified: true },
    ...overrides,
  };
}

describe('normalizeGoogleProfile', () => {
  it('aceita e-mail verificado afirmado pelo Google', () => {
    const profile = normalizeGoogleProfile(googleProfile());
    expect(profile).toEqual({
      provider: 'google',
      providerId: 'google-123',
      email: 'augusto@example.com',
      emailVerified: true,
      name: 'Augusto Fortes',
      avatarUrl: 'https://example.com/photo.jpg',
    });
  });

  it('aceita quando só emails[0].verified afirma a verificação', () => {
    const profile = normalizeGoogleProfile(
      googleProfile({ _json: { email: 'augusto@example.com' } }),
    );
    expect(profile.emailVerified).toBe(true);
  });

  it('recusa e-mail NÃO verificado com erro claro', async () => {
    expect(() =>
      normalizeGoogleProfile(
        googleProfile({
          emails: [{ value: 'augusto@example.com', verified: false }],
          _json: { email: 'augusto@example.com', email_verified: false },
        }),
      ),
    ).toThrow(UnauthorizedException);
    try {
      normalizeGoogleProfile(
        googleProfile({
          emails: [{ value: 'augusto@example.com', verified: false }],
          _json: { email: 'augusto@example.com', email_verified: false },
        }),
      );
    } catch (err: any) {
      expect(err.message).toMatch(/ainda não foi verificado/);
    }
  });

  it('recusa quando o Google não informa e-mail (nunca inventa e-mail)', () => {
    expect(() =>
      normalizeGoogleProfile(
        googleProfile({ emails: [], _json: { email_verified: true } }),
      ),
    ).toThrow(UnauthorizedException);
    try {
      normalizeGoogleProfile(
        googleProfile({ emails: [], _json: { email_verified: true } }),
      );
    } catch (err: any) {
      expect(err.message).toMatch(/não informou um e-mail/);
    }
  });

  it('usa o local-part do e-mail como nome quando não há displayName', () => {
    const profile = normalizeGoogleProfile(
      googleProfile({ displayName: '' }),
    );
    expect(profile.name).toBe('augusto');
  });
});
