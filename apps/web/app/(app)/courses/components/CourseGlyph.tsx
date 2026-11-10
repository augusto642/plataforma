import React from 'react';

/**
 * Glifo decorativo único dos cursos. Substitui a antiga taxonomia de
 * ícones por "tipo de trilha" (CourseTechIcon), que classificava cada
 * curso numa categoria que a API não conhece. Um único glifo neutro
 * não afirma nada sobre o conteúdo do curso.
 */
export function CourseGlyph({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      <rect x="4" y="5" width="24" height="22" rx="4" stroke="#8257E5" strokeWidth="2" />
      <path
        d="M 10 13 L 15 17 L 10 21 M 17 22 L 23 22"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="10" r="1.6" fill="#04D361" />
    </svg>
  );
}
