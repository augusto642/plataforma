import { describe, expect, it } from 'vitest';
import { oauthErrorMessage, oauthLoginUrl } from './oauth-errors';

describe('oauthLoginUrl', () => {
  it('aponta para a rota da API (nunca para o provedor direto)', () => {
    expect(oauthLoginUrl('google')).toBe('http://localhost:3000/auth/google');
    expect(oauthLoginUrl('github')).toBe('http://localhost:3000/auth/github');
  });
});

describe('oauthErrorMessage', () => {
  it('null sem código (nada a exibir)', () => {
    expect(oauthErrorMessage(null)).toBeNull();
  });

  it('mensagem em pt-BR por código de falha do callback', () => {
    expect(oauthErrorMessage('oauth_unavailable')).toMatch(
      /ainda não está configurado/,
    );
    expect(oauthErrorMessage('email_unverified')).toMatch(
      /ainda não foi verificado/,
    );
    expect(oauthErrorMessage('email_required')).toMatch(/não informou um e-mail/);
    expect(oauthErrorMessage('github_emails_unavailable')).toMatch(
      /ler seu e-mail do GitHub/,
    );
    expect(oauthErrorMessage('oauth_failed')).toMatch(/Não foi possível entrar/);
  });

  it('código desconhecido cai na mensagem genérica (sem vazar detalhe)', () => {
    expect(oauthErrorMessage('qualquer-coisa')).toBe(
      oauthErrorMessage('oauth_failed'),
    );
  });
});
