'use client';

import React, { useId, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import Logo from './Logo';
import { MaterialIcon } from './MaterialIcon';
import { OAuthButtons } from './OAuthButtons';
import { oauthErrorMessage } from '../lib/oauth-errors';
import { prefillRecoveryEmail } from '../lib/recovery-email';
import { useAuth } from '../context/AuthContext';
import styles from './AuthView.module.css';

interface AuthViewProps {
  onAuth: (user: { id: string; name: string; email: string; role: string }) => void;
}

// A moldura não controla formulários, sessão, etapas ou redirecionamentos.
export function AuthLayout({
  mode,
  children,
}: {
  mode: 'login' | 'register';
  children: React.ReactNode;
}) {
  const storyTitleId = useId();
  const register = mode === 'register';

  return (
    <div className={styles.access}>
      <header className={styles.header}>
        <Link href="/" className={styles.homeLink} aria-label="Nexus Code — início">
          <Image src="/nexus-home/logo.svg" alt="Nexus Code" width={165} height={40} />
        </Link>
        <Link href="/" className={styles.backLink}>
          <span aria-hidden="true">←</span> Voltar ao início
        </Link>
      </header>

      <main className={styles.layout}>
        <div className={styles.card}>
          <nav className={styles.switcher} aria-label="Acesso à plataforma">
            <Link href="/login" aria-current={!register ? 'page' : undefined}>Entrar</Link>
            <Link href="/register" aria-current={register ? 'page' : undefined}>Começar grátis</Link>
          </nav>
          <div className={styles.cardBody}>{children}</div>
        </div>

        <section className={styles.story} aria-labelledby={storyTitleId}>
          <p className={styles.tag}>Prática de programação</p>
          <h2 id={storyTitleId}>
            {register ? 'Comece com' : 'Retome sua'}{' '}
            <span>{register ? 'um exercício de código.' : 'trilha de estudos.'}</span>
          </h2>
          <p className={styles.description}>
            {register
              ? 'Escreva uma solução, confira os testes e ajuste o código.'
              : 'Volte ao próximo exercício: escreva o código, confira o resultado dos testes e ajuste sua solução.'}
          </p>
          <ol className={styles.steps} aria-label="Ciclo de prática">
            <li><span aria-hidden="true">01</span> Escreva</li>
            <li><span aria-hidden="true">02</span> Teste</li>
            <li><span aria-hidden="true">03</span> Ajuste</li>
          </ol>
        </section>
      </main>

      <footer className={styles.footer}>
        © 2026 Nexus Code
      </footer>
    </div>
  );
}

export default function AuthView({ onAuth }: AuthViewProps) {
  const { login } = useAuth();
  const pathname = usePathname();
  // A IDE também usa AuthView como tela de acesso; mantenha sua moldura atual.
  const branded = pathname === '/login' || pathname === '/login/';
  const searchParams = useSearchParams();
  const fieldId = useId();
  // OAuth: o callback da API volta para /login?oauth_error=<código> quando
  // o login com Google/GitHub falha (ex.: e-mail não verificado, OAuth
  // não configurado). A mensagem é exibida aqui, sem inventar sessão.
  const oauthErrorCode = searchParams.get('oauth_error');
  const oauthError = oauthErrorMessage(oauthErrorCode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [needsAgeConfirmation, setNeedsAgeConfirmation] = useState(false);
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
      const result = await login(email.trim(), password, adultConfirmed);

      if (!result.success) {
        if (result.errorCode === 'AUTH_ADULT_ELIGIBILITY_REQUIRED') setNeedsAgeConfirmation(true);
        // C3 (Lote 1): falha de login — inclusive falha de rede/conexão —
        // é erro visível ao usuário. Nunca criar sessão local nem
        // redirecionar ao dashboard sem autenticação real na API.
        setAuthError(branded && result.errorCode === 'AUTH_INVALID_CREDENTIALS'
          ? 'E-mail ou senha incorretos. Confira os dados ou redefina sua senha.'
          : result.error || 'Falha ao autenticar.');
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

  const content = (
    <>
      {branded ? (
        <div className={styles.intro}>
          <p className={styles.tag}>Acesso à plataforma</p>
          <h1>Entre na Nexus Code</h1>
          <p className={styles.description}>Acesse sua conta para continuar de onde parou.</p>
        </div>
      ) : (
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
      )}

      {authError && (
        <div role="alert" className={branded ? styles.error : 'mb-5 p-3.5 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2.5 animate-fadeIn'}>
          <span aria-hidden="true">⚠️</span>
          <span>{authError}</span>
        </div>
      )}

      {!branded && (
        <>
          <div className="mb-6">
            <OAuthButtons dividerText={null} />
          </div>

          <div className="relative flex items-center mb-6">
            <div className="w-full border-t border-border-subtle" />
            <span className="absolute left-1/2 -translate-x-1/2 shrink-0 whitespace-nowrap bg-dark-surface-container-low px-3 font-code text-xs text-dark-on-surface-variant">
              ou com e-mail
            </span>
          </div>
        </>
      )}

      <form method="post" onSubmit={handleLogin} className={branded ? styles.form : 'space-y-4'}>
        <div className={branded ? styles.field : undefined}>
          <label htmlFor={`${fieldId}-email`} className={branded ? undefined : 'block font-label text-xs font-semibold text-white mb-1.5'}>
            E-mail
          </label>
          <input
            id={`${fieldId}-email`}
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu.email@exemplo.com"
            required
            className={branded ? styles.input : legacyInput}
          />
        </div>

        <div className={branded ? styles.field : undefined}>
          <div className={branded ? styles.fieldHeader : 'flex items-center justify-between mb-1.5'}>
            <label htmlFor={`${fieldId}-password`} className={branded ? undefined : 'font-label text-xs font-semibold text-white'}>Senha</label>
            <button
              type="button"
              aria-controls={`${fieldId}-password`}
              onClick={() => setShowPassword(!showPassword)}
              className={branded ? styles.reveal : 'text-[11px] text-dark-on-surface-variant hover:text-white'}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          <input
            id={`${fieldId}-password`}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sua senha"
            required
            className={branded ? styles.input : legacyInput}
          />
          {branded && (
            <Link href="/recuperar-senha" className={styles.helpLink} onNavigate={() => prefillRecoveryEmail(email)}>
              Esqueci minha senha
            </Link>
          )}
        </div>

        {(!branded || needsAgeConfirmation) && (
          <label className={branded ? styles.consent : 'flex items-start gap-2.5 text-xs leading-relaxed text-dark-on-surface-variant'}>
            <input
              type="checkbox"
              checked={adultConfirmed}
              onChange={(event) => setAdultConfirmed(event.target.checked)}
              className={branded ? undefined : 'mt-0.5 h-4 w-4 shrink-0 accent-[#8257E5]'}
            />
            <span>
              Confirmo que tenho 18 anos ou mais para participar do alfa externo.{' '}
              <Link href="/politica-de-idade" target="_blank" rel="noopener noreferrer" className={branded ? undefined : 'text-primary underline'}>
                Política de idade
              </Link>
            </span>
          </label>
        )}

        <button
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
          className={branded ? styles.primary : 'w-full py-3 bg-primary hover:bg-dark-primary text-white font-label text-sm font-bold rounded transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2 mt-4 disabled:opacity-50'}
        >
          <span>{isLoading ? 'Entrando…' : branded ? 'Entrar' : 'Entrar no jogo'}</span>
          {!isLoading && <MaterialIcon name="arrow_forward" className="text-[18px]" />}
        </button>
      </form>

      {branded && <OAuthButtons appearance="access" requireConsent={oauthErrorCode === 'legal_consent_required'} />}
    </>
  );

  if (branded) return <AuthLayout mode="login">{content}</AuthLayout>;

  return (
    <div className="min-h-screen bg-dark-surface text-dark-on-surface font-body antialiased flex flex-col justify-between code-grid">
      <header className="h-20 px-8 flex items-center justify-between">
        <Logo />
        <div className="text-body-sm text-dark-on-surface-variant font-label">
          Não tem conta?{' '}
          <Link href="/register" className="text-primary hover:text-dark-primary font-semibold ml-1">
            Começar grátis
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-dark-surface-container-low border border-border-strong rounded-xl p-8 shadow-2xl relative">
          {content}
        </div>
      </main>

      <footer className="h-16 border-t border-border-subtle px-8 flex items-center justify-center text-xs font-code text-dark-on-surface-variant">
        © 2026 Nexus Code • Aprenda a programar de verdade, jogando.
      </footer>
    </div>
  );
}

const legacyInput = 'w-full px-3.5 py-2.5 bg-dark-surface-container border border-border-subtle focus:border-primary focus:ring-1 focus:ring-primary rounded text-white text-xs font-body outline-none transition-colors placeholder:text-dark-on-surface-variant/60';
