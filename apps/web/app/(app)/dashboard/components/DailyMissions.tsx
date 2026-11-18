'use client';

import React, { useEffect, useState } from 'react';
import { MaterialIcon } from '../../../components/MaterialIcon';
import { apiFetch, API_BASE } from '../../../lib/apiClient';
import { listInterviewSessions } from '../../../lib/interview';
import {
  countCreatedToday,
  deriveDailyMissions,
  type DailyMission,
} from '../utils/daily-missions';

interface XpHistoryEntry {
  id: string;
  source: string;
  amount: number;
  description: string;
  createdAt: string;
}

function isXpHistoryEntry(value: unknown): value is XpHistoryEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.source === 'string' &&
    typeof entry.amount === 'number' &&
    Number.isSafeInteger(entry.amount) &&
    entry.amount > 0 &&
    typeof entry.description === 'string' &&
    typeof entry.createdAt === 'string' &&
    Number.isFinite(Date.parse(entry.createdAt))
  );
}

const XP_SOURCE_LABELS: Record<string, string> = {
  submission: 'Desafio',
  battle_run: 'Combate',
  daily_bonus: 'Missões diárias',
  gitea_project: 'Projeto',
};

export function DailyMissions() {
  const [missions, setMissions] = useState<DailyMission[] | null>(null);
  const [isClaimed, setIsClaimed] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [history, setHistory] = useState<XpHistoryEntry[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [subsRes, statusRes] = await Promise.all([
          apiFetch(`${API_BASE}/submissions`),
          apiFetch(`${API_BASE}/gamification/daily-status`).catch(() => null),
        ]);

        if (statusRes && statusRes.ok) {
          const statusData = await statusRes.json().catch(() => null);
          if (!cancelled && statusData?.claimed) {
            setIsClaimed(true);
          }
        }

        if (!subsRes.ok) return;
        const subs = (await subsRes.json()) as Array<{ createdAt?: string | null }>;
        if (!Array.isArray(subs)) return;
        const submissionsToday = countCreatedToday(subs);
        let includeInterview = false;
        let interviewDoneToday = false;
        try {
          const sessions = await listInterviewSessions();
          includeInterview = true;
          interviewDoneToday = countCreatedToday(sessions) > 0;
        } catch {
          includeInterview = false;
        }
        if (!cancelled) {
          setMissions(
            deriveDailyMissions({ submissionsToday, interviewDoneToday, includeInterview }),
          );
        }
      } catch {
        // Silêncio fail-closed
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClaim = async () => {
    if (isClaiming || isClaimed) return;
    setIsClaiming(true);
    try {
      const res = await apiFetch(`${API_BASE}/gamification/daily-claim`, {
        method: 'POST',
      });
      if (res.ok) {
        setIsClaimed(true);
        // Dispara evento customizado para atualizar XP no header e sidebar
        window.dispatchEvent(new CustomEvent('nexus_profile_updated'));
      }
    } catch {
      // Silêncio fail-closed
    } finally {
      setIsClaiming(false);
    }
  };

  const handleHistoryToggle = async () => {
    if (historyOpen) {
      setHistoryOpen(false);
      return;
    }

    setHistoryOpen(true);
    if (history !== null || historyLoading) return;

    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await apiFetch(`${API_BASE}/gamification/xp-history`);
      if (!res.ok) throw new Error('Failed to load XP history');
      const data: unknown = await res.json();
      if (!Array.isArray(data) || !data.every(isXpHistoryEntry)) {
        throw new Error('Invalid XP history response');
      }
      setHistory(data);
    } catch {
      setHistoryError('Não foi possível carregar o extrato de XP. Tente novamente.');
    } finally {
      setHistoryLoading(false);
    }
  };

  if (!missions) return null;
  const completedCount = missions.filter((m) => m.done).length;
  const progressPercent = missions.length > 0 ? (completedCount / missions.length) * 100 : 0;
  const allDone = completedCount === missions.length && missions.length > 0;

  return (
    <div className="rounded-3xl bg-[#0C0F17] border border-[#1C2338] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-brand font-bold text-white text-sm">Missões de Hoje</h4>
        <span className="text-xs font-mono text-[#04D361] font-bold">
          {completedCount} / {missions.length} feitas
        </span>
      </div>

      {/* Barra de Progresso Simples */}
      <div className="h-1.5 w-full rounded-full bg-[#07090E] border border-[#1C2338] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#00B37E] transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Checklist */}
      <div className="space-y-2 text-xs font-mono">
        {missions.map((mission) => (
          <div
            key={mission.id}
            className={`p-2.5 rounded-xl border flex items-center justify-between ${
              mission.done
                ? 'bg-[#121624] border-[#00B37E]/40 text-[#04D361]'
                : 'bg-[#121624] border-[#1C2338] text-[#94A3B8]'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {mission.done ? (
                <span className="shrink-0 font-bold">✓</span>
              ) : (
                <span className="w-3.5 h-3.5 rounded border border-[#64748B] shrink-0" />
              )}
              <div className="truncate">
                <span className={mission.done ? 'text-[#E2E8F0]' : 'text-white'}>
                  {mission.title}
                </span>
                <span className="block text-[10px] text-[#64748B] mt-0.5 truncate">
                  {mission.detail}
                </span>
              </div>
            </div>
            {mission.done && (
              <span className="text-[10px] text-[#00E5FF] font-bold shrink-0 ml-2">Feito</span>
            )}
          </div>
        ))}
      </div>

      {/* Recompensa Diária (PLG) */}
      {allDone && (
        <div className="pt-1">
          {isClaimed ? (
            <div className="p-2.5 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-center text-xs font-mono font-bold text-[#00E5FF] flex items-center justify-center gap-2">
              <span>⭐</span>
              <span>Bônus diário de +50 XP resgatado!</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleClaim}
              disabled={isClaiming}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#8257E5] to-[#00E5FF] hover:brightness-110 text-black font-bold text-xs font-mono flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <span>{isClaiming ? 'Resgatando bônus...' : '⭐ Resgatar Bônus Diário (+50 XP)'}</span>
            </button>
          )}
        </div>
      )}

      <div className="border-t border-[#1C2338] pt-3">
        <button
          type="button"
          onClick={() => void handleHistoryToggle()}
          aria-expanded={historyOpen}
          className="flex w-full items-center justify-between bg-transparent p-0 text-left text-xs font-mono text-[#94A3B8] hover:text-white cursor-pointer border-0"
        >
          <span className="flex items-center gap-2">
            <MaterialIcon name="history" className="text-[16px]" />
            Extrato de XP
          </span>
          <span aria-hidden="true">{historyOpen ? '−' : '+'}</span>
        </button>
        {historyOpen && (
          <div className="mt-3 space-y-2" aria-live="polite">
            {historyLoading && (
              <p className="m-0 text-xs text-[#64748B]">Carregando extrato...</p>
            )}
            {historyError && (
              <p role="alert" className="m-0 text-xs text-[#FCA5A5]">
                {historyError}
              </p>
            )}
            {history && history.length === 0 && (
              <p className="m-0 text-xs text-[#64748B]">Nenhuma recompensa registrada ainda.</p>
            )}
            {history?.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-3 rounded-lg bg-[#121624] px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="m-0 truncate text-[#E2E8F0]">{entry.description}</p>
                  <p className="m-0 mt-1 text-[10px] text-[#64748B]">
                    {XP_SOURCE_LABELS[entry.source] ?? entry.source} ·{' '}
                    {new Intl.DateTimeFormat('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }).format(new Date(entry.createdAt))}
                  </p>
                </div>
                <span className="shrink-0 font-mono font-bold text-[#00E676]">
                  +{entry.amount} XP
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
