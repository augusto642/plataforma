'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '../components/Logo';

// B09 — Quiz diagnóstico público (sem cadastro): a API devolve as questões,
// pontua 6 eixos, sugere um arquétipo e uma trilha. O sessionToken permite
// vincular o resultado à conta quando o visitante se cadastra depois.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const DIAGNOSTIC_STORAGE_KEY = 'nexus_diagnostic_token';

type QuizOption = { id: string; label: string };
type QuizQuestion = {
  id: string;
  axis: string;
  type: string;
  prompt: string;
  options: QuizOption[];
};
type QuizResponse = { version: string; questions: QuizQuestion[] };

type DiagnosticScores = {
  logica: number;
  codigo: number;
  web: number;
  dados: number;
  automacao: number;
  jogos: number;
};
type Archetype = {
  id: string;
  name: string;
  description: string;
  strengths: string[];
};
type DiagnosticResult = {
  sessionToken: string;
  scores: DiagnosticScores;
  archetype: Archetype;
  recommendedTrack: string;
  // Nome legível da trilha (a API o devolve junto do slug); preferir na exibição
  recommendedTrackName?: string;
};

type Answer = { questionId: string; optionId: string };
type Phase = 'loading' | 'error' | 'intro' | 'quiz' | 'submitting' | 'result';

const AXES: { key: keyof DiagnosticScores; label: string }[] = [
  { key: 'logica', label: 'Lógica' },
  { key: 'codigo', label: 'Código' },
  { key: 'web', label: 'Web' },
  { key: 'dados', label: 'Dados' },
  { key: 'automacao', label: 'Automação' },
  { key: 'jogos', label: 'Jogos' },
];

// A API pontua em escala 0–100; se um dia vier 0–1, sobe para porcentagem.
function normalizeScore(value: number, all: number[]): number {
  const max = Math.max(...all);
  const scaled = max > 0 && max <= 1 ? value * 100 : value;
  return Math.min(100, Math.max(0, scaled));
}

// Radar SVG desenhado à mão (o projeto não tem lib de charts): 6 eixos,
// anéis de grade em 25/50/75/100% e o polígono do aluno por cima.
function RadarChart({ scores }: { scores: DiagnosticScores }) {
  const size = 320;
  const center = size / 2;
  const radius = 104;
  const values = AXES.map((axis) => scores[axis.key] ?? 0);

  const point = (index: number, fraction: number) => {
    const angle = (Math.PI / 3) * index - Math.PI / 2;
    return {
      x: center + radius * fraction * Math.cos(angle),
      y: center + radius * fraction * Math.sin(angle),
    };
  };
  const polygon = (fraction: number) =>
    AXES.map((_, i) => {
      const p = point(i, fraction);
      return `${p.x},${p.y}`;
    }).join(' ');
  const dataPolygon = AXES.map((_, i) => {
    const p = point(i, normalizeScore(values[i], values) / 100);
    return `${p.x},${p.y}`;
  }).join(' ');

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto w-full max-w-[340px]"
      role="img"
      aria-label="Gráfico de radar com seus resultados nos seis eixos"
    >
      {[0.25, 0.5, 0.75, 1].map((fraction) => (
        <polygon
          key={fraction}
          points={polygon(fraction)}
          fill="none"
          stroke="#2B2B3B"
          strokeWidth="1"
        />
      ))}
      {AXES.map((axis, i) => {
        const end = point(i, 1);
        const label = point(i, 1.22);
        const anchor =
          label.x > center + 12 ? 'start' : label.x < center - 12 ? 'end' : 'middle';
        return (
          <g key={axis.key}>
            <line
              x1={center}
              y1={center}
              x2={end.x}
              y2={end.y}
              stroke="#2B2B3B"
              strokeWidth="1"
            />
            <text
              x={label.x}
              y={label.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fill="#C0C0D1"
              fontSize="13"
              fontWeight="600"
            >
              {axis.label}
            </text>
          </g>
        );
      })}
      <polygon
        points={dataPolygon}
        fill="rgba(130, 87, 229, 0.32)"
        stroke="#8257E5"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {AXES.map((axis, i) => {
        const p = point(i, normalizeScore(values[i], values) / 100);
        return <circle key={axis.key} cx={p.x} cy={p.y} r="4" fill="#996DFF" />;
      })}
    </svg>
  );
}

