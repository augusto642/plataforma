'use client';

import React from 'react';
import Link from 'next/link';
import { DetailedCourse } from '../types';

interface CourseHeroHeaderProps {
  course: DetailedCourse;
}

export const CourseHeroHeader: React.FC<CourseHeroHeaderProps> = ({ course }) => {
  return (
    <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6 md:p-8 mb-8 relative overflow-hidden shadow-2xl">
      {/* Background Cyber Glow */}
      <div className="absolute right-0 top-0 w-96 h-96 bg-[#8257E5]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top badges */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <span className="text-xs font-mono font-bold bg-[#8257E5]/15 text-[#996DFF] border border-[#8257E5]/30 px-3 py-1 rounded-full">
          {course.badgeTitle}
        </span>
        <span className="text-xs font-mono font-bold bg-[#04D361]/10 text-[#04D361] border border-[#04D361]/30 px-2.5 py-1 rounded-full">
          ★ {course.rating.toFixed(2)} ({course.studentsCount.toLocaleString('pt-BR')} devs)
        </span>
        <span className="text-xs font-mono bg-zinc-800 text-zinc-300 border border-zinc-700 px-2.5 py-1 rounded-full font-semibold">
          Nível: {course.level}
        </span>
      </div>

      {/* Main Title & Description */}
      <div className="max-w-3xl mb-6">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-heading text-white tracking-tight leading-tight mb-3">
          {course.title}
        </h1>
        <p className="text-sm sm:text-[15px] text-zinc-300 leading-relaxed">
          {course.overview}
        </p>

        {/* Tech tags */}
        <div className="flex flex-wrap gap-2 mt-4">
          {course.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] font-mono bg-[#181820] text-zinc-300 border border-[#27272A] px-2.5 py-1 rounded-lg"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#181820] border border-[#27272A] rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⏱️</span>
          <div>
            <div className="text-xs font-mono font-bold text-white">{course.hours}</div>
            <div className="text-[10px] text-zinc-400">Carga Horária</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-2xl">💻</span>
          <div>
            <div className="text-xs font-mono font-bold text-[#00E5FF]">
              {course.challengesCount} Desafios Git
            </div>
            <div className="text-[10px] text-zinc-400">Testes Automatizados</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <div>
            <div className="text-xs font-mono font-bold text-[#996DFF]">
              +{course.totalXp.toLocaleString('pt-BR')} XP
            </div>
            <div className="text-[10px] text-zinc-400">Recompensa Semanal</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-2xl">📜</span>
          <div>
            <div className="text-xs font-mono font-bold text-[#04D361]">Certificado SHA-256</div>
            <div className="text-[10px] text-zinc-400">Ledger Imutável</div>
          </div>
        </div>
      </div>

      {/* Instructor & CTA Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-2 border-t border-[#27272A]">
        {/* Author info */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#8257E5] to-[#00E5FF] p-[1.5px] shrink-0">
            <div className="w-full h-full bg-[#181820] rounded-[10px] flex items-center justify-center font-mono font-black text-sm text-white">
              {course.instructor.avatarInitials}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">{course.instructor.name}</span>
              <span className="text-[10px] font-mono bg-[#8257E5]/15 text-[#996DFF] px-1.5 py-0.2 rounded border border-[#8257E5]/30">
                INSTRUTOR
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">{course.instructor.role}</p>
          </div>
        </div>

        {/* Progress & Main Launch CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="sm:w-44">
            <div className="flex justify-between text-[11px] font-mono mb-1">
              <span className="text-zinc-400">Seu Progresso</span>
              <span className="font-bold text-[#04D361]">{course.userProgressPercent}%</span>
            </div>
            <div className="w-full bg-[#181820] h-2 rounded-full overflow-hidden border border-[#27272A]">
              <div
                className="h-full bg-gradient-to-r from-[#8257E5] to-[#04D361] rounded-full"
                style={{ width: `${course.userProgressPercent}%` }}
              />
            </div>
          </div>

          <Link
            href={`/ide?course=${course.slug}&lesson=${course.currentLessonId || 'm1-l1'}`}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00B37E] to-[#04D361] hover:from-[#00875F] hover:to-[#00B37E] text-[#08080B] font-black text-xs transition-all shadow-lg shadow-[#04D361]/25 flex items-center justify-center gap-2 active:scale-95 text-decoration-none"
          >
            <span>⚡</span>
            <span>Continuar Desafio na IDE</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
