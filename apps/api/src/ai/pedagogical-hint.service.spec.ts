import { NotFoundException } from '@nestjs/common';
import { PedagogicalHintService } from './pedagogical-hint.service';
import { SocraticTierService } from './socratic-tier.service';
import { TutorKnowledgeService } from './tutor-knowledge.service';
import { PromptSafetyService } from './prompt-safety.service';
import { HeuristicTutorService } from './heuristic-tutor.service';
import { LlmQuotaExceededError, LlmQuotaUnavailableError } from './llm-client';

/** M12 — specs do PedagogicalHintService (extraído do AiService). */
describe('PedagogicalHintService', () => {
  const prismaMock = {
    submission: {
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0),
    },
    aiChatMessage: { count: jest.fn().mockResolvedValue(0) },
  };
  const llmMock = {
    isAvailable: false,
    unavailableReason: 'no-provider' as string | null,
    providerId: null as string | null,
    model: null as string | null,
    complete: jest.fn(),
    stream: jest.fn(),
  };

  const build = () =>
    new PedagogicalHintService(
      prismaMock as any,
      llmMock as any,
      new SocraticTierService(prismaMock as any),
      new TutorKnowledgeService(prismaMock as any),
      new PromptSafetyService(),
      new HeuristicTutorService(),
    );

  const submissionFixture = (over: Record<string, any> = {}) => ({
    id: 'sub-1',
    activityId: 'act-1',
    activity: { title: 'Soma de Dois Números', description: 'Retorne a + b' },
    testResults: [{ passed: false, name: 'caso 1', errorMessage: 'expected 5 got undefined' }],
    codeSnapshot: 'function somar(a, b) { const x = a + b; }',
    aiFeedback: null,
    aiHints: null,
    ...over,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    llmMock.isAvailable = false;
    llmMock.unavailableReason = 'no-provider';
    llmMock.providerId = null;
    llmMock.model = null;
    prismaMock.submission.count.mockResolvedValue(0);
    prismaMock.aiChatMessage.count.mockResolvedValue(0);
  });

  it('submissão inexistente: 404', async () => {
    prismaMock.submission.findFirst.mockResolvedValue(null);
    await expect(build().generatePedagogicalHint('nope', 'u1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sem provedor: heurística rotulada + persistência do feedback', async () => {
    prismaMock.submission.findFirst.mockResolvedValue(submissionFixture());
    const feedback = await build().generatePedagogicalHint('sub-1', 'user-1');
    expect(feedback.source).toBe('heuristic');
    expect(feedback.fallbackReason).toBe('no-provider');
    expect(feedback.tier).toBe(1);
    expect(prismaMock.submission.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: { aiFeedback: feedback.summary, aiHints: JSON.stringify(feedback.hints) },
    });
  });

  it('feedback cacheado: devolve o persistido e anexa o escape quando esgotado', async () => {
    prismaMock.submission.count.mockResolvedValue(5);
    prismaMock.submission.findFirst.mockResolvedValue(
      submissionFixture({
        aiFeedback: 'Resumo cacheado.',
        aiHints: JSON.stringify(['dica cacheada']),
        activity: { title: 'Soma', description: 'Retorne a + b', conceptTags: ['loops'] },
      }),
    );
    const feedback = await build().generatePedagogicalHint('sub-1', 'user-1');
    expect(feedback.summary).toBe('Resumo cacheado.');
    expect(feedback.escape?.kind).toBe('analogous-example');
    // Escape é dinâmico: não é persistido.
    expect(prismaMock.submission.update).not.toHaveBeenCalled();
  });

  it('com provedor: caminho LLM com proveniência e citação da base vazia sem "Fontes"', async () => {
    llmMock.isAvailable = true;
    llmMock.unavailableReason = null;
    llmMock.providerId = 'gemini';
    llmMock.model = 'gemini-3.5-flash-lite';
    llmMock.complete.mockResolvedValue(
      JSON.stringify({ summary: 'Resumo do tutor', hints: ['dica 1'], suggestedConcept: 'Lógica' }),
    );
    prismaMock.submission.findFirst.mockResolvedValue(submissionFixture());
    const feedback = await build().generatePedagogicalHint('sub-1', 'user-1');
    expect(feedback.source).toBe('llm');
    expect(feedback.provider).toBe('gemini');
    expect(feedback.model).toBe('gemini-3.5-flash-lite');
    expect(feedback.summary).toBe('Resumo do tutor');
    expect(llmMock.complete).toHaveBeenCalledTimes(1);
    const call = llmMock.complete.mock.calls[0][0];
    expect(call.userId).toBe('user-1');
    expect(call.purpose).toBe('hint');
    expect(call.jsonMode).toBe(true);
  });

  it('cota estourada: fallback heurístico com motivo quota-exceeded', async () => {
    llmMock.isAvailable = true;
    llmMock.unavailableReason = null;
    llmMock.complete.mockRejectedValue(new LlmQuotaExceededError(20, 20));
    prismaMock.submission.findFirst.mockResolvedValue(submissionFixture());
    const feedback = await build().generatePedagogicalHint('sub-1', 'user-1');
    expect(feedback.source).toBe('heuristic');
    expect(feedback.fallbackReason).toBe('quota-exceeded');
    expect(feedback.hints.length).toBeGreaterThan(0);
  });

  it('M17: backend de cota fora → quota-unavailable, sem erro ao aluno', async () => {
    llmMock.isAvailable = true;
    llmMock.unavailableReason = null;
    llmMock.complete.mockRejectedValue(new LlmQuotaUnavailableError());
    prismaMock.submission.findFirst.mockResolvedValue(submissionFixture());
    const feedback = await build().generatePedagogicalHint('sub-1', 'user-1');
    expect(feedback.source).toBe('heuristic');
    expect(feedback.fallbackReason).toBe('quota-unavailable');
    expect(feedback.hints.length).toBeGreaterThan(0);
  });
});
