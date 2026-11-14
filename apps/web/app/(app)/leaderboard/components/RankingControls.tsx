'use client';

import React from 'react';
import type { CourseOption } from '../types';
import { MaterialIcon } from '../../../components/MaterialIcon';

export type RankingScope = 'global' | 'course';

interface RankingControlsProps {
  mode: RankingScope;
  onModeChange: (mode: RankingScope) => void;
  courses: CourseOption[];
  selectedCourseId: string;
  onCourseChange: (courseId: string) => void;
  enrolledCourseIds: readonly string[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalParticipants: number;
}

export const RankingControls: React.FC<RankingControlsProps> = ({
  mode,
  onModeChange,
  courses,
  selectedCourseId,
  onCourseChange,
  enrolledCourseIds,
  searchQuery,
  onSearchChange,
  totalParticipants,
}) => {
  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const isEnrolledInSelected = selectedCourse ? enrolledCourseIds.includes(selectedCourse.id) : false;

  return (
    <div className="bg-[#0C0F17] border border-[#1C2338] rounded-2xl p-4 sm:p-5 mb-8 shadow-xl space-y-5">
      {/* SELETOR DE ESCOPO: GERAL vs POR CURSO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A2133]">
        <div className="flex items-center gap-2 p-1 bg-[#121624] border border-[#1E273D] rounded-xl self-start">
          <button
            type="button"
            onClick={() => onModeChange('global')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
              mode === 'global'
                ? 'bg-[#8257E5] text-white shadow-[0_0_15px_rgba(130,87,229,0.4)]'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#1A2133]'
            }`}
          >
            <MaterialIcon name="public" className="text-sm" />
            <span>Ranking Geral (Global)</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange('course')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
              mode === 'course'
                ? 'bg-[#8257E5] text-white shadow-[0_0_15px_rgba(130,87,229,0.4)]'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#1A2133]'
            }`}
          >
            <MaterialIcon name="school" className="text-sm" />
            <span>Por Curso Matriculado</span>
            {enrolledCourseIds.length > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-[#04D361]/20 text-[#04D361] text-[10px]">
                {enrolledCourseIds.length}
              </span>
            )}
          </button>
        </div>

        {/* Resumo de Participantes */}
        <div className="flex items-center gap-2 text-xs font-mono text-[#94A3B8]">
          <span className="w-2 h-2 rounded-full bg-[#04D361] animate-pulse" />
          <span>
            {totalParticipants > 0
              ? `${totalParticipants} ${totalParticipants === 1 ? 'desenvolvedor ranqueado' : 'desenvolvedores ranqueados'}`
              : 'Nenhum competidor nesta divisão'}
          </span>
        </div>
      </div>

      {/* CONTROLES DE FILTRO E BUSCA */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        {mode === 'course' ? (
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="leaderboard-course"
                className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#94A3B8]"
              >
                Filtrar por Curso
              </label>
              {isEnrolledInSelected && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#04D361] bg-[#04D361]/10 px-2 py-0.5 rounded border border-[#04D361]/30">
                  <MaterialIcon name="check_circle" className="text-xs" />
                  Você está matriculado
                </span>
              )}
            </div>
            <select
              id="leaderboard-course"
              value={selectedCourseId}
              onChange={(event) => onCourseChange(event.target.value)}
              className="w-full bg-[#121624] border border-[#1E273D] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#8257E5] transition-colors cursor-pointer"
            >
              {courses.map((course) => {
                const isEnrolled = enrolledCourseIds.includes(course.id);
                return (
                  <option key={course.id} value={course.id}>
                    {course.title} {isEnrolled ? '✓ (Sua Matrícula)' : ''}
                  </option>
                );
              })}
            </select>
            <p className="text-[11px] text-[#64748B] mt-1.5 font-sans">
              Competição restrita aos alunos inscritos no módulo selecionado.
            </p>
          </div>
        ) : (
          <div className="flex-1">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5">
              Escopo da Competição
            </div>
            <div className="bg-[#121624] border border-[#1E273D] rounded-xl px-4 py-2.5 text-sm text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[#A379FF]">🌐</span>
                <span className="font-bold">Hall da Fama Global da Nexus Code</span>
              </div>
              <span className="text-xs font-mono text-[#00E5FF] bg-[#00E5FF]/10 px-2 py-0.5 rounded border border-[#00E5FF]/30">
                Todas as Trilhas
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-1.5 font-sans">
              Todos os alunos da plataforma ranqueados pelo XP geral acumulado em desafios e capstones.
            </p>
          </div>
        )}

        {/* CAMPO DE BUSCA */}
        <div className="relative w-full lg:w-72">
          <label
            htmlFor="leaderboard-search"
            className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5"
          >
            Buscar Desenvolvedor
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]">
              <MaterialIcon name="search" className="text-base" />
            </span>
            <input
              id="leaderboard-search"
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Nome do dev..."
              className="w-full bg-[#121624] border border-[#1E273D] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#8257E5] transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
