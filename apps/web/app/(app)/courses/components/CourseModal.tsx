'use client';

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { CourseListItem } from '../types';
import { mapApiCourseDetail } from '../utils';
import { useCourseDetailQuery } from '../../../hooks/useCoursesQuery';

interface CourseModalProps {
  course: CourseListItem | null;
  onClose: () => void;
}

// B41 (Sprint 14) — a ementa deixou de vir dos "módulos" do catálogo
// estático: ao abrir, o modal busca GET /courses/:id e lista as
// atividades reais do curso (título e linguagem, na ordem da API).
// Nível, horas e XP não existem no DTO e não são exibidos.
export function CourseModal({ course, onClose }: CourseModalProps) {
  const { data, isLoading, isError } = useCourseDetailQuery(course?.id);
  const detail = useMemo(() => (data ? mapApiCourseDetail(data) : null), [data]);

  // ESC key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (course) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [course, onClose]);

  if (!course) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-[#121217] border border-zinc-700/80 rounded-[24px] max-w-[680px] w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 relative shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#27272A] border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
        >
          ✕
        </button>

        {/* Title */}
        <h2 className="text-[22px] font-extrabold text-white mb-1.5 font-heading leading-tight pr-10">
          {course.title}
        </h2>

        {/* Meta — somente campos reais da API */}
        <div className="text-xs font-mono text-zinc-500 mb-4">
          {course.activitiesCount} atividades · {course.enrollmentsCount} alunos
          matriculados
          {course.instructorName ? <> · Instrutor: {course.instructorName}</> : null}
        </div>

        {/* Description */}
        {course.description ? (
          <p className="text-sm text-zinc-400 leading-relaxed mb-6">{course.description}</p>
        ) : null}

        {/* Syllabus — atividades reais do detalhe */}
        <div className="mb-6">
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider mb-3">
            📚 Conteúdo do curso
          </h3>
          {isLoading ? (
            <p className="text-xs font-mono text-zinc-500">Carregando conteúdo…</p>
          ) : isError || !detail ? (
            <p className="text-xs font-mono text-zinc-500">
              Não foi possível carregar o conteúdo deste curso agora.
            </p>
          ) : detail.activities.length === 0 ? (
            <p className="text-xs font-mono text-zinc-500">
              Este curso ainda não tem atividades publicadas.
            </p>
          ) : (
            <div className="space-y-2">
              {detail.activities.map((activity, idx) => (
                <div
                  key={activity.id}
                  className="bg-[#181820] border border-[#27272A] rounded-xl p-3 sm:px-4 flex items-center justify-between gap-3 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-md bg-[#27272A] text-[#04D361] font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-[13px] font-semibold text-white truncate">
                      {activity.title}
                    </span>
                  </div>
                  {activity.language ? (
                    <span className="text-[11px] font-mono text-zinc-400 shrink-0 whitespace-nowrap">
                      {activity.language}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-[#27272A] pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href={`/courses/${course.slug}`}
            className="text-[11px] font-mono text-zinc-400 hover:text-white transition-colors"
          >
            Abrir página do curso →
          </Link>
          <Link
            href="/ide"
            className="bg-[#04D361] hover:opacity-90 text-black font-extrabold text-xs px-5 py-2.5 rounded-xl inline-flex items-center justify-center gap-2 transition-all duration-200 shadow-[0_0_20px_rgba(4,211,97,0.25)] active:scale-95 text-center"
          >
            <span>Iniciar Trilha na IDE</span>
            <span>🚀</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
