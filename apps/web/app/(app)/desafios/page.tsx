'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
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

/**
 * Fase 3 premium (desenho §4.1) — desafio da semana + liga + ranking.
 * Participação opt-in (sem join, sem ranking); ligas por nível, nunca
 * uma única liga global; bônus por participação, não só por vitória.
 * A liga persistente é Pro/Carreira — free vê o desafio e o ranking
 * do desafio, e recebe o aviso de plano na seção de ligas.
 */
export default function DesafiosPage() {
  const { user, isLoading } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [ranking, setRanking] = useState<ChallengeRankingEntry[]>([]);
  const [leagues, setLeagues] = useState<LeagueStanding[]>([]);
  const [leagueError, setLeagueError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const current = await getCurrentChallenge();
      setChallenge(current);
      if (current) {
        const board = await getChallengeLeaderboard(current.id);
        setRanking(board.ranking);
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

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#08080B] text-[#EDEDED] px-5 py-16">
        <div className="max-w-[720px] mx-auto text-sm text-zinc-400">Carregando…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#08080B] text-[#EDEDED] px-5 py-16">
        <div className="max-w-[720px] mx-auto">
          <h1 className="text-2xl font-black text-white">Desafio da semana</h1>
          <p className="text-sm text-zinc-400 mt-2">Faça login para participar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080B] text-[#EDEDED] px-5 py-16">
      <div className="max-w-[720px] mx-auto">
        <h1 className="text-2xl font-black text-white">Desafio da semana</h1>
        <p className="text-sm text-zinc-400 mt-2">
          Um problema curto por semana, com ranking por nível — iniciante compete com
          iniciante. Participar já rende pontos; vencer rende mais. Prêmio é XP e posição
          na liga, sem promessa de emprego.
        </p>
        {error && <p className="text-sm text-red-400 mt-4">{error}</p>}

        {!challenge && (
          <p className="text-sm text-zinc-400 mt-6">
            Nenhum desafio ativo no momento. Volte na próxima semana.
          </p>
        )}

        {challenge && (
          <section className="mt-6 rounded-xl border border-zinc-800 bg-[#121217] p-4">
            <h2 className="font-bold text-white">{challenge.title}</h2>
            <p className="text-sm text-zinc-400 mt-1">
              {challenge.activity?.title ?? 'Atividade do desafio'} ·{' '}
              {challenge.status === 'active'
                ? 'em andamento'
                : challenge.status === 'upcoming'
                  ? 'começa em breve'
                  : 'encerrado'}{' '}
              · {challenge.participantCount} participante(s)
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              De {new Date(challenge.startsAt).toLocaleString('pt-BR')} até{' '}
              {new Date(challenge.endsAt).toLocaleString('pt-BR')}
            </p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={toggleJoin}
                className="px-4 py-2 rounded-xl bg-[#8257E5] hover:bg-[#6f46cc] text-white text-sm font-bold"
              >
                {challenge.joined ? 'Sair do desafio' : 'Participar (opt-in)'}
              </button>
              <Link
                href="/comunidade"
                className="px-4 py-2 rounded-xl bg-[#18181B] border border-zinc-800 text-zinc-300 text-sm font-semibold"
              >
                Discussão no fórum →
              </Link>
            </div>
            {!challenge.joined && (
              <p className="text-xs text-zinc-500 mt-3">
                Sem inscrição, você não entra no ranking — o desafio nunca inscreve ninguém
                sozinho.
              </p>
            )}
          </section>
        )}

        {challenge && ranking.length > 0 && (
          <section className="mt-6">
            <h2 className="font-bold text-white">Ranking do desafio</h2>
            <ol className="mt-3 space-y-2">
              {ranking.map((r) => (
                <li
                  key={r.userId}
                  className="flex justify-between rounded-xl border border-zinc-800 bg-[#121217] px-4 py-2 text-sm"
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

        <section className="mt-8">
          <h2 className="font-bold text-white">Minhas ligas</h2>
          {leagueError ? (
            <p className="text-sm text-zinc-400 mt-2">
              As ligas persistentes fazem parte dos planos pagos. Você ainda participa do
              desafio e do ranking da semana acima.
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
                  className="flex justify-between rounded-xl border border-zinc-800 bg-[#121217] px-4 py-2 text-sm"
                >
                  <span className="text-zinc-300">
                    Liga {l.tier} · {l.position}º de {l.participants}
                  </span>
                  <span className="font-bold text-white">{l.points} pts</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
