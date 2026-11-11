'use client';

import React, { useState } from 'react';
import {
  planInterestCountLabel,
  registerPlanInterestLead,
  type InterestBillingCycle,
  type InterestPlanId,
} from '../../lib/planInterest';

/* B71 (Sprint 18 · Volta 3 · Growth M1) — captura SÓ-E-MAIL da lista
   de interessados, dentro do card de preço: o lead mais valioso da
   landing tinha a maior fricção (exigia o cadastro completo para
   virar registro). Espelha o padrão da waitlist das trilhas (B49):
   e-mail + plano, dedupe por e-mail no servidor, contagem pública
   total devolvida pela própria resposta. Quem já é lead e depois
   conclui o cadastro tem o registro da conta prevalecendo (o lead é
   vinculado/removido no register autenticado). */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface PlanInterestFormProps {
  plan: InterestPlanId;
  planLabel: string;
  billingCycle?: InterestBillingCycle;
}

export const PlanInterestForm: React.FC<PlanInterestFormProps> = ({
  plan,
  planLabel,
  billingCycle,
}) => {
  const [email, setEmail] = useState('');
  const [count, setCount] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'joined' | 'already' | 'error'>('idle');
  const [invalidEmail, setInvalidEmail] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      setInvalidEmail(true);
      return;
    }
    setInvalidEmail(false);
    setStatus('sending');
    const result = await registerPlanInterestLead(normalized, plan, billingCycle);
    if (!result) {
      setStatus('error');
      return;
    }
    setCount(result.count);
    setStatus(result.alreadyOnList ? 'already' : 'joined');
  };

  if (status === 'joined' || status === 'already') {
    return (
      <div className="w-full text-left">
        <p className="text-body-sm font-mono font-bold text-brand-green-neon">
          {status === 'joined'
            ? `✓ Você entrou na lista de interessados do ${planLabel}`
            : `✓ Seu e-mail já está na lista do ${planLabel}`}
        </p>
        {count !== null && (
          <p className="text-xs font-mono text-ink-span mt-1.5">{planInterestCountLabel(count)}</p>
        )}
        <p className="text-xs font-mono text-ink-muted mt-1.5">
          Sem cobrança: a lista só serve para avisar quando a cobrança abrir.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full text-left" noValidate>
      <p className="text-xs font-mono text-ink-span mb-2">
        Ou entre na lista só com seu e-mail — sem criar conta agora:
      </p>
      {/* Central 216 retrabalho (D1) — o formulário vivia em linha
          (`flex gap-2`) dentro de cards de ~260px: o botão longo
          espremia o input a ~26px de largura, inutilizável. Empilhado. */}
      <div className="flex flex-col gap-2">
        <label className="sr-only" htmlFor={`plan-interest-email-${plan}`}>
          Seu e-mail para a lista de interessados do {planLabel}
        </label>
        <input
          id={`plan-interest-email-${plan}`}
          type="email"
          autoComplete="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-background border border-border-1 text-body-sm font-mono text-ink-heading placeholder:text-ink-span focus:outline-none focus:border-brand-purple"
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="cursor-pointer w-full inline-flex items-center justify-center px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-ink-heading text-body-sm font-mono font-bold whitespace-nowrap transition-all duration-200 active:scale-95 border border-border-1 disabled:opacity-50"
        >
          {/* A9 (Lote 3) — o rótulo do botão É a ação da lista: a fase 1
              premium trocou o CTA do card Pro pelo checkout em modo de
              testes e a frase "Entrar na lista de interessados" sumiu
              do HTML (landing-render.spec.ts esperava encontrá-la).
              O formulário continua sendo a captura só-e-mail da lista,
              então o botão diz exatamente o que faz. */}
          {status === 'sending' ? 'Entrando…' : 'Entrar na lista de interessados'}
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
