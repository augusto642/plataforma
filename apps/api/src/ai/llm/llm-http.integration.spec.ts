/**
 * Sprint 22 — prova de integração do caminho REAL sobre HTTP.
 *
 * Sobe um servidor OpenAI-compatível fake em localhost (o mesmo
 * formato que Ollama/LM Studio expõem) e exercita o gateway
 * (LlmClient) de ponta a ponta, por HTTP de verdade — sem chave real
 * e sem rede externa:
 *
 *  - complete + stream contra o endpoint configurado só por ambiente;
 *  - cota diária no limite exato: a chamada limite+1 NEM CHEGA ao
 *    servidor (contador do servidor não anda);
 *  - kill switch: nenhuma chamada sai;
 *  - 404 de modelo aposentado → LlmRequestError kind
 *    'model-unavailable' (≠ erro de credencial).
 *
 * A prova com a chave real do Gemini é o gate `golden-live.spec.ts`
 * (GOLDEN_LIVE=1), que entra no smoke do deploy — a chave vive no
 * cofre e não é legível em ambiente de desenvolvimento.
 */
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { LlmClient, LlmQuotaExceededError, LlmRequestError } from '../llm-client';
import { AiUsageService } from './ai-usage.service';

jest.setTimeout(30_000);

interface FakeState {
  requests: number;
  lastHeaders: Record<string, string | string[] | undefined>;
}

function startFakeProvider(): Promise<{ server: Server; baseUrl: string; state: FakeState }> {
  const state: FakeState = { requests: 0, lastHeaders: {} };
  const server = createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      state.requests++;
      state.lastHeaders = req.headers;
      const body = raw ? JSON.parse(raw) : {};
      if (body.model === 'modelo-aposentado') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: `The model '${body.model}' does not exist` } }));
        return;
      }
      if (body.stream) {
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        res.write('data: {"choices":[{"delta":{"content":"Resposta "}}]}\n\n');
        res.write('data: {"choices":[{"delta":{"content":"local."}}]}\n\n');
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          choices: [{ message: { content: 'Resposta do provedor local fake.' } }],
          usage: { prompt_tokens: 11, completion_tokens: 6, total_tokens: 17 },
        }),
      );
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}/v1`, state });
    });
  });
}

function makeConfig(values: Record<string, string>) {
  return {
    get: jest.fn((key: string, def?: unknown) => (values[key] !== undefined ? values[key] : def)),
  } as any;
}

function makeInMemoryCache() {
  const store = new Map<string, number>();
  return {
    increment: jest.fn(async (key: string) => {
      const next = (store.get(key) ?? 0) + 1;
      store.set(key, next);
      return next;
    }),
    decrement: jest.fn(async (key: string) => {
      store.set(key, (store.get(key) ?? 0) - 1);
    }),
  } as any;
}

describe('Sprint 22 — gateway contra provedor OpenAI-compatível fake (HTTP real)', () => {
  let server: Server;
  let baseUrl: string;
  let state: FakeState;

  beforeAll(async () => {
    ({ server, baseUrl, state } = await startFakeProvider());
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const localConfig = (extra: Record<string, string> = {}) =>
    makeConfig({
      AI_PROVIDER: 'openai',
      AI_OPENAI_BASE_URL: baseUrl,
      AI_OPENAI_MODEL: 'fake-local',
      ...extra,
    });

  it('complete + stream funcionam só com configuração (sem chave: caminho local)', async () => {
    const client = new LlmClient(localConfig());
    expect(client.isAvailable).toBe(true);

    await expect(
      client.complete({ messages: [{ role: 'user', content: 'oi' }], purpose: 'hint' }),
    ).resolves.toBe('Resposta do provedor local fake.');
    // Sem chave configurada, nenhum Authorization foi ao servidor.
    expect(state.lastHeaders.authorization).toBeUndefined();

    const deltas: string[] = [];
    for await (const delta of client.stream({
      messages: [{ role: 'user', content: 'oi' }],
      purpose: 'chat-stream',
    })) {
      deltas.push(delta);
    }
    expect(deltas.join('')).toBe('Resposta local.');
  });

  it('cota no limite EXATO: 2 chamadas passam; a 3ª é recusada sem tocar o servidor', async () => {
    const usage = new AiUsageService(
      makeConfig({ AI_DAILY_QUOTA_FREE: '2' }),
      undefined,
      makeInMemoryCache(),
    );
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ plan: 'free' }) } } as any;
    const client = new LlmClient(localConfig(), usage, prisma);

    const before = state.requests;
    await client.complete({ messages: [{ role: 'user', content: '1' }], userId: 'aluno-1', purpose: 'hint' });
    await client.complete({ messages: [{ role: 'user', content: '2' }], userId: 'aluno-1', purpose: 'hint' });
    const err = await client
      .complete({ messages: [{ role: 'user', content: '3' }], userId: 'aluno-1', purpose: 'hint' })
      .catch((e) => e);
    expect(err).toBeInstanceOf(LlmQuotaExceededError);
    expect(state.requests).toBe(before + 2);
  });

  it('kill switch ligado: complete lança unavailable e o servidor não recebe nada', async () => {
    const client = new LlmClient(localConfig({ AI_TUTOR_ENABLED: 'false' }));
    expect(client.isAvailable).toBe(false);
    expect(client.unavailableReason).toBe('disabled');
    const before = state.requests;
    const err = await client
      .complete({ messages: [{ role: 'user', content: 'oi' }] })
      .catch((e) => e);
    expect(err).toBeInstanceOf(LlmRequestError);
    expect(err.kind).toBe('unavailable');
    expect(state.requests).toBe(before);
  });

  it('modelo aposentado no endpoint: 404 vira kind model-unavailable', async () => {
    const client = new LlmClient(localConfig({ AI_OPENAI_MODEL: 'modelo-aposentado' }));
    const err = await client
      .complete({ messages: [{ role: 'user', content: 'oi' }] })
      .catch((e) => e);
    expect(err).toBeInstanceOf(LlmRequestError);
    expect((err as LlmRequestError).kind).toBe('model-unavailable');
  });
});
