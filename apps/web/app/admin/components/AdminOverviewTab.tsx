'use client';

import React from 'react';
import { AdminHealth, AdminMetrics, AdminTab } from '../types';
import { formatNumber, formatUptime } from '../utils';

// B40/A4 (Sprint 13) — Visão Geral com dados REAIS.
// Antes: cards de um SystemMetric fictício (latência Piston, "32 nós",
// deltas "+14,2%"), sparkline desenhado à mão, nós de cluster inventados
// e feed de auditoria de logs fabricados. Agora todos os números vêm de
// GET /admin/metrics e GET /admin/health. Não há série temporal nem logs
// na API: o gráfico e o feed foram removidos, não simulados.

interface AdminOverviewTabProps {
  metrics: AdminMetrics | null;
  metricsError: string | null;
  health: AdminHealth | null;
  onNavigateTab: (tab: AdminTab) => void;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  metrics,
  metricsError,
  health,
  onNavigateTab,
}) => {
  if (!metrics) {
    return (
      <div className="p-6 rounded-2xl bg-[#121217] border border-[#27272A]">
        <h2 className="text-base font-bold text-white font-heading mb-1">Visão Geral</h2>
        <p className="text-xs text-[#A1A1AA]">
          {metricsError
            ? `Não foi possível carregar as métricas reais da plataforma: ${metricsError}`
            : 'Carregando as métricas reais da plataforma…'}
        </p>
      </div>
    );
  }

  const { platform, system, cache } = metrics;

  const cards: Array<{
    title: string;
    value: string;
    subtext: string;
    accent: string;
  }> = [
    {
      title: 'Usuários cadastrados',
      value: formatNumber(platform.users.total),
      subtext: `${formatNumber(platform.users.students)} alunos · ${formatNumber(platform.users.instructors)} instrutores · ${formatNumber(platform.users.admins)} admins`,
      accent: 'text-[#996DFF]',
    },
    {
      title: 'Usuários ativos (24h)',
      value: formatNumber(platform.users.activeLast24h),
      subtext: 'Contas com atividade registrada nas últimas 24 horas',
      accent: 'text-[#04D361]',
    },
    {
      title: 'Cursos',
      value: formatNumber(platform.courses.total),
      subtext: `${formatNumber(platform.courses.publicLibrary)} na biblioteca pública · ${formatNumber(platform.courses.totalEnrollments)} matrículas no total`,
      accent: 'text-[#FFA116]',
    },
    {
      title: 'Atividades',
      value: formatNumber(platform.activities.total),
      subtext: 'Atividades cadastradas em todos os cursos',
      accent: 'text-[#00E5FF]',
    },
    {
      title: 'Submissões de código',
      value: formatNumber(platform.submissions.total),
      subtext: `${formatNumber(platform.submissions.passed)} aprovadas · ${formatNumber(platform.submissions.failed)} reprovadas · ${formatNumber(platform.submissions.pendingOrRunning)} em execução/fila`,
      accent: 'text-[#996DFF]',
    },
    {
      title: 'Taxa de aprovação',
      value: `${platform.submissions.passRate.toLocaleString('pt-BR')}%`,
      subtext: 'Aprovadas ÷ total de submissões registradas',
      accent: 'text-[#04D361]',
    },
    {
      title: 'Latência média HTTP da API',
      value: `${Math.round(system.avgLatencyMs)} ms`,
      subtext: `${formatNumber(system.httpRequestsTotal)} requisições · ${formatNumber(system.httpErrorsTotal)} erros desde o início do processo`,
      accent: 'text-[#00E5FF]',
    },
    {
      title: 'Cache (Redis)',
      value: cache.status === 'connected' ? 'Conectado' : cache.status,
      subtext: `Ping de ${cache.pingLatencyMs} ms na medição das métricas`,
      accent: 'text-[#FFA116]',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#181820] via-[#121217] to-[#181820] border border-[#27272A] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-48 bg-[#8257E5]/5 blur-3xl pointer-events-none" />
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                health?.status === 'healthy'
                  ? 'bg-[#04D361]/15 text-[#04D361] border-[#04D361]/30'
                  : 'bg-[#FFA116]/15 text-[#FFA116] border-[#FFA116]/30'
              }`}
            >
              {health
                ? health.status === 'healthy'
                  ? 'API SAUDÁVEL'
                  : `API ${health.status.toUpperCase()}`
                : 'SAÚDE NÃO CONSULTADA'}
            </span>
            <span className="text-xs text-[#71717A] font-mono">
              atualizado em {new Date(metrics.timestamp).toLocaleTimeString('pt-BR')}
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white font-heading tracking-tight">
            Painel de Operações
          </h1>
          <p className="text-sm text-[#A1A1AA]">
            Números reais da plataforma, lidos de GET /admin/metrics e GET /admin/health.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 z-10">
          <button
            onClick={() => onNavigateTab('users')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white text-xs font-semibold shadow-[0_0_15px_rgba(130,87,229,0.35)] transition-all"
          >
            <span>👥</span>
            <span>Gerenciar Usuários</span>
          </button>
          <button
            onClick={() => onNavigateTab('system')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#181820] hover:bg-[#202028] border border-[#27272A] text-white text-xs font-semibold transition-all"
          >
            <span>🩺</span>
            <span>Saúde do Sistema</span>
          </button>
        </div>
      </div>

      {/* Real metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="p-5 rounded-2xl bg-[#121217] border border-[#27272A] transition-all duration-300"
          >
            <span className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider font-mono">
              {card.title}
            </span>
            <div className={`text-2xl lg:text-3xl font-bold font-heading tracking-tight mt-2 ${card.accent}`}>
              {card.value}
            </div>
            <p className="text-xs text-[#71717A] mt-1.5 leading-relaxed">{card.subtext}</p>
          </div>
        ))}
      </div>

      {/* Processo da API + auditoria (estado honesto) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-[#121217] border border-[#27272A] space-y-3">
          <h3 className="text-base font-bold text-white font-heading">Processo da API</h3>
          <dl className="text-xs space-y-2">
            <div className="flex justify-between gap-4">
              <dt className="text-[#A1A1AA]">Uptime do processo</dt>
              <dd className="font-mono text-white">{formatUptime(system.uptimeSeconds)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#A1A1AA]">Memória (heap usado / total)</dt>
              <dd className="font-mono text-white">
                {system.memory.heapUsedMb} MB / {system.memory.heapTotalMb} MB
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#A1A1AA]">Node.js</dt>
              <dd className="font-mono text-white">
                {system.nodeVersion} · {system.platform}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#A1A1AA]">Submissões ativas agora</dt>
              <dd className="font-mono text-white">{formatNumber(system.activeSubmissions)}</dd>
            </div>
          </dl>
        </div>

        <div className="p-6 rounded-2xl bg-[#121217] border border-[#27272A] space-y-3">
          <h3 className="text-base font-bold text-white font-heading">Auditoria</h3>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            A API atual não expõe um feed de logs de auditoria administrativa. Esta área não exibe
            registros de exemplo como se fossem eventos reais da plataforma.
          </p>
          <button
            onClick={() => onNavigateTab('audit')}
            className="text-xs font-semibold text-[#8257E5] hover:text-[#996DFF] transition-colors"
          >
            Ver a área de Auditoria &amp; Certificados →
          </button>
        </div>
      </div>
    </div>
  );
};
