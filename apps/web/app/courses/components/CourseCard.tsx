import React from 'react';
import { Course } from '../types';
import { CourseTechIcon } from './CourseTechIcon';

interface CourseCardProps {
  course: Course;
  onSelect: (course: Course) => void;
}

export function CourseCard({ course, onSelect }: CourseCardProps) {
  const getLevelBadgeClass = (level: Course['level']) => {
    switch (level) {
      case 'Intermediário':
        return 'bg-[#00E5FF]/10 border-[#00E5FF]/30 text-[#00E5FF]';
      case 'Avançado':
        return 'bg-[#8257E5]/15 border-[#8257E5]/40 text-[#996DFF]';
      case 'Todos os Níveis':
        return 'bg-[#04D361]/10 border-[#04D361]/30 text-[#04D361]';
      case 'Iniciante':
        return 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]';
      default:
        return 'bg-zinc-800 border-zinc-700 text-zinc-300';
    }
  };

  return (
    <div className="bg-[#121217] border border-[#27272A] rounded-[20px] p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-[#8257E5]/60 hover:shadow-[0_12px_30px_-10px_rgba(130,87,229,0.3)] group">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${getLevelBadgeClass(
              course.level
            )}`}
          >
            {course.level}
          </span>
          <span className="text-[11px] font-mono font-bold text-[#04D361]">
            ⚡ {course.xp}
          </span>
        </div>

        {/* Icon & Title Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-[46px] h-[46px] rounded-[14px] bg-[#181820] border border-[#27272A] flex items-center justify-center p-2 shrink-0 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] group-hover:border-[#8257E5]/40 transition-colors">
            <CourseTechIcon type={course.iconType} className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-snug font-heading">
              {course.title}
            </h3>
            <p className="text-[11px] font-mono text-zinc-500 mt-1">
              {course.hours} • {course.challenges}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-[13px] text-zinc-400 leading-relaxed mb-4">
          {course.shortDesc || course.desc}
        </p>

        {/* Tech Pills */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {course.tags.map((tag) => (
            <span
              key={tag}
              className="bg-[#181820] border border-[#27272A] text-zinc-300 text-[10px] font-mono px-1.5 py-0.5 rounded-md"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-[#27272A] flex items-center justify-between">
        <span
          className={`text-[11px] font-mono ${
            course.inProgress
              ? 'text-[#00E5FF] font-semibold'
              : 'text-zinc-500'
          }`}
        >
          {course.inProgress
            ? `Em Progresso (${course.progressPercent ?? 68}%)`
            : 'Disponível'}
        </span>
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
