'use client';

/**
 * /torre — página MÍNIMA de teste da Torre de Desafios (Fase 1).
 * Não é a UI final: só expõe o loop rolar → resolver via JSON.
 * Requer login (o cookie de auth vai em `credentials: 'include'`).
 */
import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function call(path: string, method: 'GET' | 'POST', body?: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: unknown = text;
  try {
    json = JSON.parse(text);
  } catch {
    // mantém o texto cru
  }
  return { status: res.status, body: json };
}

export default function TorreTestPage() {
  const [code, setCode] = useState('function soma(a, b) {\n  return a + b;\n}');
  const [output, setOutput] = useState('Carregue o progresso para começar.');
  const [busy, setBusy] = useState(false);

  async function run(label: string, fn: () => Promise<{ status: number; body: unknown }>) {
    setBusy(true);
    try {
      const result = await fn();
      setOutput(`${label} — HTTP ${result.status}\n${JSON.stringify(result.body, null, 2)}`);
    } catch (err) {
      setOutput(`${label} — erro de rede: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: 16, fontFamily: 'sans-serif' }}>
      <h1>Torre de Desafios — teste (Fase 1)</h1>
      <p>Página mínima de teste. A UI final chega nas próximas fases.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button disabled={busy} onClick={() => run('GET /tower/progress', () => call('/tower/progress', 'GET'))}>
          Ver progresso
        </button>
        <button disabled={busy} onClick={() => run('POST /tower/roll', () => call('/tower/roll', 'POST', {}))}>
          Rolar dado
        </button>
      </div>
      <label style={{ display: 'block', marginBottom: 4 }}>Código da solução:</label>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        rows={8}
        style={{ width: '100%', fontFamily: 'monospace', marginBottom: 12 }}
      />
      <button
        disabled={busy}
        onClick={() => run('POST /tower/submit', () => call('/tower/submit', 'POST', { code }))}
      >
        Enviar solução
      </button>
      <pre
        style={{
          marginTop: 16,
          padding: 12,
          background: '#111',
          color: '#eee',
          borderRadius: 8,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {output}
      </pre>
    </main>
  );
}
