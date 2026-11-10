'use client';

import React, { useRef, useEffect } from 'react';

interface CourseFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

// B41 (Sprint 14) — os filtros de nível e as tags filtravam atributos
// do catálogo estático (level/tags) que o DTO real de GET /courses
// não possui: qualquer seleção filtraria com base em dados
// inventados. Restou a busca textual, aplicada sobre título,
// descrição e instrutor reais.
export function CourseFilters({ searchQuery, onSearchChange }: CourseFiltersProps) {
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
    <div className="my-7" id="catalogo">
      <div className="relative">
        <span className="absolute left-3.5 top-3 text-zinc-500 text-sm select-none">
          🔍
        </span>
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por curso ou instrutor..."
          className="w-full bg-[#121217] border border-[#27272A] rounded-[14px] py-3 pl-10 pr-16 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8257E5] transition-colors"
        />
        <div className="absolute right-3.5 top-3 flex items-center gap-1 pointer-events-none">
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold text-zinc-500 bg-[#181820] border border-[#27272A] rounded">
            /
          </kbd>
        </div>
      </div>
    </div>
  );
}
