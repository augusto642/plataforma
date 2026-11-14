'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { MaterialIcon } from '../../components/MaterialIcon';
import {
  getChallengeLeaderboard,
  getCurrentChallenge,
  getMyLeagues,
  joinChallenge,
  leaveChallenge,
  type Challenge,
  type ChallengeRankingEntry,
  type LeagueStanding,
} from '../../lib/challenges';
import { apiFetch, API_BASE } from '../../lib/apiClient';
import { IdeEditorPane } from '../ide/components/IdeEditorPane';
import { TestResultsGrid } from '../ide/components/TestResultsGrid';
import { useSubmissionStream, type SubmissionEvent } from '../../hooks/useSubmissionStream';
import { StudentSidebar } from '../../components/StudentSidebar';
import { StudentHeader } from '../../components/StudentHeader';
import { useSidebar } from '../../context/SidebarContext';

/**
 * Fase 3 premium (desenho §4.1) — desafio da semana + liga + ranking.
 * Participação opt-in (sem join, sem ranking); ligas por nível, nunca
 * uma única liga global; bônus por participação, não só por vitória.
 * A liga persistente é Pro/Carreira — free vê o desafio e o ranking
 * do desafio, e recebe o aviso de plano na seção de ligas.
 *
 * Central 216 (A4) — as ligas exibidas são os tiers REAIS do
 * league.service (bronze/silver/gold, via GET /leagues/me): nenhuma
 * "Liga Diamante" existe no produto.
 *
 * Central 216 retrabalho (D4) — a tela vira o desafio em 3 colunas do
 * protótipo Stitch v2 (desafio-jogo.html): enunciado + casos de teste
 * | editor + terminal | tutora. O enunciado e o código inicial vêm da
 * atividade real (GET /activities/:id); a execução é a submissão real
 * (POST /submissions + stream, igual à IDE); os casos de teste são os
 * resultados reais da submissão — antes da primeira execução, a seção
 * diz isso em vez de listar casos inventados. Sem desafio ativo ou
 * sem atividade, estado vazio honesto (fail-closed), nunca o desafio
 * do mock ("O Guardião da Pontuação" / "Calculadora de XP").
 */
const TIER_LABEL: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Prata',
  gold: 'Ouro',
};

interface ChallengeActivity {
  id: string;
  title: string;
  description: string;
  instructions?: string;
  language: string;
  initialCode?: string;
  course?: { id: string; title: string; slug: string };
}

