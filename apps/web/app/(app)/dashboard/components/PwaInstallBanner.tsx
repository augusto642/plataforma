'use client';

import React, { useEffect, useState } from 'react';

/**
 * Fase 5 premium (desenho §6.2) — banner de instalação do PWA no
 * dashboard. Só aparece quando o navegador sinaliza instalabilidade
 * (evento beforeinstallprompt) e some após instalar ou dispensar.
 * Não promete nada sobre offline total: o texto deixa claro que a
 * revisão funciona offline e a execução de código fica online.
 */
export default function PwaInstallBanner() {
  const [deferred, setDeferred] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferred || dismissed) return null;

  return (
    <div
      role="status"
      className="rounded-xl border border-[#8257E5]/40 bg-[#8257E5]/10 px-4 py-3 flex flex-wrap items-center gap-3"
    >
      <span className="text-sm text-[#F4F4F5]">
        Instale a Nexus Code no seu celular: revise flashcards e quizzes
        offline — a execução de código continua online.
      </span>
      <button
        type="button"
        className="px-3 py-1.5 rounded-lg bg-[#8257E5] text-white text-sm font-medium"
        onClick={async () => {
          await deferred.prompt();
          setDeferred(null);
        }}
      >
        Instalar
      </button>
      <button
        type="button"
        className="text-sm text-zinc-400 underline"
        onClick={() => setDismissed(true)}
      >
        Agora não
      </button>
    </div>
  );
}
