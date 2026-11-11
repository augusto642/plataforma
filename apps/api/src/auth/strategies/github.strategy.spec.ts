import { UnauthorizedException } from '@nestjs/common';
import { resolveGitHubPrimaryVerifiedEmail } from './github.strategy';

describe('resolveGitHubPrimaryVerifiedEmail', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function mockFetch(emails: Array<{ email: string; primary: boolean; verified: boolean }>, ok = true) {
    global.fetch = jest.fn().mockResolvedValue({
      ok,
      json: jest.fn().mockResolvedValue(emails),
    }) as any;
  }

  it('devolve o e-mail primário verificado', async () => {
    mockFetch([
      { email: 'secundario@example.com', primary: false, verified: true },
      { email: 'primario@example.com', primary: true, verified: true },
    ]);
    await expect(
      resolveGitHubPrimaryVerifiedEmail('token-123'),
    ).resolves.toBe('primario@example.com');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.github.com/user/emails',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      }),
    );
  });

  it('recusa quando não há e-mail primário verificado (privado/nulo)', async () => {
    mockFetch([
      { email: 'so-secundario@example.com', primary: false, verified: true },
      { email: 'nao-verificado@example.com', primary: true, verified: false },
    ]);
    await expect(
      resolveGitHubPrimaryVerifiedEmail('token-123'),
    ).rejects.toThrow(UnauthorizedException);
    try {
      await resolveGitHubPrimaryVerifiedEmail('token-123');
    } catch (err: any) {
      expect(err.message).toMatch(/e-mail primário verificado/);
    }
  });

  it('recusa com erro honesto quando o GitHub responde não-2xx', async () => {
    mockFetch([], false);
    await expect(
      resolveGitHubPrimaryVerifiedEmail('token-ruim'),
    ).rejects.toThrow(UnauthorizedException);
    try {
      await resolveGitHubPrimaryVerifiedEmail('token-ruim');
    } catch (err: any) {
      expect(err.message).toMatch(/Não foi possível ler seu e-mail do GitHub/);
    }
  });

  it('recusa com erro honesto quando a rede falha', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('boom')) as any;
    await expect(
      resolveGitHubPrimaryVerifiedEmail('token-123'),
    ).rejects.toThrow(UnauthorizedException);
  });
});
