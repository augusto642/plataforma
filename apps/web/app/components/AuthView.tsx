'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Logo from './Logo';
import { MaterialIcon } from './MaterialIcon';
import { OAuthButtons } from './OAuthButtons';
import { oauthErrorMessage } from '../lib/oauth-errors';
import { useAuth } from '../context/AuthContext';

interface AuthViewProps {
  onAuth: (user: { id: string; name: string; email: string; role: string }) => void;
}

// Central 216 — fidelidade visual ao protótipo Stitch v2 (login.html):
// header minimalista com "Começar grátis" → /register, card com
// "Acesso à Plataforma / Bem-vindo de volta, dev", botões sociais
// REAIS (OAuthButtons) no topo, divisor "ou com e-mail" e o botão
// "Entrar no jogo". O COMPORTAMENTO do mock (form GET + botões mortos)
// foi reprovado — aqui o form é o login real via API (cookie httpOnly)
// e os botões sociais são os links reais para a API. Nada muda na
// lógica de auth: só o layout.
export default function AuthView({ onAuth }: AuthViewProps) {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  // OAuth: o callback da API volta para /login?oauth_error=<código> quando
  // o login com Google/GitHub falha (ex.: e-mail não verificado, OAuth
  // não configurado). A mensagem é exibida aqui, sem inventar sessão.
  const oauthError = oauthErrorMessage(searchParams.get('oauth_error'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(oauthError);
  const [isLoading, setIsLoading] = useState(false);

  // C2/C3 (Lote 1): sem botões demo, sem credenciais hardcoded e sem
  // sessão local de fallback — login só autentica via API (cookie httpOnly).

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoading(true);

    try {
      // Fluxo cookie-only: POST /auth/login grava os cookies httpOnly e devolve
      // apenas { user }. O AuthContext hidrata a sessão (user + /users/me).
      const result = await login(email.trim(), password);

      if (!result.success) {
        // C3 (Lote 1): falha de login — inclusive falha de rede/conexão —
        // é erro visível ao usuário. Nunca criar sessão local nem
        // redirecionar ao dashboard sem autenticação real na API.
        setAuthError(result.error || 'Falha ao autenticar.');
        return;
      }

      onAuth({
        id: result.user?.id || email,
        email: result.user?.email || email,
        name: result.user?.name || email.split('@')[0] || 'Desenvolvedor',
        role: result.user?.role || 'student',
      });
    } catch (err: any) {
      setAuthError(err?.message || 'Falha ao autenticar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-surface text-dark-on-surface font-body antialiased flex flex-col justify-between code-grid">
      {/* Header minimalista */}
      <header className="h-20 px-8 flex items-center justify-between">
        <Logo />
        <div className="text-body-sm text-dark-on-surface-variant font-label">
          Não tem conta?{' '}
          <Link href="/register" className="text-primary hover:text-dark-primary font-semibold ml-1">
            Começar grátis
          </Link>
        </div>
      </header>

      {/* Card Central de Login */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-dark-surface-container-low border border-border-strong rounded-xl p-8 shadow-2xl relative">
          {/* Topo: eyebrow + título + cadeado */}
          <div className="flex items-center justify-between pb-6 mb-6 border-b border-border-subtle">
            <div>
              <span className="font-code text-xs text-secondary font-bold uppercase tracking-wider block mb-1">
                Acesso à Plataforma
              </span>
              <h1 className="font-headline text-headline-sm font-bold text-white">
                Bem-vindo de volta, dev
              </h1>
            </div>
            <div className="w-8 h-8 rounded-full bg-dark-surface-container flex items-center justify-center text-secondary border border-border-subtle">
              <MaterialIcon name="lock_open" className="text-[18px]" />
            </div>
          </div>

          {/* Error Alert */}
          {authError && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2.5 animate-fadeIn">
              <span>⚠️</span>
              <span>{authError}</span>
            </div>
          )}

          {/* Logins sociais REAIS (GitHub/Google) — no topo, como no mock */}
          <div className="mb-6">
            <OAuthButtons dividerText={null} />
          </div>

          {/* Central 216 (checagem visual) — o rótulo do divisor quebrava
              em 2 linhas ("ou com e- / mail"): o span ficava espremido
              em flex; absoluto + sem quebra, como no protótipo. */}
          <div className="relative flex items-center mb-6">
            <div className="w-full border-t border-border-subtle" />
            <span className="absolute left-1/2 -translate-x-1/2 shrink-0 whitespace-nowrap bg-dark-surface-container-low px-3 font-code text-xs text-dark-on-surface-variant">
              ou com e-mail
            </span>
          </div>

          {/* Form — login real via API (o form GET do mock foi reprovado) */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block font-label text-xs font-semibold text-white mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                required
                className="w-full px-3.5 py-2.5 bg-dark-surface-container border border-border-subtle focus:border-primary focus:ring-1 focus:ring-primary rounded text-white text-xs font-body outline-none transition-colors placeholder:text-dark-on-surface-variant/60"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-label text-xs font-semibold text-white">Senha</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-dark-on-surface-variant hover:text-white"
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                required
                className="w-full px-3.5 py-2.5 bg-dark-surface-container border border-border-subtle focus:border-primary focus:ring-1 focus:ring-primary rounded text-white text-xs font-body outline-none transition-colors placeholder:text-dark-on-surface-variant/60"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary hover:bg-dark-primary text-white font-label text-sm font-bold rounded transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
            >
              <span>{isLoading ? 'Entrando...' : 'Entrar no jogo'}</span>
              {!isLoading && <MaterialIcon name="arrow_forward" className="text-[18px]" />}
            </button>
          </form>
        </div>
      </main>

      <footer className="h-16 border-t border-border-subtle px-8 flex items-center justify-center text-xs font-code text-dark-on-surface-variant">
        © 2026 Nexus Code • Aprenda a programar de verdade, jogando.
      </footer>
    </div>
  );
}
