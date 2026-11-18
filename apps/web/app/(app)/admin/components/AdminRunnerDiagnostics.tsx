'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { API_BASE, apiFetch } from '../../../lib/apiClient';

interface Diagnostic {
  id: string;
  adminId: string | null;
  language: 'javascript' | 'python';
  status: 'running' | 'passed' | 'failed';
  kind: string | null;
  durationMs: number | null;
  createdAt: string;
}

const reasons: Record<string, string> = {
  passed: 'Saída esperada recebida',
  sandbox_unavailable: 'Executor indisponível, desativado ou sobrecarregado',
  unexpected_output: 'Saída diferente da esperada',
  timeout: 'Tempo de execução esgotado',
  compile_error: 'Erro de compilação',
  runtime_error: 'Erro de execução',
  signal: 'Execução interrompida',
  output_limit: 'Limite de saída excedido',
  unsupported: 'Linguagem indisponível',
  internal_error: 'Falha interna no diagnóstico',
  failed: 'Teste não passou',
};

export function AdminRunnerDiagnostics() {
  const [events, setEvents] = useState<Diagnostic[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await apiFetch(`${API_BASE}/admin/runner/diagnostics`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setEvents(await response.json() as Diagnostic[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de conexão.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const response = await apiFetch(`${API_BASE}/admin/runner/diagnostics`, { method: 'POST' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await load();
    } catch (err) {
      await load();
      setError(err instanceof Error ? err.message : 'Erro de conexão.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#27272A] bg-[#121217] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white">Diagnóstico do executor</h3>
          <p className="mt-1 max-w-2xl text-xs text-zinc-400">
            Executa programas fixos em JavaScript e Python pela mesma API usada pelos alunos.
            Quando o executor está habilitado, o teste também roda automaticamente a cada 15 minutos.
            Um resultado positivo não comprova o isolamento da VM ou da VPN.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()} disabled={running}
            className="rounded-lg border border-[#3F3F46] px-3 py-2 text-xs text-white disabled:opacity-50">Atualizar</button>
          <button type="button" onClick={() => void run()} disabled={running}
            className="rounded-lg bg-[#04D361] px-3 py-2 text-xs font-bold text-black disabled:opacity-50">
            {running ? 'Executando…' : 'Executar testes reais'}
          </button>
        </div>
      </div>
      {error && <p role="alert" className="mt-4 text-xs text-rose-300">Não foi possível consultar ou executar o diagnóstico: {error}</p>}
      {loading ? <p className="mt-4 text-xs text-zinc-400">Carregando registros…</p> :
        events.length === 0 ? <p className="mt-4 text-xs text-zinc-400">Nenhum teste registrado.</p> :
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-xs">
            <thead className="text-zinc-500"><tr><th className="p-2">Data</th><th className="p-2">Linguagem</th><th className="p-2">Resultado</th><th className="p-2">Duração</th><th className="p-2">Admin</th></tr></thead>
            <tbody>{events.map((event) => (
              <tr key={event.id} className="border-t border-[#27272A] text-zinc-300">
                <td className="p-2">{new Date(event.createdAt).toLocaleString('pt-BR')}</td>
                <td className="p-2">{event.language === 'python' ? 'Python' : 'JavaScript'}</td>
                <td className={`p-2 ${event.status === 'passed' ? 'text-emerald-300' : event.status === 'failed' ? 'text-rose-300' : 'text-amber-300'}`}>
                  {event.status === 'running' ? 'Em andamento ou interrompido' : reasons[event.kind ?? ''] ?? 'Falha no teste'}
                </td>
                <td className="p-2">{event.durationMs === null ? '—' : `${event.durationMs} ms`}</td>
                <td className="p-2 font-mono" title={event.adminId ?? undefined}>{event.adminId ? event.adminId.slice(0, 8) : 'Automático'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>}
    </section>
  );
}
