import { beforeEach, describe, expect, it, vi } from 'vitest';
import { answerInterview } from '../interview';
import { apiFetch } from '../apiClient';

vi.mock('../apiClient', () => ({ apiFetch: vi.fn() }));

const mockedApiFetch = vi.mocked(apiFetch);

// Regressão do fluxo só-texto + prova de que a transcrição por voz usa
// o MESMO caminho: a voz só preenche o textarea; o envio é este
// `answerInterview` — mesmo endpoint, mesmo corpo `{ content }`, mesmo
// DTO (AnswerInterviewDto, máx. 8.000), mesmo prompt-guard M11 e mesma
// quota M17 no backend. Nenhum caminho paralelo de avaliação.
describe('answerInterview — mesmo caminho para texto digitado e transcrito', () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
    mockedApiFetch.mockResolvedValue(
      new Response(JSON.stringify({ id: 'sess-1', status: 'active', turns: [] }), {
        status: 200,
      }),
    );
  });

  it('texto digitado vai como { content } no POST /answer', async () => {
    await answerInterview('sess-1', 'resposta digitada');
    expect(mockedApiFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockedApiFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/interview/sessions/sess-1/answer');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ content: 'resposta digitada' });
  });

  it('texto transcrito por voz vai idêntico — sem campo, rota ou DTO extra', async () => {
    await answerInterview('sess-1', 'resposta falada e transcrita pelo microfone');
    const [url, init] = mockedApiFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/interview/sessions/sess-1/answer');
    expect(Object.keys(JSON.parse(init.body as string))).toEqual(['content']);
  });
});
