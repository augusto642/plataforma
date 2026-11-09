'use client';

/**
 * SaveAccountStep — etapa final do prólogo /onboarding (Sprint 5, B11 real).
 *
 * Até a Sprint 4, o prólogo terminava em /game SEM criar conta, e o
 * componente de cadastro do onboarding (OnboardingView) estava órfão —
 * nenhuma rota o montava. Agora o prólogo fecha o funil de verdade:
 * as escolhas (nível, starter, codename) são resumidas e o visitante cria
 * a conta AQUI, pela porta única (AuthContext), herdando UTMs, token do
 * diagnóstico e intenção de plano — o mesmo contexto do /register.
 * Quem não quiser conta segue como convidado, com o rótulo explícito
 * "testar sem conta" e o aviso de que o progresso não fica salvo.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import {
  clearStoredDiagnosticToken,
  readAttributionProps,
  readPlanIntentProps,
  readStoredDiagnosticToken,
  readStoredUtm,
} from '../../lib/attribution';
import { track } from '../../lib/analytics';
import { clearOnboardingChoices } from '../../lib/onboardingChoices';
import { useGameStore } from '../../game/stores/useGameStore';

interface SaveAccountStepProps {
  /** Cadastro concluído (ou conta já existente): a conta salvou o
   *  progresso e a jornada continua na primeira missão da IDE. */
  onSaved: () => void;
  /** Convidado: segue para o jogo SEM conta (progresso não salvo). */
  onSkip: () => void;
}

const TIER_LABELS: Record<string, string> = {
  beginner: 'Iniciante',
  junior: 'Júnior',
  mid: 'Pleno',
  senior: 'Sênior',
};

