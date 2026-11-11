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
    <div className="my-7 space-y-4" id="catalogo">
      <div className="relative">
        <span className="absolute left-3 top-2.5 text-dark-on-surface-variant select-none">
          <MaterialIcon name="search" className="text-[16px]" />
        </span>
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar tecnologia..."
          className="w-full bg-dark-surface-container border border-border-subtle rounded py-2 pl-8 pr-16 text-xs text-white placeholder:text-dark-on-surface-variant/60 outline-none focus:border-primary transition-colors"
        />
        <div className="absolute right-3.5 top-2.5 flex items-center gap-1 pointer-events-none">
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold text-zinc-500 bg-[#181820] border border-[#27272A] rounded">
            /
          </kbd>
        </div>
      </div>

      {chips.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-label">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onChipChange(chip)}
              aria-pressed={selectedChip === chip}
              className={
                selectedChip === chip
                  ? 'px-3 py-1.5 rounded bg-primary text-white font-bold flex-shrink-0'
                  : 'px-3 py-1.5 rounded bg-dark-surface-container border border-border-subtle text-dark-on-surface flex-shrink-0'
              }
            >
              {chip}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
