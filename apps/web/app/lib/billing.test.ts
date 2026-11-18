import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMySubscription } from './billing';

describe('fetchMySubscription', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('retorna o estado da assinatura quando a API responde com sucesso', async () => {
    const subscription = {
      subscription: null,
      hasAccess: false,
      effectivePlan: 'explorer',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(subscription), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(fetchMySubscription()).resolves.toEqual(subscription);
  });

  it('lança erro HTTP em vez de tratar falha da API como ausência de assinatura', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Serviço indisponível' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(fetchMySubscription()).rejects.toThrow('Serviço indisponível');
  });
});