export const SaveAccountStep: React.FC<SaveAccountStepProps> = ({ onSaved, onSkip }) => {
  const { register: authRegister, user, isLoading } = useAuth();

  const player = useGameStore((s) => s.player);
  const selectedStarter = useGameStore((s) => s.selectedStarter);
  const careerTier = useGameStore((s) => s.careerTier);
  // Sprint 6 — a Missão 1 já foi JOGADA antes desta etapa: o resultado
  // entra no resumo (é progresso real a salvar) e nas props do funil.
  const firstMission = useGameStore((s) => s.firstMission);

  const [name, setName] = useState(player.name ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contexto do funil que acompanha o cadastro (Sprint 5): escolhas do
  // prólogo + intenção de plano + campanha — é o que permite à leitura do
  // funil (GET /analytics/funnel) ligar esta conversão à sua origem.
  const funnelProps = () => ({
    ...readPlanIntentProps(),
    ...readAttributionProps(),
    starter: selectedStarter.id,
    tier: careerTier,
    firstMission: firstMission?.completed ? 'completed' : 'not_completed',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Informe seu nome para criar a conta.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Informe um e-mail válido.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    track('signup_submit', 'onboarding_save', funnelProps());
    try {
      // Porta única: AuthContext, com UTMs + token do diagnóstico — igual
      // ao /register. As escolhas do prólogo (starter/nível/avatar) já vivem
      // no useGameStore e seguem para a primeira sessão em /game.
      const result = await authRegister({
        email: email.trim(),
        password,
        name: name.trim(),
        role: 'student',
        ...readStoredUtm(),
        ...readStoredDiagnosticToken(),
      });

      if (!result.success) {
        const message = result.error || 'Erro ao registrar conta.';
        setErrorMsg(
          message.includes('já cadastrado')
            ? 'Este e-mail já possui cadastro. Faça login para salvar seu progresso.'
            : message,
        );
        return;
      }

      track('signup_success', 'onboarding_save', funnelProps());
      // B09 — resultado do diagnóstico vinculado: o token não é mais necessário
      clearStoredDiagnosticToken();
      // Sprint 6 — a conta vira a fonte da verdade: as escolhas
      // persistidas do prólogo (D3) não precisam mais do espelho local
      clearOnboardingChoices();
      onSaved();
    } catch {
      setErrorMsg('Falha ao conectar com o servidor. Tente de novo em instantes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-[#0B1021]/90 p-8 shadow-2xl backdrop-blur-md">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#8257E5]">
        Passo final · Salvar progresso
      </div>
      <h2 className="font-mono text-2xl font-black tracking-tight text-white">
        Crie sua conta grátis para salvar tudo isto
      </h2>
      <p className="mt-2 font-mono text-xs leading-relaxed text-slate-400">
        Operador <span className="font-bold text-[#04D361]">{player.name}</span> · Starter{' '}
        <span className="font-bold text-[#FFA116]">{selectedStarter.name}</span> · Nível{' '}
        <span className="font-bold text-slate-200">{TIER_LABELS[careerTier] ?? careerTier}</span>
        {firstMission?.completed && (
          <>
            {' '}· Missão 1{' '}
            <span className="font-bold text-[#04D361]">
              concluída (+{firstMission.xpEarned} XP · +{firstMission.bitsEarned} Bits)
            </span>
          </>
        )}
        {/* Sprint 7 — fecha o laço de quem TENTOU e não venceu (a
            tentativa é gravada ao iniciar a batalha): o resumo diz com
            honestidade que a missão continua esperando na IDE, em vez de
            silenciar a derrota como fazia até a Sprint 6 */}
        {firstMission && !firstMission.completed && (
          <>
            {' '}·{' '}
            <span className="font-bold text-slate-200">Sua Missão 1 te espera na IDE</span>
          </>
        )}
      </p>

      {user ? (
        <div className="mt-6">
          <div className="rounded-xl border border-[#04D361]/40 bg-[#04D361]/10 px-4 py-3 font-mono text-xs text-[#04D361]">
            Conta detectada: {user.email}. Seu progresso fica salvo nesta conta.
          </div>
          <button
            type="button"
            onClick={onSaved}
            className="mt-5 w-full rounded-xl bg-[#8257E5] px-6 py-3.5 font-mono text-sm font-black text-white transition hover:bg-[#6D28D9] active:scale-[0.98]"
          >
            Salvar e ir para a primeira missão →
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {errorMsg && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 font-mono text-xs text-rose-300">
              {errorMsg}{' '}
              {errorMsg.includes('Faça login') && (
                <Link href="/login" className="font-bold underline">
                  Ir para o login
                </Link>
              )}
            </div>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Nome completo
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-[#8257E5]"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
              E-mail
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@exemplo.com"
              className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-[#8257E5]"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Senha
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-[#8257E5]"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full rounded-xl bg-[#8257E5] px-6 py-3.5 font-mono text-sm font-black text-white shadow-lg shadow-[#8257E5]/30 transition hover:bg-[#6D28D9] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Criando sua conta...' : 'Começar grátis agora'}
          </button>

          <p className="text-center font-mono text-[11px] text-slate-500">
            Já tem conta?{' '}
            <Link href="/login" className="font-bold text-[#996DFF] underline">
              Entrar
            </Link>
          </p>
        </form>
      )}

      {/* Ponte explícita para quem quer só testar: rótulo e consequência claros */}
      <div className="mt-7 border-t border-slate-800 pt-5 text-center">
        <p className="font-mono text-[11px] leading-relaxed text-slate-500">
          Prefere só conhecer o jogo? Você pode{' '}
          <span className="font-bold text-slate-300">testar sem conta</span> — mas XP, starter e
          avatar <span className="font-bold text-slate-300">não ficam salvos</span>.
        </p>
        <button
          type="button"
          onClick={onSkip}
          className="mt-3 font-mono text-xs font-bold text-cyan-400 underline-offset-4 transition hover:text-cyan-300 hover:underline"
        >
          Testar sem conta →
        </button>
      </div>
    </div>
  );
};
