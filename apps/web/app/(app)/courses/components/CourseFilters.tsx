'use client';

import React, { useRef, useEffect } from 'react';
import { MaterialIcon } from '../../../components/MaterialIcon';

interface CourseFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  // Central 216 (A5) — chips de linguagem do catálogo REAL
  // (derivados das linguagens presentes em GET /courses/public-catalog).
  // "Todos" = sem filtro. Sem linguagem presente, sem chip inventado.
  chips: string[];
  selectedChip: string;
  onChipChange: (chip: string) => void;
}

// B41 (Sprint 14) — os filtros de nível e as tags filtravam atributos
// do catálogo estático (level/tags) que o DTO real não possui:
// qualquer seleção filtraria com base em dados inventados. Restou a
// busca textual, aplicada sobre título e descrição reais — e, na
// Central 216, os chips de linguagem do catálogo público.
export function CourseFilters({
  searchQuery,
  onSearchChange,
  chips,
  selectedChip,
  onChipChange,
}: CourseFiltersProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts '/' and 'Cmd+K' / 'Ctrl+K' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      const isSlash = e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA';

      if (isCmdK || isSlash) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="my-6 space-y-4" id="catalogo">
      <div className="relative">
        <span className="absolute left-3.5 top-3 text-[#64748B] select-none pointer-events-none">
          <MaterialIcon name="search" className="text-[18px]" />
        </span>
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar curso, linguagem ou framework..."
          className="w-full bg-[#111420] border border-[#1C2133] hover:border-[#8257E5]/40 rounded-xl py-3 pl-10 pr-24 text-xs font-mono text-white placeholder:text-[#64748B] outline-none focus:border-[#8257E5] focus:ring-1 focus:ring-[#8257E5]/50 transition-all shadow-inner"
        />
        <div className="absolute right-3.5 top-2.5 flex items-center gap-1.5 pointer-events-none">
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-1 text-[10px] font-mono font-bold text-[#94A3B8] bg-[#07080C] border border-[#1C2133] rounded-md shadow-sm">
            <span>⌘K</span>
            <span className="text-[#64748B]">ou</span>
            <span>/</span>
          </kbd>
        </div>
      </div>

      {chips.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono scrollbar-none">
          {chips.map((chip) => {
            const isSelected = selectedChip === chip;
            return (
              <button
                key={chip}
                type="button"
                onClick={() => onChipChange(chip)}
                aria-pressed={isSelected}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all flex-shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#8257E5] text-white font-bold shadow-[0_0_12px_rgba(130,87,229,0.3)]'
                    : 'bg-[#111420] border border-[#1C2133] hover:border-[#8257E5]/40 text-[#94A3B8] hover:text-white'
                }`}
              >
                {chip}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
