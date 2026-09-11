'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Course } from '../types';

interface CourseModalProps {
  course: Course | null;
  onClose: () => void;
}

export function CourseModal({ course, onClose }: CourseModalProps) {
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

        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3 pr-10">
          <span className="text-[11px] font-mono font-bold bg-[#8257E5]/20 text-[#996DFF] px-2.5 py-0.5 rounded-full border border-[#8257E5]/30">
            {course.level}
          </span>
          <span className="text-xs font-mono font-bold text-[#04D361]">
            ⚡ {course.xp}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-[22px] font-extrabold text-white mb-1.5 font-heading leading-tight">
          {course.modalTitle || course.title}
        </h2>

        {/* Meta */}
        <div className="text-xs font-mono text-zinc-500 mb-4">
          {course.hours} • {course.challenges} • Git Nativo
        </div>

        {/* Description */}
        <p className="text-sm text-zinc-400 leading-relaxed mb-6">
          {course.desc}
        </p>

        {/* Syllabus / Modules List */}
        <div className="mb-6">
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider mb-3">
            📚 Ementa dos Módulos
          </h3>
          <div className="space-y-2">
            {course.modules.map((m, idx) => (
              <div
                key={idx}
                className="bg-[#181820] border border-[#27272A] rounded-xl p-3 sm:px-4 flex items-center justify-between gap-3 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-md bg-[#27272A] text-[#04D361] font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-[13px] font-semibold text-white truncate">
                    {m.name}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-zinc-400 shrink-0 whitespace-nowrap">
                  {m.tasks}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-[#27272A] pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <span className="text-[11px] font-mono text-zinc-500">
            Ambiente: <span className="text-zinc-300">Piston Runner + Git Privado</span>
          </span>
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
