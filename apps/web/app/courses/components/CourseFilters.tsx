'use client';

import React, { useRef, useEffect } from 'react';
import { FilterLevel } from '../types';

interface CourseFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedLevel: FilterLevel;
  onLevelChange: (level: FilterLevel) => void;
  selectedTag: string | null;
  onTagToggle: (tag: string) => void;
}

const LEVEL_OPTIONS: { label: string; value: FilterLevel }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Iniciante', value: 'Iniciante' },
  { label: 'Intermediário', value: 'Intermediário' },
  { label: 'Avançado', value: 'Avançado' },
];

const AVAILABLE_TAGS = [
  { label: 'TypeScript', value: 'TypeScript' },
  { label: 'Go (Golang)', value: 'Go' },
  { label: 'Python', value: 'Python' },
  { label: 'Docker & Linux', value: 'Docker' },
  { label: 'Algoritmos & Big-O', value: 'Algorithms' },
  { label: 'Sistemas Distribuídos', value: 'Distributed' },
];

export function CourseFilters({
  searchQuery,
  onSearchChange,
  selectedLevel,
  onLevelChange,
  selectedTag,
  onTagToggle,
}: CourseFiltersProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="my-7 flex flex-col gap-4" id="catalogo">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input with shortcut hint */}
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-3 text-zinc-500 text-sm select-none">
            🔍
          </span>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por curso, tecnologia ou conceito (ex: Go, Docker, Raft, Algoritmos)..."
            className="w-full bg-[#121217] border border-[#27272A] rounded-[14px] py-3 pl-10 pr-16 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8257E5] transition-colors"
          />
          <div className="absolute right-3.5 top-3 flex items-center gap-1 pointer-events-none">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold text-zinc-500 bg-[#181820] border border-[#27272A] rounded">
              /
            </kbd>
          </div>
        </div>

        {/* Level Tabs */}
        <div className="flex bg-[#121217] border border-[#27272A] p-1 rounded-xl gap-1 self-start md:self-auto">
          {LEVEL_OPTIONS.map((lvl) => {
            const isActive = selectedLevel === lvl.value;
            return (
              <button
                key={lvl.value}
                type="button"
                onClick={() => onLevelChange(lvl.value)}
                className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#8257E5] text-white shadow-[0_0_10px_rgba(130,87,229,0.3)]'
                    : 'text-zinc-400 hover:text-white bg-transparent'
                }`}
              >
                {lvl.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tag Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] text-zinc-500 uppercase font-mono tracking-wider mr-1 shrink-0">
          Tags:
        </span>
        {AVAILABLE_TAGS.map((tag) => {
          const isActive = selectedTag === tag.value;
          return (
            <button
              key={tag.value}
              type="button"
              onClick={() => onTagToggle(tag.value)}
              className={`text-[11px] font-mono px-3 py-1 rounded-full cursor-pointer whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-[#8257E5] border-[#8257E5] text-white shadow-[0_0_10px_rgba(130,87,229,0.3)]'
                  : 'bg-[#121217] border-[#27272A] text-zinc-400 hover:border-[#8257E5] hover:text-white'
              }`}
            >
              {tag.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
