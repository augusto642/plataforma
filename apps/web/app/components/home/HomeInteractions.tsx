'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { mountPractice } from './practice';

export default function HomeInteractions({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const controller = new AbortController();
    const { signal } = controller;
    mountPractice(root, signal);
    void import('./motion').then(({ mountMotion }) => {
      if (!signal.aborted) mountMotion(root, signal);
    }).catch(error => console.warn('Animações da página inicial indisponíveis.', error));
    void import('./tower').then(({ mountTower }) => {
      if (!signal.aborted) mountTower(root, signal);
    }).catch(error => console.warn('Demonstração da Torre indisponível.', error));
    return () => controller.abort();
  }, []);

  return <div className="nexus-home" ref={ref}>{children}</div>;
}
