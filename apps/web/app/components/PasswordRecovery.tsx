'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { API_BASE } from '../lib/apiClient';
import { takeRecoveryEmail } from '../lib/recovery-email';
import { AuthLayout } from './AuthView';
import styles from './AuthView.module.css';

export default function PasswordRecovery({ mode }: { mode: 'request' | 'reset' }) {
  const reset = mode === 'reset';
  const [token, setToken] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [invalidLink, setInvalidLink] = useState(false);
  const emailInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!reset) {
      const prefilled = takeRecoveryEmail();
      if (prefilled) setEmail(prefilled);
      return;
    }
    const value = new URLSearchParams(window.location.hash.slice(1)).get('token');
    setToken(value && /^[A-Za-z0-9_-]{64}$/.test(value) ? value : '');
  }, [reset]);

  useEffect(() => {
    if (!done && submittedEmail) emailInput.current?.focus();
  }, [done, submittedEmail]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || (reset && !token)) return;
    const fields = new FormData(event.currentTarget);
    const password = String(fields.get('password') ?? '');
    const requestedEmail = String(fields.get('email') ?? '').trim();
    if (reset && new TextEncoder().encode(password).length > 72) {
      setError('Use uma senha mais curta.');
      return;
    }
    setError('');
    setPending(true);
    try {
      const response = await fetch(`${API_BASE}/auth/${reset ? 'reset' : 'forgot'}-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reset ? { token, password } : { email: requestedEmail }),
      });
      if (!response.ok) {
        const detail: { errorCode?: string } | null = response.status === 400
          ? await response.json().catch(() => null)
          : null;
        if (reset && detail?.errorCode === 'AUTH_INVALID_PASSWORD_RESET_LINK') {
          setInvalidLink(true);
          return;
        }
        setError(response.status === 429
          ? 'Muitas tentativas. Aguarde um minuto e tente novamente.'
          : 'Não foi possível concluir o pedido agora. Tente novamente em instantes.');
        return;
      }
      if (reset) window.history.replaceState(window.history.state, '', window.location.pathname);
      else {
        setSubmittedEmail(requestedEmail);
        setEmail(requestedEmail);
      }
      setDone(true);
    } catch {
      setError('Não foi possível conectar. Confira sua conexão e tente novamente.');
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout mode="login">
      <div className={styles.intro}>
        <h1>{reset ? 'Redefina sua senha' : 'Recupere sua senha'}</h1>
        <p className={styles.description}>{reset ? 'Escolha uma senha nova para entrar na Nexus Code.' : 'Informe o e-mail da sua conta para receber um link de redefinição.'}</p>
      </div>
      {done ? (
        <div className={styles.recoveryActions}>
          <p role="status" className={`${styles.description} ${styles.recoveryStatus}`}>
            {reset ? 'Senha alterada. Agora você pode entrar com a nova senha.' : (
              <>Se houver uma conta com senha em <strong>{submittedEmail}</strong>, você receberá um link válido por 30 minutos. Confira também a pasta de spam.</>
            )}
          </p>
          {!reset && <button type="button" className={styles.helpLink} onClick={() => setDone(false)}>Corrigir e-mail</button>}
        </div>
      ) : reset && (!token || invalidLink) ? (
        (token === '' || invalidLink) && (
          <div className={styles.recoveryActions}>
            <p role="alert" className={styles.error}>Este link é inválido ou expirou.</p>
            <Link href="/recuperar-senha" className={styles.primary}>Solicitar novo link</Link>
          </div>
        )
      ) : (
        <form className={styles.form} method="post" onSubmit={submit}>
          {reset ? (
            <div className={styles.field}>
              <div className={styles.fieldHeader}>
                <label htmlFor="recovery-password">Nova senha</label>
                <button type="button" className={styles.reveal} aria-controls="recovery-password" onClick={() => setVisible(!visible)}>
                  {visible ? 'Ocultar senha' : 'Mostrar senha'}
                </button>
              </div>
              <input id="recovery-password" className={styles.input} name="password" type={visible ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={72} aria-describedby="recovery-password-hint" required />
              <small id="recovery-password-hint">Use pelo menos oito caracteres.</small>
            </div>
          ) : (
            <label className={styles.field}>
              E-mail
              <input ref={emailInput} className={styles.input} name="email" type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.currentTarget.value)} readOnly={pending} required />
            </label>
          )}
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <button type="submit" className={styles.primary} disabled={pending} aria-busy={pending}>
            {reset ? (pending ? 'Salvando…' : 'Salvar nova senha') : (pending ? 'Solicitando…' : 'Enviar link de recuperação')}
          </button>
        </form>
      )}
      <Link href="/login" className={styles.helpLink}>Voltar ao login</Link>
    </AuthLayout>
  );
}
