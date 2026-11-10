'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import {
  answerInterview,
  finishInterview,
  getInterviewSession,
  type InterviewReport,
  type InterviewSession,
} from '../../../lib/interview';
import Link from 'next/link';
import { MaterialIcon } from '../../../components/MaterialIcon';
import { appendTranscript } from '../../../hooks/voice-support';
import { InterviewVoiceControls } from '../InterviewVoiceControls';
import { IdeEditorPane } from '../../ide/components/IdeEditorPane';

/**
 * Fase 2 premium (desenho §3.1) — sessão de entrevista por turnos +
 * relatório final. A avaliação de cada turno (rubrica + evidência)
 * aparece abaixo da resposta do aluno; o relatório final lista pontos
 * fortes, fracos e próximos passos de estudo. Treino — não substitui
 * entrevista humana real.
 *
 * Central 216 retrabalho (D3) — sessão ao vivo em 2 colunas, como o
 * protótipo Stitch v2 (simulador-entrevista.html): conversa à
 * esquerda (chat + voz + resposta) e live coding à direita (editor
 * `debounce.js` + critérios em tempo real). Antes: coluna única
 * max-w-[720px]. Controles de voz da 208 mantidos (microfone +
 * "Ouvir pergunta"). Sem números inventados (#15/#16): sem "Tempo",
 * sem "Pergunta N de M", sem percentuais — só o contador real de
 * turnos (cap 20) e os critérios REAIS da avaliação do turno, sem
 * nota numérica. O teste do debounce roda de verdade no navegador
 * (novo Function + chamadas reais), nunca um resultado fixo.
 */
const DEBOUNCE_STARTER = `// Implementação solicitada pela entrevistadora:
// crie uma função debounce(fn, delay) que atrasa a execução de fn
// até que as chamadas parem por 'delay' ms.
function debounce(fn, delay = 300) {
  // Implemente aqui: cancele o temporizador anterior a cada
  // chamada e agende fn com os argumentos recebidos.
}
`;

interface LiveTestResult {
  passed: boolean;
  lines: string[];
}

