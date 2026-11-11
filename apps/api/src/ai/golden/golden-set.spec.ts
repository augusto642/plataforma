import { readFileSync } from 'fs';
import { join } from 'path';
import { AiService, PedagogicalFeedback } from '../ai.service';

/**
 * B06 — Golden set do tutor IA (runner).
 *
 * Régua versionada de qualidade do tutor: roda cada caso de
 * `golden-set.json` contra o AiService como caixa-preta, pelo ponto de
 * entrada público `generatePedagogicalHint`, no caminho OFFLINE e
 * determinístico (LlmClient mockado com `isAvailable: false` → engine
 * heurística). O Prisma é mockado com a estrutura real que o tutor
 * recebe (Submission + Activity + TestCaseResult[]) e o tier é dirigido
 * pelo histórico do caso (contadores que alimentam `calculateTier`).
 *
 * Um caso reprova se:
 *  - o tier devolvido diferir do esperado;
 *  - o conceito sugerido divergir do padrão do tier;
 *  - qualquer substring de `forbidden` aparecer na saída — incluindo o
 *    payload PERSISTIDO (aiFeedback/aiHints), que é o que o aluno lê
 *    depois via progresso da submissão;
 *  - o errorMessage integral de qualquer teste OCULTO falho aparecer
 *    (derivação automática, além da lista `forbidden` do caso);
 *  - a saída contiver código que resolve o exercício (anti-solução:
 *    linhas distintivas da solução de referência — normalizadas e
 *    ausentes do código do aluno — não podem aparecer na saída; e
 *    nenhum bloco de código cercado com mais de 3 linhas é aceito);
 *  - as assertivas obrigatórias (`required` / `requiredAny`) do padrão
 *    socrático não forem satisfeitas.
 */

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

/**
 * Linhas da solução de referência que a distinguem do código do aluno:
 * são o "gabarito" que a saída do tutor nunca pode reproduzir.
 */
function distinctiveSolutionLines(gc: GoldenCase): string[] {
  const studentNormalized = normalizeCode(gc.studentCode);
  return gc.referenceSolution
    .split('\n')
    .map((line) => normalizeCode(line))
    .filter((line) => line.length >= 10)
    .filter((line) => !studentNormalized.includes(line));
}

interface RunResult {
  feedback: PedagogicalFeedback;
  feedbackText: string;
  persistedText: string;
}

async function runCase(gc: GoldenCase): Promise<RunResult> {
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
  const llmMock = {
    // Sprint 22: gateway sem provedor → engine heurística (offline).
    isAvailable: false,
    unavailableReason: 'no-provider',
    providerId: null,
    model: null,
    complete: jest.fn(),
    stream: jest.fn(),
  };

  // M12 — AiService é fachada: construção fora do Nest via fromRawDeps.
  const service = AiService.fromRawDeps(prismaMock as any, llmMock as any);
  const feedback = await service.generatePedagogicalHint(
    `sub-${gc.id}`,
    'user-golden',
  );

  const feedbackText = [feedback.summary, ...feedback.hints, feedback.suggestedConcept].join('\n');
  const persistedText = update.mock.calls
    .map((call) => JSON.stringify(call[0]?.data ?? {}))
    .join('\n');

  return { feedback, feedbackText, persistedText };
}

describe('B06 — Golden set do tutor IA (meta)', () => {
  it('está versionado e cobre as classes de erro e os 3 tiers', () => {
    expect(goldenSet.version).toBe(1);
    expect(goldenSet.cases.length).toBeGreaterThanOrEqual(14);

    const ids = goldenSet.cases.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);

    const classes = new Set(goldenSet.cases.map((c) => c.errorClass));
    for (const requiredClass of [
      'sintaxe',
      'tipo',
      'indice-lista',
      'laco',
      'condicao',
      'funcao-retorno',
      'variavel-indefinida',
    ]) {
      expect(classes.has(requiredClass)).toBe(true);
    }

    const tiers = new Set(goldenSet.cases.map((c) => c.expectedTier));
    expect(tiers).toEqual(new Set([1, 2, 3]));

    const languages = new Set(goldenSet.cases.map((c) => c.language));
    expect(languages.has('portugol')).toBe(true);
    expect(languages.has('python')).toBe(true);
    expect(languages.has('javascript')).toBe(true);

    // Todo caso precisa de gabarito p/ a checagem anti-solução.
    for (const gc of goldenSet.cases) {
      expect(distinctiveSolutionLines(gc).length).toBeGreaterThan(0);
    }
  });
});

describe('B06 — Golden set do tutor IA (casos)', () => {
  for (const gc of goldenSet.cases) {
    it(`[${gc.id}] tier ${gc.expectedTier}, sem spoiler, no padrão socrático`, async () => {
      const { feedback, feedbackText, persistedText } = await runCase(gc);
      const everything = `${feedbackText}\n${persistedText}`;

      // Tier e conceito do padrão.
      expect(feedback.tier).toBe(gc.expectedTier);
      if (gc.expectedConceptContains) {
        expect(feedback.suggestedConcept).toContain(gc.expectedConceptContains);
      }

      // Assertivas obrigatórias do padrão socrático.
      for (const required of gc.required) {
        expect(feedbackText).toContain(required);
      }
      if (gc.requiredAny.length > 0) {
        expect(gc.requiredAny.some((marker) => feedbackText.includes(marker))).toBe(true);
      }

      // Assertivas proibidas do caso (valores/stderr de testes ocultos).
      for (const forbidden of gc.forbidden) {
        expect(everything).not.toContain(forbidden);
      }

      // Derivação automática: o errorMessage integral de qualquer teste
      // oculto falho nunca pode aparecer, em nenhuma superfície.
      for (const t of gc.failedTests) {
        if (t.isHidden && !t.passed && t.errorMessage) {
          expect(everything).not.toContain(t.errorMessage);
        }
      }

      // Anti-solução: nenhuma linha distintiva da referência na saída.
      const normalizedOutput = normalizeCode(everything);
      for (const line of distinctiveSolutionLines(gc)) {
        expect(normalizedOutput).not.toContain(line);
      }

      // Anti-solução estrutural: bloco de código cercado > 3 linhas.
      const codeBlocks = feedbackText.match(/```[\s\S]*?```/g) || [];
      for (const block of codeBlocks) {
        expect(block.split('\n').length).toBeLessThanOrEqual(5);
      }
    });
  }
});
