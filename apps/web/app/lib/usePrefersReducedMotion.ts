'use client';

import { useEffect, useState } from 'react';

// Sprint 7 (D4 do Designer) — a preferência de movimento reduzido do
// sistema operacional passa a governar os loops decorativos da landing:
// quem pediu menos movimento não recebe digitação animada, pulso nem
// bounce — o conteúdo aparece inteiro e estático.
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mediaQuery.matches);
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReduced(event.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReduced;
}
