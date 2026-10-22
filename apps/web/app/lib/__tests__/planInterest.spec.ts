import { describe, expect, it } from 'vitest';
import {
  intentToRegistration,
  planInterestConfirmation,
  planPriceLabel,
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
    ).toContain('79,90');
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
