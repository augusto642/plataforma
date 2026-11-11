'use client';

import React from 'react';
import { oauthLoginUrl } from '../lib/oauth-errors';

/**
 * Botões reais de OAuth (Google/GitHub) — substituem os botões demo
 * removidos no Lote 1 (C2). São links comuns para a API (`GET /auth/google`
 * e `GET /auth/github`): o navegador vai à API, o guard redireciona ao
 * provedor e o callback volta com os cookies httpOnly gravados.
 *
 * Se o OAuth não estiver configurado no servidor, o callback devolve
 * `/login?oauth_error=oauth_unavailable` e a tela de login exibe o erro
 * honesto — o botão nunca preenche credencial nem cria sessão local.
 */
export function OAuthButtons({ dividerText = 'ou continue com' }: { dividerText?: string | null } = {}) {
  return (
    <div>
      {dividerText !== null && (
        <div className="flex items-center gap-3 my-5">
          <div className="h-px flex-1 bg-[#27272A]" />
          <span className="text-[11px] text-zinc-500">{dividerText}</span>
          <div className="h-px flex-1 bg-[#27272A]" />
        </div>
      )}

      {/* Central 216 — ordem do protótipo: GitHub primeiro, Google depois. */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href={oauthLoginUrl('github')}
          className="flex items-center justify-center gap-2 py-2.5 px-3 h-11 bg-dark-surface-container hover:bg-dark-surface-container-high border border-border-strong text-white font-label text-xs font-semibold rounded transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .3a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.23v3.3c0 .32.22.7.83.58A12 12 0 0 0 12 .3z" />
          </svg>
          <span>GitHub</span>
        </a>

        <a
          href={oauthLoginUrl('google')}
          className="flex items-center justify-center gap-2 py-2.5 px-3 h-11 bg-dark-surface-container hover:bg-dark-surface-container-high border border-border-strong text-white font-label text-xs font-semibold rounded transition-colors"
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
          <span>Google</span>
        </a>
      </div>
    </div>
  );
}
