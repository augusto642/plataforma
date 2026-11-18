'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../lib/apiClient';

type Goal = {
  signal: { skill: string };
  excludedReason: string | null;
  practice: null | {
    id: string;
    courseId: string;
    title: string;
    objective: string;
    criterion: string;
  };
};
type Evidence = {
  submissionId: string;
  activity: string;
  language: string;
  concepts: string[];
  criterion: string;
  testsPassed: number;
  submittedAt: string;
  independence: string;
  transferEligible: boolean;
  transfer: TransferResult | null;
};

type TransferResult = {
  taskVersion: string;
  score: number;
  maxScore: number;
  passed: boolean;
  assessedAt: string;
};

type Challenge = {
  title: string;
  language: string;
  functionName: string;
  instructions: string;
  criterion: string;
  reflectionPrompt: string;
  examples: Array<{ input: number; expected: number }>;
  notice: string;
  starterCode: string;
  maxScore: number;
};

function TransferAssessment({ item, onResult }: { item: Evidence; onResult: (result: TransferResult) => void }) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [sourceCode, setSourceCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const path = `/transfer/${encodeURIComponent(item.submissionId)}`;

  async function start() {
    setBusy(true);
    setError('');
    try {
      const response = await apiFetch(path);
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (data.attempt) onResult(data.attempt);
      else {
        setChallenge(data.challenge);
        setSourceCode(data.challenge.starterCode);
      }
    } catch {
      setError('Não foi possível carregar a avaliação.');
    } finally { setBusy(false); }
  }

  async function submit() {
    if (!sourceCode.trim()) {
      setError('Escreva a função antes de enviar.');
      return;
    }
    if (!window.confirm('Esta avaliação permite uma única tentativa. O código não será armazenado e o resultado não poderá ser refeito. Deseja executar agora?')) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await apiFetch(path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceCode }),
      });
      if (!response.ok) throw new Error();
      onResult(await response.json());
      setChallenge(null);
    } catch {
      setError('Não foi possível registrar a tentativa. Recarregue o portfólio para consultar o resultado.');
    } finally { setBusy(false); }
  }

  if (item.transfer) return (
    <div className="mt-2 rounded-lg border border-zinc-700 p-3" role="status" aria-live="polite">
      <p className="font-semibold">
        Transferência {item.transfer.passed ? 'aprovada' : 'não aprovada'}: {item.transfer.score}/{item.transfer.maxScore}.
      </p>
      <p className="mt-1">
        {item.transfer.passed
          ? 'Você aplicou a regra aos casos avaliados. Reflita sobre como os limites orientaram sua solução.'
          : 'Revise as faixas de entrada e o limite 5. Os casos individuais não são revelados para preservar a avaliação.'}
      </p>
      <p className="mt-1 text-xs text-zinc-400">Sem tutor integrado; ajuda externa não é verificada.</p>
    </div>
  );
  if (!item.transferEligible) return null;
  return <div className="mt-2">
    {!challenge ? (
      <button type="button" disabled={busy} aria-busy={busy} onClick={() => void start()} className="text-[#996DFF] hover:underline disabled:opacity-50">
        {busy ? 'Carregando avaliação…' : 'Iniciar avaliação de transferência'}
      </button>
    ) : (
      <div aria-busy={busy}>
        <strong>{challenge.title} ({challenge.language})</strong>
        <p id={`transfer-instructions-${item.submissionId}`}>{challenge.instructions}</p>
        <p className="mt-2 font-medium">Exemplos públicos</p>
        <ul className="list-inside list-disc" aria-label="Exemplos públicos da avaliação">
          {challenge.examples.map(({ input, expected }) => (
            <li key={input}>quantidade {input}: {expected} ponto(s)</li>
          ))}
        </ul>
        <p id={`transfer-reflection-${item.submissionId}`} className="mt-2 rounded border-l-2 border-[#8257E5] pl-3">
          Pense antes de codificar: {challenge.reflectionPrompt}
        </p>
        <p>{challenge.criterion} Resultados avaliados: {challenge.maxScore} casos.</p>
        <p>{challenge.notice}</p>
        <label htmlFor={`transfer-code-${item.submissionId}`} className="mt-2 block font-medium">
          Código da função {challenge.functionName}
        </label>
        <textarea
          id={`transfer-code-${item.submissionId}`}
          aria-describedby={`transfer-instructions-${item.submissionId} transfer-reflection-${item.submissionId}`}
          value={sourceCode}
          onChange={(event) => setSourceCode(event.target.value)}
          rows={10}
          maxLength={12_000}
          spellCheck={false}
          className="my-2 block w-full rounded bg-zinc-900 p-3 font-mono text-white"
        />
        <button type="button" disabled={busy || !sourceCode.trim()} aria-busy={busy} onClick={() => void submit()} className="text-[#996DFF] hover:underline disabled:opacity-50">
          {busy ? 'Executando avaliação…' : 'Enviar única tentativa'}
        </button>
      </div>
    )}
    {error && <p role="alert">{error}</p>}
  </div>;
}

