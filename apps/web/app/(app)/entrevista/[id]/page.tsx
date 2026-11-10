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
import {
  INTERVIEW_TURN_CAP,
  criterionLabel,
  currentQuestionLabel,
  latestFeedbackText,
  orderedEvaluationEntries,
  userInitials,
} from '../session-view';
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
 * nota numérica. O rótulo "Pergunta N de 20" do rodapé do scorecard
 * usa o contador real de respostas (N = respostas + 1) — nunca um
 * total inventado. O teste do debounce roda de verdade no navegador
 * (novo Function + chamadas reais), nunca um resultado fixo.
 *
 * Central 219 lote 3 (D3) — fidelidade integral ao protótipo: a
 * sessão vira o split de tela cheia do mock (top app bar h-14 com
 * selo + status ao vivo + avatar de iniciais reais; painel esquerdo
 * com cabeçalho da entrevistadora, fluxo de diálogo com rolagem
 * própria e área de resposta ancorada no rodapé; painel direito com
 * chrome bar do editor, scorecard em grade + nota de feedback com a
 * evidência real da última avaliação + ação "Enviar resposta e
 * avançar"). Sem "Vaga: ..." inventada no título (usa modo + trilha
 * reais) e sem "Próxima etapa: CSS e Responsividade" (usa o contador
 * real de turnos). Shift+Enter envia de verdade (antes o hint
 * existia sem o handler).
 */
const DEBOUNCE_STARTER = `// Implementação solicitada pela entrevistadora:
// crie uma função debounce(fn, delay) que atrasa a execução de fn
// até que as chamadas parem por 'delay' ms.
function debounce(fn, delay = 300) {
  // Implemente aqui: cancele o temporizador anterior a cada
  // chamada e agende fn com os argumentos recebidos.
}
`;

