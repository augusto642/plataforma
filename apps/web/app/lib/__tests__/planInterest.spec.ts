import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchPlanInterestCounts,
  intentToRegistration,
  planInterestConfirmation,
  planInterestCountLabel,
  planPriceLabel,
  registerPlanInterestLead,
} from '../planInterest';

// B54 (Sprint 17 · Volta 2) — a intenção de plano salva no clique de
// preço vira registro no servidor: só planos PAGOS geram registro, o
// ciclo acompanha o toggle exibido na landing e a confirmação diz o
// estado real (cobrança inativa) com o preço da fonte única.
describe('planInterest — destino da intenção de plano', () => {
  it('sem intenção, nenhum registro', () => {
    expect(intentToRegistration(null)).toBeNull();
  });

  it('intenção do Explorer (grátis) não gera registro', () => {
    expect(intentToRegistration({ plan: 'explorer' })).toBeNull();
    expect(intentToRegistration({ plan: 'free' })).toBeNull();
  });

  it('Pro sem ciclo explícito registra como mensal', () => {
    expect(intentToRegistration({ plan: 'pro' })).toEqual({
      plan: 'pro',
      billingCycle: 'monthly',
    });
  });

  it('ciclo anual da landing é preservado no registro', () => {
    expect(intentToRegistration({ plan: 'staff', billingCycle: 'annual' })).toEqual({
      plan: 'staff',
      billingCycle: 'annual',
    });
    expect(intentToRegistration({ plan: 'pro', billingCycle: 'monthly' })).toEqual({
      plan: 'pro',
      billingCycle: 'monthly',
    });
  });

  it('plano desconhecido não gera registro', () => {
    expect(intentToRegistration({ plan: 'enterprise' })).toBeNull();
  });

  it('rótulo de preço vem da fonte única, por ciclo', () => {
    expect(
      planPriceLabel({ plan: 'pro', billingCycle: 'monthly', createdAt: '' }),
    ).toContain('39,90');
    expect(
      planPriceLabel({ plan: 'pro', billingCycle: 'annual', createdAt: '' }),
    ).toContain('358,80');
    expect(
      planPriceLabel({ plan: 'staff', billingCycle: null, createdAt: '' }),
    ).toBe('Preço a definir');
  });

  it('confirmação nomeia o plano e declara a cobrança inativa, sem prometer benefício', () => {
    const { title, body } = planInterestConfirmation({
      plan: 'pro',
      billingCycle: 'monthly',
      createdAt: '2026-10-22T12:00:00.000Z',
    });
    expect(title).toContain('lista de interessados do plano Pro');
    expect(body).toContain('ainda não está ativa');
    expect(body).toContain('nada foi cobrado');
    expect(body).not.toMatch(/desconto|vaga garantida|prioridade/i);
  });
});

// B71/B72 (Sprint 18 · Volta 3) — captura só-e-mail da lista e o
// número real exibido no hero: zero é zero (convida o primeiro nome),
// a falha da API vira null (nenhum número exibido), nunca estimativa.
describe('planInterest — captura só-e-mail e contagem real', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rótulo da contagem: zero convida, um é singular, vários é plural', () => {
    expect(planInterestCountLabel(0)).toBe(
      '0 pessoas na lista de interessados — seja a primeira',
    );
    expect(planInterestCountLabel(1)).toBe('1 pessoa na lista de interessados');
    expect(planInterestCountLabel(12)).toBe('12 pessoas na lista de interessados');
  });

  it('registerPlanInterestLead posta e-mail+plano e devolve a contagem pública', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ plan: 'pro', count: 3, alreadyOnList: false }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await registerPlanInterestLead('a@mail.com', 'pro', 'annual');

    expect(result).toEqual({ plan: 'pro', count: 3, alreadyOnList: false });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/plan-interest/lead');
    expect(JSON.parse(init.body as string)).toEqual({
      email: 'a@mail.com',
      plan: 'pro',
      billingCycle: 'annual',
    });
  });

  it('registerPlanInterestLead devolve null quando a API falha (form mostra erro, não sucesso falso)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(registerPlanInterestLead('a@mail.com', 'staff')).resolves.toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(registerPlanInterestLead('a@mail.com', 'staff')).resolves.toBeNull();
  });

  it('fetchPlanInterestCounts lê os dois planos; falha vira null (hero sem número)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ pro: 4, staff: 1 }),
      }),
    );
    await expect(fetchPlanInterestCounts()).resolves.toEqual({ pro: 4, staff: 1 });

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(fetchPlanInterestCounts()).resolves.toBeNull();
  });
});
