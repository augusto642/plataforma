'use client';

import React from 'react';
import { SystemMetric, AuditLogItem, AdminTab } from '../types';

interface AdminOverviewTabProps {
  metrics: SystemMetric;
  recentLogs: AuditLogItem[];
  onNavigateTab: (tab: AdminTab) => void;
  onQuickAction: (action: string) => void;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  metrics,
  recentLogs,
  onNavigateTab,
  onQuickAction,
}) => {
  const metricCards = [
    {
      title: 'Usuários Ativos',
      value: metrics.activeUsers.toLocaleString('pt-BR'),
      subtext: '+14.2% em relação à última semana',
      change: '+14.2%',
      isPositive: true,
      color: 'from-[#8257E5] to-[#996DFF]',
      borderGlow: 'hover:border-[#8257E5]',
      icon: (
        <svg className="w-5 h-5 text-[#8257E5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      title: 'Latência Piston P50',
      value: `${metrics.pistonLatencyMs} ms`,
      subtext: `P99: ${metrics.p99LatencyMs}ms • 32 nós online`,
      change: '-4.8ms',
      isPositive: true,
      color: 'from-[#04D361] to-[#00B37E]',
      borderGlow: 'hover:border-[#04D361]',
      icon: (
        <svg className="w-5 h-5 text-[#04D361]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      title: 'Submissões de Código',
      value: metrics.totalSubmissions.toLocaleString('pt-BR'),
      subtext: 'Fila atual: 3 execuções em buffer',
      change: '+3.4k hoje',
      isPositive: true,
      color: 'from-[#00E5FF] to-[#0070F3]',
      borderGlow: 'hover:border-[#00E5FF]',
      icon: (
        <svg className="w-5 h-5 text-[#00E5FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
    },
    {
      title: 'Taxa Global de Aprovação',
      value: `${metrics.passRate}%`,
      subtext: `Erro de infra: ${(metrics.errorRate * 100).toFixed(2)}%`,
      change: '+2.1%',
      isPositive: true,
      color: 'from-[#FFA116] to-[#F59E0B]',
      borderGlow: 'hover:border-[#FFA116]',
      icon: (
        <svg className="w-5 h-5 text-[#FFA116]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: 'Alocação de RAM Sandbox',
      value: metrics.containerMemoryUsage.split('(')[0].trim(),
      subtext: '23.7% do pool reservado (16 GB)',
      change: 'Estável',
      isPositive: true,
      color: 'from-[#996DFF] to-[#8257E5]',
      borderGlow: 'hover:border-[#996DFF]',
      icon: (
        <svg className="w-5 h-5 text-[#996DFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      ),
    },
    {
      title: 'Carga Média de CPU',
      value: metrics.cpuLoad,
      subtext: `Uptime Sandbox: ${metrics.sandboxUptime}`,
      change: 'Excelente',
      isPositive: true,
      color: 'from-[#04D361] to-[#00E5FF]',
      borderGlow: 'hover:border-[#04D361]',
      icon: (
        <svg className="w-5 h-5 text-[#04D361]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header with Status Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#181820] via-[#121217] to-[#181820] border border-[#27272A] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-48 bg-[#8257E5]/5 blur-3xl pointer-events-none" />
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#04D361]/15 text-[#04D361] border border-[#04D361]/30">
              CLUSTER SAUDÁVEL
            </span>
            <span className="text-xs text-[#71717A] font-mono">v2.4.0-prod</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white font-heading tracking-tight">
            Painel de Operações & Engenharia
          </h1>
          <p className="text-sm text-[#A1A1AA]">
            Visão consolidada da infraestrutura de execução remota, métricas de compilação e usuários.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 z-10">
          <button
            onClick={() => onNavigateTab('courses')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white text-xs font-semibold shadow-[0_0_15px_rgba(130,87,229,0.35)] transition-all"
          >
            <span>➕</span>
            <span>Novo Desafio</span>
          </button>
          <button
            onClick={() => onNavigateTab('users')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#181820] hover:bg-[#202028] border border-[#27272A] text-white text-xs font-semibold transition-all"
          >
            <span>👥</span>
            <span>Promover Instrutor</span>
          </button>
          <button
            onClick={() => onQuickAction('flush_pool')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#181820] hover:bg-[#202028] border border-[#27272A] text-[#00E5FF] text-xs font-semibold transition-all"
          >
            <span>⚡</span>
            <span>Limpar Micro-VMs</span>
          </button>
        </div>
      </div>

      {/* 2. 6 Metric Cards Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {metricCards.map((card, idx) => (
          <div
            key={idx}
            className={`p-5 rounded-2xl bg-[#121217] border border-[#27272A] ${card.borderGlow} transition-all duration-300 relative group overflow-hidden`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider font-mono">
                {card.title}
              </span>
              <div className="p-2 rounded-xl bg-[#181820] border border-[#27272A]">
                {card.icon}
              </div>
            </div>

            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-2xl lg:text-3xl font-bold text-white font-heading tracking-tight">
                {card.value}
              </span>
              <span className="text-xs font-mono font-semibold text-[#04D361] bg-[#04D361]/10 px-2 py-0.5 rounded-full border border-[#04D361]/30">
                {card.change}
              </span>
            </div>

            <p className="text-xs text-[#71717A]">{card.subtext}</p>
          </div>
        ))}
      </div>

      {/* 3. Piston Throughput & Execution Sparkline + Cluster SRE Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Vazão Piston Gráfico */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#121217] border border-[#27272A] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white font-heading">
                Vazão de Execuções e Latência Piston (Últimas 24h)
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                Monitoramento contínuo de compilação isolada (gRPC + isolated cgroups v2)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-mono text-[#00E5FF]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF]" /> Submissões/min
              </span>
              <span className="flex items-center gap-1.5 text-xs font-mono text-[#04D361]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#04D361]" /> Latência (ms)
              </span>
            </div>
          </div>

          {/* SVG Visual Graph */}
          <div className="h-56 w-full relative bg-[#09090A] rounded-xl border border-[#27272A] p-4 flex flex-col justify-end overflow-hidden">
            {/* Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none opacity-20">
              <div className="border-b border-[#71717A] w-full" />
              <div className="border-b border-[#71717A] w-full" />
              <div className="border-b border-[#71717A] w-full" />
              <div className="border-b border-[#71717A] w-full" />
            </div>

            {/* Sparkline Graphic */}
            <svg className="w-full h-36 overflow-visible" preserveAspectRatio="none" viewBox="0 0 600 140">
              <defs>
                <linearGradient id="glowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#8257E5" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#8257E5" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area Under Submissions Curve */}
              <polygon
                fill="url(#glowGradient)"
                points="0,120 50,105 100,80 150,95 200,60 250,70 300,45 350,55 400,30 450,40 500,25 550,35 600,20 600,140 0,140"
              />

              {/* Path 1: Submissions Throughput (Purple) */}
              <polyline
                fill="none"
                stroke="#8257E5"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="0,120 50,105 100,80 150,95 200,60 250,70 300,45 350,55 400,30 450,40 500,25 550,35 600,20"
              />

              {/* Path 2: Latency Sparkline (Neon Green) */}
              <polyline
                fill="none"
                stroke="#04D361"
                strokeWidth="2"
                strokeDasharray="4 4"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="0,65 50,60 100,55 150,58 200,50 250,52 300,42 350,44 400,40 450,42 500,38 550,39 600,37"
              />
            </svg>

            {/* Time labels */}
            <div className="flex justify-between text-[10px] font-mono text-[#71717A] pt-2 border-t border-[#27272A]/40 mt-1">
              <span>00:00</span>
              <span>04:00</span>
              <span>08:00</span>
              <span>12:00</span>
              <span>16:00</span>
              <span>20:00</span>
              <span>Agora</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-[#181820] border border-[#27272A]">
              <span className="text-[11px] text-[#A1A1AA]">Média 24h</span>
              <p className="text-sm font-bold text-white font-mono">16.2k exec/h</p>
            </div>
            <div className="p-3 rounded-xl bg-[#181820] border border-[#27272A]">
              <span className="text-[11px] text-[#A1A1AA]">Pico Histórico</span>
              <p className="text-sm font-bold text-[#00E5FF] font-mono">34.8k exec/h</p>
            </div>
            <div className="p-3 rounded-xl bg-[#181820] border border-[#27272A]">
              <span className="text-[11px] text-[#A1A1AA]">Tempo de Resposta P99</span>
              <p className="text-sm font-bold text-[#04D361] font-mono">128 ms</p>
            </div>
          </div>
        </div>

        {/* Right 1 Col: SRE Live Nodes Status */}
        <div className="p-6 rounded-2xl bg-[#121217] border border-[#27272A] flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
              <h3 className="text-base font-bold text-white font-heading">Nós de Execução</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#04D361]/15 text-[#04D361] border border-[#04D361]/30">
                4/4 Ativos
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {[
                { name: 'us-east-1a (Master Pool)', ping: '38ms', cpu: '14.5%', status: 'green' },
                { name: 'us-east-1b (Runner 2)', ping: '44ms', cpu: '22.1%', status: 'green' },
                { name: 'sa-east-1a (LATAM Edge)', ping: '19ms', cpu: '28.4%', status: 'green' },
                { name: 'eu-central-1 (Backup)', ping: '112ms', cpu: '6.2%', status: 'amber' },
              ].map((node, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-[#181820] border border-[#27272A] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        node.status === 'green' ? 'bg-[#04D361]' : 'bg-[#FFA116]'
                      }`}
                    />
                    <div>
                      <p className="font-semibold text-white truncate max-w-[140px]">{node.name}</p>
                      <p className="text-[11px] text-[#71717A] font-mono">CPU: {node.cpu}</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#A1A1AA]">{node.ping}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('system')}
            className="w-full py-2.5 rounded-xl bg-[#181820] hover:bg-[#202028] border border-[#27272A] text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all"
          >
            <span>Inspecionar Sandbox Cluster</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* 4. Recent SRE & Admin Audit Feed */}
      <div className="p-6 rounded-2xl bg-[#121217] border border-[#27272A] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white font-heading">
              Feed de Atividades Recentes & Auditoria
            </h3>
            <p className="text-xs text-[#A1A1AA]">
              Registro em tempo real de promoções, modificações de cursos e alertas de segurança
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('audit')}
            className="text-xs font-semibold text-[#8257E5] hover:text-[#996DFF] transition-colors"
          >
            Ver todos os logs →
          </button>
        </div>

        <div className="divide-y divide-[#27272A]">
          {recentLogs.slice(0, 5).map((log) => {
            const severityStyles = {
              info: 'bg-[#8257E5]/15 text-[#8257E5] border-[#8257E5]/30',
              warn: 'bg-[#FFA116]/15 text-[#FFA116] border-[#FFA116]/30',
              critical: 'bg-[#F43F5E]/15 text-[#F43F5E] border-[#F43F5E]/30',
            }[log.severity];

            return (
              <div key={log.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="flex items-start md:items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded font-mono font-bold uppercase text-[10px] border ${severityStyles}`}
                  >
                    {log.severity}
                  </span>
                  <div>
                    <span className="font-semibold text-white font-mono">{log.action}</span>
                    <span className="text-[#71717A] mx-2">•</span>
                    <span className="text-[#A1A1AA]">{log.target}</span>
                    {log.details && (
                      <p className="text-[11px] text-[#71717A] mt-0.5">{log.details}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-[#71717A] font-mono shrink-0">
                  <span>{log.actor.name}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString('pt-BR')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
