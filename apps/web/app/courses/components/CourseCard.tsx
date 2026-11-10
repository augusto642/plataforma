import React from 'react';
import type { CourseListItem, CourseProgressEntry } from '../types';
import { courseProgressStatus } from '../utils';
import { CourseGlyph } from './CourseGlyph';

interface CourseCardProps {
  course: CourseListItem;
  progress?: CourseProgressEntry;
  onSelect: (course: CourseListItem) => void;
}

// B41 (Sprint 14) — o card exibe somente campos do DTO real de
// GET /courses (título, descrição, instrutor, contagens de atividades
// e matrículas) e, quando há matrícula do usuário, o progresso real de
// GET /users/me/progress. Nível, horas, XP e o selo de progresso com
// default de 68% não existem na API e foram removidos.
export function CourseCard({ course, progress, onSelect }: CourseCardProps) {
  // Q2 (Sprint 15) — o rótulo vem da regra única de courseProgressStatus:
  // matrícula real em 0% é "Não iniciado", não "Em Progresso (0%)".
  const statusInfo = courseProgressStatus(progress);
  const status = {
    label: statusInfo.label,
    className:
      statusInfo.kind === 'completed'
        ? 'text-[#04D361] font-semibold'
        : statusInfo.kind === 'in-progress'
          ? 'text-[#00E5FF] font-semibold'
          : 'text-zinc-500',
  };

  return (
    <div className="bg-[#121217] border border-[#27272A] rounded-[20px] p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-[#8257E5]/60 hover:shadow-[0_12px_30px_-10px_rgba(130,87,229,0.3)] group">
      <div>
        {/* Icon & Title Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-[46px] h-[46px] rounded-[14px] bg-[#181820] border border-[#27272A] flex items-center justify-center p-2 shrink-0 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] group-hover:border-[#8257E5]/40 transition-colors">
            <CourseGlyph className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-snug font-heading">
              {course.title}
            </h3>
            <p className="text-[11px] font-mono text-zinc-500 mt-1">
              {course.activitiesCount} atividades · {course.enrollmentsCount} alunos
              matriculados
            </p>
          </div>
        </div>

        {/* Description (somente a da API; sem descrição, nada é inventado) */}
        {course.description ? (
          <p className="text-[13px] text-zinc-400 leading-relaxed mb-4">
            {course.description}
          </p>
        ) : null}

        {course.instructorName ? (
          <p className="text-[11px] font-mono text-zinc-500 mb-5">
            Instrutor: <span className="text-zinc-300">{course.instructorName}</span>
          </p>
        ) : null}
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-[#27272A] flex items-center justify-between">
        <span className={`text-[11px] font-mono ${status.className}`}>{status.label}</span>
        <button
          type="button"
          onClick={() => onSelect(course)}
          className="bg-[#27272A] hover:bg-[#8257E5] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all duration-200 inline-flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
        >
          <span>Ver Ementa</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
