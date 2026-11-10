'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { nearestSnapIndex } from './tracksCarousel';

interface TracksCarouselProps {
  /** Rótulos das trilhas, na ordem dos cards — usados nos aria-labels dos dots. */
  labels: string[];
  children: React.ReactNode;
}

/* B47 (Sprint 15) — ilha client do carrossel de trilhas.
   Os cards continuam renderizados no servidor (TracksSection) e
   entram como filhos; esta ilha só dona o comportamento: o contêiner
   de scroll com snap, as sombras laterais e os dots.
   Até aqui os dots eram spans estáticos — o primeiro sempre "ativo",
   sem refletir o scroll nem responder a clique: um indicador falso.
   Agora cada dot é um botão que rola até o card correspondente, e o
   dot ativo é calculado da posição real de scroll (alvo de snap mais
   próximo, via nearestSnapIndex). */
export const TracksCarousel: React.FC<TracksCarouselProps> = ({ labels, children }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Posição de scroll em que cada card encaixa no snap "start":
  // offset do card dentro do contêiner, descontado o padding-left
  // (o snap alinha no início da área de padding do contêiner).
  const computeTargets = useCallback((): number[] => {
    const container = scrollRef.current;
    if (!container) return [];
    const paddingLeft = parseFloat(getComputedStyle(container).paddingLeft) || 0;
    return Array.from(container.children).map(
      (child) =>
        (child as HTMLElement).offsetLeft - container.offsetLeft - paddingLeft,
    );
  }, []);

  const updateActiveFromScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    setActiveIndex(nearestSnapIndex(container.scrollLeft, computeTargets()));
  }, [computeTargets]);

  // Um resize muda os alvos (o padding-left é percentual): recalcula
  // o dot ativo para a posição de scroll corrente.
  useEffect(() => {
    window.addEventListener('resize', updateActiveFromScroll);
    return () => window.removeEventListener('resize', updateActiveFromScroll);
  }, [updateActiveFromScroll]);

  const goTo = (index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const target = computeTargets()[index];
    if (target === undefined) return;
    setActiveIndex(index);
    container.scrollTo({ left: target, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      {/* Sombra fade esquerda */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-20 z-10 bg-gradient-to-r from-background to-transparent" />
      {/* Sombra fade direita */}
      <div className="pointer-events-none absolute right-0 top-0 h-full w-16 z-10 bg-gradient-to-l from-background to-transparent" />

      <div
        ref={scrollRef}
        onScroll={updateActiveFromScroll}
        className="flex gap-6 overflow-x-auto scroll-smooth pb-6 pl-[10%] pr-12"
        style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>

      {/* Indicadores de navegação (dots) — B47: botões reais */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {labels.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Ir para a trilha ${label}`}
            aria-current={i === activeIndex ? true : undefined}
            className={
              i === activeIndex
                ? 'w-6 h-1.5 rounded-full bg-brand-amber transition-all cursor-pointer'
                : 'w-2 h-1.5 rounded-full bg-surface-3 hover:bg-surface-2 transition-all cursor-pointer'
            }
          />
        ))}
      </div>
    </div>
  );
};
