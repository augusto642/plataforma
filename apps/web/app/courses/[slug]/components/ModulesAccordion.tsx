'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DetailedCourseModule, CourseLesson } from '../types';

interface ModulesAccordionProps {
  modules: DetailedCourseModule[];
  courseSlug: string;
}

export const ModulesAccordion: React.FC<ModulesAccordionProps> = ({ modules, courseSlug }) => {
  // Default first 2 modules open
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({
    [modules[0]?.id || '']: true,
    [modules[1]?.id || '']: true,
  });

  const toggleModule = (id: string) => {
    setOpenModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderLessonTypeIcon = (type: CourseLesson['type']) => {
    switch (type) {
      case 'git_challenge':
        return <span title="Desafio de Código Git">💻</span>;
      case 'quiz':
        return <span title="Quiz Conceitual & Big-O">🧠</span>;
      case 'lab':
        return <span title="Laboratório Prático">🛠️</span>;
      case 'project':
        return <span title="Projeto Integrador">📦</span>;
    }
  };

  const renderLessonStatusBadge = (status: CourseLesson['status']) => {
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#04D361] bg-[#04D361]/10 px-2 py-0.5 rounded border border-[#04D361]/30">
          ✓ Concluído
        </span>
      );
    }
    if (status === 'in_progress') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#00E5FF] bg-[#00E5FF]/10 px-2 py-0.5 rounded border border-[#00E5FF]/30 animate-pulse">
          ● Em Andamento
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-500 bg-zinc-800/60 px-2 py-0.5 rounded border border-zinc-700">
        🔒 Bloqueado
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold font-heading text-white flex items-center gap-2">
          <span>📚</span>
          <span>Grade Curricular &amp; Desafios Práticos</span>
        </h2>
        <span className="text-xs font-mono text-zinc-400">
          {modules.reduce((acc, m) => acc + m.lessons.length, 0)} Atividades • {modules.length} Módulos
        </span>
      </div>

      {modules.map((mod) => {
        const isOpen = !!openModules[mod.id];
        const isAllDone = mod.completedCount === mod.lessons.length && mod.lessons.length > 0;

        return (
          <div
            key={mod.id}
            className="bg-[#121217] border border-[#27272A] rounded-2xl overflow-hidden transition-all shadow-md"
          >
            {/* Accordion Header */}
            <button
              type="button"
              onClick={() => toggleModule(mod.id)}
              className="w-full p-5 text-left flex items-start sm:items-center justify-between gap-4 hover:bg-[#181820]/60 transition-colors cursor-pointer"
            >
              <div className="flex items-start sm:items-center gap-3.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black text-xs shrink-0 border ${
                    isAllDone
                      ? 'bg-[#04D361]/15 text-[#04D361] border-[#04D361]/40'
                      : 'bg-[#181820] text-[#996DFF] border-[#8257E5]/40'
                  }`}
                >
                  {isAllDone ? '✓' : `0${mod.moduleNumber}`}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white font-heading">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 max-w-xl">{mod.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:flex flex-col items-end text-xs font-mono">
                  <span className="font-bold text-[#04D361]">+{mod.xpTotal} XP</span>
                  <span className="text-zinc-500 text-[10px]">
                    {mod.completedCount}/{mod.lessons.length} Concluídos
                  </span>
                </div>
                <span className="text-zinc-400 text-sm">{isOpen ? '▲' : '▼'}</span>
              </div>
            </button>

            {/* Accordion Lessons Content */}
            {isOpen && (
              <div className="border-t border-[#27272A] bg-[#0E0E12] divide-y divide-[#27272A]/40">
                {mod.lessons.map((lesson, lIdx) => {
                  const isLocked = lesson.status === 'locked';

                  return (
                    <div
                      key={lesson.id}
                      className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        lesson.status === 'in_progress'
                          ? 'bg-[#8257E5]/5 border-l-2 border-l-[#00E5FF]'
                          : 'hover:bg-[#121217]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">{renderLessonTypeIcon(lesson.type)}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{lesson.title}</span>
                            {renderLessonStatusBadge(lesson.status)}
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                            {lesson.description}
                          </p>
                          {lesson.targetFile && (
                            <span className="inline-block mt-1 font-mono text-[10px] text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                              📄 {lesson.targetFile}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center font-mono shrink-0">
                        <span className="text-[11px] text-zinc-400">{lesson.duration}</span>
                        <span className="text-[11px] font-bold text-[#996DFF]">+{lesson.xp} XP</span>

                        {isLocked ? (
                          <button
                            type="button"
                            disabled
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-500 text-xs font-semibold cursor-not-allowed"
                          >
                            Bloqueado
                          </button>
                        ) : (
                          <Link
                            href={`/ide?course=${courseSlug}&lesson=${lesson.id}`}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              lesson.status === 'in_progress'
                                ? 'bg-[#00E5FF] hover:bg-[#00B4D8] text-black shadow-md shadow-[#00E5FF]/20'
                                : 'bg-[#181820] hover:bg-[#202028] text-white border border-[#27272A]'
                            }`}
                          >
                            {lesson.status === 'completed' ? 'Revisar' : 'Resolver'} →
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
