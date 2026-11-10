import React, { useEffect, useState } from 'react';
import {
  listReviews,
  requestAiReview,
  type CodeReview,
} from '../../../lib/reviews';

/**
 * Fase 2 premium (desenho §3.2) — painel "Revisão" dentro do IDE.
 * Exibido AO LADO (nunca no lugar) do resultado dos testes: o
 * passa/falha continua decidido só pelos testes ocultos + Piston.
 * Pro: só projetos finais; Carreira: todos os projetos; free: a API
 * responde 403. Revisão assíncrona: `pending` vira `completed` sem
 * recarregar a página (polling curto enquanto houver pendente).
 */
export function CodeReviewPanel({ submissionId }: { submissionId: string }) {
  const [reviews, setReviews] = useState<CodeReview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listReviews(submissionId)
      .then((list) => {
        if (!cancelled) setReviews(list);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  // Polling curto enquanto houver revisão pendente (fila assíncrona).
  useEffect(() => {
    if (!reviews.some((r) => r.status === 'pending')) return;
    const timer = setTimeout(() => {
      listReviews(submissionId)
        .then(setReviews)
        .catch(() => undefined);
    }, 5000);
    return () => clearTimeout(timer);
  }, [reviews, submissionId]);

  async function request() {
    setError(null);
    setRequesting(true);
    try {
      const review = await requestAiReview(submissionId);
      setReviews((prev) =>
        prev.some((r) => r.id === review.id) ? prev : [review, ...prev],
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível pedir a revisão.');
    } finally {
      setRequesting(false);
    }
  }

  if (!loaded) return null;

  return (
    <div style={{ borderTop: '1px solid #1e222d', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#F4F4F5', margin: 0 }}>
          Revisão de código por IA
        </h3>
        <button
          onClick={request}
          disabled={requesting}
          style={{
            background: '#8257E5',
            color: '#fff',
            border: 0,
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 700,
            cursor: requesting ? 'default' : 'pointer',
            opacity: requesting ? 0.5 : 1,
          }}
        >
          {requesting ? 'Pedindo…' : 'Pedir revisão'}
        </button>
      </div>
      <p style={{ fontSize: 12, color: '#A1A1AA', margin: '6px 0 0' }}>
        Complementa o resultado dos testes — não o substitui. A revisão é específica ao
        seu código e não usa os testes ocultos.
      </p>
      {error && <p style={{ fontSize: 12, color: '#f87171' }}>{error}</p>}
      {reviews.length === 0 && (
        <p style={{ fontSize: 12, color: '#A1A1AA' }}>
          Nenhuma revisão ainda. Peça uma acima (planos pagos; no Pro, só projetos finais).
        </p>
      )}
      {reviews.map((review) => (
        <div key={review.id} style={{ marginTop: 12, fontSize: 13, color: '#C0C0D1' }}>
          <p style={{ margin: 0, color: '#A1A1AA', fontSize: 12 }}>
            {review.status === 'pending'
              ? 'Em fila…'
              : review.status === 'completed'
                ? 'Concluída'
                : 'Falhou — peça novamente'}
            {review.note ? ` · ${review.note}` : ''}
          </p>
          {review.summary && <p style={{ whiteSpace: 'pre-wrap' }}>{review.summary}</p>}
          {review.rubric && (
            <ul style={{ paddingLeft: 16 }}>
              {Object.entries(review.rubric).map(([key, v]) => (
                <li key={key}>
                  <strong>{key}: {v.score}/5</strong> — {v.comment}
                </li>
              ))}
            </ul>
          )}
          {review.suggestions.length > 0 && (
            <ul style={{ paddingLeft: 16 }}>
              {review.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
