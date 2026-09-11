'use client';

import React, { useState } from 'react';
import { CourseAdminItem, AdminChallengeItem, DifficultyLevel, CourseStatus } from '../types';

interface AdminCoursesTabProps {
  courses: CourseAdminItem[];
  onCreateChallenge: (courseId: string, challenge: Omit<AdminChallengeItem, 'id' | 'activeSubmissions' | 'passRate'>) => void;
  onToggleCourseStatus: (courseId: string, status: CourseStatus) => void;
}

export const AdminCoursesTab: React.FC<AdminCoursesTabProps> = ({
  courses,
  onCreateChallenge,
  onToggleCourseStatus,
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(courses[0]?.id || null);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);

  // New Challenge Form States
  const [targetCourseId, setTargetCourseId] = useState<string>(courses[0]?.id || '');
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeLang, setChallengeLang] = useState('rust');
  const [challengeDiff, setChallengeDiff] = useState<DifficultyLevel>('medium');
  const [cpuLimit, setCpuLimit] = useState<number>(1000);
  const [ramLimit, setRamLimit] = useState<number>(128);
  const [codeTemplate, setCodeTemplate] = useState(`// Implemente a solução de alta performance abaixo
pub fn solve(input: &[u8]) -> Vec<u8> {
    todo!()
}`);
  const [testCases, setTestCases] = useState<
    { id: string; input: string; expectedOutput: string; isHidden: boolean }[]
  >([
    { id: '1', input: 'sample_input_1', expectedOutput: 'expected_output_1', isHidden: false },
    { id: '2', input: 'edge_case_stress_10k', expectedOutput: 'valid_checksum', isHidden: true },
  ]);

  const handleAddTestCase = () => {
    setTestCases([
      ...testCases,
      {
        id: String(Date.now()),
        input: '',
        expectedOutput: '',
        isHidden: true,
      },
    ]);
  };

  const handleRemoveTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const handleUpdateTestCase = (index: number, field: string, val: string | boolean) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], [field]: val };
    setTestCases(updated);
  };

  const handleSubmitChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeTitle.trim() || !targetCourseId) return;

    const hiddenCount = testCases.filter((tc) => tc.isHidden).length;

    onCreateChallenge(targetCourseId, {
      title: challengeTitle.trim(),
      language: challengeLang,
      difficulty: challengeDiff,
      cpuLimitMs: cpuLimit,
      ramLimitMb: ramLimit,
      codeTemplate,
      hiddenTestsCount: hiddenCount,
      testCases,
    });

    // Reset Form
    setChallengeTitle('');
    setIsChallengeModalOpen(false);
  };

  const getDifficultyBadge = (diff: DifficultyLevel) => {
    switch (diff) {
      case 'easy':
        return (
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#04D361]/15 text-[#04D361] border border-[#04D361]/30">
            FÁCIL
          </span>
        );
      case 'medium':
        return (
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FFA116]/15 text-[#FFA116] border border-[#FFA116]/30">
            MÉDIO
          </span>
        );
      case 'hard':
        return (
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/30">
            HARDCORE
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header with Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading tracking-tight">
            Gestão de Trilhas & Desafios Técnicos
          </h1>
          <p className="text-xs text-[#A1A1AA]">
            Curadoria de problemas algorítmicos, templates de código, limites de CPU/RAM e testes ocultos.
          </p>
        </div>

        <button
          onClick={() => {
            setTargetCourseId(courses[0]?.id || '');
            setIsChallengeModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white text-xs font-semibold shadow-[0_0_15px_rgba(130,87,229,0.35)] transition-all self-start md:self-auto"
        >
          <span>➕</span>
          <span>Criar Novo Desafio Sandbox</span>
        </button>
      </div>

      {/* 2. Courses Accordion / List */}
      <div className="space-y-4">
        {courses.map((course) => {
          const isExpanded = expandedCourseId === course.id;

          return (
            <div
              key={course.id}
              className="rounded-2xl bg-[#121217] border border-[#27272A] overflow-hidden transition-all duration-300"
            >
              {/* Course Header Banner */}
              <div
                onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-[#181820]/60 transition-colors"
              >
                <div className="flex items-start md:items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#181820] border border-[#27272A] flex items-center justify-center text-lg shrink-0">
                    {course.language === 'Rust' ? '🦀' : course.language === 'Go' ? '🦫' : course.language === 'TypeScript' ? '🔷' : '⚡'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white font-heading">{course.title}</h3>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          course.status === 'published'
                            ? 'bg-[#04D361]/15 text-[#04D361] border-[#04D361]/30'
                            : 'bg-[#FFA116]/15 text-[#FFA116] border-[#FFA116]/30'
                        }`}
                      >
                        {course.status === 'published' ? 'PUBLICADO' : 'RASCUNHO'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#71717A] mt-1 font-mono">
                      <span>Linguagem: <strong className="text-[#EDEDED]">{course.language}</strong></span>
                      <span>•</span>
                      <span>Instrutor: <strong className="text-[#8257E5]">{course.instructorName}</strong></span>
                      <span>•</span>
                      <span>{course.enrolledStudents.toLocaleString('pt-BR')} alunos</span>
                    </div>
                  </div>
                </div>

                {/* Right controls */}
                <div
                  className="flex items-center gap-3 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <select
                    value={course.status}
                    onChange={(e) => onToggleCourseStatus(course.id, e.target.value as CourseStatus)}
                    className="bg-[#181820] border border-[#27272A] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none cursor-pointer"
                  >
                    <option value="published">Publicado</option>
                    <option value="draft">Rascunho</option>
                    <option value="archived">Arquivado</option>
                  </select>

                  <button
                    onClick={() => {
                      setTargetCourseId(course.id);
                      setIsChallengeModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#8257E5]/15 hover:bg-[#8257E5]/30 border border-[#8257E5]/40 text-xs font-semibold text-[#8257E5] transition-colors"
                  >
                    + Desafio
                  </button>

                  <button
                    onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                    className="p-2 text-[#71717A] hover:text-white"
                  >
                    <svg
                      className={`w-5 h-5 transform transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Challenges Drawer Content */}
              {isExpanded && (
                <div className="p-5 border-t border-[#27272A] bg-[#09090A]/40 space-y-3">
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-[#71717A] font-semibold">
                      Desafios Ativos ({course.challenges.length})
                    </span>
                    <span className="text-xs text-[#A1A1AA]">
                      Isolamento gRPC Piston com micro-sandbox ativo
                    </span>
                  </div>

                  {course.challenges.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-[#27272A] rounded-xl text-xs text-[#71717A]">
                      Nenhum desafio cadastrado nesta trilha ainda.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5">
                      {course.challenges.map((ch) => (
                        <div
                          key={ch.id}
                          className="p-4 rounded-xl bg-[#181820] border border-[#27272A] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{ch.title}</span>
                              {getDifficultyBadge(ch.difficulty)}
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#27272A] text-[#A1A1AA]">
                                {ch.language}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-[#71717A] font-mono">
                              <span>CPU: {ch.cpuLimitMs}ms</span>
                              <span>•</span>
                              <span>RAM: {ch.ramLimitMb}MB</span>
                              <span>•</span>
                              <span className="text-[#00E5FF]">🔒 {ch.hiddenTestsCount} testes ocultos</span>
                              <span>•</span>
                              <span>Submissões: {ch.activeSubmissions}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-[10px] text-[#71717A] font-mono block">Pass Rate</span>
                              <span className="font-bold text-[#04D361] font-mono">{ch.passRate}%</span>
                            </div>
                            <button
                              onClick={() => alert(`Visualizando template e testes do desafio "${ch.title}"`)}
                              className="px-3 py-1.5 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-[#EDEDED] font-mono text-xs transition-colors"
                            >
                              Inspecionar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Modal: Criar Novo Desafio */}
      {isChallengeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#121217] border border-[#8257E5]/40 rounded-2xl p-6 shadow-[0_0_40px_rgba(130,87,229,0.2)] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <h3 className="text-base font-bold text-white font-heading">
                  Novo Desafio Técnico para Sandbox
                </h3>
              </div>
              <button
                onClick={() => setIsChallengeModalOpen(false)}
                className="text-[#71717A] hover:text-white p-1 rounded-lg hover:bg-[#181820]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitChallenge} className="space-y-4 text-xs">
              {/* Target Course */}
              <div>
                <label className="block text-[#A1A1AA] mb-1 font-medium">Trilha Destino</label>
                <select
                  value={targetCourseId}
                  onChange={(e) => setTargetCourseId(e.target.value)}
                  className="w-full bg-[#181820] border border-[#27272A] focus:border-[#8257E5] rounded-xl px-3 py-2 text-white outline-none font-mono"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.language})
                    </option>
                  ))}
                </select>
              </div>

              {/* Challenge Title */}
              <div>
                <label className="block text-[#A1A1AA] mb-1 font-medium">Título do Desafio</label>
                <input
                  type="text"
                  required
                  value={challengeTitle}
                  onChange={(e) => setChallengeTitle(e.target.value)}
                  placeholder="Ex: Lockless Single-Producer Multi-Consumer Queue"
                  className="w-full bg-[#181820] border border-[#27272A] focus:border-[#8257E5] rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              {/* Lang & Diff */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A1A1AA] mb-1 font-medium">Linguagem do Sandbox</label>
                  <select
                    value={challengeLang}
                    onChange={(e) => setChallengeLang(e.target.value)}
                    className="w-full bg-[#181820] border border-[#27272A] rounded-xl px-3 py-2 text-white outline-none font-mono"
                  >
                    <option value="rust">Rust (1.78.0)</option>
                    <option value="go">Go (1.22.2)</option>
                    <option value="typescript">TypeScript (5.5)</option>
                    <option value="python">Python (3.12)</option>
                    <option value="cpp">C++ (GCC 13.2)</option>
                    <option value="solidity">Solidity (0.8.24)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#A1A1AA] mb-1 font-medium">Dificuldade</label>
                  <select
                    value={challengeDiff}
                    onChange={(e) => setChallengeDiff(e.target.value as DifficultyLevel)}
                    className="w-full bg-[#181820] border border-[#27272A] rounded-xl px-3 py-2 text-white outline-none"
                  >
                    <option value="easy">Fácil (Easy)</option>
                    <option value="medium">Médio (Medium)</option>
                    <option value="hard">Difícil / Hardcore (Hard)</option>
                  </select>
                </div>
              </div>

              {/* CPU and RAM limits */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A1A1AA] mb-1 font-medium">Limite CPU (ms)</label>
                  <input
                    type="number"
                    value={cpuLimit}
                    onChange={(e) => setCpuLimit(Number(e.target.value))}
                    className="w-full bg-[#181820] border border-[#27272A] rounded-xl px-3 py-2 text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#A1A1AA] mb-1 font-medium">Limite RAM (MB)</label>
                  <input
                    type="number"
                    value={ramLimit}
                    onChange={(e) => setRamLimit(Number(e.target.value))}
                    className="w-full bg-[#181820] border border-[#27272A] rounded-xl px-3 py-2 text-white font-mono outline-none"
                  />
                </div>
              </div>

              {/* Code Template */}
              <div>
                <label className="block text-[#A1A1AA] mb-1 font-medium">Template Inicial de Código</label>
                <textarea
                  rows={4}
                  value={codeTemplate}
                  onChange={(e) => setCodeTemplate(e.target.value)}
                  className="w-full bg-[#09090A] border border-[#27272A] focus:border-[#8257E5] rounded-xl p-3 text-white font-mono text-xs outline-none"
                />
              </div>

              {/* Test Cases Builder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[#A1A1AA] font-medium">
                    Casos de Teste & Validação de Borda
                  </label>
                  <button
                    type="button"
                    onClick={handleAddTestCase}
                    className="text-[11px] text-[#8257E5] hover:text-[#996DFF] font-semibold"
                  >
                    + Adicionar Caso de Teste
                  </button>
                </div>

                <div className="space-y-2">
                  {testCases.map((tc, idx) => (
                    <div
                      key={tc.id}
                      className="p-3 rounded-xl bg-[#181820] border border-[#27272A] grid grid-cols-1 md:grid-cols-3 gap-2 items-center"
                    >
                      <input
                        type="text"
                        placeholder="Input (stdin/args)"
                        value={tc.input}
                        onChange={(e) => handleUpdateTestCase(idx, 'input', e.target.value)}
                        className="bg-[#121217] border border-[#27272A] rounded-lg px-2 py-1 text-white font-mono text-[11px]"
                      />
                      <input
                        type="text"
                        placeholder="Expected Output"
                        value={tc.expectedOutput}
                        onChange={(e) => handleUpdateTestCase(idx, 'expectedOutput', e.target.value)}
                        className="bg-[#121217] border border-[#27272A] rounded-lg px-2 py-1 text-white font-mono text-[11px]"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-1.5 text-[11px] text-[#A1A1AA] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tc.isHidden}
                            onChange={(e) => handleUpdateTestCase(idx, 'isHidden', e.target.checked)}
                            className="accent-[#8257E5]"
                          />
                          <span>Oculto</span>
                        </label>
                        {testCases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTestCase(idx)}
                            className="text-[#F43F5E] hover:text-red-400 text-xs px-2 py-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsChallengeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#181820] hover:bg-[#202028] text-[#A1A1AA] text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white text-xs font-semibold shadow-[0_0_15px_rgba(130,87,229,0.35)]"
                >
                  Publicar Desafio no Cluster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