async function runDebounceSelfTest(code: string): Promise<LiveTestResult> {
  const lines: string[] = [];
  try {
    const factory = new Function(
      `${code}\n;return typeof debounce === 'function' ? debounce : null;`,
    ) as () => ((fn: (...args: unknown[]) => void, delay?: number) => (...args: unknown[]) => void) | null;
    const debounce = factory();
    if (!debounce) {
      return { passed: false, lines: ['debounce não foi definida.'] };
    }
    // Teste 1 — chamadas repetidas disparam 1×.
    let calls = 0;
    let lastArgs: unknown[] = [];
    const fn = (...args: unknown[]) => {
      calls += 1;
      lastArgs = args;
    };
    const debounced = debounce(fn, 50);
    if (typeof debounced !== 'function') {
      return { passed: false, lines: ['debounce não retornou uma função — implemente o retorno.'] };
    }
    debounced('a');
    debounced('b');
    debounced('c');
    await new Promise((r) => setTimeout(r, 120));
    if (calls === 1) lines.push('✓ chamadas repetidas disparam 1 vez');
    else {
      lines.push(`✗ esperado 1 disparo após 3 chamadas rápidas, houve ${calls}`);
      return { passed: false, lines };
    }
    // Teste 2 — repassa os argumentos da última chamada.
    if (lastArgs.length === 1 && lastArgs[0] === 'c') {
      lines.push('✓ argumentos da última chamada repassados');
    } else {
      lines.push(`✗ argumentos repassados: ${JSON.stringify(lastArgs)}`);
      return { passed: false, lines };
    }
    return { passed: true, lines };
  } catch (err) {
    return {
      passed: false,
      lines: [`✗ erro ao executar: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

export default function EntrevistaSessaoPage() {
  const params = useParams();
  const id = (params?.id as string | undefined) ?? '';
  const { user, isLoading } = useAuth();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState(DEBOUNCE_STARTER);
  const [liveTest, setLiveTest] = useState<LiveTestResult | null>(null);
  const [testingCode, setTestingCode] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    // Central 216 r3 (Q-1) — sem usuário não há fetch: encerrar o
    // carregamento aqui; o card de login é renderizado abaixo (mesma
    // ordem do D5 em /trilha/sugerida). Antes, o efeito retornava sem
    // fazer nada e `loading` ficava true para sempre — "Carregando…"
    // infinito para o visitante deslogado.
    if (!user || !id) {
      setLoading(false);
      return;
    }
    getInterviewSession(id)
      .then((s) => {
        setSession(s);
        if (s.report) setReport(s.report);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, isLoading, id]);

  async function send() {
    if (!answer.trim()) return;
    setError(null);
    setSending(true);
    try {
      const updated = await answerInterview(id, answer.trim());
      setSession(updated);
      setAnswer('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a resposta.');
    } finally {
      setSending(false);
    }
  }

  async function finish() {
    setError(null);
    setFinishing(true);
    try {
      const rep = await finishInterview(id);
      setReport(rep);
      setSession((s) => (s ? { ...s, status: 'completed', report: rep } : s));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível gerar o relatório.');
    } finally {
      setFinishing(false);
    }
  }

  async function testCode() {
    setTestingCode(true);
    setLiveTest(await runDebounceSelfTest(code));
    setTestingCode(false);
  }

  // Central 216 r3 (Q-1) — ordem D5: authLoading → !user → fetch.
  // O visitante deslogado vê o card de login, nunca "Carregando…".
  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-surface text-dark-on-surface px-5 py-16">
        <div className="max-w-7xl mx-auto text-sm text-zinc-400">Carregando…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-surface text-dark-on-surface flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border border-border-strong bg-dark-surface-container-low p-6 text-center">
          <h1 className="text-lg font-headline font-bold text-white mb-2">
            Faça login para treinar
          </h1>
          <p className="text-sm text-dark-on-surface-variant mb-5">
            A sessão de entrevista fica na sua conta.
          </p>
          <Link
            href="/login"
            className="inline-block bg-primary hover:bg-dark-primary text-white text-sm font-bold px-5 py-2.5 rounded transition-colors"
          >
            Entrar
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-surface text-dark-on-surface px-5 py-16">
        <div className="max-w-7xl mx-auto text-sm text-zinc-400">Carregando…</div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-dark-surface text-dark-on-surface px-5 py-16">
        <div className="max-w-7xl mx-auto text-sm text-red-400">{error}</div>
      </div>
    );
  }

  if (!session) return null;
  const candidateCount = session.turns.filter((t) => t.role === 'candidate').length;
  const isActive = session.status === 'active';
  // Última fala da entrevistadora (pergunta + feedback) — lida em voz
  // alta pelo controle de voz; null antes da primeira pergunta (nunca
  // acontece: a criação já inclui a pergunta inicial).
  const lastInterviewer = [...session.turns]
    .reverse()
    .find((t) => t.role === 'interviewer') ?? null;
  // Critérios em tempo real: SÓ os critérios reais da última avaliação
  // (nomes + evidência, sem nota numérica). Sem avaliação ainda, a
  // lista fica vazia com estado honesto — nunca critérios fixos.
  const lastEvaluation =
    [...session.turns]
      .reverse()
      .find((t) => t.role === 'candidate' && t.evaluation)?.evaluation ?? null;

  return (
    <div className="min-h-screen bg-dark-surface text-dark-on-surface px-4 md:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/entrevista"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors mb-6"
        >
          <MaterialIcon name="arrow_back" className="text-[18px]" />
          Sair da simulação
        </Link>
        <p className="font-code text-[11px] text-primary font-bold uppercase tracking-wider">
          Simulador de Entrevista
        </p>
        <div className="flex flex-wrap items-start justify-between gap-3 mt-1">
          <div>
            <h1 className="text-2xl font-black text-white">
              Entrevista {session.mode === 'technical' ? 'técnica' : 'comportamental'}
              {session.track ? ` · ${session.track}` : ''}
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              {candidateCount}/20 turnos · Treino — não substitui entrevista humana real.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-dark-surface-container border border-border-subtle text-xs font-bold text-secondary">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            {isActive ? 'Sessão em andamento' : 'Sessão finalizada'}
          </span>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-400 border border-red-900 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Coluna 1 — conversa com a entrevistadora. */}
          <section aria-label="Conversa da entrevista" className="space-y-3 min-w-0">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-purple/20 text-dark-primary font-bold text-xs">
                IA
              </span>
              <div>
                <p className="font-bold text-zinc-200 text-sm">Tutora de IA · Avaliadora</p>
                <p className="text-[11px]">Áudio &amp; Texto Ativos</p>
              </div>
            </div>

            <div className="space-y-3">
              {session.turns.map((turn) => (
                <div
                  key={turn.id}
                  className={`rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
                    turn.role === 'interviewer'
                      ? 'bg-dark-surface-container-low border border-border-subtle'
                      : 'bg-[#1B1430] border border-[#3B2A6B]'
                  }`}
                >
                  <p className="text-xs font-bold text-zinc-400 mb-1">
                    {turn.role === 'interviewer' ? 'Entrevistadora' : 'Você'}
                  </p>
                  <p>{turn.content}</p>
                  {turn.role === 'candidate' && turn.evaluation && (
                    <div className="mt-2 text-xs text-zinc-400 space-y-1">
                      {/* Redesign v2 (correção 15): avaliação por critérios
                          SEM números — só o nome do critério e a evidência. */}
                      {Object.entries(turn.evaluation).map(([key, v]) => (
                        <p key={key}>
                          <span className="font-bold text-zinc-300">{key}</span>
                          {' — '}
                          {v.evidence}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {isActive && (
              <div className="space-y-3 pt-2">
                {/* Voz (opcional): a transcrição só preenche o campo abaixo —
                    o envio continua pelo mesmo `answerInterview` do texto
                    digitado (mesmo DTO, mesmo prompt-guard M11, mesma quota
                    M17). Sem microfone, tudo abaixo funciona igual. */}
                <InterviewVoiceControls
                  questionText={lastInterviewer ? lastInterviewer.content : null}
                  onTranscript={(text) => setAnswer((prev) => appendTranscript(prev, text))}
                  disabled={sending}
                />
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={5}
                  maxLength={8000}
                  placeholder="Explique sua solução para a entrevistadora…"
                  className="w-full bg-dark-surface-container-low border border-border-subtle rounded-xl px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={send}
                    disabled={sending || !answer.trim() || candidateCount >= 20}
                    className="bg-[#8257E5] hover:bg-[#6F46D6] disabled:opacity-50 text-white text-sm font-bold rounded-lg px-4 py-2"
                  >
                    {sending ? 'Avaliando…' : 'Enviar'}
                  </button>
                  <button
                    onClick={finish}
                    disabled={finishing || candidateCount === 0}
                    className="border border-border-strong hover:border-[#8257E5] disabled:opacity-50 text-sm font-bold rounded-lg px-4 py-2"
                  >
                    {finishing ? 'Gerando relatório…' : 'Finalizar e ver relatório'}
                  </button>
                </div>
                <p className="text-xs text-zinc-500">
                  Pressione Shift+Enter para enviar.
                </p>
              </div>
            )}
          </section>

          {/* Coluna 2 — live coding + critérios em tempo real. */}
          <section aria-label="Live coding" className="space-y-4 min-w-0">
            <div className="rounded-xl bg-dark-surface-container-low border border-border-subtle overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle">
                <span className="font-code text-xs text-dark-on-surface-variant">
                  javascript · debounce.js · Live Coding com IA
                </span>
                <button
                  type="button"
                  onClick={() => void testCode()}
                  disabled={testingCode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary hover:bg-dark-primary disabled:opacity-50 text-white text-xs font-bold transition-colors"
                >
                  <MaterialIcon name="play_arrow" className="text-[16px]" />
                  {testingCode ? 'Testando…' : 'Testar implementação'}
                </button>
              </div>
              <div className="h-[380px]">
                <IdeEditorPane
                  language="javascript"
                  code={code}
                  onChange={setCode}
                  onRun={() => void testCode()}
                  isSubmitting={testingCode}
                />
              </div>
              {liveTest && (
                <div
                  role="status"
                  className={`px-4 py-3 border-t border-border-subtle text-sm space-y-1 ${
                    liveTest.passed ? 'text-secondary' : 'text-red-400'
                  }`}
                >
                  <p className="font-bold">
                    {liveTest.passed ? 'Testes aprovados' : 'Testes com falha'}
                  </p>
                  {liveTest.lines.map((line) => (
                    <p key={line} className="text-xs font-code">
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-dark-surface-container-low border border-border-subtle p-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <MaterialIcon name="analytics" className="text-[18px] text-dark-primary" />
                Critérios de avaliação técnica
              </h2>
              {lastEvaluation ? (
                <ul className="mt-3 space-y-2">
                  {Object.entries(lastEvaluation).map(([key, v]) => (
                    <li key={key} className="flex items-start justify-between gap-3 text-sm">
                      <span className="text-zinc-300">{key}</span>
                      <span className="shrink-0 text-xs font-bold text-secondary">Avaliado</span>
                      <span className="sr-only">{v.evidence}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-400 mt-2">
                  Os critérios aparecem aqui após a primeira resposta avaliada.
                </p>
              )}
              <p className="text-xs text-zinc-500 mt-3">
                Feedback em tempo real — a avaliação completa fica no relatório final.
              </p>
            </div>
          </section>
        </div>

        {report && (
          <div className="mt-8 border border-border-strong rounded-xl p-4 space-y-4 max-w-3xl">
            <h2 className="text-lg font-bold text-white">Relatório</h2>
            <div>
              <h3 className="text-sm font-bold text-zinc-300">Avaliação por critério</h3>
              <ul className="text-sm text-zinc-400 mt-1 space-y-1">
                {Object.entries(report.scores).map(([key, v]) => (
                  <li key={key}>
                    <span className="font-bold text-zinc-200">{key}</span>
                    {' — '}
                    {v.evidence}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-300">Pontos fortes</h3>
              <ul className="text-sm text-zinc-400 mt-1 list-disc list-inside">
                {report.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-300">Pontos fracos</h3>
              <ul className="text-sm text-zinc-400 mt-1 list-disc list-inside">
                {report.gaps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-300">O que estudar em seguida</h3>
              <ul className="text-sm text-zinc-400 mt-1 list-disc list-inside">
                {report.nextSteps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
