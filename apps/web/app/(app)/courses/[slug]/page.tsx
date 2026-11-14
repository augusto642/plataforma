'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from '../../../components/Logo';
import { StudentSidebar } from '../../../components/StudentSidebar';
import { StudentHeader } from '../../../components/StudentHeader';
import { useSidebar } from '../../../context/SidebarContext';
import { apiFetch, API_BASE } from '../../../lib/apiClient';
import { track } from '../../../lib/analytics';
import {
  mapApiCoursePath,
  moduleStatusLabel,
  type CoursePathView,
} from '../utils';

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
  // Rodada 3 (R9) — payload da geração incremental (DESIGN §I1): só
  // existe em atividades semeadas de segmentos; ausente = atividade
  // fora de segmento (catálogo antigo), exibida sem selo, sem inventar.
  lessonPayload?: {
    segment?: { trackSlug?: string; stageSlug?: string; segmentVersion?: number };
    activityKind?: string;
    techVersions?: Record<string, { version: string | null; status?: string }>;
    kmsEntries?: Array<{ slug?: string; version?: number }>;
    marketSkills?: Array<{ skill?: string; sampleSize?: number }>;
  } | null;
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

// Rodada 3 (R9) — agrupamento por segmento incremental a partir do
// lessonPayload. Atividades sem segmento formam o grupo "sem segmento".
// O selo de cada grupo usa SÓ o que o payload sustenta: versões
// resolvidas (techVersions) e skills de mercado com amostra válida —
// sem data de coleta no payload, sem data inventada; sem endpoint de
// geração para o aluno (R12/Q13), o botão de próximos passos apenas
// recarrega o curso e explica o estado honesto.
interface SegmentGroup {
  key: string;
  stageSlug: string | null;
  segmentVersion: number | null;
  activities: ApiActivity[];
  techVersions: Record<string, { version: string | null; status?: string }>;
  marketSkills: Array<{ skill?: string; sampleSize?: number }>;
}

function groupActivities(activities: ApiActivity[]): SegmentGroup[] {
  const groups: SegmentGroup[] = [];
  const byKey = new Map<string, SegmentGroup>();
  for (const activity of activities) {
    const seg = activity.lessonPayload?.segment;
    const key = seg?.stageSlug ?? '__none__';
    let group = byKey.get(key);
    if (!group) {
      group = {
        key,
        stageSlug: seg?.stageSlug ?? null,
        segmentVersion: seg?.segmentVersion ?? null,
        activities: [],
        techVersions: {},
        marketSkills: [],
      };
      byKey.set(key, group);
      groups.push(group);
    }
    group.activities.push(activity);
    Object.assign(group.techVersions, activity.lessonPayload?.techVersions ?? {});
    for (const skill of activity.lessonPayload?.marketSkills ?? []) {
      if (!group.marketSkills.some((s) => s.skill === skill.skill)) group.marketSkills.push(skill);
    }
  }
  return groups;
}

