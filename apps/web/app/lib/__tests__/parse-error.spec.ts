import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseError } from '../parse-error';
import { apiFetch } from '../apiClient';
import { getCurrentChallenge } from '../challenges';
import { listThreads } from '../community';
import { listInterviewSessions } from '../interview';
import { listReviews } from '../reviews';
import { getJobs } from '../talent';

vi.mock('../apiClient', () => ({ apiFetch: vi.fn() }));

const mockedApiFetch = vi.mocked(apiFetch);
const DEFAULT_MESSAGE = 'Não foi possível completar a operação.';

// M18 (Lote 4) — `parseError` único em `app/lib/parse-error.ts`,
// importado pelos 5 clients (challenges, community, interview, reviews,
// talent). Comportamento idêntico ao das 5 cópias removidas.
describe('parseError — módulo compartilhado (M18)', () => {
  it('usa a mensagem string do corpo', async () => {
    const res = new Response(JSON.stringify({ message: 'Sessão expirada.' }), { status: 401 });
    await expect(parseError(res)).resolves.toEqual(new Error('Sessão expirada.'));
  });

  it('junta array de mensagens com espaço', async () => {
    const res = new Response(JSON.stringify({ message: ['Campo', 'inválido.'] }), { status: 400 });
    await expect(parseError(res)).resolves.toEqual(new Error('Campo inválido.'));
  });

  it('sem message, usa a mensagem padrão', async () => {
    const res = new Response(JSON.stringify({ error: 'Bad Request' }), { status: 400 });
    await expect(parseError(res)).resolves.toEqual(new Error(DEFAULT_MESSAGE));
  });

  it('message nula usa a mensagem padrão', async () => {
    const res = new Response(JSON.stringify({ message: null }), { status: 400 });
    await expect(parseError(res)).resolves.toEqual(new Error(DEFAULT_MESSAGE));
  });

  it('corpo que não é JSON usa a mensagem padrão (não lança na leitura)', async () => {
    const res = new Response('<html>erro</html>', { status: 500 });
    await expect(parseError(res)).resolves.toEqual(new Error(DEFAULT_MESSAGE));
  });
});

// Fiação: cada um dos 5 clients rejeita com a mensagem do `parseError`
// compartilhado quando a API responde erro — prova que nenhum deles
// manteve cópia local nem mudou o mapeamento.
describe('parseError — fiação nos 5 clients (M18)', () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
    mockedApiFetch.mockResolvedValue(
      new Response(JSON.stringify({ message: ['Acesso', 'negado.'] }), { status: 403 }),
    );
  });

  it('challenges rejeita com a mensagem mapeada', async () => {
    await expect(getCurrentChallenge()).rejects.toEqual(new Error('Acesso negado.'));
  });

  it('community rejeita com a mensagem mapeada', async () => {
    await expect(listThreads()).rejects.toEqual(new Error('Acesso negado.'));
  });

  it('interview rejeita com a mensagem mapeada', async () => {
    await expect(listInterviewSessions()).rejects.toEqual(new Error('Acesso negado.'));
  });

  it('reviews rejeita com a mensagem mapeada', async () => {
    await expect(listReviews('sub-1')).rejects.toEqual(new Error('Acesso negado.'));
  });

  it('talent rejeita com a mensagem mapeada', async () => {
    await expect(getJobs()).rejects.toEqual(new Error('Acesso negado.'));
  });
});
