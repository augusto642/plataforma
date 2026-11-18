'use client';

import { useEffect, useState } from 'react';
import { API_BASE, apiFetch } from '../../../lib/apiClient';

interface Reference {
  id: string;
  title: string;
  url: string;
  author: string | null;
  license: string;
}

export function CuratedReferences({ topics }: { topics: string[] }) {
  const [references, setReferences] = useState<Reference[]>([]);
  const [error, setError] = useState(false);
  const query = [...new Set(topics.filter((topic) => /^[a-z0-9][a-z0-9_-]{0,63}$/.test(topic)))].slice(0, 20).sort().join(',');

  useEffect(() => {
    let active = true;
    setReferences([]);
    setError(false);
    if (!query) return () => { active = false; };
    void apiFetch(`${API_BASE}/knowledge/references?topics=${encodeURIComponent(query)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Falha ao carregar referências');
        return response.json() as Promise<Reference[]>;
      })
      .then((items) => { if (active) setReferences(items); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [query]);

  if (error) return <p role="status" className="px-6 pb-4 text-xs text-amber-300">Referências indisponíveis no momento.</p>;
  if (!references.length) return null;
  return (
    <section className="px-6 pb-6 text-sm text-[#bdcbc3]" aria-label="Referências revisadas">
      <h2 className="font-semibold text-[#c1e8ca]">Referências revisadas</h2>
      <ul className="mt-2 space-y-3">
        {references.map((reference) => (
          <li key={reference.id}>
            <a href={reference.url} target="_blank" rel="noopener noreferrer" className="text-emerald-300 underline">{reference.title}</a>
            <p className="text-xs">{reference.author ? `${reference.author} · ` : ''}Licença informada: {reference.license}</p>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs">Links externos; consulte os termos da fonte antes de reutilizar conteúdo.</p>
    </section>
  );
}
