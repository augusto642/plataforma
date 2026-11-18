'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AdminHealth, AdminMetrics, AdminTab } from '../types';
import { formatNumber, formatUptime } from '../utils';
import { apiFetch, API_BASE } from '../../../lib/apiClient';

const CONTROLLED_AI_QUEUES = new Set([
  'ai-reviews',
  'track-investigation',
  'research',
  'track-generation',
]);

type BillingReadiness = {
  mode: string;
  provider: string;
  livePaymentsEnabled: boolean;
  localConfigurationReady: boolean;
  checks: Array<{
    key: string;
    label: string;
    status: 'ready' | 'blocked' | 'manual';
  }>;
};

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
  onRefreshMetrics: () => Promise<void>;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  metrics,
  metricsError,
  health,
  onNavigateTab,
  onRefreshMetrics,
}) => {
  const [controlReason, setControlReason] = useState('');
  const [controlBusy, setControlBusy] = useState<string | null>(null);
  const [controlError, setControlError] = useState<string | null>(null);
  const [operatorAudit, setOperatorAudit] = useState<Array<{
    id: string;
    queue: string;
    action: string;
    reason: string;
    status: string;
    createdAt: string;
  }>>([]);
  const [billingReadiness, setBillingReadiness] = useState<BillingReadiness | null>(null);
  const [billingReadinessError, setBillingReadinessError] = useState<string | null>(null);

  const loadOperatorAudit = useCallback(async () => {
    const res = await apiFetch(`${API_BASE}/admin/ai/operator-audit`);
    if (res.ok) setOperatorAudit(await res.json());
  }, []);

  const loadBillingReadiness = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE}/billing/admin/readiness`);
      if (!res.ok) {
        throw new Error(`A API respondeu ${res.status}.`);
      }
      setBillingReadiness((await res.json()) as BillingReadiness);
      setBillingReadinessError(null);
    } catch (error) {
      setBillingReadinessError(
        error instanceof Error ? error.message : 'Não foi possível consultar a configuração de cobrança.',
      );
    }
  }, []);

  useEffect(() => {
    void loadOperatorAudit();
    void loadBillingReadiness();
  }, [loadOperatorAudit, loadBillingReadiness]);

  const controlQueue = async (queue: string, action: 'pause' | 'resume') => {
    if (controlReason.trim().length < 10) {
      setControlError('Informe um motivo com pelo menos 10 caracteres.');
      return;
    }
    if (!window.confirm(`${action === 'pause' ? 'Pausar' : 'Retomar'} a fila ${queue}?`)) return;

    setControlBusy(`${queue}:${action}`);
    setControlError(null);
    try {
      const res = await apiFetch(`${API_BASE}/admin/ai/queue-control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue, action, reason: controlReason.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setControlError(body?.message || `A API respondeu ${res.status}.`);
        return;
      }
      setControlReason('');
      await Promise.all([loadOperatorAudit(), onRefreshMetrics()]);
    } catch {
      setControlError('Não foi possível concluir o controle da fila.');
    } finally {
      setControlBusy(null);
    }
  };

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
  const estimatedAiCost =
    metrics.ai.estimatedCostUsd === null
      ? 'Indisponível'
      : new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 4,
          maximumFractionDigits: 6,
        }).format(metrics.ai.estimatedCostUsd);
  const aiMetrics: Array<{ label: string; value: string }> = [
    { label: 'Chamadas', value: formatNumber(metrics.ai.calls) },
    { label: 'Falhas', value: formatNumber(metrics.ai.failedCalls) },
    { label: 'Bloqueios', value: formatNumber(metrics.ai.blockedCalls) },
    { label: 'Fallbacks estimados', value: formatNumber(metrics.ai.fallbackCalls) },
    {
      label: 'Taxa de fallback estimada',
      value:
        metrics.ai.fallbackRate === null
          ? 'N/D'
          : `${(metrics.ai.fallbackRate * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`,
    },
    { label: 'Tokens de entrada', value: formatNumber(metrics.ai.promptTokens) },
    { label: 'Tokens de saída', value: formatNumber(metrics.ai.completionTokens) },
    { label: 'Tokens totais', value: formatNumber(metrics.ai.totalTokens) },
    { label: 'Custo estimado (USD)', value: estimatedAiCost },
    { label: 'Chamadas precificadas', value: formatNumber(metrics.ai.pricedCalls) },
    { label: 'Chamadas sem tarifa/uso', value: formatNumber(metrics.ai.unpricedCalls) },
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
            A auditoria geral ainda não tem feed. As ações de controle das filas de IA ficam
            registradas na seção de operações abaixo.
          </p>
          <button
            onClick={() => onNavigateTab('audit')}
            className="text-xs font-semibold text-[#8257E5] hover:text-[#996DFF] transition-colors"
          >
            Ver a área de Auditoria &amp; Certificados →
          </button>
        </div>
      </div>

      <section className="p-6 rounded-2xl bg-[#121217] border border-[#27272A] space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white font-heading">Prontidão de cobrança</h3>
            <p className="text-xs text-[#A1A1AA]">
              Diagnóstico de configuração para checkout Mercado Pago sandbox; nenhum segredo é exibido.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadBillingReadiness()}
            className="rounded-lg border border-[#3F3F46] px-3 py-1.5 text-xs font-semibold text-white"
          >
            Atualizar diagnóstico
          </button>
        </div>
        {billingReadinessError ? (
          <p role="alert" className="text-xs text-[#F87171]">
            Não foi possível consultar a prontidão: {billingReadinessError}
          </p>
        ) : !billingReadiness ? (
          <p className="text-xs text-[#A1A1AA]">Consultando configuração de cobrança…</p>
        ) : (
          <>
            <p className={`text-xs font-semibold ${billingReadiness.localConfigurationReady ? 'text-[#04D361]' : 'text-[#FFA116]'}`}>
              {billingReadiness.localConfigurationReady
                ? 'Configuração local pronta para validar o sandbox.'
                : 'Configuração local incompleta para validar o sandbox.'}{' '}
              Provedor atual: {billingReadiness.provider} · modo: {billingReadiness.mode}
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {billingReadiness.checks.map((check) => (
                <li key={check.key} className="rounded-lg bg-[#181820] p-3 text-xs">
                  <span className={`mr-2 font-semibold ${
                    check.status === 'ready'
                      ? 'text-[#04D361]'
                      : check.status === 'manual'
                        ? 'text-[#00E5FF]'
                        : 'text-[#FFA116]'
                  }`}>
                    {check.status === 'ready'
                      ? 'Configurado'
                      : check.status === 'manual'
                        ? 'Verificação manual'
                        : 'Pendente'}
                  </span>
                  <span className="text-[#D4D4D8]">{check.label}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-[#71717A]">
              {billingReadiness.livePaymentsEnabled
                ? 'Pagamentos reais estão habilitados.'
                : 'Pagamentos reais continuam desativados. A configuração local não comprova webhook público, pagamento Pix aprovado nem conta comercial validada.'}
            </p>
          </>
        )}
      </section>

      <div className="p-6 rounded-2xl bg-[#121217] border border-[#27272A] space-y-4">
        <div>
          <h3 className="text-base font-bold text-white font-heading">Uso de IA — hoje (UTC)</h3>
          <p className="text-xs text-[#A1A1AA]">
            Chamadas reais registradas, incluindo falhas e bloqueios antes do provedor.
          </p>
        </div>
        <dl className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {aiMetrics.map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-[#181820] p-3">
              <dt className="text-[#A1A1AA]">{label}</dt>
              <dd className="mt-1 font-mono text-lg font-semibold text-white">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-[#71717A]">
          Estimativa por tarifa pública paga, verificada em {metrics.ai.pricingCheckedAt}; não é
          cobrança real e não inclui nível gratuito, cache, descontos, impostos ou tarifas de
          ferramentas.
          {metrics.ai.unpricedCalls > 0 &&
            ` Subtotal parcial: ${formatNumber(metrics.ai.unpricedCalls)} chamadas sem tarifa pública conhecida ou sem tokens registrados.`}
        </p>
        <p className="text-xs text-[#71717A]">
          Fallback estimado = falhas do provedor + bloqueios por cota/configuração, dividido por
          chamadas e bloqueios; não representa todas as respostas heurísticas.
        </p>
        <p className="text-xs text-[#71717A]">
          Fontes:{' '}
          <a
            href="https://ai.google.dev/gemini-api/docs/pricing"
            target="_blank"
            rel="noreferrer"
            className="text-[#A1A1AA] underline hover:text-white"
          >
            Google Gemini
          </a>
          {' · '}
          <a
            href="https://developers.openai.com/api/docs/pricing"
            target="_blank"
            rel="noreferrer"
            className="text-[#A1A1AA] underline hover:text-white"
          >
            OpenAI
          </a>
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-[#121217] border border-[#27272A] space-y-4">
        <div>
          <h3 className="text-base font-bold text-white font-heading">Resultados do tutor — últimos {metrics.aiQuality.windowDays} dias</h3>
          <p className="text-xs text-[#A1A1AA]">
            Feedback categórico dos alunos; nenhum código, texto da conversa ou identificador pessoal é armazenado.
          </p>
        </div>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {[
            ['Respostas avaliadas', metrics.aiQuality.total],
            ['Ajudaram', metrics.aiQuality.helpful],
            ['Não ajudaram', metrics.aiQuality.notHelpful],
            ['Excesso de resposta', metrics.aiQuality.concerns.tooMuchAnswer],
            ['Possivelmente incorretas', metrics.aiQuality.concerns.incorrect],
            ['Pouco claras', metrics.aiQuality.concerns.unclear],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-[#181820] p-3">
              <dt className="text-[#A1A1AA]">{label}</dt>
              <dd className="mt-1 font-mono text-lg font-semibold text-white">{formatNumber(Number(value))}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-[#71717A]">
          Use os temas recorrentes para revisar o conjunto de testes determinístico em
          <code className="mx-1">apps/api/src/ai/golden/golden-set.json</code>.
          Avaliações live continuam opt-in e não geram chamadas pagas automaticamente.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-[#121217] border border-[#27272A] space-y-4">
        <div>
          <h3 className="text-base font-bold text-white font-heading">Filas assíncronas</h3>
          <p className="text-xs text-[#A1A1AA]">
            Contagens atuais do BullMQ. Pausar ou retomar exige motivo, confirmação e registro de auditoria.
          </p>
        </div>
        <label className="block text-xs text-[#A1A1AA]">
          Motivo obrigatório (10–500 caracteres; não inclua dados pessoais ou segredos)
          <input
            value={controlReason}
            onChange={(event) => setControlReason(event.target.value)}
            maxLength={500}
            className="mt-1 w-full rounded-lg border border-[#27272A] bg-[#181820] px-3 py-2 text-sm text-white"
          />
        </label>
        {controlError && <p role="alert" className="text-xs text-[#F87171]">{controlError}</p>}
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {metrics.queues.map((queue) => (
            <li key={queue.name} className="rounded-xl bg-[#181820] p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-white">{queue.name}</span>
                <span className={`text-xs ${queue.available ? 'text-[#04D361]' : 'text-[#FFA116]'}`}>
                  {queue.available ? 'Disponível' : 'Indisponível'}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#A1A1AA]">
                {queue.available
                  ? `${formatNumber(queue.waiting ?? 0)} aguardando · ${formatNumber(queue.active ?? 0)} ativos · ${formatNumber(queue.failed ?? 0)} falhos · ${formatNumber(queue.delayed ?? 0)} atrasados · ${formatNumber(queue.headWaitingAgeSeconds ?? 0)}s na cabeça da fila`
                  : 'Não foi possível consultar os contadores desta fila.'}
              </p>
              {CONTROLLED_AI_QUEUES.has(queue.name) && (
                <div className="mt-3 flex gap-2">
                  {(['pause', 'resume'] as const).map((action) => (
                  <button
                    key={action}
                    type="button"
                    disabled={!queue.available || controlBusy !== null || controlReason.trim().length < 10}
                    onClick={() => void controlQueue(queue.name, action)}
                    className="rounded-lg border border-[#3F3F46] px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {controlBusy === `${queue.name}:${action}` ? 'Processando…' : action === 'pause' ? 'Pausar fila' : 'Retomar fila'}
                  </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
        <div>
          <h4 className="text-sm font-semibold text-white">Auditoria de controles</h4>
          {operatorAudit.length === 0 ? (
            <p className="mt-1 text-xs text-[#71717A]">Nenhum controle registrado recentemente.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {operatorAudit.slice(0, 10).map((event) => (
                <li key={event.id} className="rounded-lg bg-[#181820] p-3 text-xs text-[#A1A1AA]">
                  <span className="font-semibold text-white">{event.action} · {event.queue}</span>
                  <span className="mx-2">· {event.status}</span>
                  <span>· {new Date(event.createdAt).toLocaleString('pt-BR')}</span>
                  <p className="mt-1">{event.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