export default function DesafiosPage() {
  const { user, token, isLoading } = useAuth();
  const { isCollapsed } = useSidebar();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [ranking, setRanking] = useState<ChallengeRankingEntry[]>([]);
  const [leagues, setLeagues] = useState<LeagueStanding[]>([]);
  const [leagueError, setLeagueError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<ChallengeActivity | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [submission, setSubmission] = useState<SubmissionEvent | null>(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [aiHints, setAiHints] = useState<string | null>(null);
  const [loadingHints, setLoadingHints] = useState(false);

  useSubmissionStream(
    streamingId,
    token || (user ? 'cookie-auth' : null),
    (updated) => {
      setSubmission(updated);
      if (['passed', 'failed', 'error'].includes(updated.status)) {
        setIsSubmitting(false);
        setStreamingId(null);
      }
    },
    () => {
      setIsSubmitting(false);
      setStreamingId(null);
    },
  );

  async function load() {
    try {
      const current = await getCurrentChallenge();
      setChallenge(current);
      if (current) {
        const board = await getChallengeLeaderboard(current.id);
        setRanking(board.ranking);
        if (current.activityId) {
          try {
            const res = await apiFetch(`${API_BASE}/activities/${current.activityId}`);
            if (!res.ok) throw new Error('Não foi possível carregar a atividade do desafio.');
            const act = (await res.json()) as ChallengeActivity;
            setActivity(act);
            setCode(act.initialCode || '// Escreva sua solução aqui\n');
          } catch (err) {
            setActivityError(
              err instanceof Error ? err.message : 'Não foi possível carregar a atividade.',
            );
          }
        }
      }
      try {
        setLeagues(await getMyLeagues());
      } catch (err) {
        setLeagueError(err instanceof Error ? err.message : 'Ligas indisponíveis.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o desafio.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading]);

  async function toggleJoin() {
    if (!challenge) return;
    setError(null);
    try {
      if (challenge.joined) await leaveChallenge(challenge.id);
      else await joinChallenge(challenge.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar a inscrição.');
    }
  }

  async function runTests() {
    if (!activity) return;
    setRunError(null);
    setAiHints(null);
    setIsSubmitting(true);
    setSubmission(null);
    try {
      const res = await apiFetch(`${API_BASE}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId: activity.id, code }),
      });
      if (!res.ok) throw new Error('Falha ao enviar submissão');
      const created = await res.json();
      setStreamingId(created.id);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Não foi possível executar os testes.');
      setIsSubmitting(false);
    }
  }

  async function askAiHint() {
    if (!submission) return;
    setLoadingHints(true);
    try {
      const res = await apiFetch(`${API_BASE}/ai/hint/${submission.id}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAiHints(
          typeof data === 'string'
            ? data
            : (data.hint ?? data.feedback ?? JSON.stringify(data)),
        );
      } else {
        setAiHints('Não foi possível carregar a dica da IA no momento.');
      }
    } catch {
      setAiHints('Não foi possível carregar a dica da IA no momento.');
    } finally {
      setLoadingHints(false);
    }
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-dark-surface text-dark-on-surface px-5 py-16">
        <div className="max-w-7xl mx-auto text-sm text-zinc-400">Carregando…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-surface text-dark-on-surface px-5 py-16">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-black text-white">Desafio da semana</h1>
          <p className="text-sm text-zinc-400 mt-2">Faça login para participar.</p>
          <Link
            href="/login"
            className="inline-block mt-4 px-4 py-2 rounded-xl bg-[#8257E5] text-white text-sm font-bold"
          >
            Entrar
          </Link>
        </div>
      </div>
    );
  }

  const ideHref = activity
    ? `/ide?activity=${activity.id}${activity.course ? `&course=${activity.course.id}` : ''}`
    : '/ide';

  return (
    <div className="min-h-screen bg-[#07090E] text-[#F1F5F9] font-sans antialiased flex selection:bg-[#8257E5] selection:text-white">
      {/* Sidebar Lateral Retrátil Oficial */}
      <StudentSidebar />

      {/* Conteúdo à Direita com Largura Dinâmica */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          isCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        <StudentHeader
          title="Desafios de Código"
          subtitle="Desafio Semanal & Ranking da Liga"
        />

        <main className="p-4 md:p-8 space-y-6 flex-1 max-w-7xl w-full mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-[#94A3B8] hover:text-white transition-colors mb-2"
        >
          <MaterialIcon name="arrow_back" className="text-[16px]" />
          Voltar à Visão Geral
        </Link>

        <p className="font-mono text-xs text-[#8257E5] font-bold uppercase tracking-wider">
          {challenge
            ? `Desafio da semana · ${challenge.status === 'active' ? 'em andamento' : challenge.status === 'upcoming' ? 'começa em breve' : 'encerrado'}`
            : 'Desafio da semana'}
        </p>
        <h1 className="text-2xl md:text-3xl font-brand font-black text-white mt-1">
          {challenge ? challenge.title : 'Desafio de Código da Semana'}
        </h1>
        <p className="text-sm text-[#94A3B8] mt-2 max-w-2xl leading-relaxed">
          Desafio algorítmico avaliado por runner isolado com bateria de testes unitários automatizados. Sua pontuação mensura correção lógica, complexidade assintótica Big-O e cobertura de casos de borda. Suba de divisão nas Ligas Técnicas e consolide seu portfólio.
        </p>
        {error && <p className="text-sm text-red-400 mt-4">{error}</p>}

        {!challenge && (
          <p className="text-sm text-zinc-400 mt-6">
            Nenhum desafio ativo no momento. Volte na próxima semana.
          </p>
        )}

        {challenge && (
          <>
            <div className="flex flex-wrap items-center gap-3 mt-5">
              <span className="text-xs text-zinc-500">
                {challenge.participantCount} participante(s) · De{' '}
                {new Date(challenge.startsAt).toLocaleString('pt-BR')} até{' '}
                {new Date(challenge.endsAt).toLocaleString('pt-BR')}
              </span>
              <button
                onClick={toggleJoin}
                className="px-4 py-2 rounded-xl bg-[#8257E5] hover:bg-[#6f46cc] text-white text-sm font-bold"
              >
                {challenge.joined ? 'Sair do desafio' : 'Participar (opt-in)'}
              </button>
              {!challenge.joined && (
                <span className="text-xs text-zinc-500">
                  Inscrição voluntária (opt-in): necessária para submeter execuções ao ranking oficial da sua divisão.
                </span>
              )}
            </div>

            {/* 3 colunas do protótipo — só com atividade real. */}
            {activity ? (
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Coluna 1 — enunciado + casos de teste. */}
                <section
                  aria-label="Enunciado do desafio"
                  className="lg:col-span-3 rounded-2xl border border-[#1C2338] bg-[#0C0F17] p-5 min-w-0 shadow-sm"
                >
                  <p className="font-code text-[11px] text-secondary font-bold uppercase tracking-wider">
                    Missão de código
                  </p>
                  <h2 className="font-bold text-white mt-1">{activity.title}</h2>
                  <p className="text-sm text-zinc-400 mt-3 whitespace-pre-wrap leading-relaxed">
                    {activity.description}
                  </p>
                  {activity.instructions && (
                    <p className="text-sm text-zinc-400 mt-3 whitespace-pre-wrap leading-relaxed">
                      {activity.instructions}
                    </p>
                  )}
                  <div className="mt-6">
                    <h3 className="text-sm font-bold text-white">
                      Casos de teste
                      {submission && submission.testResults.length > 0 && (
                        <span className="text-zinc-500 font-normal">
                          {' '}
                          · {submission.testResults.filter((r) => r.passed).length}/
                          {submission.testResults.length} aprovados
                        </span>
                      )}
                    </h3>
                    {submission && submission.testResults.length > 0 ? (
                      <ul className="mt-3 space-y-2">
                        {submission.testResults.map((r) => (
                          <li key={r.id} className="flex items-start gap-2 text-sm">
                            <MaterialIcon
                              name={r.passed ? 'check_circle' : 'cancel'}
                              className={`text-[18px] shrink-0 ${r.passed ? 'text-secondary' : 'text-red-400'}`}
                            />
                            <span className="text-zinc-300">
                              {r.name}
                              {r.errorMessage && (
                                <span className="block text-xs text-red-400 mt-0.5">
                                  {r.errorMessage}
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-zinc-500 mt-2">
                        Os casos de teste aparecem aqui após a primeira execução.
                      </p>
                    )}
                  </div>
                  <Link
                    href="/comunidade"
                    className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-dark-primary hover:underline"
                  >
                    Discussão no fórum
                    <MaterialIcon name="arrow_forward" className="text-[16px]" />
                  </Link>
                </section>

                {/* Coluna 2 — editor + terminal. */}
                <section
                  aria-label="Editor e terminal"
                  className="lg:col-span-6 rounded-2xl border border-[#1C2338] bg-[#0C0F17] overflow-hidden min-w-0 shadow-sm"
                >
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1C2338] bg-[#07090E]">
                    <span className="font-code text-xs text-dark-on-surface-variant">
                      {activity.language} · {activity.title.toLowerCase().replace(/\s+/g, '-')}.{' '}
                      {activity.language === 'python' ? 'py' : 'js'}
                    </span>
                    <button
                      type="button"
                      onClick={() => void runTests()}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-dark-primary disabled:opacity-50 text-white text-xs font-bold transition-colors"
                    >
                      <MaterialIcon name="play_arrow" className="text-[16px]" />
                      {isSubmitting ? 'Executando…' : 'Executar testes (Ctrl + Enter)'}
                    </button>
                  </div>
                  <div className="h-[420px]">
                    <IdeEditorPane
                      language={activity.language}
                      code={code}
                      onChange={setCode}
                      onRun={() => void runTests()}
                      isSubmitting={isSubmitting}
                    />
                  </div>
                  <div className="border-t border-[#1C2338] bg-[#07090E]/60">
                    <p className="px-4 pt-3 pb-1 font-code text-xs text-dark-on-surface-variant">
                      Console de execução
                    </p>
                    {runError && (
                      <p role="alert" className="px-4 pb-2 text-sm text-red-400">
                        {runError}
                      </p>
                    )}
                    {isSubmitting && !submission && (
                      <p role="status" className="px-4 pb-3 text-sm text-zinc-400">
                        Executando testes no Sandbox isolado…
                      </p>
                    )}
                    {submission && (
                      <>
                        <p className="px-4 pb-2 text-sm text-zinc-400">
                          {submission.status === 'passed'
                            ? 'Todos os testes foram validados com sucesso no Sandbox Piston.'
                            : submission.status === 'failed'
                              ? 'Alguns testes falharam — revise o código e execute novamente.'
                              : submission.status === 'error'
                                ? `Erro na execução: ${submission.errorMessage ?? 'verifique o código.'}`
                                : 'Executando testes no Sandbox isolado…'}
                        </p>
                        <TestResultsGrid
                          results={submission.testResults}
                          score={submission.score ?? undefined}
                          maxScore={submission.maxScore ?? 100}
                        />
                      </>
                    )}
                    {!submission && !isSubmitting && !runError && (
                      <p className="px-4 pb-3 text-sm text-zinc-500">
                        Execute os testes para ver o resultado aqui.
                      </p>
                    )}
                  </div>
                </section>

                {/* Coluna 3 — tutora. */}
                <section
                  aria-label="Tutora de IA"
                  className="lg:col-span-3 rounded-2xl border border-[#1C2338] bg-[#0C0F17] p-5 min-w-0 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-purple/20 text-dark-primary font-bold text-xs">
                      IA
                    </span>
                    <div>
                      <h2 className="font-bold text-white text-sm">Tutora de IA</h2>
                      <p className="text-xs text-zinc-500">Mentoria socrática ativa</p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400 mt-4 leading-relaxed">
                    A tutora não entrega a resposta pronta: ela guia seu raciocínio.
                  </p>
                  {submission?.aiFeedback && (
                    <div className="mt-4 rounded-xl border border-[#1C2338] bg-[#121624] p-3">
                      <p className="text-xs font-bold text-zinc-300 mb-1">
                        Feedback da IA sobre sua submissão
                      </p>
                      <p className="text-sm text-zinc-400 whitespace-pre-wrap">
                        {submission.aiFeedback}
                      </p>
                    </div>
                  )}
                  {aiHints && (
                    <div className="mt-4 rounded-xl border border-[#1C2338] bg-[#121624] p-3">
                      <p className="text-xs font-bold text-zinc-300 mb-1">Dica da IA</p>
                      <p className="text-sm text-zinc-400 whitespace-pre-wrap">{aiHints}</p>
                    </div>
                  )}
                  <div className="mt-4 flex flex-col gap-2">
                    {submission && (
                      <button
                        type="button"
                        onClick={() => void askAiHint()}
                        disabled={loadingHints}
                        className="w-full px-4 py-2 rounded-xl bg-[#121624] hover:bg-[#1C2338] border border-[#1C2338] text-sm font-bold text-dark-on-surface hover:text-white disabled:opacity-50 transition-colors"
                      >
                        {loadingHints ? 'Carregando dica…' : 'Pedir dica da IA'}
                      </button>
                    )}
                    <Link
                      href={ideHref}
                      className="w-full px-4 py-2 rounded-xl bg-primary hover:bg-dark-primary text-white text-sm font-bold text-center transition-colors"
                    >
                      Abrir na IDE com a tutora
                    </Link>
                  </div>
                </section>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-[#1C2338] bg-[#0C0F17] p-5 max-w-2xl">
                <p className="text-sm text-zinc-400">
                  {activityError ??
                    'O desafio ativo ainda não tem uma atividade para resolver.'}
                </p>
                <Link
                  href="/ide"
                  className="mt-3 inline-block text-sm font-bold text-dark-primary hover:underline"
                >
                  Abrir o editor →
                </Link>
              </div>
            )}

            {challenge && ranking.length > 0 && (
              <section className="mt-8 max-w-3xl">
                <h2 className="font-bold text-white">Ranking do desafio</h2>
                <ol className="mt-3 space-y-2">
                  {ranking.map((r) => (
                    <li
                      key={r.userId}
                      className="flex justify-between rounded-xl border border-[#1C2338] bg-[#0C0F17] px-4 py-2.5 text-sm"
                    >
                      <span className="text-zinc-300">
                        {r.position}º {r.name} <span className="text-zinc-500">· nível {r.level}</span>
                      </span>
                      <span className="font-bold text-white">{r.points} pts</span>
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-zinc-500 mt-2">
                  Pontos = 10 por participar + melhor nota aprovada na semana.
                </p>
              </section>
            )}
          </>
        )}

        <section className="mt-8 max-w-3xl">
          <h2 className="font-bold text-white">Minhas ligas</h2>
          {leagueError ? (
            <p className="text-sm text-zinc-400 mt-2">
              As ligas persistentes fazem parte dos planos pagos. Quando houver um
              desafio ativo, ele aparece aqui com o ranking da semana.
            </p>
          ) : leagues.length === 0 ? (
            <p className="text-sm text-zinc-400 mt-2">
              Nenhuma liga ainda — participe de um desafio para entrar na sua liga.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {leagues.map((l) => (
                <li
                  key={l.seasonId}
                  className="flex justify-between rounded-xl border border-[#1C2338] bg-[#0C0F17] px-4 py-2.5 text-sm"
                >
                  <span className="text-zinc-300">
                    Liga {TIER_LABEL[l.tier] ?? l.tier} · {l.position}º de {l.participants}
                  </span>
                  <span className="font-bold text-white">{l.points} pts</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        </main>
      </div>
    </div>
  );
}
