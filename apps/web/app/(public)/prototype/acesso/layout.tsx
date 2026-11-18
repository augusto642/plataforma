import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './preview.css';

export const metadata: Metadata = {
  title: 'Prévia de acesso | Nexus Code',
  robots: { index: false, follow: false },
};

export default function AccessPreviewLayout({ children }: { children: ReactNode }) {
  return children;
}