export default function DiagnosticoPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasStoredResult, setHasStoredResult] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Token da sessão atual: sobrevive ao "refazer" (que limpa o resultado da
  // tela) para o próximo submit atualizar a mesma linha em vez de criar outra
  const sessionTokenRef = useRef<string | null>(null);

  const loadQuiz = useCallback(async () => {
    setPhase('loading');
    try {
      const res = await fetch(`${API_BASE}/diagnostic/quiz`);
      if (!res.ok) throw new Error('quiz unavailable');
      const data = (await res.json()) as QuizResponse;
      if (!data.questions || data.questions.length === 0) {
        throw new Error('empty quiz');
      }
      setQuestions(data.questions);
      setPhase('intro');
    } catch {
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    loadQuiz();
    try {
      setHasStoredResult(!!sessionStorage.getItem(DIAGNOSTIC_STORAGE_KEY));
    } catch {
      setHasStoredResult(false);
    }
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, [loadQuiz]);

  const loadStoredResult = useCallback(async () => {
    let token: string | null = null;
    try {
      token = sessionStorage.getItem(DIAGNOSTIC_STORAGE_KEY);
    } catch {
      token = null;
    }
    if (!token) return;
    setPhase('loading');
    try {
      const res = await fetch(`${API_BASE}/diagnostic/result/${token}`);
      if (!res.ok) throw new Error('result unavailable');
      const data = (await res.json()) as DiagnosticResult;
      sessionTokenRef.current = data.sessionToken;
      setResult(data);
      setPhase('result');
    } catch {
      // Token expirado/inválido: limpa e volta ao início sem travar a página
      try {
        sessionStorage.removeItem(DIAGNOSTIC_STORAGE_KEY);
      } catch {
        // ignore
      }
      setHasStoredResult(false);
      setPhase('intro');
    }
  }, []);

  const submitAnswers = useCallback(
    async (finalAnswers: Record<string, string>) => {
      setPhase('submitting');
      setSubmitError(null);
      const payload: Answer[] = questions.map((question) => ({
        questionId: question.id,
        optionId: finalAnswers[question.id],
      }));
      // Refazer reaproveita a sessão: com o token conhecido (resultado exibido
      // ou o guardado para o cadastro), a API atualiza o resultado existente
      // em vez de criar uma linha nova a cada tentativa
      let knownToken: string | null =
        sessionTokenRef.current ?? result?.sessionToken ?? null;
      if (!knownToken) {
        try {
          knownToken = sessionStorage.getItem(DIAGNOSTIC_STORAGE_KEY);
        } catch {
          knownToken = null;
        }
      }
      const body: { answers: Answer[]; sessionToken?: string } = {
        answers: payload,
      };
      if (knownToken) body.sessionToken = knownToken;
      try {
        const res = await fetch(`${API_BASE}/diagnostic/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('submit failed');
        const data = (await res.json()) as DiagnosticResult;
        sessionTokenRef.current = data.sessionToken;
        setResult(data);
        setPhase('result');
      } catch {
        setPhase('quiz');
        setSubmitError(
          'Não consegui enviar suas respostas agora. Confira a conexão e tente de novo — suas respostas estão salvas nesta tela.',
        );
      }
    },
    [questions, result],
  );

  const selectOption = (questionId: string, optionId: string) => {
    const next = { ...answers, [questionId]: optionId };
    setAnswers(next);
    setSubmitError(null);
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      if (current < questions.length - 1) {
        setCurrent(current + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (Object.keys(next).length === questions.length) {
        submitAnswers(next);
      }
    }, 220);
  };

  const goBack = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    if (current === 0) {
      setPhase('intro');
    } else {
      setCurrent(current - 1);
    }
  };

  const restart = () => {
    setAnswers({});
    setCurrent(0);
    setResult(null);
    setSubmitError(null);
    setPhase('intro');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveToAccount = () => {
    if (result) {
      try {
        // O cadastro lê esta chave e envia diagnosticSessionToken no payload
        sessionStorage.setItem(DIAGNOSTIC_STORAGE_KEY, result.sessionToken);
      } catch {
        // Sem sessionStorage o vínculo não acontece, mas o cadastro segue normal
      }
    }
    router.push('/register');
  };

  const question = questions[current];
  const answeredCount = Object.keys(answers).length;
  const progress =
    questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  return (
    <div className="min-h-screen w-full bg-background text-ink-body">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo size="md" href="/" />
        <span className="text-sm text-ink-span">Diagnóstico gratuito</span>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6">
        {phase === 'loading' && (
          <div className="py-24 text-center" role="status">
            <div
              className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-border-2 border-t-brand-purple"
              aria-hidden="true"
            />
            <p className="text-ink-span">Carregando o diagnóstico…</p>
          </div>
        )}

        {phase === 'error' && (
          <section className="rounded-2xl border border-border-2 bg-surface-2 p-6 text-center sm:p-10">
            <h1 className="font-heading text-2xl font-bold text-ink-heading">
              O diagnóstico está indisponível no momento
            </h1>
            <p className="mx-auto mt-3 max-w-md text-ink-body">
              Não conseguimos carregar as questões agora. Isso costuma se resolver
              em poucos instantes — tente de novo.
            </p>
            <button
              type="button"
              onClick={loadQuiz}
              className="mt-6 rounded-xl bg-brand-purple px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-purple-dark"
            >
              Tentar de novo
            </button>
          </section>
        )}

        {phase === 'intro' && (
          <section className="rounded-2xl border border-border-2 bg-surface-2 p-6 sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-purple-light">
              Descubra seu ponto de partida
            </p>
            <h1 className="mt-3 font-heading text-3xl font-bold leading-tight text-ink-heading sm:text-4xl">
              Qual é o seu perfil de programador?
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed">
              São {questions.length} perguntas rápidas sobre como você pensa,
              estuda e resolve problemas — leva cerca de <strong>3 minutos</strong> e
              não precisa de cadastro. No fim, você recebe um mapa em seis eixos
              (lógica, código, web, dados, automação e jogos), o seu arquétipo e a
              trilha recomendada pra começar.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-ink-span">
              <li>• Sem respostas certas ou erradas — responda com sinceridade.</li>
              <li>• Você pode voltar e mudar qualquer resposta.</li>
              <li>• O resultado pode ser salvo na sua conta depois, se quiser.</li>
            </ul>
            <button
              type="button"
              onClick={() => {
                setCurrent(0);
                setPhase('quiz');
              }}
              className="mt-8 w-full rounded-xl bg-brand-purple px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-brand-purple-dark sm:w-auto"
            >
              Começar o diagnóstico
            </button>
            {hasStoredResult && (
              <button
                type="button"
                onClick={loadStoredResult}
                className="mt-4 block text-sm font-medium text-brand-purple-light underline-offset-4 hover:underline"
              >
                Já fez o diagnóstico nesta sessão? Ver meu resultado
              </button>
            )}
          </section>
        )}

        {(phase === 'quiz' || phase === 'submitting') && question && (
          <section>
            <div className="mb-2 flex items-center justify-between text-sm text-ink-span">
              <span>
                Pergunta {current + 1} de {questions.length}
              </span>
              <span>{progress}%</span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-surface-3"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progresso do diagnóstico"
            >
              <div
                className="h-full rounded-full bg-brand-purple transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-6 rounded-2xl border border-border-2 bg-surface-2 p-6 sm:p-8">
              <h2 className="font-heading text-xl font-bold leading-snug text-ink-heading sm:text-2xl">
                {question.prompt}
              </h2>
              <div className="mt-6 grid gap-3">
                {question.options.map((option) => {
                  const selected = answers[question.id] === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={selected}
                      disabled={phase === 'submitting'}
                      onClick={() => selectOption(question.id, option.id)}
                      className={`rounded-xl border px-5 py-4 text-left text-base transition-colors ${
                        selected
                          ? 'border-border-brand bg-brand-purple-low text-ink-heading'
                          : 'border-border-2 bg-surface-1 text-ink-body hover:border-border-brand hover:bg-surface-3'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {submitError && (
                <p
                  role="alert"
                  className="mt-5 rounded-lg border border-brand-rose/40 bg-surface-1 px-4 py-3 text-sm text-ink-body"
                >
                  {submitError}
                </p>
              )}

              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={phase === 'submitting'}
                  className="rounded-xl border border-border-2 px-5 py-3 font-medium text-ink-body transition-colors hover:bg-surface-3 disabled:opacity-50"
                >
                  Voltar
                </button>
                {phase === 'submitting' ? (
                  <span className="flex items-center gap-2 text-sm text-ink-span" role="status">
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-border-2 border-t-brand-purple"
                      aria-hidden="true"
                    />
                    Calculando seu resultado…
                  </span>
                ) : (
                  <span className="text-sm text-ink-span">
                    {current === questions.length - 1
                      ? 'Ao responder, seu resultado é calculado'
                      : 'Toque numa opção para avançar'}
                  </span>
                )}
              </div>
            </div>
          </section>
        )}

        {phase === 'result' && result && (
          <section>
            <div className="rounded-2xl border border-border-2 bg-surface-2 p-6 sm:p-10">
              <p className="text-center text-sm font-semibold uppercase tracking-wide text-brand-purple-light">
                Seu mapa de partida
              </p>
              <div className="mt-4">
                <RadarChart scores={result.scores} />
              </div>
              <dl className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
                {AXES.map((axis) => (
                  <div key={axis.key} className="flex items-baseline justify-between gap-2">
                    <dt className="text-ink-span">{axis.label}</dt>
                    <dd className="font-semibold text-ink-heading">
                      {Math.round(
                        normalizeScore(
                          result.scores[axis.key] ?? 0,
                          AXES.map((a) => result.scores[a.key] ?? 0),
                        ),
                      )}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-8 rounded-2xl border border-border-brand bg-brand-purple-low p-6">
                <p className="text-sm text-ink-span">Seu arquétipo</p>
                <h2 className="mt-1 font-heading text-2xl font-bold text-ink-heading">
                  {result.archetype.name}
                </h2>
                <p className="mt-3 leading-relaxed">{result.archetype.description}</p>
                {Array.isArray(result.archetype.strengths) &&
                  result.archetype.strengths.length > 0 && (
                    <>
                      <h3 className="mt-5 font-semibold text-ink-heading">
                        Pontos fortes
                      </h3>
                      <ul className="mt-2 space-y-1.5">
                        {result.archetype.strengths.map((strength) => (
                          <li key={strength} className="flex gap-2">
                            <span aria-hidden="true" className="text-brand-green-neon">
                              ✓
                            </span>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
              </div>

              {(result.recommendedTrackName || result.recommendedTrack) && (
                <p className="mt-6 text-center text-ink-body">
                  Trilha recomendada:{' '}
                  <strong className="text-ink-heading">
                    {result.recommendedTrackName || result.recommendedTrack}
                  </strong>
                </p>
              )}

              <button
                type="button"
                onClick={saveToAccount}
                className="mt-8 w-full rounded-xl bg-brand-purple px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-brand-purple-dark"
              >
                Criar conta e salvar meu resultado
              </button>
              <button
                type="button"
                onClick={restart}
                className="mt-3 w-full rounded-xl border border-border-2 px-6 py-3 font-medium text-ink-body transition-colors hover:bg-surface-3"
              >
                Refazer o diagnóstico
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
