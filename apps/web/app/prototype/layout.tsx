import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// B38a (Sprint 11) — /prototype é um protótipo visual de design (composição
// estática, sem chamadas à API do produto), não uma superfície do produto:
// a copy foi saneada para o padrão honesto da Sprint 10 e a rota fica fora
// dos mecanismos de busca. Confirmado: /prototype não está no sitemap.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PrototypeLayout({ children }: { children: ReactNode }) {
  return children;
}
