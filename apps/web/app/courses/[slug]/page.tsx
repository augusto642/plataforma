'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from '../../components/Logo';
import { apiFetch, API_BASE } from '../../lib/apiClient';

// B40/A3 (Sprint 13) — detalhe de curso HONESTO, ligado à API real.
// Antes esta página era 100% estática (courseDetailsData.ts): instrutora
// fictícia ("Dra. Beatriz Vasconcelos, Lead AI Engineer @ Nexus
// Intelligence"), rating 4,97, 1.950 alunos e módulos/pré-requisitos/
// capstone inventados para cada curso. A API não tem detalhe por slug,
// mas GET /courses expõe slug/título/descrição/instrutor real e
// GET /courses/:id expõe as atividades reais e a contagem real de
// matrículas — é só isso que a página mostra agora:
//  - título e descrição reais do curso;
//  - instrutor REAL do registro (nome; sem cargo/bio inventados);
//  - nº real de atividades e de alunos matriculados (_count da API);
//  - lista real de atividades (título, descrição, linguagem, ordem).
// Campos que a API não fornece (rating, carga horária, XP total,
// progresso do visitante, módulos, capstone) foram REMOVIDOS da
// exibição em vez de inventados. Estados: carregando, requer login
// (a API de cursos não é pública), curso não encontrado e erro.

interface ApiInstructor {
  id: string;
  name: string;
  email: string;
}

interface ApiCourseListItem {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  instructor?: ApiInstructor;
  _count?: { enrollments?: number; activities?: number };
}

interface ApiActivity {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  language?: string | null;
  order: number;
}