export function SkillEvidence() {
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [evidence, setEvidence] = useState<Evidence[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const [issuing, setIssuing] = useState<string | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch('/dynamic-track/me/skill-goals'),
      apiFetch('/dynamic-track/me/evidence'),
    ]).then(async ([goalsResponse, evidenceResponse]) => {
      if (!goalsResponse.ok || !evidenceResponse.ok) throw new Error('unavailable');
      const [nextGoals, nextEvidence] = await Promise.all([goalsResponse.json(), evidenceResponse.json()]);
      if (active) { setGoals(nextGoals); setEvidence(nextEvidence); }
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);

  function exportSelected() {
    const records = evidence?.filter((item) => selected.includes(item.submissionId)) ?? [];
    const blob = new Blob([JSON.stringify({
      description: 'Exportação privada de resultados; não é credencial assinada nem prova de autonomia.',
      evidence: records,
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'evidencias.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function downloadCredential(submissionId: string) {
    setIssuing(submissionId);
    setIssueError(null);
    try {
      const response = await apiFetch(`/credentials/${encodeURIComponent(submissionId)}`, { method: 'POST' });
      if (!response.ok) throw new Error('unavailable');
      const credential = await response.json();
      const url = URL.createObjectURL(new Blob([JSON.stringify(credential, null, 2)], { type: 'application/ld+json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'credencial-open-badges.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setIssueError('Não foi possível emitir a credencial. Verifique a configuração do emissor e tente novamente.');
    } finally {
      setIssuing(null);
    }
  }

  if (error) return <p className="mb-8 text-sm text-zinc-400">Objetivos e evidências indisponíveis agora.</p>;
  if (!goals || !evidence) return <p className="mb-8 text-sm text-zinc-400">Carregando objetivos e evidências…</p>;
  return (
    <section className="mb-8 space-y-4 text-sm text-zinc-300">
      <h3 className="font-bold uppercase">Da habilidade à prática</h3>
      {goals.length === 0 && <p>Sem sinais de vagas disponíveis para mapear.</p>}
      {goals.filter(({ practice }) => practice).map(({ signal, practice }) => (
        <div key={signal.skill} className="rounded-xl border border-zinc-800 p-3">
          <strong>{signal.skill}</strong>
          {practice ? <>
            <p>Objetivo: {practice.objective}</p>
            <p>Critério: {practice.criterion}</p>
            <Link className="text-[#996DFF] hover:underline" href={`/ide?course=${encodeURIComponent(practice.courseId)}&activity=${encodeURIComponent(practice.id)}`}>
              Praticar: {practice.title}
            </Link>
          </> : null}
        </div>
      ))}
      {goals.length > 0 && !goals.some(({ practice }) => practice) && <p>Nenhuma recomendação com prática avaliada disponível neste percurso.</p>}
      {goals.some(({ practice }) => !practice) && <div>
        <h4 className="font-bold">Sinais observados sem recomendação de prática</h4>
        {goals.filter(({ practice }) => !practice).map(({ signal, excludedReason }) => (
          <p key={signal.skill}>{signal.skill}: {excludedReason}</p>
        ))}
      </div>}
      <h3 className="font-bold uppercase">Meu portfólio privado</h3>
      <p>Entre as 200 submissões aprovadas mais recentes, escolha resultados com testes para baixar. São registros de testes, não prova resistente a código adversarial ou comprovação de domínio. O arquivo não é assinado; compartilhar uma cópia não pode ser desfeito. Código e conversas não são incluídos. Autonomia não foi verificada. Títulos e conceitos são os atuais e podem ter mudado desde a submissão.</p>
      {evidence.length === 0 && <p>Nenhuma atividade com testes aprovados registrada ainda.</p>}
      <p>A emissão é opcional. A credencial assinada contém um identificador estável da sua conta, a atividade e o resultado; quem receber o arquivo poderá vê-los e copiá-los.</p>
      {evidence.map((item) => (
        <div key={item.submissionId} className="rounded-xl border border-zinc-800 p-3">
          <label>
            <input type="checkbox" checked={selected.includes(item.submissionId)} onChange={(event) => {
              const checked = event.target.checked;
              setSelected((previous) => checked
                ? [...previous, item.submissionId]
                : previous.filter((id) => id !== item.submissionId));
            }} />{' '}
            {item.activity} — {item.testsPassed} testes aprovados ({item.language}); {item.criterion}
          </label>
          <TransferAssessment item={item} onResult={(result) => setEvidence((previous) => previous?.map((record) =>
            record.submissionId === item.submissionId ? { ...record, transfer: result } : record) ?? null)} />
          <button type="button" disabled={issuing !== null} onClick={() => void downloadCredential(item.submissionId)} className="mt-2 block text-[#996DFF] hover:underline disabled:opacity-50">
            {issuing === item.submissionId ? 'Emitindo…' : 'Baixar credencial assinada'}
          </button>
        </div>
      ))}
      {issueError && <p role="alert">{issueError}</p>}
      <button type="button" disabled={!selected.length} onClick={exportSelected} className="rounded bg-primary px-4 py-2 text-white disabled:opacity-50">
        Baixar selecionados
      </button>
    </section>
  );
}
