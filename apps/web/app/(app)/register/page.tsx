'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '../../components/AuthView';
import styles from '../../components/AuthView.module.css';
import { useAuth } from '../../context/AuthContext';
import { captureUtmFromUrl, clearStoredDiagnosticToken, readAttributionProps, readPlanIntentProps, readStoredDiagnosticToken, readStoredUtm } from '../../lib/attribution';
import { track, trackPageview } from '../../lib/analytics';
import { clearOnboardingChoices } from '../../lib/onboardingChoices';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordMeetsMinimum, setPasswordMeetsMinimum] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    captureUtmFromUrl();
    trackPageview();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !termsAccepted) return;
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get('email') ?? '').trim();
    const password = String(fields.get('password') ?? '');
    setError('');
    setPending(true);
    const attribution = { ...readPlanIntentProps(), ...readAttributionProps(), source: 'register' };
    track('signup_submit', 'register_submit', attribution);
    try {
      const result = await register({
        email,
        password,
        adultConfirmed: termsAccepted,
        termsAccepted,
        privacyAcknowledged: termsAccepted,
        deferLearningProfile: true,
        ...readStoredUtm(),
        ...readStoredDiagnosticToken(),
      });
      if (!result.success) {
        setError(result.error || 'Não foi possível criar sua conta. Tente novamente.');
        return;
      }
      track('signup_success', 'register_submit', attribution);
      clearStoredDiagnosticToken();
      clearOnboardingChoices();
      router.replace('/perfil-inicial');
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout mode="register">
      <div className={styles.intro}>
        <span className={styles.tag}>Acesso gratuito</span>
        <h1>Crie sua conta</h1>
        <p className={styles.description}>Seu perfil de aprendizagem é opcional. Você pode preenchê-lo depois de entrar.</p>
      </div>
      <form className={styles.form} method="post" onSubmit={submit}>
        <label className={styles.field}>E-mail<input className={styles.input} name="email" type="email" autoComplete="email" maxLength={254} required /></label>
        <div className={styles.field}>
          <div className={styles.fieldHeader}>
            <label htmlFor="register-password">Senha</label>
            <button className={styles.reveal} type="button" aria-controls="register-password" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Ocultar senha' : 'Mostrar senha'}</button>
          </div>
          <input className={styles.input} id="register-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={128} aria-describedby="register-password-hint" onChange={(event) => setPasswordMeetsMinimum(Array.from(event.currentTarget.value).length >= 8)} required />
          <small id="register-password-hint" aria-live="polite" className={passwordMeetsMinimum ? styles.validHint : undefined}>
            {passwordMeetsMinimum ? '✓ Mínimo de 8 caracteres atingido.' : 'Use pelo menos 8 caracteres.'}
          </small>
        </div>
        <label className={styles.consent}>
          <input type="checkbox" checked={termsAccepted} onChange={event => setTermsAccepted(event.target.checked)} required />
          <span>
            Aceito os <Link href="/termos" target="_blank" rel="noopener noreferrer">Termos de Uso</Link>,
            estou ciente da <Link href="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade</Link> e
            confirmo que <Link href="/politica-de-idade" target="_blank" rel="noopener noreferrer">tenho 18 anos ou mais</Link>.
          </span>
        </label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button type="submit" className={styles.primary} disabled={pending} aria-busy={pending}>{pending ? 'Criando conta…' : 'Criar conta grátis ↗'}</button>
      </form>
    </AuthLayout>
  );
}