interface ApiCourseDetail extends ApiCourseListItem {
  activities?: ApiActivity[];
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'auth-error' }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; course: ApiCourseDetail };

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function CourseDetailPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const listRes = await apiFetch(`${API_BASE}/courses`);
      if (listRes.status === 401 || listRes.status === 403) {
        setState({ kind: 'auth-error' });
        return;
      }
      if (!listRes.ok) {
        setState({ kind: 'error', message: `A API respondeu ${listRes.status}.` });
        return;
      }
      const list: ApiCourseListItem[] = await listRes.json().catch(() => []);
      const match = Array.isArray(list) ? list.find((c) => c.slug === slug) : undefined;
      if (!match) {
        setState({ kind: 'not-found' });
        return;
      }

      const detailRes = await apiFetch(`${API_BASE}/courses/${match.id}`);
      if (detailRes.status === 401 || detailRes.status === 403) {
        setState({ kind: 'auth-error' });
        return;
      }
      if (!detailRes.ok) {
        setState({ kind: 'error', message: `A API respondeu ${detailRes.status}.` });
        return;
      }
      const detail: ApiCourseDetail = await detailRes.json();
      setState({ kind: 'ready', course: detail });
    } catch {
      setState({ kind: 'error', message: 'Erro de conexão com o servidor.' });
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  return (
    <div className="min-h-screen bg-[#08080B] text-[#EDEDED] font-sans selection:bg-[#04D361] selection:text-black pb-24">
      <header className="sticky top-0 z-40 bg-[#08080B]/90 backdrop-blur-md border-b border-[#27272A] h-16">
        <div className="max-w-[1240px] mx-auto px-5 h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo size="md" href="/" />
            <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
              <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link
                href="/courses"
                className="text-white border-b-2 border-[#04D361] pb-1 font-semibold"
              >
                Cursos &amp; Trilhas
              </Link>
              <Link href="/leaderboard" className="text-zinc-400 hover:text-white transition-colors">
                Leaderboard
              </Link>
              <Link href="/ide" className="text-zinc-400 hover:text-white transition-colors">
                IDE Sandbox
              </Link>
            </nav>
          </div>
          <Link
            href="/courses"
            className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181820] border border-[#27272A]"
          >
            ← Voltar aos Cursos
          </Link>
        </div>
      </header>

      <main className="max-w-[1240px] mx-auto px-5 pt-8 space-y-8">
        {state.kind === 'loading' && (
          <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-8">
            <p className="text-sm text-zinc-400">Carregando os dados reais do curso…</p>
          </div>
        )}

        {state.kind === 'auth-error' && (
          <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-8 space-y-4">
            <h1 className="text-xl font-bold text-white font-heading">
              Detalhes do curso disponíveis para alunos conectados
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
              A API de cursos da plataforma exige uma sessão ativa, por isso o detalhe deste curso
              não é exibido publicamente. Entre na sua conta ou crie uma para ver o conteúdo real
              do curso — nenhum dado de exemplo é mostrado aqui.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="px-5 py-2.5 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white font-bold text-xs transition-all"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="px-5 py-2.5 rounded-xl bg-[#181820] border border-[#27272A] hover:border-zinc-500 text-white font-bold text-xs transition-all"
              >
                Criar conta
              </Link>
            </div>
          </div>
        )}

        {state.kind === 'not-found' && (
          <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-8 space-y-3">
            <h1 className="text-xl font-bold text-white font-heading">Curso não encontrado</h1>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
              Não existe um curso com o endereço “{slug}” no catálogo atual da plataforma.
            </p>
            <Link
              href="/courses"
              className="inline-block px-5 py-2.5 rounded-xl bg-[#181820] border border-[#27272A] hover:border-zinc-500 text-white font-bold text-xs transition-all"
            >
              Ver o catálogo de cursos
            </Link>
          </div>
        )}

        {state.kind === 'error' && (
          <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-8 space-y-4">
            <h1 className="text-xl font-bold text-white font-heading">
              Não foi possível carregar o curso
            </h1>
            <p className="text-sm text-zinc-400">{state.message}</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="px-5 py-2.5 rounded-xl bg-[#181820] border border-[#27272A] hover:border-zinc-500 text-white font-bold text-xs transition-all cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {state.kind === 'ready' && (
          <>
            {/* Hero com os dados reais do curso */}
            <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
              <div className="absolute right-0 top-0 w-96 h-96 bg-[#8257E5]/15 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-wrap items-center gap-2.5 mb-4 relative">
                <span className="text-xs font-mono font-bold bg-[#8257E5]/15 text-[#996DFF] border border-[#8257E5]/30 px-3 py-1 rounded-full">
                  CURSO · {state.course.slug}
                </span>
                <span className="text-xs font-mono bg-zinc-800 text-zinc-300 border border-zinc-700 px-2.5 py-1 rounded-full font-semibold">
                  {(state.course.activities?.length ?? state.course._count?.activities ?? 0)} atividades
                </span>
                <span className="text-xs font-mono bg-zinc-800 text-zinc-300 border border-zinc-700 px-2.5 py-1 rounded-full font-semibold">
                  {(state.course._count?.enrollments ?? 0).toLocaleString('pt-BR')} alunos matriculados
                </span>
              </div>

              <div className="max-w-3xl mb-6 relative">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-heading text-white tracking-tight leading-tight mb-3">
                  {state.course.title}
                </h1>
                <p className="text-sm sm:text-[15px] text-zinc-300 leading-relaxed">
                  {state.course.description || 'Este curso ainda não tem uma descrição cadastrada.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-4 border-t border-[#27272A] relative">
                {state.course.instructor ? (
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#8257E5] to-[#00E5FF] p-[1.5px] shrink-0">
                      <div className="w-full h-full bg-[#181820] rounded-[10px] flex items-center justify-center font-mono font-black text-sm text-white">
                        {initialsOf(state.course.instructor.name)}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {state.course.instructor.name}
                        </span>
                        <span className="text-[10px] font-mono bg-[#8257E5]/15 text-[#996DFF] px-1.5 py-0.2 rounded border border-[#8257E5]/30">
                          INSTRUTOR
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">Instrutor responsável pelo curso</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400">Instrutor não informado para este curso.</p>
                )}

                <Link
                  href="/ide"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00B37E] to-[#04D361] hover:from-[#00875F] hover:to-[#00B37E] text-[#08080B] font-black text-xs transition-all shadow-lg shadow-[#04D361]/25 flex items-center justify-center gap-2"
                >
                  <span>⚡</span>
                  <span>Praticar na IDE</span>
                </Link>
              </div>
            </div>

            {/* Atividades reais do curso */}
            <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6 md:p-8">
              <h2 className="text-base font-bold text-white font-heading mb-1">
                Atividades do curso
              </h2>
              <p className="text-xs text-zinc-400 mb-5">
                Lista real de atividades cadastradas neste curso, na ordem do currículo.
              </p>

              {(!state.course.activities || state.course.activities.length === 0) && (
                <p className="text-xs text-zinc-400 bg-[#181820] border border-[#27272A] rounded-xl p-4">
                  Este curso ainda não tem atividades publicadas.
                </p>
              )}

              <ol className="space-y-3">
                {(state.course.activities ?? [])
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((activity, index) => (
                    <li
                      key={activity.id}
                      className="flex items-start gap-4 bg-[#181820] border border-[#27272A] rounded-xl p-4"
                    >
                      <span className="text-xs font-mono font-black text-[#00E5FF] bg-[#00E5FF]/10 border border-[#00E5FF]/30 rounded-lg px-2 py-1 shrink-0">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white">{activity.title}</p>
                        {activity.description && (
                          <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">
                            {activity.description}
                          </p>
                        )}
                      </div>
                      {activity.language && (
                        <span className="ml-auto shrink-0 text-[10px] font-mono uppercase bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded">
                          {activity.language}
                        </span>
                      )}
                    </li>
                  ))}
              </ol>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
