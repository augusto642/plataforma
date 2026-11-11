/**
 * Sprint 22 — testes dos adaptadores de provedor (fetch mockado).
 *
 * Provam o contrato da camada: mapeamento de mensagens, transporte,
 * usage/tokens (incl. thought tokens do Gemini) e a taxonomia de erros
 * — em especial `model-unavailable` (404 de modelo aposentado), que
 * NÃO é erro de credencial.
 */
import { GeminiProvider } from './gemini.provider';
import { LlmRequestError } from './llm-provider';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';

const fetchMock = jest.fn();
const originalFetch = global.fetch;

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as any;
});

afterAll(() => {
  global.fetch = originalFetch;
});

function jsonResponse(status: number, body: unknown, text?: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(text ?? JSON.stringify(body)),
    body: null,
  };
}

function sseResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return { ok: true, status: 200, body: stream, text: jest.fn(), json: jest.fn() };
}

describe('OpenAiCompatibleProvider', () => {
  const makeProvider = (overrides: Partial<ConstructorParameters<typeof OpenAiCompatibleProvider>[0]> = {}) =>
    new OpenAiCompatibleProvider({
      endpoint: 'http://localhost:11434/v1/chat/completions',
      apiKey: '',
      model: 'llama-local',
      timeoutMs: 5_000,
      ...overrides,
    });

  it('complete devolve conteúdo + usage e chama o endpoint configurado', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        choices: [{ message: { content: 'Pense no caso base.' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    );
    const provider = makeProvider();
    const result = await provider.complete({ messages: [{ role: 'user', content: 'oi' }] });
    expect(result.content).toBe('Pense no caso base.');
    expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 5, totalTokens: 15 });
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:11434/v1/chat/completions');
  });

  it('SEM chave (modelo local): nenhum header Authorization é enviado', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'ok' } }] }),
    );
    await makeProvider().complete({ messages: [{ role: 'user', content: 'oi' }] });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('COM chave (OpenAI remota): envia Bearer', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'ok' } }] }),
    );
    await makeProvider({ apiKey: 'sk-test' }).complete({
      messages: [{ role: 'user', content: 'oi' }],
    });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer sk-test');
  });

  it('404 de modelo inexistente → kind model-unavailable, sem retry', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(404, {}, '{"error":{"message":"The model `nope` does not exist"}}'),
    );
    const err = await makeProvider()
      .complete({ messages: [{ role: 'user', content: 'oi' }] })
      .catch((e) => e);
    expect(err).toBeInstanceOf(LlmRequestError);
    expect(err.kind).toBe('model-unavailable');
    expect(err.retryable).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('500 transitório → 1 retry e sucesso', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(500, {}, 'boom'))
      .mockResolvedValueOnce(jsonResponse(200, { choices: [{ message: { content: 'ok' } }] }));
    const result = await makeProvider().complete({ messages: [{ role: 'user', content: 'oi' }] });
    expect(result.content).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('timeout → kind timeout', async () => {
    fetchMock.mockImplementation((_url: string, init: any) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () =>
          reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })),
        );
      }),
    );
    const err = await makeProvider({ timeoutMs: 30 })
      .complete({ messages: [{ role: 'user', content: 'oi' }] })
      .catch((e) => e);
    expect(err).toBeInstanceOf(LlmRequestError);
    expect(err.kind).toBe('timeout');
  });

  it('stream concatena os deltas SSE até [DONE]', async () => {
    fetchMock.mockResolvedValue(
      sseResponse([
        'data: {"choices":[{"delta":{"content":"Olá"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":", mundo"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    );
    const deltas: string[] = [];
    for await (const delta of makeProvider().stream({ messages: [{ role: 'user', content: 'oi' }] })) {
      deltas.push(delta);
    }
    expect(deltas.join('')).toBe('Olá, mundo');
  });
});

describe('GeminiProvider', () => {
  const makeProvider = (overrides: Partial<ConstructorParameters<typeof GeminiProvider>[0]> = {}) =>
    new GeminiProvider({
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: 'AIza-test',
      model: 'gemini-3.5-flash-lite',
      timeoutMs: 5_000,
      thinkingBudget: 128,
      ...overrides,
    });

  it('complete usa a API nativa: URL :generateContent, header x-goog-api-key, system→systemInstruction', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        candidates: [{ content: { parts: [{ text: 'Qual é o caso base?' }] } }],
        usageMetadata: { promptTokenCount: 9, candidatesTokenCount: 12, totalTokenCount: 78, thoughtsTokenCount: 57 },
      }),
    );
    const provider = makeProvider();
    const result = await provider.complete({
      messages: [
        { role: 'system', content: 'Você é um tutor socrático.' },
        { role: 'user', content: 'não entendi loops' },
        { role: 'assistant', content: 'O que se repete?' },
        { role: 'user', content: 'o bloco' },
      ],
    });
    expect(result.content).toBe('Qual é o caso base?');
    // Thought tokens medidos à parte (modelos 3.x os gastam por padrão)
    expect(result.usage).toEqual({
      promptTokens: 9,
      completionTokens: 12,
      totalTokens: 78,
      thoughtsTokens: 57,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
    );
    expect(init.headers['x-goog-api-key']).toBe('AIza-test');
    expect(init.headers.Authorization).toBeUndefined();

    const body = JSON.parse(init.body);
    expect(body.systemInstruction.parts[0].text).toBe('Você é um tutor socrático.');
    // user/model alternados; mensagens consecutivas do mesmo papel fundidas
    expect(body.contents.map((c: any) => c.role)).toEqual(['user', 'model', 'user']);
    // Thinking budget enxuto vai na generationConfig
    expect(body.generationConfig.thinkingConfig.thinkingBudget).toBe(128);
  });

  it('jsonMode → responseMimeType application/json', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { candidates: [{ content: { parts: [{ text: '{}' }] } }] }),
    );
    await makeProvider().complete({ messages: [{ role: 'user', content: 'oi' }], jsonMode: true });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });

  it('thinkingBudget undefined (dynamic) → thinkingConfig ausente', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { candidates: [{ content: { parts: [{ text: 'ok' }] } }] }),
    );
    await makeProvider({ thinkingBudget: undefined }).complete({
      messages: [{ role: 'user', content: 'oi' }],
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.generationConfig).toBeUndefined();
  });

  it('404 "no longer available" (modelo listado mas aposentado) → kind model-unavailable', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        404,
        {},
        '{"error":{"code":404,"message":"This model is no longer available to new users","status":"NOT_FOUND"}}',
      ),
    );
    const err = await makeProvider({ model: 'gemini-2.5-flash' })
      .complete({ messages: [{ role: 'user', content: 'oi' }] })
      .catch((e) => e);
    expect(err).toBeInstanceOf(LlmRequestError);
    expect(err.kind).toBe('model-unavailable');
    expect(err.message).toContain('retired');
    expect(fetchMock).toHaveBeenCalledTimes(1); // sem retry: trocar o modelo é a correção
  });

  it('401 (credencial) continua upstream — NÃO é model-unavailable', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, {}, '{"error":{"message":"API key not valid"}}'));
    const err = await makeProvider()
      .complete({ messages: [{ role: 'user', content: 'oi' }] })
      .catch((e) => e);
    expect(err.kind).toBe('upstream');
  });

  it('stream via streamGenerateContent?alt=sse concatena os textos', async () => {
    fetchMock.mockResolvedValue(
      sseResponse([
        'data: {"candidates":[{"content":{"parts":[{"text":"Parte 1 "}]}}]}\n\n',
        'data: {"candidates":[{"content":{"parts":[{"text":"parte 2"}]}}]}\n\n',
      ]),
    );
    const deltas: string[] = [];
    for await (const delta of makeProvider().stream({ messages: [{ role: 'user', content: 'oi' }] })) {
      deltas.push(delta);
    }
    expect(deltas.join('')).toBe('Parte 1 parte 2');
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain(':streamGenerateContent?alt=sse');
  });
});
