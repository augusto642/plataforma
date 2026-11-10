'use client';

import React from 'react';
import type { CourseOption } from '../types';

interface RankingControlsProps {
  courses: CourseOption[];
  selectedCourseId: string;
  onCourseChange: (courseId: string) => void;
  enrolledCourseIds: readonly string[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalParticipants: number;
}

export const RankingControls: React.FC<RankingControlsProps> = ({
  courses,
  selectedCourseId,
  onCourseChange,
  enrolledCourseIds,
  searchQuery,
  onSearchChange,
  totalParticipants,
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end gap-4 mb-6">
      <div className="flex-1">
        <label
          htmlFor="leaderboard-course"
          className="block text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1.5"
        >
          Curso
        </label>
        <select
          id="leaderboard-course"
          value={selectedCourseId}
          onChange={(event) => onCourseChange(event.target.value)}
          className="w-full bg-[#121217] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#8257E5] transition-colors"
        >
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
              {enrolledCourseIds.includes(course.id) ? ' — você está matriculado' : ''}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-zinc-500 mt-1.5">
          {totalParticipants > 0
            ? `${totalParticipants} ${totalParticipants === 1 ? 'aluno retornado' : 'alunos retornados'} pela API para este curso.`
            : 'O ranking é carregado da API para o curso selecionado.'}
        </p>
      </div>

      <div className="relative w-full lg:w-72">
        <label
          htmlFor="leaderboard-search"
          className="block text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1.5"
        >
          Buscar aluno
        </label>
        <svg
          className="absolute left-3.5 bottom-3 w-4 h-4 text-zinc-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          id="leaderboard-search"
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por nome..."
          className="w-full bg-[#121217] border border-[#27272A] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#8257E5] transition-colors"
        />
      </div>
    </div>
  );
};
