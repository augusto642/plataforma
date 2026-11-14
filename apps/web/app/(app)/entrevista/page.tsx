'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { MaterialIcon } from '../../components/MaterialIcon';
import { StudentSidebar } from '../../components/StudentSidebar';
import { StudentHeader } from '../../components/StudentHeader';
import { useSidebar } from '../../context/SidebarContext';
import {
  createInterviewSession,
  listInterviewSessions,
  type InterviewSession,
} from '../../lib/interview';

export default function EntrevistaPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { isCollapsed } = useSidebar();
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [mode, setMode] = useState<'technical' | 'behavioral'>('technical');
  const [track, setTrack] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    listInterviewSessions()
      .then(setSessions)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  async function start() {
    setError(null);
    setCreating(true);
    try {
      const session = await createInterviewSession(mode, track.trim() || undefined);
      router.push(`/entrevista/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível iniciar a sessão.');
      setCreating(false);
    }
  }

  const active = sessions.find((s) => s.status === 'active');

  return (
    <div className="min-h-screen bg-[#07080C] text-[#F1F5F9] font-sans antialiased flex selection:bg-[#8257E5] selection:text-white">
      {/* Ambient Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[320px] bg-gradient-to-b from-[#8257E5]/12 via-[#00E5FF]/6 to-transparent blur-[140px] pointer-events-none -z-10" />

      {/* Sidebar Lateral Oficial com Suporte a Retrair */}
      <StudentSidebar />

      {/* Área de Conteúdo à Direita com Largura Dinâmica */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          isCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        {/* Header Superior */}
        <StudentHeader
          title="Simulador de Entrevista"
          subtitle="Avaliação Algorítmica Big-O & Rubricas STAR"
        />

        {/* Conteúdo Principal */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-5 lg:px-10 py-8 space-y-8">
          {/* Apresentação do Recurso */}
          <div className="pb-6 border-b border-[#1C2133]">
            <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
              <span className="px-2.5 py-0.5 rounded-full bg-[#00E5FF]/10 text-[#00E5FF] text-[10px] font-mono font-bold border border-[#00E5FF]/30">
                IA SOCRÁTICA • MENTORIA LUMI
              </span>
              <span className="text-xs text-[#94A3B8] font-mono">Rubricas Técnicas Big-O &amp; Modelo STAR</span>
            </div>
            <h1 className="font-brand text-2xl md:text-3xl text-white font-black tracking-tight">
              Simulador de Entrevista Técnica &amp; Comportamental
            </h1>
            <p className="text-sm text-[#94A3B8] mt-2 max-w-3xl leading-relaxed">
              Prepare-se para processos seletivos globais de tecnologia com o simulador socrático da Nexus Code.
              Nossa IA atua como tech lead avaliador: questiona premissas arquiteturais, audita a complexidade algorítmica Big-O e avalia clareza executiva no modelo STAR.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-[#F43F5E]/10 border border-[#F43F5E]/30 text-[#F43F5E] text-xs font-mono flex items-center gap-3">
              <MaterialIcon name="error_outline" className="text-lg shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Sessão Ativa em Destaque (se houver) */}
          {active && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-[#8257E5]/15 via-[#111420] to-[#00E5FF]/10 border border-[#8257E5]/40 shadow-[0_0_24px_rgba(130,87,229,0.2)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#04D361] animate-pulse" />
                  <span className="text-xs font-mono font-bold text-[#04D361] uppercase tracking-wide">
                    Sessão em Andamento
                  </span>
                </div>
                <h3 className="text-lg font-brand font-bold text-white">
                  Entrevista {active.mode === 'technical' ? 'Técnica' : 'Comportamental'}
                  {active.track ? ` • ${active.track}` : ''}
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  Você possui uma entrevista pausada. Finalize-a para desbloquear o relatório de avaliação e pontuação.
                </p>
              </div>

              <Link
                href={`/entrevista/${active.id}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#8257E5] to-[#7142D6] hover:from-[#996DFF] hover:to-[#8257E5] text-white text-xs font-mono font-bold transition-all shadow-[0_0_16px_rgba(130,87,229,0.4)] shrink-0"
              >
                <span>Continuar Sessão</span>
                <MaterialIcon name="arrow_forward" className="text-sm" />
              </Link>
            </div>
          )}

          {/* Seletor de Nova Sessão */}
          {!active && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Opções de Modalidade */}
              <div className="md:col-span-8 space-y-4">
                <div className="text-xs font-mono uppercase tracking-wider text-[#64748B] font-bold">
                  1. Escolha a Modalidade da Simulação
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Card Técnico */}
                  <button
                    type="button"
                    onClick={() => setMode('technical')}
                    className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      mode === 'technical'
                        ? 'bg-[#8257E5]/15 border-[#8257E5] shadow-[0_0_20px_rgba(130,87,229,0.25)]'
                        : 'bg-[#111420] border-[#1C2133] hover:border-[#8257E5]/40 hover:bg-[#181C2C]'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-[#8257E5]/20 text-[#A379FF] flex items-center justify-center">
                        <MaterialIcon name="code" className="text-2xl" />
                      </div>
                      <div>
                        <div className="font-brand font-bold text-base text-white">Etapa Algorítmica &amp; Big-O</div>
                        <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
                          Estruturas de dados, complexidade temporal e espacial Big-O, Trade-offs de memória, Clean Code e padrões de microsserviços.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#1C2133] flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[#00E5FF]">Até 20 turnos socráticos</span>
                      {mode === 'technical' ? (
                        <span className="text-[#04D361] font-bold flex items-center gap-1">
                          <MaterialIcon name="check_circle" className="text-sm" />
                          Selecionado
                        </span>
                      ) : (
                        <span className="text-[#64748B]">Clique para escolher</span>
                      )}
                    </div>
                  </button>

                  {/* Card Comportamental */}
                  <button
                    type="button"
                    onClick={() => setMode('behavioral')}
                    className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      mode === 'behavioral'
                        ? 'bg-[#8257E5]/15 border-[#8257E5] shadow-[0_0_20px_rgba(130,87,229,0.25)]'
                        : 'bg-[#111420] border-[#1C2133] hover:border-[#8257E5]/40 hover:bg-[#181C2C]'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/20 text-[#00E5FF] flex items-center justify-center">
                        <MaterialIcon name="psychology" className="text-2xl" />
                      </div>
                      <div>
                        <div className="font-brand font-bold text-base text-white">Etapa Comportamental (STAR)</div>
                        <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
                          Metodologia STAR (Situação, Tarefa, Ação e Resultado). Avaliação de liderança situacional, gestão de conflitos e comunicação de impacto.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#1C2133] flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[#00E5FF]">Rubrica de soft skills</span>
                      {mode === 'behavioral' ? (
                        <span className="text-[#04D361] font-bold flex items-center gap-1">
                          <MaterialIcon name="check_circle" className="text-sm" />
                          Selecionado
                        </span>
                      ) : (
                        <span className="text-[#64748B]">Clique para escolher</span>
                      )}
                    </div>
                  </button>
                </div>

                {/* Input de Trilha/Cargo */}
                <div className="p-5 rounded-2xl bg-[#111420] border border-[#1C2133] space-y-3">
                  <div className="text-xs font-mono uppercase tracking-wider text-[#64748B] font-bold">
                    2. Cargo ou Trilha Alvo (Opcional)
                  </div>
                  <div className="relative">
                    <MaterialIcon name="work_outline" className="text-[#64748B] text-lg absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={track}
                      onChange={(e) => setTrack(e.target.value)}
                      placeholder="ex.: Frontend React, Backend Node.js, Fullstack, Python/Django"
                      maxLength={64}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#07080C] border border-[#1C2133] focus:border-[#8257E5] focus:outline-none text-xs text-white placeholder:text-[#64748B] font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-[#64748B] font-mono">
                    A IA personalizará as perguntas técnicas de acordo com a stack que você definir.
                  </p>
                </div>
              </div>

              {/* Card Resumo & Iniciar */}
              <div className="md:col-span-4 space-y-4">
                <div className="text-xs font-mono uppercase tracking-wider text-[#64748B] font-bold">
                  3. Iniciar Simulação
                </div>

                <div className="p-6 rounded-2xl bg-[#111420] border border-[#1C2133] space-y-5">
                  <div className="space-y-3">
                    <div className="text-xs text-[#94A3B8] font-mono">Resumo da sessão:</div>
                    <div className="p-3 rounded-xl bg-[#07080C] border border-[#1C2133] space-y-2 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Modo:</span>
                        <span className="text-white font-bold capitalize">
                          {mode === 'technical' ? 'Técnica' : 'Comportamental'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Stack:</span>
                        <span className="text-[#00E5FF] font-bold">{track.trim() || 'Geral'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Avaliador:</span>
                        <span className="text-[#A379FF]">Tutora Lumi (IA)</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={start}
                    disabled={creating}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#8257E5] to-[#7142D6] hover:from-[#996DFF] hover:to-[#8257E5] text-white text-xs font-mono font-bold transition-all shadow-[0_0_20px_rgba(130,87,229,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {creating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Iniciando sessão...</span>
                      </>
                    ) : (
                      <>
                        <MaterialIcon name="play_arrow" className="text-lg" />
                        <span>Começar Entrevista Agora</span>
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-[#64748B] text-center font-mono leading-tight">
                    * Treino simulado para aprimoramento de repertório; não garante aprovação em processos externos.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Histórico de Sessões Anteriores */}
          <div className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-brand font-bold text-white flex items-center gap-2">
                <MaterialIcon name="history" className="text-lg text-[#8257E5]" />
                <span>Histórico de Simulações</span>
              </h2>
              <span className="text-xs font-mono text-[#64748B]">
                {sessions.length} {sessions.length === 1 ? 'sessão realizada' : 'sessões realizadas'}
              </span>
            </div>

            {loading ? (
              <div className="p-8 rounded-2xl bg-[#111420] border border-[#1C2133] text-center font-mono text-xs text-[#94A3B8]">
                Carregando histórico de sessões...
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-12 rounded-2xl bg-[#111420] border border-[#1C2133] text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-[#8257E5]/15 text-[#A379FF] flex items-center justify-center mx-auto">
                  <MaterialIcon name="chat_bubble_outline" className="text-2xl" />
                </div>
                <h3 className="text-sm font-brand font-bold text-white">Nenhuma entrevista realizada ainda</h3>
                <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
                  Inicie sua primeira entrevista simulada acima para exercitar suas respostas e receber feedback técnico da IA.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessions.map((s) => {
                  const candidateTurns = s.turns.filter((t) => t.role === 'candidate').length;
                  const isFinished = s.status === 'completed';

                  return (
                    <div
                      key={s.id}
                      className="p-5 rounded-2xl bg-[#111420] border border-[#1C2133] hover:border-[#8257E5]/40 transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              s.mode === 'technical'
                                ? 'bg-[#8257E5]/20 text-[#A379FF]'
                                : 'bg-[#00E5FF]/20 text-[#00E5FF]'
                            }`}
                          >
                            {s.mode === 'technical' ? 'Técnica' : 'Comportamental'}
                          </span>

                          <span
                            className={`text-[10px] font-mono flex items-center gap-1 ${
                              isFinished ? 'text-[#04D361]' : 'text-[#FFA116]'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isFinished ? 'bg-[#04D361]' : 'bg-[#FFA116] animate-pulse'
                              }`}
                            />
                            {isFinished ? 'Concluída' : 'Em andamento'}
                          </span>
                        </div>

                        <div className="font-brand font-bold text-sm text-white">
                          {s.track ? `Trilha: ${s.track}` : 'Entrevista Geral'}
                        </div>

                        <div className="text-[11px] font-mono text-[#94A3B8]">
                          {candidateTurns} {candidateTurns === 1 ? 'resposta enviada' : 'respostas enviadas'}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#1C2133]">
                        <Link
                          href={`/entrevista/${s.id}`}
                          className="w-full py-2 rounded-xl bg-[#181C2C] hover:bg-[#8257E5]/20 border border-[#1C2133] hover:border-[#8257E5]/50 text-white hover:text-[#A379FF] text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <MaterialIcon name={isFinished ? 'assessment' : 'play_arrow'} className="text-[14px]" />
                          <span>{isFinished ? 'Ver Relatório' : 'Continuar Sessão'}</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* Rodapé Minimalista */}
        <footer className="h-16 border-t border-[#1C2133] px-8 flex items-center justify-between text-xs font-mono text-[#64748B]">
          <span>© 2026 Nexus Code • Simulador de Entrevista Tech</span>
          <span>Treinamento socrático com IA</span>
        </footer>
      </div>
    </div>
  );
}
