/**
 * Sprint 22 — gateway da tutora (LlmClient): resolução de provedor SÓ
 * por configuração, kill switch, cota integrada e registro de uso.
 *
 * Estes testes são a prova executável de que trocar de provedor
 * (Gemini ⇄ OpenAI-compatível ⇄ modelo local) não exige tocar em
 * nenhum consumidor: muda o ambiente, muda o destino da chamada.
 */
import { LlmClient, LlmQuotaExceededError, LlmRequestError } from './llm-client';

const fetchMock = jest.fn();
const originalFetch = global.fetch;

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as any;
});

afterAll(() => {
  global.fetch = originalFetch;
});

function makeConfig(values: Record<string, string> = {}) {
  return {
    get: jest.fn((key: string, def?: unknown) => (values[key] !== undefined ? values[key] : def)),
  } as any;
}

function makeUsage(reserveResult: { ok: boolean; used: number; limit: number } = { ok: true, used: 1, limit: 20 }) {
  return {
    reserve: jest.fn().mockResolvedValue(reserveResult),
    refund: jest.fn().mockResolvedValue(undefined),
    recordUsage: jest.fn().mockResolvedValue(undefined),
    recordBlocked: jest.fn().mockResolvedValue(undefined),
    quotaLimitForPlan: jest.fn().mockReturnValue(20),
  } as any;
}

function makePrisma(plan = 'pro') {
  return {
    user: { findUnique: jest.fn().mockResolvedValue({ plan }) },
  } as any;
}

function okJson(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
    body: null,
  };
}

function geminiOk(text = 'Resposta do Gemini') {
  return okJson({
    candidates: [{ content: { parts: [{ text }] } }],
    usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 7, totalTokenCount: 12 },
  });
}

function openAiOk(text = 'Resposta OpenAI-compatível') {
  return okJson({
    choices: [{ message: { content: text } }],
    usage: { prompt_tokens: 5, completion_tokens: 7, total_tokens: 12 },
  });
}

