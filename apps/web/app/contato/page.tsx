'use client';

/**
 * /contato — página pública de contato (Sprint 6).
 *
 * É o destino REAL do CTA "Falar com Engenharia" do plano Staff: até a
 * Sprint 5, esse botão caía no /register — um cadastro disfarçado de
 * contato. Agora quem quer falar com a equipe encontra um formulário
 * de contato de verdade, que grava a mensagem pelo endpoint próprio
 * POST /contact (DTO validado na API; nenhum dado volta pela resposta).
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from '../components/Logo';
import { API_BASE } from '../lib/apiClient';
import { trackPageview } from '../lib/analytics';

type SubmitState = 'idle' | 'sending' | 'sent' | 'error';

export default function ContatoPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<SubmitState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    trackPageview();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (name.trim().length < 2) {
      setErrorMsg('Informe seu nome.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Informe um e-mail válido para recebermos sua mensagem e respondermos.');
      return;
    }
    if (message.trim().length < 10) {
      setErrorMsg('Conte um pouco mais na mensagem (mínimo de 10 caracteres).');
      return;
    }

    setState('sending');
    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });
      if (!res.ok) {
        throw new Error('request failed');
      }
      setState('sent');
    } catch {
      setState('error');
      setErrorMsg('Não conseguimos enviar agora. Tente de novo em alguns instantes.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-ink-body font-sans antialiased">
      <header className="border-b border-border-1">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <Logo size="md" theme="dark" href="/" />
          <Link href="/" className="text-sm text-ink-span hover:text-ink-heading transition-colors">
            ← Voltar para a página inicial
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-14">
        <h1 className="font-heading text-3xl sm:text-4xl font-black text-ink-heading tracking-tight mb-3">
          Fale com a equipe Nexus Code
        </h1>
        <p className="text-base leading-relaxed text-ink-body mb-10">
          Quer o plano Staff para o seu time, cadastrar sua empresa como parceira ou tirar uma
          dúvida que a página de planos não respondeu? Escreva aqui — a mensagem chega direto para
          a equipe, e a resposta vai para o e-mail que você informar.
        </p>

        {state === 'sent' ? (
          <div className="rounded-2xl border border-brand-green-neon/40 bg-brand-green-neon/10 px-6 py-8 text-center">
            <div className="text-4xl mb-3">✔</div>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">
              Mensagem enviada
            </h2>
            <p className="text-sm text-ink-body">
              Recebemos sua mensagem e responderemos no e-mail informado. Enquanto isso, você pode
              conhecer a plataforma por dentro criando uma conta grátis.
            </p>
            <Link
              href="/onboarding"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-purple hover:bg-brand-purple-dark text-white text-sm font-heading font-black transition-all active:scale-95 shadow-lg shadow-brand-purple/30"
            >
              <span>Começar grátis agora</span>
              <span>→</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {errorMsg && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {errorMsg}
              </div>
            )}

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-ink-span">
                Seu nome
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como podemos te chamar?"
                maxLength={120}
                className="rounded-xl border border-border-2 bg-surface-1 px-4 py-3 text-sm text-ink-heading outline-none transition focus:border-brand-purple"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-ink-span">
                Seu e-mail
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                maxLength={254}
                className="rounded-xl border border-border-2 bg-surface-1 px-4 py-3 text-sm text-ink-heading outline-none transition focus:border-brand-purple"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-ink-span">
                Mensagem
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Conte o que você precisa: tamanho do time, objetivo, prazos…"
                rows={6}
                maxLength={2000}
                className="rounded-xl border border-border-2 bg-surface-1 px-4 py-3 text-sm text-ink-heading outline-none transition focus:border-brand-purple resize-y"
              />
            </label>

            <button
              type="submit"
              disabled={state === 'sending'}
              className="w-full rounded-xl bg-brand-purple px-6 py-3.5 text-sm font-heading font-black text-white shadow-lg shadow-brand-purple/30 transition hover:bg-brand-purple-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state === 'sending' ? 'Enviando...' : 'Enviar mensagem'}
            </button>

            <p className="text-center text-xs text-ink-span">
              Prefere conhecer primeiro?{' '}
              <Link href="/#precos" className="font-bold text-brand-purple-light underline">
                Veja os planos
              </Link>{' '}
              ou{' '}
              <Link href="/onboarding" className="font-bold text-brand-purple-light underline">
                comece grátis agora
              </Link>
              .
            </p>
          </form>
        )}
      </main>
    </div>
  );
}
