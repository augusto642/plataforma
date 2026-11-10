'use client';

import { useEffect } from 'react';

/**
 * Fase 5 premium (desenho §6.2) — registro do service worker do PWA.
 * Só em produção: em dev o worker cachearia o build em desenvolvimento
 * e esconderia mudanças. Sem o worker, o manifest sozinho não instala.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Instalação é conveniência, não requisito: falha silenciosa.
    });
  }, []);
  return null;
}
