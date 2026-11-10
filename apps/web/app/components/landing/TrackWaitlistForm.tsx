'use client';

import React, { useEffect, useState } from 'react';
import { API_BASE } from '../../lib/apiClient';
// Alias: a prop `track` (a trilha) sombreia a função de analytics.
import { track as trackEvent } from '../../lib/analytics';
import { waitlistCountLabel, type WaitlistTrackKey } from './waitlist';

/* B49/P2 (Sprint 16) — ilha client do formulário de lista de espera
   de UMA trilha do roadmap. O contador exibido é a contagem REAL da
   API (GET /waitlist/counts): enquanto a contagem não chega, nenhum
   número é exibido (nada de chutar 0); se a API estiver fora do ar,
   o formulário continua utilizável e o contador simplesmente não
   aparece. Depois do POST, a contagem vem da resposta do próprio
   endpoint — que lê a tabela — e substitui a exibida. */

type CountsResponse = Partial<Record<WaitlistTrackKey, number>>;

// As 4 ilhas da seção dividem UMA busca de contagens (cache de
// módulo): montar os 4 cards não vira 4 requests idênticos.
// B76 (Sprint 18 · Volta 3 · TL B3): a FALHA não é cacheada — se a
// busca falhar, a promise é limpa e a próxima montagem tenta de novo;
// o que fica cacheado é só o sucesso.
let countsPromise: Promise<CountsResponse> | null = null;

function fetchCountsOnce(): Promise<CountsResponse> {
  if (!countsPromise) {
    countsPromise = fetch(`${API_BASE}/waitlist/counts`)
      .then((res) => {
        if (!res.ok) throw new Error('waitlist_counts_failed');
        return res.json() as Promise<CountsResponse>;
      })
      .catch(() => {
        countsPromise = null;
        return {};
      });
  }
  return countsPromise;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface TrackWaitlistFormProps {
  track: WaitlistTrackKey;
  /** Cor de destaque do card da trilha (classe do botão). */
  accentClassName?: string;
}

export const TrackWaitlistForm: React.FC<TrackWaitlistFormProps> = ({ track }) => {
  const [count, setCount] = useState<number | null>(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'joined' | 'already' | 'error'>('idle');
  const [invalidEmail, setInvalidEmail] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchCountsOnce().then((counts) => {
      if (!cancelled && typeof counts[track] === 'number') {
        setCount(counts[track] as number);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [track]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      setInvalidEmail(true);
      return;
    }
    setInvalidEmail(false);
    setStatus('sending');
    try {
      const res = await fetch(`${API_BASE}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized, track }),
      });
      if (!res.ok) throw new Error('waitlist_failed');
      const data = (await res.json()) as { count: number; alreadyOnList: boolean };
      setCount(data.count);
      setStatus(data.alreadyOnList ? 'already' : 'joined');
      // Demanda medida no funil existente (catálogo fechado de eventos).
      trackEvent('trilha_cta', `waitlist_${track}`, { track });
    } catch {
      setStatus('error');
    }
  };

  if (status === 'joined' || status === 'already') {
    return (
      <div className="w-full">
        <p className="text-body-sm font-mono font-bold text-brand-green-neon">
          {status === 'joined' ? '✓ Você entrou na lista desta trilha' : '✓ Você já está nesta lista'}
        </p>
        {count !== null && (
          <p className="text-xs font-mono text-ink-span mt-1.5">{waitlistCountLabel(count)}</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full" noValidate>
      {count !== null && (
        <p className="text-xs font-mono text-ink-span mb-2">{waitlistCountLabel(count)}</p>
      )}
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`waitlist-email-${track}`}>
          Seu e-mail para entrar na lista desta trilha
        </label>
        <input
          id={`waitlist-email-${track}`}
          type="email"
          autoComplete="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-0 flex-1 px-3 py-2 rounded-xl bg-background border border-border-1 text-body-sm font-mono text-ink-heading placeholder:text-ink-span focus:outline-none focus:border-brand-purple"
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="cursor-pointer shrink-0 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-brand-purple hover:bg-brand-purple-dark text-white text-body-sm font-mono font-bold whitespace-nowrap transition-all duration-200 active:scale-95 border border-transparent shadow-md shadow-brand-purple/25 disabled:opacity-50"
        >
          {status === 'sending' ? 'Entrando…' : 'Entrar na lista'}
        </button>
      </div>
      {invalidEmail && (
        <p className="text-xs font-mono text-brand-rose mt-2">Digite um e-mail válido para entrar na lista.</p>
      )}
      {status === 'error' && (
        <p className="text-xs font-mono text-brand-rose mt-2">
          Não foi possível entrar agora. Confira o e-mail e tente de novo.
        </p>
      )}
    </form>
  );
};
