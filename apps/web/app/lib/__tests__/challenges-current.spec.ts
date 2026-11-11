import { describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../apiClient';
import { getCurrentChallenge } from '../challenges';

vi.mock('../apiClient', () => ({ apiFetch: vi.fn() }));

const mockedApiFetch = vi.mocked(apiFetch);

// Central 216 (auditoria do Designer, item 1) — GET /challenges/current
// sem desafio ativo: a API antiga devolvia `null` e o Nest respondia
// 200 com corpo VAZIO; res.json() direto quebrava ("Unexpected end of
// JSON input") e /desafios mostrava erro vermelho. O cliente agora lê
// texto, aceita corpo vazio (= null) e desembrulha o envelope
// { challenge } da API nova (formato direto continua aceito).
describe('getCurrentChallenge — corpo vazio e envelope', () => {
  it('corpo vazio (API antiga sem desafio) devolve null sem lançar', async () => {
    mockedApiFetch.mockResolvedValue(new Response('', { status: 200 }));
    await expect(getCurrentChallenge()).resolves.toBeNull();
  });

  it('envelope { challenge: null } devolve null', async () => {
    mockedApiFetch.mockResolvedValue(
      new Response(JSON.stringify({ challenge: null }), { status: 200 }),
    );
    await expect(getCurrentChallenge()).resolves.toBeNull();
  });

  it('envelope { challenge } devolve o desafio', async () => {
    const challenge = { id: 'ch-1', title: 'Desafio da semana' };
    mockedApiFetch.mockResolvedValue(
      new Response(JSON.stringify({ challenge }), { status: 200 }),
    );
    await expect(getCurrentChallenge()).resolves.toEqual(challenge);
  });

  it('formato direto legado (desafio sem envelope) continua aceito', async () => {
    const challenge = { id: 'ch-1', title: 'Desafio da semana' };
    mockedApiFetch.mockResolvedValue(
      new Response(JSON.stringify(challenge), { status: 200 }),
    );
    await expect(getCurrentChallenge()).resolves.toEqual(challenge);
  });
});
