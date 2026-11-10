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

// Central 216 (F3) — "Missões de Hoje" no visual do protótipo Stitch
// v2 (dashboard-aluno.html). Dados reais: submissões de hoje
// (GET /submissions) e simulação de hoje (GET /interview/sessions/me).
// Fail-closed: se /submissions falhar, o card some inteiro; se só
// as sessões falharem, só a missão de entrevista some.
export function DailyMissions() {
  const [missions, setMissions] = useState<DailyMission[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`${API_BASE}/submissions`);
        if (!res.ok) return; // sem submissões, sem missões — omitir
        const subs = (await res.json()) as Array<{ createdAt?: string | null }>;
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
        // Rede/API fora: omitir o card, nunca inventar missões.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!missions) return null;
  const allDone = missions.every((m) => m.done);

  return (
    <section
      aria-label="Missões de hoje"
      className="spotlight-card rounded-2xl border border-zinc-800 bg-[#121217] p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-white">Missões de Hoje</h2>
        <span className="text-xs font-bold text-zinc-400">
          {allDone ? 'Concluídas' : 'Em andamento'}
        </span>
      </div>
      <ul className="space-y-3">
        {missions.map((mission) => (
          <li key={mission.id} className="flex items-center gap-3">
            <MaterialIcon
              name={mission.done ? 'check_circle' : 'radio_button_unchecked'}
              className={`text-[20px] ${mission.done ? 'text-secondary' : 'text-dark-on-surface-variant'}`}
            />
            <span className="flex-1 text-sm text-zinc-300">{mission.title}</span>
            <span className="text-xs text-zinc-500">{mission.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
