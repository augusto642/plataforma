'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AGE_ELIGIBILITY_POLICY_VERSION } from '@plataforma/contracts';
import { API_BASE } from '../lib/apiClient';
import {
  AGE_CONFIRMATION_KEY,
  AGE_ELIGIBILITY_TOKEN_KEY,
} from '../lib/ageEligibility';

export function AdultEligibilityGate({
  onConfirm,
  requireServerToken = false,
}: {
  onConfirm: () => void;
  requireServerToken?: boolean;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem(AGE_CONFIRMATION_KEY) === AGE_ELIGIBILITY_POLICY_VERSION) {
      const hasToken = Boolean(
        sessionStorage.getItem(AGE_ELIGIBILITY_TOKEN_KEY),
      );
      if (!requireServerToken || hasToken) onConfirm();
      else setConfirmed(true);
    }
  }, [onConfirm, requireServerToken]);

  const confirmAge = async () => {
    if (!confirmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (requireServerToken) {
        const response = await fetch(`${API_BASE}/auth/guest-age-eligibility`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ adultConfirmed: true }),
        });
        const payload: unknown = await response.json().catch(() => null);
        const token =
          payload && typeof payload === 'object' && 'token' in payload &&
          typeof payload.token === 'string'
            ? payload.token
            : null;
        if (!response.ok || !token) {
          const message =
            payload && typeof payload === 'object' && 'message' in payload &&
            typeof payload.message === 'string'
              ? payload.message
              : 'Não foi possível registrar a confirmação. Tente novamente.';
          setError(message);
          return;
        }
        sessionStorage.setItem(AGE_ELIGIBILITY_TOKEN_KEY, token);
      }

      sessionStorage.setItem(AGE_CONFIRMATION_KEY, AGE_ELIGIBILITY_POLICY_VERSION);
      onConfirm();
    } catch {
      setError('Não foi possível conectar à API para confirmar a elegibilidade. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050814] px-4 text-dark-on-surface">
      <section className="w-full max-w-xl rounded-2xl border border-border-subtle bg-dark-surface-container-low p-8 shadow-2xl">
        <p className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-[#00E5FF]">
          Elegibilidade do alfa
        </p>
        <h1 className="font-mono text-2xl font-black text-white">
          Acesso exclusivo para maiores de 18 anos
        </h1>
        <p className="mt-3 font-mono text-sm leading-relaxed text-dark-on-surface-variant">
          O alfa externo não aceita participantes menores de idade, mesmo com autorização de
          responsável. Não solicitamos sua data de nascimento.
        </p>
        <label className="mt-6 flex items-start gap-3 font-mono text-sm leading-relaxed text-dark-on-surface">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            disabled={submitting}
            className="mt-1 h-4 w-4 shrink-0 accent-[#8257E5]"
          />
          <span>
            Confirmo que tenho 18 anos ou mais.{' '}
            <Link
              href="/politica-de-idade"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#A379FF] underline"
            >
              Política de idade
            </Link>
          </span>
        </label>
        {error ? (
          <p role="alert" className="mt-4 font-mono text-sm text-red-300">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          disabled={!confirmed || submitting}
          onClick={confirmAge}
          className="mt-6 w-full rounded-xl bg-[#8257E5] px-6 py-3.5 font-mono text-sm font-black text-white transition hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Confirmando…' : 'Continuar'}
        </button>
      </section>
    </main>
  );
}
