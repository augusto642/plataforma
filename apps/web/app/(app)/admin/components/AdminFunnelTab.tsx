'use client';

/**
 * AdminFunnelTab — leitura do funil de conversão (Sprint 8, Frente B).
 *
 * Até a Sprint 7, o GET /analytics/funnel respondia JSON cru e NINGUÉM
 * consumia: a leitura do funil (apontada pelo Growth em duas rodadas)
 * não existia como página. Esta tab consome o endpoint real com a
 * sessão por cookie (apiClient) e mostra TAXAS, não só totais:
 * pageview → clique em CTA → Missão 1 iniciada → vitória → cadastro →
 * primeira atividade, com os recortes que os dados permitem (porta,
 * campanha, etapa do prólogo).
 *
 * Estados honestos: sem sessão admin, a API responde 401/403 e a tab
 * diz isso (nenhum número é inventado); com o funil zerado, a tab
 * mostra o estado vazio em vez de taxas fictícias.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../../lib/apiClient';

interface FunnelSummary {
  totalsByEvent: Record<string, number>;
  clicksByCta: Array<{ event: string; ctaId: string; count: number }>;
  signupsByCampaign: Array<{ campaign: string; count: number }>;
  signupsByDoor: Array<{ door: string; count: number }>;
  mission: { started: number; completed: number; failed: number; skipped: number };
  onboarding: { steps: Array<{ step: string; count: number }>; resumed: number };
  uniqueVisitors: number;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'auth-error' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: FunnelSummary };

const CTA_EVENTS = [
  'hero_cta',
  'quiz_cta',
  'pricing_cta',
  'trilha_cta',
  'sandbox_cta',
  'nav_cta',
  'final_cta',
];

const DOOR_LABELS: Record<string, string> = {
  onboarding_save: 'Prólogo (/onboarding)',
  register_submit: 'Cadastro direto (/register)',
};

const STEP_LABELS: Record<string, string> = {
  mascot: '1 · Mascote',
  mission: '2 · Missão 1',
  tier: '3 · Nível de carreira',
  starter: '4 · Starter',
  avatar: '5 · Avatar',
  account: '6 · Salvar conta',
};

function fmtRate(numerator: number, denominator: number): string {
  if (denominator <= 0) return '—';
  return `${((numerator / denominator) * 100).toFixed(1).replace('.', ',')}%`;
}

export const AdminFunnelTab: React.FC = () => {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const res = await apiClient.get('/analytics/funnel');
      if (res.status === 401 || res.status === 403) {
        setState({ kind: 'auth-error' });
        return;
      }
      if (!res.ok) {
        setState({ kind: 'error', message: `A API respondeu ${res.status}.` });
        return;
      }
      const data = (await res.json()) as FunnelSummary;
      setState({ kind: 'ready', data });
    } catch {
      setState({ kind: 'error', message: 'Não foi possível falar com a API.' });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Funil de Conversão</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#A1A1AA]">
            Leitura real do analytics próprio (GET /analytics/funnel): da visita à primeira
            atividade na IDE, com a Missão 1 do prólogo medida etapa a etapa desde a Sprint 8.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl border border-[#27272A] bg-[#181820] px-4 py-2 text-xs font-semibold text-white transition hover:border-[#8257E5]/50 hover:bg-[#8257E5]/10"
        >
          Atualizar
        </button>
      </div>

      {state.kind === 'loading' && (
        <div className="rounded-2xl border border-[#27272A] bg-[#121217] p-8 text-center text-xs text-[#A1A1AA]">
          Carregando os eventos do funil…
        </div>
      )}

      {state.kind === 'auth-error' && (
        <div className="rounded-2xl border border-[#FFA116]/40 bg-[#FFA116]/5 p-8 text-center">
          <div className="text-sm font-bold text-[#FFA116]">Sessão admin necessária</div>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#A1A1AA]">
            O endpoint do funil exige login com papel admin. Entre com uma conta administradora e
            volte a esta aba — nenhum número é exibido sem a leitura real da API.
          </p>
        </div>
      )}

      {state.kind === 'error' && (
        <div className="rounded-2xl border border-[#F43F5E]/40 bg-[#F43F5E]/5 p-8 text-center">
          <div className="text-sm font-bold text-[#F43F5E]">Falha ao ler o funil</div>
          <p className="mt-2 text-xs text-[#A1A1AA]">{state.message}</p>
        </div>
      )}

      {state.kind === 'ready' && <FunnelBody data={state.data} />}
    </div>
  );
};

const FunnelBody: React.FC<{ data: FunnelSummary }> = ({ data }) => {
  const totals = data.totalsByEvent;
  const pageviews = totals['pageview'] ?? 0;
  const ctaClicks = CTA_EVENTS.reduce((sum, event) => sum + (totals[event] ?? 0), 0);
  const signups = totals['signup_success'] ?? 0;
  const firstActivity = totals['first_activity_completed'] ?? 0;

  const stages: Array<{ label: string; hint: string; value: number }> = [
    { label: 'Visitas (pageview)', hint: `${data.uniqueVisitors} visitantes únicos`, value: pageviews },
    { label: 'Cliques em CTA', hint: 'soma dos CTAs da landing', value: ctaClicks },
    { label: 'Missão 1 iniciada', hint: 'batalha do prólogo começou', value: data.mission.started },
    { label: 'Missão 1 vencida', hint: 'primeira vitória antes da conta', value: data.mission.completed },
    { label: 'Cadastros concluídos', hint: 'signup_success, todas as portas', value: signups },
    { label: 'Primeira atividade na IDE', hint: 'ativação real do aluno', value: firstActivity },
  ];

  const isEmpty = pageviews === 0 && ctaClicks === 0 && signups === 0 && data.mission.started === 0;

  if (isEmpty) {
    return (
      <div className="rounded-2xl border border-[#27272A] bg-[#121217] p-8 text-center">
        <div className="text-sm font-bold text-white">Nenhum evento de funil registrado ainda</div>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#A1A1AA]">
          A tabela analytics_events está vazia para os eventos do funil. Assim que a landing e o
          prólogo receberem visitas, as taxas aparecem aqui — sem estimativas.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Etapas do funil com taxas */}
      <div className="rounded-2xl border border-[#27272A] bg-[#121217] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Jornada — taxa entre etapas
          </h3>
          <span className="font-mono text-[10px] text-[#71717A]">
            base: {pageviews.toLocaleString('pt-BR')} pageviews
          </span>
        </div>
        <div className="space-y-3">
          {stages.map((stage, idx) => {
            const prev = idx === 0 ? null : stages[idx - 1].value;
            const widthPct = pageviews > 0 ? Math.max(2, (stage.value / pageviews) * 100) : 0;
            return (
              <div key={stage.label}>
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-white">
                    {idx + 1}. {stage.label}
                    <span className="ml-2 font-normal text-[#71717A]">{stage.hint}</span>
                  </span>
                  <span className="font-mono text-xs text-[#EDEDED]">
                    {stage.value.toLocaleString('pt-BR')}
                    {prev !== null && (
                      <span className="ml-2 text-[#996DFF]">
                        {fmtRate(stage.value, prev)} da etapa anterior
                      </span>
                    )}
                    {idx > 0 && (
                      <span className="ml-2 text-[#71717A]">
                        {fmtRate(stage.value, pageviews)} do total
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#27272A]">
                  <div
                    className="h-full rounded-full bg-[#8257E5] transition-all duration-500"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Missão 1 em detalhe */}
        <div className="rounded-2xl border border-[#27272A] bg-[#121217] p-5">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">
            Missão 1 do prólogo
          </h3>
          <dl className="space-y-2.5 text-xs">
            <DetailRow label="Iniciadas" value={data.mission.started} />
            <DetailRow
              label="Vencidas"
              value={data.mission.completed}
              extra={`vitória em ${fmtRate(data.mission.completed, data.mission.started)} das tentativas`}
            />
            <DetailRow label="Derrotas" value={data.mission.failed} />
            <DetailRow
              label="Puladas/abandonadas"
              value={data.mission.skipped}
              extra="props attempted separa pular antes de tentar de abandonar depois"
            />
          </dl>

          <h3 className="mb-3 mt-6 text-xs font-bold uppercase tracking-wider text-white">
            Prólogo por etapa (visualizações)
          </h3>
          {data.onboarding.steps.length === 0 ? (
            <p className="text-xs text-[#71717A]">
              Sem visualizações de etapa registradas (a instrumentação é da Sprint 8).
            </p>
          ) : (
            <dl className="space-y-2.5 text-xs">
              {data.onboarding.steps.map((row) => (
                <DetailRow
                  key={row.step}
                  label={STEP_LABELS[row.step] ?? row.step}
                  value={row.count}
                />
              ))}
              <DetailRow label="Retomadas (sessão restaurada)" value={data.onboarding.resumed} />
            </dl>
          )}
        </div>

        {/* Recortes: porta, campanha e CTAs */}
        <div className="rounded-2xl border border-[#27272A] bg-[#121217] p-5">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">
            Cadastros por porta
          </h3>
          {data.signupsByDoor.length === 0 ? (
            <p className="text-xs text-[#71717A]">Nenhum cadastro com porta identificada ainda.</p>
          ) : (
            <dl className="space-y-2.5 text-xs">
              {data.signupsByDoor.map((row) => (
                <DetailRow
                  key={row.door}
                  label={DOOR_LABELS[row.door] ?? row.door}
                  value={row.count}
                  extra={fmtRate(row.count, signups)}
                />
              ))}
            </dl>
          )}

          <h3 className="mb-3 mt-6 text-xs font-bold uppercase tracking-wider text-white">
            Cadastros por campanha (UTM)
          </h3>
          {data.signupsByCampaign.length === 0 ? (
            <p className="text-xs text-[#71717A]">Nenhum cadastro registrado ainda.</p>
          ) : (
            <dl className="space-y-2.5 text-xs">
              {data.signupsByCampaign.map((row) => (
                <DetailRow key={row.campaign} label={row.campaign} value={row.count} />
              ))}
            </dl>
          )}

          <h3 className="mb-3 mt-6 text-xs font-bold uppercase tracking-wider text-white">
            Cliques por CTA
          </h3>
          {data.clicksByCta.length === 0 ? (
            <p className="text-xs text-[#71717A]">Nenhum clique com ctaId registrado ainda.</p>
          ) : (
            <dl className="space-y-2.5 text-xs">
              {data.clicksByCta.slice(0, 8).map((row) => (
                <DetailRow
                  key={`${row.event}:${row.ctaId}`}
                  label={`${row.event} · ${row.ctaId}`}
                  value={row.count}
                />
              ))}
            </dl>
          )}
        </div>
      </div>
    </>
  );
};

const DetailRow: React.FC<{ label: string; value: number; extra?: string }> = ({
  label,
  value,
  extra,
}) => (
  <div className="flex items-baseline justify-between gap-3 border-b border-[#27272A]/60 pb-2 last:border-0 last:pb-0">
    <dt className="text-[#A1A1AA]">
      {label}
      {extra && <span className="ml-2 text-[#71717A]">— {extra}</span>}
    </dt>
    <dd className="font-mono font-bold text-white">{value.toLocaleString('pt-BR')}</dd>
  </div>
);
