'use client';

import React, { useEffect, useState } from 'react';
import { API_BASE, apiFetch } from '../../../lib/apiClient';

interface Preflight {
  sources: { adzuna: boolean; tavily: boolean };
  dailyBudget: number | null;
  enabled: boolean;
}

interface DiagnosticResult {
  source: string;
  status: 'unconfigured' | 'ok' | 'empty' | 'failed';
  reason?: string;
}

const labels: Record<DiagnosticResult['status'], string> = {
  unconfigured: 'não configurada',
  ok: 'respondeu com resultado',
  empty: 'respondeu sem resultados',
  failed: 'falhou',
};

export function AdminJobResearchPreflight() {
  const [status, setStatus] = useState<Preflight | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<DiagnosticResult[] | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await apiFetch(`${API_BASE}/admin/knowledge/job-research-preflight`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json() as Preflight;
        if (active) setStatus(result);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Erro de conexão.');
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  async function runDiagnostic() {
    if (!window.confirm('Consultar as fontes configuradas? O teste faz uma chamada por fonte e consome o orçamento diário.')) return;
    setRunning(true);
    setError(null);
    setResults(null);
    try {
      const response = await apiFetch(`${API_BASE}/admin/knowledge/job-research-diagnostics`, { method: 'POST' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json() as { results: DiagnosticResult[] };
      setResults(body.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de conexão.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#27272A] bg-[#121217] p-5 space-y-2">
      <h3 className="font-bold text-white">Fontes de vagas</h3>
      <p className="text-xs text-zinc-400">Verificação de configuração local, sem revelar chaves. Não testa conectividade, validade das credenciais, saldo restante ou resultados reais.</p>
      {error ? <p role="alert" className="text-xs text-rose-300">{error}</p> : status ? (
        <div className="text-xs text-zinc-300 space-y-1">
          <p>Adzuna: {status.sources.adzuna ? 'credenciais presentes' : 'não configurada'} · Tavily: {status.sources.tavily ? 'credencial presente' : 'não configurada'}</p>
          <p>Limite diário: {status.dailyBudget === null ? 'configuração inválida' : status.dailyBudget} · Coleta: {status.enabled ? 'configurada' : 'desabilitada'}</p>
        </div>
      ) : <p className="text-xs text-zinc-400">Consultando configuração…</p>}
      <button type="button" disabled={!status?.enabled || running} onClick={() => void runDiagnostic()}
        className="rounded-lg border border-[#3f3f46] px-3 py-2 text-xs text-white disabled:opacity-50">
        {running ? 'Consultando fontes…' : 'Testar fontes configuradas'}
      </button>
      {results && <ul className="space-y-1 text-xs text-zinc-300">
        {results.map((result) => <li key={result.source}>
          {result.source}: {labels[result.status]}{result.reason ? ` — ${result.reason}` : ''}
        </li>)}
      </ul>}
    </section>
  );
}
