'use client';

import React from 'react';

interface TerminalConsoleProps {
  logs: string[];
  stdout?: string;
  stderr?: string;
  durationMs?: number;
  memoryRssKb?: number;
  status?: string;
}

export const TerminalConsole: React.FC<TerminalConsoleProps> = ({
  logs,
  stdout,
  stderr,
  durationMs,
  memoryRssKb,
  status,
}) => {
  return (
    <div className="flex flex-col h-full bg-[#090A10] border-t border-[#1E222D] font-mono text-xs text-zinc-300">
      {/* Console Header */}
      <div className="h-9 px-4 bg-[#0D1017] border-b border-[#1E222D] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">▶</span>
          <span className="font-semibold text-zinc-400">Terminal & Telemetria do Sandbox</span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-zinc-500">
          {durationMs !== undefined && (
            <span>
              ⏱️ <strong className="text-zinc-300">{durationMs}ms</strong>
            </span>
          )}
          {memoryRssKb !== undefined && (
            <span>
              💾 <strong className="text-zinc-300">{Math.round(memoryRssKb / 1024)}MB</strong> RSS
            </span>
          )}
          {status && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                status === 'passed'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/15 text-red-400 border border-red-500/30'
              }`}
            >
              {status.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Output Screen */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2 select-text">
        {logs.length === 0 && !stdout && !stderr && (
          <div className="text-zinc-600 italic">
            Nenhuma saída disponível. Execute o código ou aguarde eventos do Sandbox.
          </div>
        )}

        {logs.map((log, index) => (
          <div key={index} className="text-zinc-400 flex items-start gap-2">
            <span className="text-zinc-600 select-none">$</span>
            <span>{log}</span>
          </div>
        ))}

        {stdout && (
          <div className="mt-2 p-2 bg-[#12151F] border border-[#1E222D] rounded text-emerald-300 whitespace-pre-wrap">
            {stdout}
          </div>
        )}

        {stderr && (
          <div className="mt-2 p-2 bg-red-950/30 border border-red-900/50 rounded text-red-400 whitespace-pre-wrap">
            {stderr}
          </div>
        )}
      </div>
    </div>
  );
};
