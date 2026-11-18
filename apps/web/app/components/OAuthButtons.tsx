'use client';

import React from 'react';
import Link from 'next/link';
import { API_BASE } from '../lib/apiClient';
import { oauthLoginUrl, type OAuthProviderId } from '../lib/oauth-errors';
import styles from './AuthView.module.css';

type OAuthButtonsProps = {
  dividerText?: string | null;
  appearance?: 'default' | 'access';
  requireConsent?: boolean;
};

/**
 * Botões reais de OAuth (Google/GitHub). O login pode começar sem novos
 * aceites; o callback solicita as confirmações quando a conta precisa delas.
 *
 * Se o OAuth não estiver configurado no servidor, o callback devolve
 * `/login?oauth_error=oauth_unavailable` e a tela de login exibe o erro
 * honesto — o botão nunca preenche credencial nem cria sessão local.
 */
export function OAuthButtons({ dividerText = 'ou continue com', appearance = 'default', requireConsent = true }: OAuthButtonsProps = {}) {
  const [adultConfirmed, setAdultConfirmed] = React.useState(false);
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = React.useState(false);
  const [starting, setStarting] = React.useState<OAuthProviderId | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const startOAuth = async (provider: OAuthProviderId) => {
    if (!requireConsent) {
      window.location.assign(oauthLoginUrl(provider));
      return;
    }
    setStarting(provider);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/auth/oauth-legal-consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ adultConfirmed, termsAccepted, privacyAcknowledged }),
      });
      if (!response.ok) throw new Error('consent-not-recorded');
      window.location.assign(oauthLoginUrl(provider));
    } catch {
      setError('Não foi possível registrar as confirmações. Tente novamente.');
      setStarting(null);
    }
  };

  const disabled = starting !== null || (requireConsent && (!adultConfirmed || !termsAccepted || !privacyAcknowledged));
  const branded = appearance === 'access';
  const consentClass = branded ? styles.consent : 'flex items-start gap-2 text-xs leading-relaxed text-dark-on-surface-variant';
  const checkboxClass = branded ? undefined : 'mt-0.5 h-4 w-4 shrink-0 accent-[#8257E5]';
  const linkClass = branded ? undefined : 'text-primary underline';
  const buttonClass = branded ? styles.oauthButton : 'flex items-center justify-center gap-2 py-2.5 px-3 h-11 bg-dark-surface-container hover:bg-dark-surface-container-high border border-border-strong text-white font-label text-xs font-semibold rounded transition-colors disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className={branded ? styles.oauth : undefined}>
      {dividerText !== null && (
        <div className={branded ? styles.divider : 'flex items-center gap-3 my-5'}>
          {!branded && <div className="h-px flex-1 bg-[#27272A]" />}
          <span className={branded ? undefined : 'text-[11px] text-zinc-500'}>{dividerText}</span>
          {!branded && <div className="h-px flex-1 bg-[#27272A]" />}
        </div>
      )}

      {/* Central 216 — ordem do protótipo: GitHub primeiro, Google depois. */}
      {requireConsent && <div className={branded ? styles.consents : 'mb-4 space-y-3 rounded-lg border border-border-subtle bg-dark-surface-container-low p-3'}>
        <label className={consentClass}>
          <input type="checkbox" checked={adultConfirmed} onChange={(event) => setAdultConfirmed(event.target.checked)} className={checkboxClass} />
          <span>
            Confirmo que tenho 18 anos ou mais para participar do alfa externo.{' '}
            <Link href="/politica-de-idade" target="_blank" rel="noopener noreferrer" className={linkClass}>Política de idade</Link>
          </span>
        </label>
        <label className={consentClass}>
          <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className={checkboxClass} />
          <span>Li e aceito os <Link href="/termos" target="_blank" rel="noopener noreferrer" className={linkClass}>Termos de Uso</Link>.</span>
        </label>
        <label className={consentClass}>
          <input type="checkbox" checked={privacyAcknowledged} onChange={(event) => setPrivacyAcknowledged(event.target.checked)} className={checkboxClass} />
          <span>Li e estou ciente da <Link href="/privacidade" target="_blank" rel="noopener noreferrer" className={linkClass}>Política de Privacidade</Link>.</span>
        </label>
        {error && <p role="alert" className={branded ? styles.error : 'text-xs text-red-300'}>{error}</p>}
      </div>}
      <div className={branded ? styles.providers : 'grid grid-cols-2 gap-3'}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void startOAuth('github')}
          className={buttonClass}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .3a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.23v3.3c0 .32.22.7.83.58A12 12 0 0 0 12 .3z" />
          </svg>
          <span>{starting === 'github' ? 'Abrindo...' : 'GitHub'}</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => void startOAuth('google')}
          className={buttonClass}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1z"
            />
            <path
              fill="#EA4335"
              d="M12 4.76c1.76 0 3.35.61 4.6 1.8l3.42-3.42A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.87 8.87 4.76 12 4.76z"
            />
          </svg>
          <span>{starting === 'google' ? 'Abrindo...' : 'Google'}</span>
        </button>
      </div>
    </div>
  );
}
