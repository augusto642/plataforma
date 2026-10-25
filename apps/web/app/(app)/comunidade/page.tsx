'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  createPost,
  createThread,
  flagPost,
  listOpenPeerRequests,
  listPosts,
  listSolutions,
  listThreads,
  submitPeerReview,
  type ForumPost,
  type ForumThread,
  type OpenPeerRequest,
  type Solution,
} from '../../lib/community';

/**
 * Fase 3 premium (desenho §4.2) — comunidade: fórum por projeto,
 * galeria de soluções opt-in e revisão por pares.
 * Postar/revisar é Pro/Carreira (free lê e sinaliza); moderação é
 * humana — sinalizar só coloca o post na fila admin.
 * A galeria nunca exibe testes ocultos.
 */

const RUBRIC_CRITERIA = [
  { key: 'legibilidade', label: 'Legibilidade' },
  { key: 'estrutura', label: 'Estrutura' },
  { key: 'nomes', label: 'Nomes' },
  { key: 'casosDeBorda', label: 'Casos de borda' },
];

export default function ComunidadePage() {
  const { user, isLoading } = useAuth();
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [peerRequests, setPeerRequests] = useState<OpenPeerRequest[]>([]);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [activityId, setActivityId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [postBody, setPostBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadThreads() {
    setThreads(await listThreads());
  }

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    Promise.all([
      loadThreads(),
      listOpenPeerRequests().then(setPeerRequests).catch(() => setPeerRequests([])),
    ])
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading]);

  async function openPosts(threadId: string) {
    setOpenThread(threadId);
    setPosts(await listPosts(threadId));
  }

  async function sendThread() {
    setError(null);
    try {
      await createThread(title, body);
      setTitle('');
      setBody('');
      await loadThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o tópico.');
    }
  }

  async function sendPost() {
    if (!openThread) return;
    setError(null);
    try {
      await createPost(openThread, postBody);
      setPostBody('');
      setPosts(await listPosts(openThread));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível comentar.');
    }
  }

  async function sendFlag(postId: string) {
    await flagPost(postId);
    setNotice('Post sinalizado para moderação. A decisão é humana, pela equipe.');
  }

  async function loadSolutions() {
    setError(null);
    try {
      setSolutions(await listSolutions(activityId.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar a galeria.');
    }
  }

  async function sendPeerReview(reviewId: string, form: HTMLFormElement) {
    const data = new FormData(form);
    const rubric: Record<string, { score: number; comment: string }> = {};
    for (const c of RUBRIC_CRITERIA) {
      rubric[c.key] = {
        score: Number(data.get(`score-${c.key}`)),
        comment: String(data.get(`comment-${c.key}`) ?? ''),
      };
    }
    const summary = String(data.get('summary') ?? '');
    const suggestions = String(data.get('suggestions') ?? '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    setError(null);
    try {
      await submitPeerReview(reviewId, rubric, summary, suggestions);
      setPeerRequests(await listOpenPeerRequests());
      setNotice('Revisão por pares enviada. Obrigado por ajudar a comunidade.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a revisão.');
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
          <h1 className="text-2xl font-black text-white">Comunidade</h1>
          <p className="text-sm text-zinc-400 mt-2">Faça login para participar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080B] text-[#EDEDED] px-5 py-16">
      <div className="max-w-[720px] mx-auto">
        <h1 className="text-2xl font-black text-white">Comunidade</h1>
        <p className="text-sm text-zinc-400 mt-2">
          Fórum por projeto, galeria de soluções e revisão por pares. Ler é livre;
          postar e revisar fazem parte dos planos pagos. Conteúdo sinalizado vai para
          moderação humana — ninguém é bloqueado automaticamente.
        </p>
        {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
        {notice && <p className="text-sm text-emerald-400 mt-4">{notice}</p>}

        <section className="mt-6">
          <h2 className="font-bold text-white">Fórum</h2>
          <div className="mt-3 space-y-2">
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => openPosts(t.id)}
                className="w-full text-left rounded-xl border border-zinc-800 bg-[#121217] px-4 py-3"
              >
                <span className="block font-semibold text-white text-sm">{t.title}</span>
                <span className="block text-xs text-zinc-500 mt-1">
                  por {t.author.name} · {t._count.posts} comentário(s)
                </span>
              </button>
            ))}
            {threads.length === 0 && (
              <p className="text-sm text-zinc-400">
                Nenhum tópico ainda — o primeiro nasce junto com o desafio da semana.
              </p>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-zinc-800 bg-[#121217] p-4 space-y-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do tópico"
              className="w-full rounded-lg bg-[#18181B] border border-zinc-800 px-3 py-2 text-sm text-white"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="O que você quer discutir?"
              className="w-full rounded-lg bg-[#18181B] border border-zinc-800 px-3 py-2 text-sm text-white"
            />
            <button
              onClick={sendThread}
              className="px-4 py-2 rounded-xl bg-[#8257E5] hover:bg-[#6f46cc] text-white text-sm font-bold"
            >
              Criar tópico
            </button>
          </div>

          {openThread && (
            <div className="mt-4 rounded-xl border border-zinc-800 bg-[#121217] p-4">
              <h3 className="font-semibold text-white text-sm">Comentários</h3>
              <ul className="mt-3 space-y-3">
                {posts.map((p) => (
                  <li key={p.id} className="text-sm">
                    <span className="text-zinc-300">{p.body}</span>
                    <span className="text-zinc-500"> — {p.author.name}</span>
                    <button
                      onClick={() => sendFlag(p.id)}
                      className="ml-3 text-xs text-zinc-500 underline"
                    >
                      Sinalizar
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 mt-4">
                <input
                  value={postBody}
                  onChange={(e) => setPostBody(e.target.value)}
                  placeholder="Escreva um comentário…"
                  className="flex-1 rounded-lg bg-[#18181B] border border-zinc-800 px-3 py-2 text-sm text-white"
                />
                <button
                  onClick={sendPost}
                  className="px-4 py-2 rounded-xl bg-[#8257E5] hover:bg-[#6f46cc] text-white text-sm font-bold"
                >
                  Comentar
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="font-bold text-white">Revisões por pares em aberto</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Colegas que pediram revisão do código. Revisar rende reputação — a partir de 5
            revisões concluídas, você ganha o badge de revisor da comunidade.
          </p>
          <div className="mt-3 space-y-4">
            {peerRequests.map((r) => (
              <form
                key={r.reviewId}
                className="rounded-xl border border-zinc-800 bg-[#121217] p-4 space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendPeerReview(r.reviewId, e.currentTarget);
                }}
              >
                <p className="text-sm font-semibold text-white">
                  {r.activity.title} · por {r.author.name}
                </p>
                <pre className="text-xs text-zinc-300 bg-[#18181B] rounded-lg p-3 overflow-x-auto">
                  {r.codeSnapshot ?? '(sem código)'}
                </pre>
                {RUBRIC_CRITERIA.map((c) => (
                  <div key={c.key} className="flex gap-2 items-center">
                    <label className="text-xs text-zinc-400 w-28">{c.label}</label>
                    <select
                      name={`score-${c.key}`}
                      defaultValue={3}
                      className="rounded-lg bg-[#18181B] border border-zinc-800 px-2 py-1 text-sm text-white"
                    >
                      {[0, 1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <input
                      name={`comment-${c.key}`}
                      placeholder="Comentário"
                      className="flex-1 rounded-lg bg-[#18181B] border border-zinc-800 px-2 py-1 text-sm text-white"
                    />
                  </div>
                ))}
                <input
                  name="summary"
                  placeholder="Resumo da revisão"
                  className="w-full rounded-lg bg-[#18181B] border border-zinc-800 px-3 py-2 text-sm text-white"
                />
                <textarea
                  name="suggestions"
                  placeholder="Sugestões, uma por linha"
                  className="w-full rounded-lg bg-[#18181B] border border-zinc-800 px-3 py-2 text-sm text-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#8257E5] hover:bg-[#6f46cc] text-white text-sm font-bold"
                >
                  Enviar revisão
                </button>
              </form>
            ))}
            {peerRequests.length === 0 && (
              <p className="text-sm text-zinc-400 mt-2">Nenhum pedido aberto no momento.</p>
            )}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-bold text-white">Galeria de soluções</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Só soluções aprovadas, compartilhadas pelo próprio autor. Informe o ID da
            atividade para ver a galeria dela.
          </p>
          <div className="flex gap-2 mt-3">
            <input
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
              placeholder="ID da atividade"
              className="flex-1 rounded-lg bg-[#18181B] border border-zinc-800 px-3 py-2 text-sm text-white"
            />
            <button
              onClick={loadSolutions}
              className="px-4 py-2 rounded-xl bg-[#8257E5] hover:bg-[#6f46cc] text-white text-sm font-bold"
            >
              Ver galeria
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {solutions.map((s) => (
              <div
                key={s.shareId}
                className="rounded-xl border border-zinc-800 bg-[#121217] p-4"
              >
                <p className="text-sm text-zinc-400">
                  por {s.author.name} · nota {s.score ?? '—'}
                </p>
                <pre className="text-xs text-zinc-300 bg-[#18181B] rounded-lg p-3 mt-2 overflow-x-auto">
                  {s.codeSnapshot ?? '(sem código)'}
                </pre>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
