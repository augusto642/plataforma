import { readFileSync } from 'fs';
import { join } from 'path';
import { AiService, PedagogicalFeedback } from '../ai.service';
import { LlmClient } from '../llm-client';

/**
 * Sprint 22 — Golden set contra o PROVEDOR REAL (gate sob demanda).
 *
 * O spec irmão (`golden-set.spec.ts`) roda os 16 casos contra a engine
 * heurística com o LLM mockado — ele prova o fallback, não o caminho
 * real. ESTE spec roda os MESMOS 16 casos com o gateway de verdade,
 * resolvido SÓ por variáveis de ambiente: é a prova de que a tutora
 * responde com um LLM de verdade, no tier certo e sem spoiler.
 *
 * COMO RODAR (a partir de apps/api):
 *
 *   # Gemini (chave do Google AI Studio):
 *   GOLDEN_LIVE=1 AI_API_KEY=<chave> npx jest src/ai/golden/golden-live.spec.ts
 *
 *   # OpenAI-compatível remoto:
 *   GOLDEN_LIVE=1 AI_PROVIDER=openai AI_OPENAI_API_KEY=<chave> \
 *     AI_OPENAI_MODEL=<modelo> npx jest src/ai/golden/golden-live.spec.ts
 *
 *   # Modelo local (Ollama servindo em localhost:11434):
 *   GOLDEN_LIVE=1 AI_PROVIDER=openai \
 *     AI_OPENAI_BASE_URL=http://localhost:11434/v1 AI_OPENAI_MODEL=llama3.1 \
 *     npx jest src/ai/golden/golden-live.spec.ts
 *
 * Sem GOLDEN_LIVE=1 o spec é PULADO (a suíte normal nunca chama a
 * rede). Com GOLDEN_LIVE=1 mas sem provedor utilizável, o gate FALHA
 * alto de propósito — é um portão, não um enfeite.
 *
 * O que reprova (100%, sem tolerância):
 *  - qualquer caso respondido pela heurística (source !== 'llm');
 *  - tier diferente do esperado pelo histórico do caso;
 *  - qualquer substring `forbidden` do caso na saída ou no payload
 *    persistido;
 *  - o errorMessage integral de teste oculto falho;
 *  - linha distintiva da solução de referência na saída;
 *  - bloco de código cercado com mais de 3 linhas úteis.
 *
 * O que tem tolerância (forma socrática, ≥ 90% dos casos — modelos
 * variam na redação, não na segurança):
 *  - summary não vazio, ao menos 1 hint, e presença de pergunta
 *    socrática ('?') no summary ou nos hints.
 */

const LIVE = process.env.GOLDEN_LIVE === '1';
const describeLive = LIVE ? describe : describe.skip;

jest.setTimeout(120_000);

interface GoldenTestResult {
  name: string;
  passed: boolean;
  isHidden: boolean;
  errorMessage: string | null;
  durationMs?: number;
}

interface GoldenCase {
  id: string;
  errorClass: string;
  language: string;
  activity: { title: string; description: string };
  studentCode: string;
  referenceSolution: string;
  history: { failedSubmissions: number; chatMessages: number };
  failedTests: GoldenTestResult[];
  expectedTier: 1 | 2 | 3;
  expectedConceptContains?: string;
  required: string[];
  requiredAny: string[];
  forbidden: string[];
}

interface GoldenSetFile {
  version: number;
  description: string;
  cases: GoldenCase[];
}

const goldenSet = JSON.parse(
  readFileSync(join(__dirname, 'golden-set.json'), 'utf-8'),
) as GoldenSetFile;

const normalizeCode = (text: string): string =>
  text.toLowerCase().replace(/\s+/g, '');

function distinctiveSolutionLines(gc: GoldenCase): string[] {
  const studentNormalized = normalizeCode(gc.studentCode);
  return gc.referenceSolution
    .split('\n')
    .map((line) => normalizeCode(line))
    .filter((line) => line.length >= 10)
    .filter((line) => !studentNormalized.includes(line));
}

/** ConfigService mínimo que lê o process.env de verdade. */
function envConfigService() {
  return {
    get: (key: string, def?: unknown) =>
      process.env[key] !== undefined && process.env[key] !== '' ? process.env[key] : def,
  } as any;
}