describe('LlmClient — resolução de provedor por configuração', () => {
  it('sem nada configurado: indisponível (no-provider) e complete lança unavailable sem chamar fetch', async () => {
    const client = new LlmClient(makeConfig());
    expect(client.isAvailable).toBe(false);
    expect(client.unavailableReason).toBe('no-provider');
    const err = await client
      .complete({ messages: [{ role: 'user', content: 'oi' }] })
      .catch((e) => e);
    expect(err).toBeInstanceOf(LlmRequestError);
    expect(err.kind).toBe('unavailable');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('só AI_API_KEY (Gemini implícito): default PROVADO gemini-3.5-flash-lite (nunca 2.x)', async () => {
    fetchMock.mockResolvedValue(geminiOk());
    const client = new LlmClient(makeConfig({ AI_API_KEY: 'AIza-x' }));
    expect(client.isAvailable).toBe(true);
    expect(client.providerId).toBe('gemini');
    expect(client.model).toBe('gemini-3.5-flash-lite');
    await expect(client.complete({ messages: [{ role: 'user', content: 'oi' }] })).resolves.toBe(
      'Resposta do Gemini',
    );
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/models/gemini-3.5-flash-lite:generateContent');
    expect(init.headers['x-goog-api-key']).toBe('AIza-x');
  });

  it('AI_GEMINI_MODEL troca o modelo (tier de qualidade gemini-3.5-flash) sem tocar em código', async () => {
    fetchMock.mockResolvedValue(geminiOk());
    const client = new LlmClient(
      makeConfig({ AI_API_KEY: 'AIza-x', AI_GEMINI_MODEL: 'gemini-3.5-flash' }),
    );
    expect(client.model).toBe('gemini-3.5-flash');
    await client.complete({ messages: [{ role: 'user', content: 'oi' }] });
    expect(fetchMock.mock.calls[0][0]).toContain('/models/gemini-3.5-flash:generateContent');
  });

  it('ambiente LEGADO (AI_API_URL + AI_API_KEY + AI_MODEL) continua funcionando como OpenAI-compatível', async () => {
    fetchMock.mockResolvedValue(openAiOk());
    const client = new LlmClient(
      makeConfig({
        AI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        AI_API_KEY: 'AIza-legacy',
        AI_MODEL: 'modelo-legado',
      }),
    );
    expect(client.providerId).toBe('openai-compatible');
    expect(client.model).toBe('modelo-legado');
    await client.complete({ messages: [{ role: 'user', content: 'oi' }] });
    const [url, init] = fetchMock.mock.calls[0];
    // AI_API_URL é usada VERBATIM (é a URL completa de chat/completions)
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer AIza-legacy');
  });

  it('modelo LOCAL (Ollama): AI_PROVIDER=openai + base URL local + SEM chave → disponível', async () => {
    fetchMock.mockResolvedValue(openAiOk('Resposta do modelo local'));
    const client = new LlmClient(
      makeConfig({
        AI_PROVIDER: 'openai',
        AI_OPENAI_BASE_URL: 'http://localhost:11434/v1',
        AI_OPENAI_MODEL: 'llama3.1',
      }),
    );
    expect(client.isAvailable).toBe(true);
    expect(client.providerId).toBe('openai-compatible');
    expect(client.model).toBe('llama3.1');
    await expect(client.complete({ messages: [{ role: 'user', content: 'oi' }] })).resolves.toBe(
      'Resposta do modelo local',
    );
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:11434/v1/chat/completions');
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('AI_PROVIDER=none desliga o provedor mesmo com chave presente', () => {
    const client = new LlmClient(makeConfig({ AI_PROVIDER: 'none', AI_API_KEY: 'AIza-x' }));
    expect(client.isAvailable).toBe(false);
    expect(client.unavailableReason).toBe('no-provider');
  });
});

describe('LlmClient — kill switch', () => {
  it('AI_TUTOR_ENABLED=false: indisponível com motivo disabled; nenhuma chamada sai', async () => {
    const client = new LlmClient(
      makeConfig({ AI_TUTOR_ENABLED: 'false', AI_API_KEY: 'AIza-x' }),
    );
    expect(client.isAvailable).toBe(false);
    expect(client.unavailableReason).toBe('disabled');
    const err = await client
      .complete({ messages: [{ role: 'user', content: 'oi' }] })
      .catch((e) => e);
    expect(err.kind).toBe('unavailable');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('LlmClient — cota integrada', () => {
  it('cota estourada: LlmQuotaExceededError ANTES de chamar o provedor (fetch intocado)', async () => {
    const usage = makeUsage({ ok: false, used: 20, limit: 20 });
    const client = new LlmClient(makeConfig({ AI_API_KEY: 'AIza-x' }), usage, makePrisma('free'));
    const err = await client
      .complete({ messages: [{ role: 'user', content: 'oi' }], userId: 'user-1', purpose: 'hint' })
      .catch((e) => e);
    expect(err).toBeInstanceOf(LlmQuotaExceededError);
    expect(err.reason).toBe('quota-exceeded');
    expect(fetchMock).not.toHaveBeenCalled();
    // O plano do aluno foi resolvido e usado na reserva
    expect(usage.reserve).toHaveBeenCalledWith('user-1', 'free');
  });

  it('sucesso: reserva → chama → registra uso com tokens', async () => {
    fetchMock.mockResolvedValue(geminiOk());
    const usage = makeUsage();
    const client = new LlmClient(makeConfig({ AI_API_KEY: 'AIza-x' }), usage, makePrisma('pro'));
    await client.complete({
      messages: [{ role: 'user', content: 'oi' }],
      userId: 'user-2',
      purpose: 'chat',
    });
    expect(usage.reserve).toHaveBeenCalledWith('user-2', 'pro');
    expect(usage.refund).not.toHaveBeenCalled();
    expect(usage.recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-2',
        provider: 'gemini',
        model: 'gemini-3.5-flash-lite',
        purpose: 'chat',
        outcome: 'success',
        usage: expect.objectContaining({ totalTokens: 12 }),
      }),
    );
  });

  it('erro do provedor: reserva é ESTORNADA e o uso registra a falha', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn(),
      text: jest.fn().mockResolvedValue('{"error":{"message":"bad key"}}'),
      body: null,
    });
    const usage = makeUsage();
    const client = new LlmClient(makeConfig({ AI_API_KEY: 'AIza-x' }), usage, makePrisma('pro'));
    const err = await client
      .complete({ messages: [{ role: 'user', content: 'oi' }], userId: 'user-3', purpose: 'hint' })
      .catch((e) => e);
    expect(err).toBeInstanceOf(LlmRequestError);
    expect(usage.refund).toHaveBeenCalledWith('user-3');
    expect(usage.recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'error', errorKind: 'upstream' }),
    );
  });

  it('sem userId: nenhuma cota é consultada (chamadas internas do sistema)', async () => {
    fetchMock.mockResolvedValue(geminiOk());
    const usage = makeUsage();
    const client = new LlmClient(makeConfig({ AI_API_KEY: 'AIza-x' }), usage, makePrisma());
    await client.complete({ messages: [{ role: 'user', content: 'oi' }], purpose: 'socratic-cat' });
    expect(usage.reserve).not.toHaveBeenCalled();
  });

  it('stream com cota estourada: erro na primeira leitura, fetch intocado', async () => {
    const usage = makeUsage({ ok: false, used: 200, limit: 200 });
    const client = new LlmClient(makeConfig({ AI_API_KEY: 'AIza-x' }), usage, makePrisma('pro'));
    const collect = async () => {
      for await (const _delta of client.stream({
        messages: [{ role: 'user', content: 'oi' }],
        userId: 'user-4',
        purpose: 'chat-stream',
      })) {
        // nunca chega aqui
      }
    };
    await expect(collect()).rejects.toBeInstanceOf(LlmQuotaExceededError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('LlmClient — evento de bloqueio (ai_llm_blocked, consolidação 22+23)', () => {
  it('bloqueio por cota gera o evento com motivo, plano, uso e limite — e NÃO gera registro de uso', async () => {
    const usage = makeUsage({ ok: false, used: 20, limit: 20 });
    const client = new LlmClient(makeConfig({ AI_API_KEY: 'AIza-x' }), usage, makePrisma('free'));
    const err = await client
      .complete({ messages: [{ role: 'user', content: 'oi' }], userId: 'user-1', purpose: 'hint' })
      .catch((e) => e);
    expect(err).toBeInstanceOf(LlmQuotaExceededError);
    expect(usage.recordBlocked).toHaveBeenCalledTimes(1);
    expect(usage.recordBlocked).toHaveBeenCalledWith({
      userId: 'user-1',
      reason: 'quota-exceeded',
      plan: 'free',
      purpose: 'hint',
      used: 20,
      limit: 20,
    });
    // Bloqueio não é uso: nenhum ai_llm_usage nasce dele
    expect(usage.recordUsage).not.toHaveBeenCalled();
  });

  it('bloqueio por cota no STREAM também gera o evento', async () => {
    const usage = makeUsage({ ok: false, used: 200, limit: 200 });
    const client = new LlmClient(makeConfig({ AI_API_KEY: 'AIza-x' }), usage, makePrisma('pro'));
    const collect = async () => {
      for await (const _delta of client.stream({
        messages: [{ role: 'user', content: 'oi' }],
        userId: 'user-4',
        purpose: 'chat-stream',
      })) {
        // nunca chega aqui
      }
    };
    await expect(collect()).rejects.toBeInstanceOf(LlmQuotaExceededError);
    expect(usage.recordBlocked).toHaveBeenCalledTimes(1);
    expect(usage.recordBlocked).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'quota-exceeded', plan: 'pro', userId: 'user-4' }),
    );
  });

  it('kill switch (AI_TUTOR_ENABLED=false) gera o evento com motivo disabled e o plano do aluno', async () => {
    const usage = makeUsage();
    const client = new LlmClient(
      makeConfig({ AI_TUTOR_ENABLED: 'false', AI_API_KEY: 'AIza-x' }),
      usage,
      makePrisma('pro'),
    );
    const err = await client
      .complete({ messages: [{ role: 'user', content: 'oi' }], userId: 'user-5', purpose: 'chat' })
      .catch((e) => e);
    expect(err.kind).toBe('unavailable');
    expect(usage.recordBlocked).toHaveBeenCalledTimes(1);
    expect(usage.recordBlocked).toHaveBeenCalledWith({
      userId: 'user-5',
      reason: 'disabled',
      plan: 'pro',
      purpose: 'chat',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sem provedor configurado: evento com motivo no-provider (sem usuário, plano nulo)', async () => {
    const usage = makeUsage();
    const client = new LlmClient(makeConfig(), usage, makePrisma());
    const err = await client
      .complete({ messages: [{ role: 'user', content: 'oi' }], purpose: 'hint' })
      .catch((e) => e);
    expect(err.kind).toBe('unavailable');
    expect(usage.recordBlocked).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'no-provider', purpose: 'hint' }),
    );
  });

  it('chamada normal (sucesso) NÃO gera evento de bloqueio', async () => {
    fetchMock.mockResolvedValue(geminiOk());
    const usage = makeUsage();
    const client = new LlmClient(makeConfig({ AI_API_KEY: 'AIza-x' }), usage, makePrisma('pro'));
    await client.complete({
      messages: [{ role: 'user', content: 'oi' }],
      userId: 'user-2',
      purpose: 'chat',
    });
    expect(usage.recordBlocked).not.toHaveBeenCalled();
    expect(usage.recordUsage).toHaveBeenCalledTimes(1);
  });

  it('erro do provedor NÃO é bloqueio: estorna, registra uso com erro e nenhum ai_llm_blocked', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn(),
      text: jest.fn().mockResolvedValue('{"error":{"message":"boom"}}'),
      body: null,
    });
    const usage = makeUsage();
    const client = new LlmClient(makeConfig({ AI_API_KEY: 'AIza-x' }), usage, makePrisma('pro'));
    await client
      .complete({ messages: [{ role: 'user', content: 'oi' }], userId: 'user-3', purpose: 'hint' })
      .catch(() => undefined);
    expect(usage.recordBlocked).not.toHaveBeenCalled();
    expect(usage.recordUsage).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'error' }));
  });
});
