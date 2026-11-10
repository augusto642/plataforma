import { UnauthorizedException } from '@nestjs/common';
import { ErrorCodes, withErrorCode } from '../common/errors/error-codes';
import {
  OAuthCallbackExceptionFilter,
  oauthErrorCodeFromErrorCode,
  oauthErrorRedirectUrl,
} from './oauth-callback.filter';

describe('oauthErrorCodeFromErrorCode', () => {
  it('mapeia cada errorCode OAuth para o código da query string', () => {
    expect(
      oauthErrorCodeFromErrorCode(ErrorCodes.AUTH_OAUTH_UNAVAILABLE),
    ).toBe('oauth_unavailable');
    expect(
      oauthErrorCodeFromErrorCode(ErrorCodes.AUTH_OAUTH_EMAIL_REQUIRED),
    ).toBe('email_required');
    expect(
      oauthErrorCodeFromErrorCode(ErrorCodes.AUTH_OAUTH_EMAIL_UNVERIFIED),
    ).toBe('email_unverified');
    expect(
      oauthErrorCodeFromErrorCode(
        ErrorCodes.AUTH_OAUTH_GITHUB_EMAILS_UNAVAILABLE,
      ),
    ).toBe('github_emails_unavailable');
  });

  it('código desconhecido vira oauth_failed (genérico, sem vazar detalhe)', () => {
    expect(oauthErrorCodeFromErrorCode('ALGUM_OUTRO')).toBe('oauth_failed');
    expect(oauthErrorCodeFromErrorCode(undefined)).toBe('oauth_failed');
  });
});

describe('OAuthCallbackExceptionFilter', () => {
  const OLD_WEB_PUBLIC_URL = process.env.WEB_PUBLIC_URL;
  const OLD_WEB_URL = process.env.WEB_URL;

  beforeEach(() => {
    delete process.env.WEB_PUBLIC_URL;
    delete process.env.WEB_URL;
  });

  afterAll(() => {
    if (OLD_WEB_PUBLIC_URL !== undefined)
      process.env.WEB_PUBLIC_URL = OLD_WEB_PUBLIC_URL;
    if (OLD_WEB_URL !== undefined) process.env.WEB_URL = OLD_WEB_URL;
  });

  function hostWithRedirect() {
    const redirect = jest.fn();
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ redirect }),
        getRequest: () => ({}),
      }),
    } as any;
    return { host, redirect };
  }

  it('redireciona e-mail não verificado para /login?oauth_error=email_unverified', () => {
    const filter = new OAuthCallbackExceptionFilter();
    const { host, redirect } = hostWithRedirect();
    filter.catch(
      new UnauthorizedException(
        withErrorCode('x', ErrorCodes.AUTH_OAUTH_EMAIL_UNVERIFIED),
      ),
      host,
    );
    expect(redirect).toHaveBeenCalledWith(
      'http://localhost:3001/login?oauth_error=email_unverified',
    );
  });

  it('redireciona OAuth não configurado para oauth_unavailable', () => {
    const filter = new OAuthCallbackExceptionFilter();
    const { host, redirect } = hostWithRedirect();
    filter.catch(
      new UnauthorizedException(
        withErrorCode('x', ErrorCodes.AUTH_OAUTH_UNAVAILABLE),
      ),
      host,
    );
    expect(redirect).toHaveBeenCalledWith(
      'http://localhost:3001/login?oauth_error=oauth_unavailable',
    );
  });

  it('erro sem errorCode conhecido vira oauth_failed', () => {
    const filter = new OAuthCallbackExceptionFilter();
    const { host, redirect } = hostWithRedirect();
    filter.catch(new UnauthorizedException('qualquer coisa'), host);
    expect(redirect).toHaveBeenCalledWith(
      'http://localhost:3001/login?oauth_error=oauth_failed',
    );
  });

  it('oauthErrorRedirectUrl usa WEB_PUBLIC_URL quando definida', () => {
    process.env.WEB_PUBLIC_URL = 'https://nexus.exemplo.com';
    expect(oauthErrorRedirectUrl('email_unverified')).toBe(
      'https://nexus.exemplo.com/login?oauth_error=email_unverified',
    );
  });
});
