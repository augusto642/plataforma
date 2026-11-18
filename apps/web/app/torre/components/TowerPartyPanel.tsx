'use client';

import React, { useState } from 'react';

export interface TowerPartyMemberView {
  id: string;
  nickname: string;
  floor: number;
  square: number;
  isLeader: boolean;
  isCurrentUser: boolean;
}

export interface TowerPartyView {
  id: string;
  name: string;
  floor: number;
  leaderId: string;
  members: TowerPartyMemberView[];
  recentAdvances: Array<{
    id: string;
    nickname: string;
    floor: number;
    createdAt: string;
  }>;
}

interface TowerPartyPanelProps {
  party: TowerPartyView | null;
  onCreate: (name: string) => Promise<void>;
  onJoin: (partyId: string) => Promise<void>;
  onLeave: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const TowerPartyPanel: React.FC<TowerPartyPanelProps> = ({
  party,
  onCreate,
  onJoin,
  onLeave,
  onRefresh,
}) => {
  const [name, setName] = useState('');
  const [partyId, setPartyId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copyInviteCode = async () => {
    if (!party) return;
    try {
      await navigator.clipboard.writeText(party.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Não foi possível copiar o código de convite.');
    }
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-[#0C0F17] p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-white">Party assíncrona</h2>
          <p className="mt-1 text-xs text-slate-400">
            Acompanhe a subida dos seus amigos sem depender de jogo em tempo real.
          </p>
        </div>
        <span className="text-xl" aria-hidden="true">🤝</span>
      </div>

      {error && (
        <p role="alert" className="mb-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
          {error}
        </p>
      )}

      {party ? (
        <div className="space-y-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => run(onRefresh)}
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? 'Atualizando...' : 'Atualizar atividade'}
          </button>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#07090E] p-4">
            <div>
              <h3 className="font-semibold text-white">{party.name}</h3>
              <p className="mt-1 text-xs text-slate-400">
                Maior andar alcançado: {party.floor} · {party.members.length}/4 integrantes
              </p>
            </div>
            <button
              type="button"
              onClick={copyInviteCode}
              className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-300 hover:bg-indigo-500/20"
            >
              {copied ? 'Código copiado' : 'Copiar convite'}
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {party.members.map((member) => (
              <div key={member.id} className="rounded-lg border border-slate-800 bg-[#07090E] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-slate-100">
                    {member.nickname}{member.isCurrentUser ? ' (você)' : ''}
                  </span>
                  {member.isLeader && (
                    <span className="text-[10px] font-bold uppercase text-amber-300">Líder</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Andar {member.floor} · Casa {member.square}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#07090E] p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Andares concluídos nas últimas 24 horas
            </h4>
            {party.recentAdvances.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">Nenhum novo andar concluído nesse período.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {party.recentAdvances.map((advance) => (
                  <li key={advance.id} className="text-xs text-emerald-300">
                    {advance.nickname} concluiu o andar {advance.floor}
                    <time className="ml-2 text-slate-500">
                      {new Date(advance.createdAt).toLocaleTimeString()}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => run(onLeave)}
            className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
          >
            {busy ? 'Saindo...' : 'Sair da party'}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(() => onCreate(name.trim()));
            }}
            className="space-y-2 rounded-xl border border-slate-800 bg-[#07090E] p-4"
          >
            <label htmlFor="tower-party-name" className="block text-xs font-bold text-slate-300">
              Criar party
            </label>
            <input
              id="tower-party-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={40}
              placeholder="Nome da party (opcional)"
              className="w-full rounded-lg border border-slate-700 bg-[#0C0F17] px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {busy ? 'Criando...' : 'Criar e convidar'}
            </button>
          </form>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(() => onJoin(partyId.trim()));
            }}
            className="space-y-2 rounded-xl border border-slate-800 bg-[#07090E] p-4"
          >
            <label htmlFor="tower-party-code" className="block text-xs font-bold text-slate-300">
              Entrar com convite
            </label>
            <input
              id="tower-party-code"
              value={partyId}
              onChange={(event) => setPartyId(event.target.value)}
              required
              placeholder="UUID do convite"
              className="w-full rounded-lg border border-slate-700 bg-[#0C0F17] px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
            >
              {busy ? 'Entrando...' : 'Entrar na party'}
            </button>
          </form>
        </div>
      )}
    </section>
  );
};