/** Cor do "Avaliado" por posição — mesma rotação do protótipo. */
const CRITERION_COLORS = [
  'text-secondary',
  'text-primary',
  'text-tertiary',
  'text-emerald-400',
];

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
  const canSend =
    isActive && !sending && answer.trim().length > 0 && candidateCount < INTERVIEW_TURN_CAP;
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
  const feedbackText = lastEvaluation
    ? latestFeedbackText(lastEvaluation, session.mode)
    : null;

  return (
    <div className="min-h-screen bg-dark-surface text-dark-on-surface flex flex-col">
      {/* Top app bar do protótipo: voltar + selo + título real + status + avatar. */}
      <header className="h-14 shrink-0 border-b border-border-subtle bg-dark-surface-container-low px-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/entrevista"
            className="flex items-center gap-2 text-dark-on-surface-variant hover:text-white transition-colors shrink-0"
          >
            <MaterialIcon name="arrow_back" className="text-[20px]" />
            <span className="font-code text-xs">Sair da simulação</span>
          </Link>
          <div className="h-4 w-px bg-border-subtle shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-tertiary/15 text-tertiary font-code text-xs font-bold border border-tertiary/30 shrink-0">
              SIMULADOR DE ENTREVISTA
            </span>
            <h1 className="font-headline font-bold text-sm text-white truncate">
              Entrevista {session.mode === 'technical' ? 'técnica' : 'comportamental'}
              {session.track ? ` · ${session.track}` : ''}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-5 shrink-0">
          <span className="hidden sm:flex items-center gap-2 px-3 py-1 rounded bg-dark-surface-container border border-border-subtle text-xs font-code text-white">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            {isActive ? 'Sessão em andamento' : 'Sessão finalizada'}
          </span>
          <span
            title={user.name}
            className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-xs text-white"
          >
            {userInitials(user.name, user.email)}
          </span>
        </div>
      </header>

      {error && (
        <p className="mx-4 md:mx-8 mt-4 text-sm text-red-400 border border-red-900 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Split de tela cheia do protótipo: 2 colunas no desktop, 1 no mobile. */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 lg:h-[calc(100vh-3.5rem)]">
        {/* Coluna 1 — conversa com a entrevistadora. */}
        <section
          aria-label="Conversa da entrevista"
          className="lg:col-span-6 border-b lg:border-b-0 lg:border-r border-border-subtle bg-dark-surface-container-low flex flex-col min-h-0"
        >
          <div className="p-4 border-b border-border-subtle bg-dark-surface-container flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 shrink-0 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
                <MaterialIcon name="record_voice_over" className="text-[22px]" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-headline font-bold text-sm text-white">Tutora de IA</h2>
                  <span className="px-2 py-0.5 rounded bg-primary/20 text-dark-primary font-code text-[10px]">
                    Avaliadora Tech Lead
                  </span>
                </div>
                <p className="text-xs text-dark-on-surface-variant">
                  Avaliando clareza de raciocínio, lógica e boas práticas
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-block px-2.5 py-1 rounded bg-secondary/15 text-secondary font-code text-xs font-bold border border-secondary/30 shrink-0">
              Áudio &amp; Texto Ativos
            </span>
          </div>

          <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto p-5 space-y-5">
            {session.turns.map((turn) =>
              turn.role === 'interviewer' ? (
                <div key={turn.id} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/20 shrink-0 flex items-center justify-center text-primary text-xs font-code mt-0.5 font-bold">
                    IA
                  </div>
                  <div className="bg-dark-surface-container p-4 rounded-lg border border-border-subtle text-sm text-dark-on-surface leading-relaxed whitespace-pre-wrap max-w-[92%]">
                    {turn.content}
                  </div>
                </div>
              ) : (
                <div key={turn.id} className="flex items-start gap-3 justify-end">
                  <div className="bg-primary/20 border border-primary/30 p-4 rounded-lg text-sm text-white leading-relaxed whitespace-pre-wrap max-w-[90%] space-y-1">
                    <p>{turn.content}</p>
                    <span className="text-[10px] font-code text-secondary flex items-center gap-1 justify-end">
                      <MaterialIcon name="check" className="text-[12px]" />
                      Resposta registrada
                    </span>
                    {turn.evaluation && (
                      <div className="pt-1 text-xs text-zinc-300 space-y-1">
                        {/* Redesign v2 (correção 15): avaliação por critérios
                            SEM números — só o nome do critério e a evidência.
                            Lote 4 (D12): rótulo legível da rubrica, nunca a
                            chave crua; ordem da rubrica, nunca a do jsonb. */}
                        {orderedEvaluationEntries(turn.evaluation, session.mode).map(([key, v]) => (
                          <p key={key}>
                            <span className="font-bold">{criterionLabel(key)}</span>
                            {' — '}
                            {v.evidence}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}
          </div>

          {isActive && (
            <div className="p-4 border-t border-border-subtle bg-dark-surface-container shrink-0">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 text-xs text-dark-on-surface-variant">
                  <span className="flex items-center gap-1.5">
                    <MaterialIcon name="mic" className="text-[16px] text-secondary" />
                    Explique sua solução para a entrevistadora
                  </span>
                  <span className="font-code text-[11px] shrink-0">Pressione Shift+Enter para enviar</span>
                </div>

                {/* Voz (opcional): a transcrição só preenche o campo abaixo —
                    o envio continua pelo mesmo `answerInterview` do texto
                    digitado (mesmo DTO, mesmo prompt-guard M11, mesma quota
                    M17). Sem microfone, tudo abaixo funciona igual. */}
                <InterviewVoiceControls
                  questionText={lastInterviewer ? lastInterviewer.content : null}
                  onTranscript={(text) => setAnswer((prev) => appendTranscript(prev, text))}
                  disabled={sending}
                />
                <div className="flex items-center gap-2 bg-dark-surface-container-low border border-border-strong rounded-lg px-3 py-2.5">
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.shiftKey) {
                        e.preventDefault();
                        if (canSend) void send();
                      }
                    }}
                    rows={2}
                    maxLength={8000}
                    placeholder="Explique sua solução para a entrevistadora…"
                    className="w-full bg-transparent text-sm text-white placeholder:text-dark-on-surface-variant/50 focus:outline-none resize-none leading-relaxed"
                  />
                  <button
                    onClick={() => void send()}
                    disabled={!canSend}
                    className="px-3 py-2 bg-primary hover:bg-dark-primary disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors self-end shrink-0"
                  >
                    <span>{sending ? 'Avaliando…' : 'Enviar'}</span>
                    <MaterialIcon name="send" className="text-[14px]" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={() => void finish()}
                    disabled={finishing || candidateCount === 0}
                    className="border border-border-strong hover:border-[#8257E5] disabled:opacity-50 text-sm font-bold rounded-lg px-4 py-2"
                  >
                    {finishing ? 'Gerando relatório…' : 'Finalizar e ver relatório'}
                  </button>
                  <p className="text-xs text-zinc-500">
                    {candidateCount}/{INTERVIEW_TURN_CAP} turnos · Treino — não substitui
                    entrevista humana real.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Coluna 2 — live coding + critérios em tempo real. */}
        <section
          aria-label="Live coding"
          className="lg:col-span-6 flex flex-col bg-[#0A0B10] min-h-0 lg:overflow-y-auto"
        >
          <div className="h-10 shrink-0 bg-dark-surface-container-high border-b border-border-subtle flex items-center justify-between px-4">
            <div className="flex items-center gap-2 min-w-0">
              <MaterialIcon name="code" className="text-[16px] text-yellow-400 shrink-0" />
              <span className="font-code text-xs text-white font-medium">debounce.js</span>
              <span className="text-[11px] font-code text-dark-on-surface-variant ml-2 hidden sm:inline">
                • Live Coding com IA
              </span>
            </div>
            <button
              type="button"
              onClick={() => void testCode()}
              disabled={testingCode}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-primary hover:bg-dark-primary disabled:opacity-50 text-white text-xs font-bold transition-colors shrink-0"
            >
              <MaterialIcon name="play_arrow" className="text-[14px]" />
              {testingCode ? 'Testando…' : 'Testar implementação'}
            </button>
          </div>
          <div className="h-[380px] shrink-0">
            {/* Lote 4 (D14): a barra da sessão já é a chrome bar do
                painel direito ("debounce.js • Live Coding com IA" +
                "Testar implementação") — a barra interna do editor
                duplicava o chrome. */}
            <IdeEditorPane
              language="javascript"
              code={code}
              onChange={setCode}
              onRun={() => void testCode()}
              isSubmitting={testingCode}
              hideChromeBar
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

          <div className="border-t border-border-subtle bg-dark-surface-container-low p-4 flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <MaterialIcon name="analytics" className="text-secondary text-[18px]" />
                  <h2 className="font-headline font-bold text-xs text-white uppercase tracking-wider">
                    Critérios de Avaliação Técnica
                  </h2>
                </div>
                <span className="font-code text-xs text-secondary font-bold shrink-0">
                  Feedback em tempo real
                </span>
              </div>
              {lastEvaluation ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Lote 4 (D12): rótulos da rubrica, na ordem da rubrica. */}
                  {orderedEvaluationEntries(lastEvaluation, session.mode).map(([key], i) => (
                    <div
                      key={key}
                      className="bg-dark-surface p-2.5 rounded border border-border-subtle text-center"
                    >
                      <span className="text-xs text-white font-medium block mb-1">{criterionLabel(key)}</span>
                      <span className={`font-code text-xs ${CRITERION_COLORS[i % CRITERION_COLORS.length]}`}>
                        Avaliado
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-400">
                  Os critérios aparecem aqui após a primeira resposta avaliada.
                </p>
              )}
              {feedbackText && (
                <div className="mt-3 p-2.5 rounded bg-dark-surface-container border border-border-subtle font-code text-[11px] text-dark-on-surface flex items-start gap-2">
                  <MaterialIcon name="verified" className="text-secondary text-[16px] mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-white">Feedback da Entrevistadora:</strong>{' '}
                    {feedbackText}
                  </div>
                </div>
              )}
              <p className="text-xs text-zinc-500 mt-3">
                Feedback em tempo real — a avaliação completa fica no relatório final.
              </p>
            </div>

            {isActive && (
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-border-subtle">
                <span className="text-xs text-dark-on-surface-variant font-code">
                  Próxima etapa: {currentQuestionLabel(candidateCount)} · envie sua resposta
                  para avançar
                </span>
                <button
                  onClick={() => void send()}
                  disabled={!canSend}
                  className="px-5 py-2 bg-primary hover:bg-dark-primary disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-md shadow-primary/20 shrink-0"
                >
                  <span>Enviar resposta e avançar</span>
                  <MaterialIcon name="arrow_forward" className="text-[16px]" />
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {report && (
        <div className="px-4 md:px-8 py-8">
          <div className="border border-border-strong rounded-xl p-4 space-y-4 max-w-3xl mx-auto">
            <h2 className="text-lg font-bold text-white">Relatório</h2>
            <div>
              <h3 className="text-sm font-bold text-zinc-300">Avaliação por critério</h3>
              <ul className="text-sm text-zinc-400 mt-1 space-y-1">
                {/* Lote 4 (D12): rótulos da rubrica, na ordem da rubrica. */}
                {orderedEvaluationEntries(report.scores, session.mode).map(([key, v]) => (
                  <li key={key}>
                    <span className="font-bold text-zinc-200">{criterionLabel(key)}</span>
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
        </div>
      )}
    </div>
  );
}