export default function CourseDetailPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const { isCollapsed } = useSidebar();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  // Sprint 21 — caminho de adaptação do aluno neste curso (módulos,
  // test-out, próximo passo). null = sem camada de adaptação exibida
  // (visitante sem sessão, curso sem espinha ou API indisponível).
  const [path, setPath] = useState<CoursePathView | null>(null);

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    setPath(null);
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

      // O caminho é um enriquecimento: qualquer falha aqui (sem sessão,
      // endpoint indisponível) apenas deixa a camada de fora.
      try {
        const pathRes = await apiFetch(
          `${API_BASE}/adaptation/courses/${match.id}/path`,
        );
        if (pathRes.ok) {
          setPath(mapApiCoursePath(await pathRes.json()));
        } else {
          setPath(null);
        }
      } catch {
        setPath(null);
      }
    } catch {
      setState({ kind: 'error', message: 'Erro de conexão com o servidor.' });
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  return (
    <div className="min-h-screen bg-[#07090E] text-[#F1F5F9] font-sans antialiased flex selection:bg-[#8257E5] selection:text-white">
      {/* Sidebar Lateral Retrátil Oficial */}
      <StudentSidebar />

      {/* Conteúdo com Largura Dinâmica */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          isCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        <StudentHeader
          title={state.kind === 'ready' ? state.course.title : 'Detalhes do Curso'}
          subtitle={state.kind === 'ready' ? `Curso • ${state.course.slug}` : 'Ementa Técnica'}
          actions={
            <Link
              href="/courses"
              className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121624] border border-[#1C2338] hover:border-[#8257E5] transition-colors"
            >
              ← Voltar aos Cursos
            </Link>
          }
        />

        <main className="max-w-[1240px] w-full mx-auto px-5 lg:px-8 py-8 space-y-8 flex-1">
        {state.kind === 'loading' && (
          <div className="bg-[#0C0F17] border border-[#1C2338] rounded-2xl p-8">
            <p className="text-sm text-zinc-400">Carregando os dados reais do curso…</p>
          </div>
        )}

        {state.kind === 'auth-error' && (
          <div className="bg-[#0C0F17] border border-[#1C2338] rounded-2xl p-8 space-y-4">
            <h1 className="text-xl font-bold text-white font-heading">
              Acesso aos módulos reservado para alunos inscritos
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
              Os laboratórios práticos e testes automatizados deste curso exigem uma sessão ativa de aluno.
              Entre na sua conta ou cadastre-se gratuitamente para começar agora.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="px-5 py-2.5 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white font-bold text-xs transition-all"
              >
                Entrar na Conta
              </Link>
              <Link
                href="/register"
                className="px-5 py-2.5 rounded-xl bg-[#121624] border border-[#1C2338] hover:border-[#8257E5] text-white font-bold text-xs transition-all"
              >
                Cadastrar Gratuitamente
              </Link>
            </div>
          </div>
        )}

        {state.kind === 'not-found' && (
          <div className="bg-[#0C0F17] border border-[#1C2338] rounded-2xl p-8 space-y-3">
            <h1 className="text-xl font-bold text-white font-heading">Curso não encontrado</h1>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
              Não existe um curso com o endereço “{slug}” no catálogo atual da plataforma.
            </p>
            <Link
              href="/courses"
              className="inline-block px-5 py-2.5 rounded-xl bg-[#121624] border border-[#1C2338] hover:border-[#8257E5] text-white font-bold text-xs transition-all"
            >
              Ver o catálogo de cursos
            </Link>
          </div>
        )}

        {state.kind === 'error' && (
          <div className="bg-[#0C0F17] border border-[#1C2338] rounded-2xl p-8 space-y-4">
            <h1 className="text-xl font-bold text-white font-heading">
              Não foi possível carregar o curso
            </h1>
            <p className="text-sm text-zinc-400">{state.message}</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="px-5 py-2.5 rounded-xl bg-[#121624] border border-[#1C2338] hover:border-[#8257E5] text-white font-bold text-xs transition-all cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {state.kind === 'ready' && (
          <>
            {/* Hero com os dados reais do curso */}
            <div className="bg-[#0C0F17] border border-[#1C2338] rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-xl">
              <div className="flex flex-wrap items-center gap-2.5 mb-4 relative">
                <span className="text-xs font-mono font-bold bg-[#121624] text-[#A379FF] border border-[#8257E5]/40 px-3 py-1 rounded-full">
                  CURSO · {state.course.slug}
                </span>
                <span className="text-xs font-mono bg-[#121624] text-zinc-300 border border-[#1C2338] px-2.5 py-1 rounded-full font-semibold">
                  {(state.course.activities?.length ?? state.course._count?.activities ?? 0)} atividades
                </span>
                <span className="text-xs font-mono bg-[#121624] text-zinc-300 border border-[#1C2338] px-2.5 py-1 rounded-full font-semibold">
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

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-4 border-t border-[#1C2338] relative">
                {state.course.instructor ? (
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#8257E5] to-[#00E5FF] p-[1.5px] shrink-0">
                      <div className="w-full h-full bg-[#121624] rounded-[10px] flex items-center justify-center font-mono font-black text-sm text-white">
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

            {/* Sprint 21 — caminho do aluno: o próximo passo é o da
                derivação de adaptação (não a ordem linear crua) e cada
                módulo mostra seu estado real, com o desafio de entrada
                (test-out) para quem já domina o conteúdo. */}
            {path && path.nextActivity && (
              <div className="bg-[#0C0F17] border border-[#04D361]/40 rounded-2xl p-6 md:p-8 shadow-sm">
                <p className="text-[11px] font-mono font-bold tracking-widest text-[#04D361] mb-2">
                  SEU PRÓXIMO PASSO
                </p>
                <h2 className="text-lg font-bold text-white font-heading">
                  {path.nextActivity.title}
                </h2>
                {path.nextActivity.moduleTag && (
                  <p className="text-xs text-zinc-400 mt-1">
                    Módulo:{' '}
                    {path.modules.find((m) => m.tag === path.nextActivity?.moduleTag)
                      ?.title ?? path.nextActivity.moduleTag}
                  </p>
                )}
                <Link
                  href={`/ide?course=${state.course.id}&activity=${path.nextActivity.id}`}
                  className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00B37E] to-[#04D361] text-[#08080B] font-black text-xs transition-all shadow-sm"
                >
                  Continuar na IDE →
                </Link>
              </div>
            )}

            {path && path.isSyntaxTrack && path.modules.length > 0 && (
              <div className="bg-[#0C0F17] border border-[#1C2338] rounded-2xl p-6 md:p-8 shadow-sm">
                <h2 className="text-base font-bold text-white font-heading mb-1">
                  Módulos da trilha
                </h2>
                <p className="text-xs text-zinc-400 mb-5">
                  Seu estado real em cada módulo da espinha de conceitos. Quem já
                  domina um módulo pode provar pelo desafio de entrada
                  (test-out) e seguir direto para o próximo.
                </p>
                <ol className="space-y-3">
                  {path.modules.map((mod) => (
                    <li
                      key={mod.tag}
                      className="flex flex-wrap items-center gap-3 bg-[#121624] border border-[#1C2338] rounded-xl p-4"
                    >
                      <span className="text-xs font-mono font-black text-[#00E5FF] bg-[#00E5FF]/10 border border-[#00E5FF]/30 rounded-lg px-2 py-1 shrink-0">
                        {String(mod.order).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white">{mod.title}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {mod.effectiveCompletedActivities} de {mod.totalActivities}{' '}
                          atividades concluídas
                        </p>
                      </div>
                      <span
                        className={`ml-auto shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          mod.status === 'completed' || mod.status === 'tested-out'
                            ? 'bg-[#04D361]/10 text-[#04D361] border-[#04D361]/30'
                            : mod.status === 'in-progress'
                              ? 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30'
                              : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                        }`}
                      >
                        {moduleStatusLabel(mod.status)}
                      </span>
                      {mod.testOutActivity &&
                        mod.totalActivities > 1 &&
                        mod.status !== 'completed' &&
                        mod.status !== 'tested-out' && (
                          <Link
                            href={`/ide?course=${state.course.id}&activity=${mod.testOutActivity.id}`}
                            onClick={() =>
                              track('test_out_started', undefined, {
                                courseSlug: state.course.slug,
                                moduleTag: mod.tag,
                              })
                            }
                            className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[#8257E5]/15 border border-[#8257E5]/40 text-[#B79CFF] hover:bg-[#8257E5]/25 transition-colors"
                          >
                            ⚡ Provar domínio (test-out)
                          </Link>
                        )}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Atividades reais do curso */}
            <div className="bg-[#0C0F17] border border-[#1C2338] rounded-2xl p-6 md:p-8 shadow-sm">
              <h2 className="text-base font-bold text-white font-heading mb-1">
                Atividades do curso
              </h2>
              <p className="text-xs text-zinc-400 mb-5">
                Lista real de atividades cadastradas neste curso, na ordem do currículo.
              </p>

              {(!state.course.activities || state.course.activities.length === 0) && (
                <p className="text-xs text-zinc-400 bg-[#121624] border border-[#1C2338] rounded-xl p-4">
                  Este curso ainda não tem atividades publicadas.
                </p>
              )}

              <div className="mb-5 rounded-xl border border-[#1C2338] bg-[#121624] p-4">
                <p className="text-sm font-bold text-white">Próximos passos</p>
                <p className="text-xs text-zinc-400 leading-relaxed mt-1">
                  Segmentos em revisão (draft) ainda não são jogáveis e não aparecem aqui; o próximo segmento só entra
                  quando aprovado por um admin. O botão abaixo recarrega o curso para mostrar atividades aprovadas.
                </p>
                <button
                  type="button"
                  onClick={() => setReloadKey((k) => k + 1)}
                  className="mt-3 rounded-lg bg-[#8257E5]/15 border border-[#8257E5]/40 text-[#A379FF] hover:bg-[#8257E5]/25 px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
                >
                  Verificar novos segmentos
                </button>
              </div>

              {groupActivities(
                (state.course.activities ?? []).slice().sort((a, b) => a.order - b.order),
              ).map((group) => (
                <div key={group.key} className="mb-6">
                  <div className="flex flex-wrap items-baseline gap-2 mb-3">
                    <h3 className="text-sm font-bold text-white">
                      {group.stageSlug ? `Segmento: ${group.stageSlug}` : 'Atividades sem segmento'}
                    </h3>
                    {group.segmentVersion !== null && (
                      <span className="text-[10px] font-mono text-zinc-400">v{group.segmentVersion}</span>
                    )}
                    {Object.entries(group.techVersions).map(([tech, v]) => (
                      <span key={tech} className="text-[10px] font-mono text-zinc-400">
                        {tech} {v.version ?? 'não confirmada'}
                        {v.status === 'unconfirmed' ? ' (não confirmada)' : ''}
                      </span>
                    ))}
                    {group.marketSkills.length > 0 && (
                      <span className="text-[10px] font-mono text-zinc-400">
                        mercado: {group.marketSkills.map((s) => `${s.skill} (n=${s.sampleSize ?? 0})`).join(', ')}
                      </span>
                    )}
                  </div>
                  <ol className="space-y-3">
                    {group.activities.map((activity, index) => (
                      <li
                        key={activity.id}
                        className="flex items-start gap-4 bg-[#121624] border border-[#1C2338] rounded-xl p-4"
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
                          <span className="ml-auto shrink-0 text-[10px] font-mono uppercase bg-[#0C0F17] text-zinc-300 border border-[#1C2338] px-2 py-0.5 rounded">
                            {activity.language}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
      </div>
    </div>
  );
}