async function runCaseLive(
  llm: LlmClient,
  gc: GoldenCase,
): Promise<{ feedback: PedagogicalFeedback; feedbackText: string; persistedText: string }> {
  const update = jest.fn().mockResolvedValue({});
  const prismaMock = {
    submission: {
      findFirst: jest.fn().mockResolvedValue({
        id: `sub-${gc.id}`,
        activityId: 'act-golden',
        userId: 'user-golden',
        aiFeedback: null,
        aiHints: null,
        codeSnapshot: gc.studentCode,
        activity: {
          title: gc.activity.title,
          description: gc.activity.description,
          language: gc.language,
        },
        testResults: gc.failedTests.map((t, i) => ({
          id: `tcr-${gc.id}-${i}`,
          submissionId: `sub-${gc.id}`,
          stdout: null,
          stderr: null,
          durationMs: t.durationMs ?? null,
          ...t,
        })),
      }),
      update,
      count: jest.fn().mockResolvedValue(gc.history.failedSubmissions),
    },
    aiChatMessage: {
      count: jest.fn().mockResolvedValue(gc.history.chatMessages),
    },
  };

  const service = new AiService(prismaMock as any, llm);
  const feedback = await service.generatePedagogicalHint(`sub-${gc.id}`, 'user-golden');
  const feedbackText = [feedback.summary, ...feedback.hints, feedback.suggestedConcept].join('\n');
  const persistedText = update.mock.calls
    .map((call) => JSON.stringify(call[0]?.data ?? {}))
    .join('\n');
  return { feedback, feedbackText, persistedText };
}

describeLive('Sprint 22 — Golden set contra o provedor REAL (gate sob demanda)', () => {
  const llm = new LlmClient(envConfigService());
  const formResults: boolean[] = [];

  it('pré-condição: há um provedor de LLM utilizável configurado no ambiente', () => {
    expect(llm.isAvailable).toBe(true);
    expect(llm.providerId).toBeTruthy();
    expect(llm.model).toBeTruthy();
  });

  for (const gc of goldenSet.cases) {
    it(`[${gc.id}] LLM real responde no tier ${gc.expectedTier}, sem spoiler`, async () => {
      const { feedback, feedbackText, persistedText } = await runCaseLive(llm, gc);
      const everything = `${feedbackText}\n${persistedText}`;

      // O caminho REAL respondeu — fallback aqui é reprovação.
      expect(feedback.source).toBe('llm');

      // Tier dirigido pelo histórico, igual ao gate offline.
      expect(feedback.tier).toBe(gc.expectedTier);

      // Anti-spoiler: proibidos do caso + stderr de teste oculto.
      for (const forbidden of gc.forbidden) {
        expect(everything).not.toContain(forbidden);
      }
      for (const t of gc.failedTests) {
        if (t.isHidden && !t.passed && t.errorMessage) {
          expect(everything).not.toContain(t.errorMessage);
        }
      }

      // Anti-solução: linhas distintivas da referência fora da saída.
      const normalizedOutput = normalizeCode(everything);
      for (const line of distinctiveSolutionLines(gc)) {
        expect(normalizedOutput).not.toContain(line);
      }

      // Anti-solução estrutural: bloco cercado com > 3 linhas úteis.
      const codeBlocks = feedbackText.match(/```[\s\S]*?```/g) || [];
      for (const block of codeBlocks) {
        expect(block.split('\n').length).toBeLessThanOrEqual(5);
      }

      // Forma socrática (contada; a régua de 90% fecha no último teste).
      const hasQuestion = /\?/.test(feedback.summary) || feedback.hints.some((h) => h.includes('?'));
      formResults.push(
        Boolean(feedback.summary?.trim()) && feedback.hints.length >= 1 && hasQuestion,
      );
    });
  }

  it('forma socrática em ≥ 90% dos casos', () => {
    const passed = formResults.filter(Boolean).length;
    expect(formResults.length).toBe(goldenSet.cases.length);
    expect(passed / formResults.length).toBeGreaterThanOrEqual(0.9);
  });
});
