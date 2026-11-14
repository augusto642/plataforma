'use client';

import React, { useEffect, useState } from 'react';

interface PendingChallenge {
  activityId: string;
  floor: number;
  toSquare: number;
  squareType: string;
  timeLimitSeconds: number;
  deadlineAt: string;
}

interface TowerChallengeModalProps {
  challenge: PendingChallenge | null;
  hasShield: boolean;
  onClose?: () => void;
  onSubmit: (code: string) => Promise<void>;
  onAskOracle: () => Promise<string>;
}

export const TowerChallengeModal: React.FC<TowerChallengeModalProps> = ({
  challenge,
  hasShield,
  onSubmit,
  onAskOracle,
}) => {
  const [code, setCode] = useState('// Digite sua solução aqui\nfunction solucao() {\n  \n}');
  const [secondsLeft, setSecondsLeft] = useState<number>(challenge?.timeLimitSeconds || 90);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oracleHint, setOracleHint] = useState<string | null>(null);
  const [askingOracle, setAskingOracle] = useState(false);

  useEffect(() => {
    if (!challenge) return;

    const deadline = new Date(challenge.deadlineAt).getTime();
    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setSecondsLeft(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [challenge]);

  if (!challenge) return null;

  const totalTime = challenge.timeLimitSeconds || 90;
  const progressPercent = Math.max(0, Math.min(100, (secondsLeft / totalTime) * 100));
  const isUrgent = secondsLeft <= 30;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(code);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAskOracle = async () => {
    setAskingOracle(true);
    setError(null);
    try {
      const hint = await onAskOracle();
      setOracleHint(hint);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAskingOracle(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-3xl bg-[#0C0F17] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header com Cronômetro */}
        <div className="p-5 border-b border-slate-800 bg-[#121624] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[11px] font-bold">
                Andar {challenge.floor} · Casa {challenge.toSquare}
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[11px] font-bold uppercase">
                {challenge.squareType}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white font-heading">
              Desafio Cronometrado da Torre
            </h2>
          </div>

          <div className="text-right">
            <div className={`text-2xl font-black font-mono tracking-tight ${isUrgent ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`}>
              ⏱️ {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">tempo restante</div>
          </div>
        </div>

        {/* Barra de Progresso do Tempo */}
        <div className="w-full bg-slate-900 h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              isUrgent ? 'bg-rose-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Alerta de Penalidade Origem - 1 & Escudo */}
        <div className={`px-5 py-3 border-b text-xs flex items-center justify-between ${
          hasShield
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            <span>{hasShield ? '🛡️' : '⚠️'}</span>
            <span>
              {hasShield
                ? 'Escudo Protetor Ativo: Em caso de falha ou tempo esgotado, você não sofrerá recuo.'
                : 'Regra Origem - 1: Se errar ou o tempo esgotar, você voltará para a casa anterior!'}
            </span>
          </div>
          {!hasShield && (
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400">
              Penalidade Ativa
            </span>
          )}
        </div>

        {/* Oráculo Socrático Banner */}
        {oracleHint && (
          <div className="p-4 mx-5 mt-4 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs leading-relaxed space-y-1">
            <div className="font-bold text-purple-300 flex items-center gap-1.5">
              <span>📜</span> Dica do Oráculo Socrático:
            </div>
            <p>{oracleHint}</p>
          </div>
        )}

        {/* Editor e Submissão */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 flex flex-col space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Escreva o código da solução:
            </label>
            <button
              type="button"
              disabled={askingOracle}
              onClick={handleAskOracle}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg font-bold disabled:opacity-50"
            >
              <span>📜</span>
              <span>{askingOracle ? 'Consultando...' : 'Dica Socrática (1 Pergaminho)'}</span>
            </button>
          </div>

          <textarea
            rows={10}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-[#07090E] p-4 text-xs font-mono text-slate-100 outline-none focus:border-indigo-500 resize-none shadow-inner"
          />

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || secondsLeft <= 0}
              className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {submitting ? 'Avaliando código no sandbox...' : 'Enviar Solução & Confirmar Avanço'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
