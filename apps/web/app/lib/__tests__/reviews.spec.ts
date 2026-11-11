import { describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../apiClient';
import { listMyReviews } from '../reviews';

vi.mock('../apiClient', () => ({ apiFetch: vi.fn() }));

const mockedApiFetch = vi.mocked(apiFetch);

// Central 219 (D2) — "Revisões da IA Salvas": GET /reviews/me.
// Fail-closed: 403 (plano free) rejeita para o card sumir, nunca
// uma lista inventada; [] é lista vazia honesta.
describe('listMyReviews (D2)', () => {
  it('200 com lista → devolve as revisões como vieram', async () => {
    const reviews = [
      {
        id: 'rev-1',
        kind: 'ai',
        status: 'completed',
        summary: 'Bom uso de funções.',
        createdAt: '2026-11-10T10:00:00.000Z',
        submissionId: 'sub-1',
        activityTitle: 'Loops e arrays',
      },
    ];
    mockedApiFetch.mockResolvedValue(
      new Response(JSON.stringify(reviews), { status: 200 }),
    );
    await expect(listMyReviews()).resolves.toEqual(reviews);
    expect(mockedApiFetch).toHaveBeenCalledWith('/reviews/me');
  });

  it('403 (plano free) → rejeita, para o card sumir fail-closed', async () => {
    mockedApiFetch.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 }),
    );
    await expect(listMyReviews()).rejects.toThrow();
  });

  it('200 com [] → lista vazia honesta', async () => {
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    await expect(listMyReviews()).resolves.toEqual([]);
  });
});
