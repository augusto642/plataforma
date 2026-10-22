'use client';

import React from 'react';
import { AdminHealth, AdminMetrics } from '../types';
import { formatNumber, formatUptime } from '../utils';

// B40/A4 (Sprint 13) — Saúde do sistema REAL.
// Antes: "cluster Piston" com 4 nós inventados (us-east/sa-east/eu),
// logs de console escritos à mão no código-fonte ("simulatedLogs") e
// ações SRE simuladas (reciclar pool, purgar cache, benchmark) que só
// exibiam toast. Agora a tela mostra apenas o que a API mede de
// verdade: GET /admin/health (banco, Redis, uptime) e o bloco system/
// cache de GET /admin/metrics (processo da API). Não existe endpoint
// de nós de execução nem das ações SRE: foram removidos.

interface AdminSystemHealthTabProps {
  metrics: AdminMetrics | null;
  metricsError: string | null;
  health: AdminHealth | null;
  healthError: string | null;
}

function ServiceRow({ name, status }: { name: string; status: string | undefined }) {
  const up = status === 'up';
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-[#181820] border border-[#27272A] text-xs">
      <span className="flex items-center gap-2.5 text-white font-semibold">
        <span className={`w-2 h-2 rounded-full ${up ? 'bg-[#04D361]' : 'bg-[#F43F5E]'}`} />
        {name}
      </span>
      <span className={`font-mono font-bold ${up ? 'text-[#04D361]' : 'text-[#F43F5E]'}`}>
        {status ? status.toUpperCase() : '—'}
      </span>
    </div>
  );
}

export const AdminSystemHealthTab: React.FC<AdminSystemHealthTabProps> = ({
  metrics,
  metricsError,
  health,
  healthError,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-white font-heading">Saúde do Sistema</h2>
        <p className="text-xs text-[#A1A1AA] mt-0.5">
          Leitura real de GET /admin/health e GET /admin/metrics (processo da API).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Serviços */}
        <div className="p-6 rounded-2xl bg-[#121217] border border-[#27272A] space-y-3">
          <h3 className="text-base font-bold text-white font-heading">Serviços</h3>
          {health ? (
            <>
              <ServiceRow name="Banco de dados (PostgreSQL)" status={health.services.database} />
              <ServiceRow name="Cache (Redis)" status={health.services.redis} />
              <p className="text-[11px] text-[#71717A] font-mono">
                status geral: {health.status} · uptime do processo:{' '}
                {formatUptime(health.uptime)} · verificado em{' '}
                {new Date(health.timestamp).toLocaleTimeString('pt-BR')}
              </p>
            </>
          ) : (
            <p className="text-xs text-[#A1A1AA]">
              {healthError
                ? `Não foi possível consultar a saúde dos serviços: ${healthError}`
                : 'Consultando a saúde dos serviços…'}
            </p>
          )}
        </div>

        {/* Processo da API */}
        <div className="p-6 rounded-2xl bg-[#121217] border border-[#27272A] space-y-3">
          <h3 className="text-base font-bold text-white font-heading">Processo da API</h3>
          {metrics ? (
            <dl className="text-xs space-y-2">
              <div className="flex justify-between gap-4">
                <dt className="text-[#A1A1AA]">Uptime</dt>
                <dd className="font-mono text-white">{formatUptime(metrics.system.uptimeSeconds)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#A1A1AA]">Memória RSS</dt>
                <dd className="font-mono text-white">{metrics.system.memory.rssMb} MB</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#A1A1AA]">Heap (usado / total)</dt>
                <dd className="font-mono text-white">
                  {metrics.system.memory.heapUsedMb} MB / {metrics.system.memory.heapTotalMb} MB
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#A1A1AA]">Requisições HTTP (total / erros)</dt>
                <dd className="font-mono text-white">
                  {formatNumber(metrics.system.httpRequestsTotal)} /{' '}
                  {formatNumber(metrics.system.httpErrorsTotal)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#A1A1AA]">Latência média HTTP</dt>
                <dd className="font-mono text-white">
                  {Math.round(metrics.system.avgLatencyMs)} ms
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#A1A1AA]">Cache</dt>
                <dd className="font-mono text-white">
                  {metrics.cache.status} · ping {metrics.cache.pingLatencyMs} ms
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#A1A1AA]">Ambiente</dt>
                <dd className="font-mono text-white">
                  Node {metrics.system.nodeVersion} · {metrics.system.platform}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-xs text-[#A1A1AA]">
              {metricsError
                ? `Não foi possível carregar as métricas do processo: ${metricsError}`
                : 'Carregando as métricas do processo…'}
            </p>
          )}
        </div>
      </div>

      <div className="bg-[#181820] border border-[#27272A] rounded-xl p-4 text-xs text-zinc-300">
        <span className="font-bold text-white">O que esta tela não mostra mais:</span> nós de um
        “cluster Piston” com latências e CPUs inventados, logs de console escritos no código e
        botões de reciclar pool, purgar cache e rodar benchmark — nenhum desses dados ou ações
        tem endpoint na API. A observabilidade do executor de código (Piston) não é exposta ao
        painel hoje.
      </div>
    </div>
  );
};
