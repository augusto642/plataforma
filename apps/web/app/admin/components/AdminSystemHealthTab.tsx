'use client';

import React, { useState } from 'react';
import { SystemMetric, PistonClusterNode } from '../types';

interface AdminSystemHealthTabProps {
  metrics: SystemMetric;
  nodes: PistonClusterNode[];
  onRecyclePool: () => void;
  onPurgeCache: () => void;
  onRunBenchmark: () => void;
}

export const AdminSystemHealthTab: React.FC<AdminSystemHealthTabProps> = ({
  metrics,
  nodes,
  onRecyclePool,
  onPurgeCache,
  onRunBenchmark,
}) => {
  const [activeConsoleTab, setActiveConsoleTab] = useState<'piston' | 'cgroups' | 'seccomp'>('piston');

  const simulatedLogs = {
    piston: `[2026-09-11 10:48:12.412] [INFO] [piston-daemon] worker-pool: 32 active warm micro-VM containers
[2026-09-11 10:48:12.890] [INFO] [grpc-runner] received job #94182: lang=rust (1.78.0) payload=3.2kb
[2026-09-11 10:48:12.920] [DEBUG] [sandbox-cgroup] assigned cgroup /sys/fs/cgroup/piston/job-94182 (mem=128mb, cpu=1.0)
[2026-09-11 10:48:13.014] [INFO] [piston-daemon] rustc compile success in 94ms. Executing binary...
[2026-09-11 10:48:13.048] [INFO] [piston-daemon] execution finished in 34ms (exit code 0). tests passed: 8/8
[2026-09-11 10:48:13.050] [INFO] [grpc-runner] dispatched payload result to redis channel #sub-94182`,
    cgroups: `[cgroups-v2-monitor] node=sa-east-1a cpu.stat: usage_usec=1498124 user_usec=1102914
[cgroups-v2-monitor] memory.current=3841289216 (3.8 GB) memory.high=12884901888 memory.max=17179869184
[cgroups-v2-monitor] pids.current=142 pids.max=2048 (fork bomb guard active: SAFE)
[cgroups-v2-monitor] io.stat: 254:0 rbytes=48210492 wbytes=184920194 rios=4129 wios=9102`,
    seccomp: `[seccomp-bpf] filter: default_sandbox_profile_v3 (DENY: ptrace, sys_chroot, reboot, kexec_load)
[seccomp-bpf] allowed syscalls: read, write, openat, close, fstat, mmap, mprotect, futex, epoll_wait
[seccomp-bpf] unshare namespace: CLONE_NEWNET | CLONE_NEWPID | CLONE_NEWIPC | CLONE_NEWUTS | CLONE_NEWNS`,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header & SRE Fast Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading tracking-tight">
            Sandbox & Piston SRE Cluster Health
          </h1>
          <p className="text-xs text-[#A1A1AA]">
            Monitoramento de micro-VMs isoladas, alocação de cgroups v2, perfis seccomp e latência gRPC.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onRecyclePool}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#04D361]/15 hover:bg-[#04D361]/25 border border-[#04D361]/40 text-[#04D361] text-xs font-semibold shadow-[0_0_15px_rgba(4,211,97,0.2)] transition-all"
          >
            <span>🔄</span>
            <span>Reciclar Micro-VMs</span>
          </button>
          <button
            onClick={onPurgeCache}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#8257E5]/15 hover:bg-[#8257E5]/25 border border-[#8257E5]/40 text-[#8257E5] text-xs font-semibold transition-all"
          >
            <span>🧹</span>
            <span>Purgar Cache de Build</span>
          </button>
          <button
            onClick={onRunBenchmark}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FFA116]/15 hover:bg-[#FFA116]/25 border border-[#FFA116]/40 text-[#FFA116] text-xs font-semibold transition-all"
          >
            <span>⚡</span>
            <span>Benchmark de Carga</span>
          </button>
        </div>
      </div>

      {/* 2. Top SRE Metric Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gauge 1: Piston P50 Latency */}
        <div className="p-5 rounded-2xl bg-[#121217] border border-[#27272A] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
            <span>Latência Média P50</span>
            <span className="text-[#04D361] font-mono">Normal</span>
          </div>
          <p className="text-2xl font-bold text-white font-mono">{metrics.pistonLatencyMs} ms</p>
          <div className="w-full bg-[#181820] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#04D361] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (metrics.pistonLatencyMs / 200) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-[#71717A] font-mono block">SLA Target: &lt; 150ms</span>
        </div>

        {/* Gauge 2: CPU Load */}
        <div className="p-5 rounded-2xl bg-[#121217] border border-[#27272A] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
            <span>Carga de CPU (Cluster)</span>
            <span className="text-[#00E5FF] font-mono">32 cores</span>
          </div>
          <p className="text-2xl font-bold text-[#00E5FF] font-mono">{metrics.cpuLoad}</p>
          <div className="w-full bg-[#181820] h-2 rounded-full overflow-hidden">
            <div className="bg-[#00E5FF] h-full rounded-full transition-all duration-500 w-[18.2%]" />
          </div>
          <span className="text-[10px] text-[#71717A] font-mono block">Thermal Guard: 42°C</span>
        </div>

        {/* Gauge 3: Memory Usage */}
        <div className="p-5 rounded-2xl bg-[#121217] border border-[#27272A] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
            <span>RAM Reservada</span>
            <span className="text-[#8257E5] font-mono">16 GB Total</span>
          </div>
          <p className="text-2xl font-bold text-white font-mono">3.8 GB</p>
          <div className="w-full bg-[#181820] h-2 rounded-full overflow-hidden">
            <div className="bg-[#8257E5] h-full rounded-full transition-all duration-500 w-[23.7%]" />
          </div>
          <span className="text-[10px] text-[#71717A] font-mono block">Alocação Atual: 23.7%</span>
        </div>

        {/* Gauge 4: Sandbox Uptime */}
        <div className="p-5 rounded-2xl bg-[#121217] border border-[#27272A] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
            <span>Uptime do Cluster</span>
            <span className="text-[#FFA116] font-mono">Zero Crash</span>
          </div>
          <p className="text-2xl font-bold text-[#04D361] font-mono">99.98%</p>
          <div className="w-full bg-[#181820] h-2 rounded-full overflow-hidden">
            <div className="bg-[#04D361] h-full rounded-full transition-all duration-500 w-[99.98%]" />
          </div>
          <span className="text-[10px] text-[#71717A] font-mono block">42 dias contínuos</span>
        </div>
      </div>

      {/* 3. Execution Nodes Table */}
      <div className="rounded-2xl bg-[#121217] border border-[#27272A] overflow-hidden space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white font-heading">
              Cluster de Nós de Execução Remota (Micro-VM Pool)
            </h3>
            <p className="text-xs text-[#A1A1AA]">
              Roteamento automático com balanceamento de carga de menor latência
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#04D361]/15 text-[#04D361] border border-[#04D361]/30">
            {nodes.length} Nós Conectados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#27272A] bg-[#181820]/60 text-[#71717A] font-mono text-[11px] uppercase">
                <th className="py-2.5 px-3">Nó / Região</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Latência Ping</th>
                <th className="py-2.5 px-3">Jobs Concorrentes</th>
                <th className="py-2.5 px-3">Uso RAM / CPU</th>
                <th className="py-2.5 px-3">Compiladores Disponíveis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A] text-[#EDEDED] font-mono">
              {nodes.map((node) => (
                <tr key={node.id} className="hover:bg-[#181820]/40 transition-colors">
                  <td className="py-3 px-3 font-semibold text-white">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#04D361]" />
                      <span>{node.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded border ${
                        node.status === 'healthy'
                          ? 'bg-[#04D361]/15 text-[#04D361] border-[#04D361]/30'
                          : 'bg-[#FFA116]/15 text-[#FFA116] border-[#FFA116]/30'
                      }`}
                    >
                      {node.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[#04D361] font-bold">{node.latencyMs} ms</td>
                  <td className="py-3 px-3">{node.activeJobs} jobs</td>
                  <td className="py-3 px-3 text-[#A1A1AA]">
                    {node.memoryUsage} | {node.cpuUsage}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1">
                      {node.runtimeEngines.slice(0, 3).map((engine, eIdx) => (
                        <span
                          key={eIdx}
                          className="text-[10px] px-1.5 py-0.2 rounded bg-[#181820] border border-[#27272A] text-[#A1A1AA]"
                        >
                          {engine}
                        </span>
                      ))}
                      {node.runtimeEngines.length > 3 && (
                        <span className="text-[10px] text-[#71717A]">
                          +{node.runtimeEngines.length - 3} mais
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Live SRE Daemon Stream Console */}
      <div className="rounded-2xl bg-[#09090A] border border-[#27272A] overflow-hidden">
        {/* Terminal Header */}
        <div className="p-3 bg-[#121217] border-b border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#F43F5E]" />
              <span className="w-3 h-3 rounded-full bg-[#FFA116]" />
              <span className="w-3 h-3 rounded-full bg-[#04D361]" />
            </div>
            <span className="text-xs font-mono font-bold text-white tracking-wide">
              SRE LIVE STREAM TELEMETRY
            </span>
          </div>

          <div className="flex items-center gap-1 bg-[#181820] p-1 rounded-xl border border-[#27272A] text-xs font-mono">
            <button
              onClick={() => setActiveConsoleTab('piston')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                activeConsoleTab === 'piston'
                  ? 'bg-[#8257E5] text-white font-semibold'
                  : 'text-[#71717A] hover:text-white'
              }`}
            >
              piston.log
            </button>
            <button
              onClick={() => setActiveConsoleTab('cgroups')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                activeConsoleTab === 'cgroups'
                  ? 'bg-[#8257E5] text-white font-semibold'
                  : 'text-[#71717A] hover:text-white'
              }`}
            >
              cgroups-v2
            </button>
            <button
              onClick={() => setActiveConsoleTab('seccomp')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                activeConsoleTab === 'seccomp'
                  ? 'bg-[#8257E5] text-white font-semibold'
                  : 'text-[#71717A] hover:text-white'
              }`}
            >
              seccomp-bpf
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-4 font-mono text-xs text-[#04D361] overflow-x-auto whitespace-pre-wrap leading-relaxed h-48 bg-[#09090A]">
          {simulatedLogs[activeConsoleTab]}
        </div>
      </div>
    </div>
  );
};
