import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LlmClient } from '../ai/llm-client';
import { AiUsageService } from '../ai/llm/ai-usage.service';
import { EntitlementsService } from '../plans/entitlements.service';
import { PrismaService } from '../prisma/prisma.service';
import { InterviewService } from './interview.service';

/**
 * Fase 2 premium — travas do simulador de entrevista:
 * - criação não consome LLM nem cota (pergunta inicial determinística);
 * - 1 sessão ativa por usuário; cap de 20 turnos;
 * - sem reserva de cota = 429 `quota-exceeded`, sem chamada LLM;
 * - falha do provedor = estorno da reserva + 503, sem registrar turno;
 * - relatório final persistido com rubrica; sem LLM, cai para a
 *   agregação determinística das avaliações por turno (sem inventar).
 */
describe('InterviewService', () => {
  let service: InterviewService;

  const mockPrisma = {
    interviewSession: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    interviewTurn: { create: jest.fn() },
    interviewReport: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const mockLlm = { complete: jest.fn() };
  const mockUsage = { reserve: jest.fn(), refund: jest.fn() };
  const mockEntitlements = { getUserPlan: jest.fn() };

  const activeSession = (candidateCount: number) => ({
    id: 'sess-1',
    userId: 'user-1',
    mode: 'technical',
    track: 'java',
    status: 'active',
    turns: [
      { role: 'interviewer', content: 'Pergunta inicial' },
      ...Array.from({ length: candidateCount }, (_, i) => ({
        role: 'candidate',
        content: `resposta ${i}`,
        evaluation: {
          correcao: { score: 5, evidence: 'ok' },
          complexidade: { score: 2, evidence: 'fraco' },
          casosDeBorda: { score: 2, evidence: 'fraco' },
          clareza: { score: 4, evidence: 'ok' },
        },
      })),
    ],
    report: null,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    // Os elementos do $transaction são os retornos dos creates: devolvem
    // o próprio `data` para o teste inspecionar o que seria persistido.
    mockPrisma.interviewTurn.create.mockImplementation((arg: { data: unknown }) => ({
      data: arg.data,
    }));
    mockPrisma.interviewReport.create.mockImplementation((arg: { data: unknown }) => ({
      data: arg.data,
    }));
    mockEntitlements.getUserPlan.mockResolvedValue('pro');
    mockUsage.reserve.mockResolvedValue({ ok: true, used: 1, limit: 200 });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LlmClient, useValue: mockLlm },
        { provide: AiUsageService, useValue: mockUsage },
        { provide: EntitlementsService, useValue: mockEntitlements },
      ],
    }).compile();
    service = module.get<InterviewService>(InterviewService);
  });

  it('criação não consome LLM nem cota e usa pergunta inicial determinística', async () => {
    mockPrisma.interviewSession.findFirst.mockResolvedValue(null);
    mockPrisma.interviewSession.create.mockResolvedValue({ id: 'sess-1' });

    const result = await service.createSession('user-1', 'technical', 'java');

    expect(result.id).toBe('sess-1');
    expect(mockLlm.complete).not.toHaveBeenCalled();
    expect(mockUsage.reserve).not.toHaveBeenCalled();
    const data = mockPrisma.interviewSession.create.mock.calls[0][0].data;
    expect(data.turns.create[0].content).toContain('dois números');
  });

  it('rejeita segunda sessão ativa', async () => {
    mockPrisma.interviewSession.findFirst.mockResolvedValue({ id: 'sess-0' });
    await expect(service.createSession('user-1', 'technical')).rejects.toThrow(
      'já tem uma sessão de entrevista ativa',
    );
  });

  it('resposta no cap de 20 turnos é rejeitada antes de qualquer chamada LLM', async () => {
    mockPrisma.interviewSession.findUnique.mockResolvedValue(activeSession(20));
    await expect(service.answer('user-1', 'sess-1', 'resposta')).rejects.toThrow(
      'Limite de 20 turnos',
    );
    expect(mockUsage.reserve).not.toHaveBeenCalled();
    expect(mockLlm.complete).not.toHaveBeenCalled();
  });

  it('cota esgotada = 429 quota-exceeded, sem chamar o LLM', async () => {
    mockPrisma.interviewSession.findUnique.mockResolvedValue(activeSession(0));
    mockUsage.reserve.mockResolvedValue({ ok: false, used: 200, limit: 200 });
    let error: HttpException | undefined;
    try {
      await service.answer('user-1', 'sess-1', 'resposta');
    } catch (err) {
      error = err as HttpException;
    }
    expect(error?.getStatus()).toBe(429);
    expect((error?.getResponse() as { reason?: string }).reason).toBe('quota-exceeded');
    expect(mockLlm.complete).not.toHaveBeenCalled();
  });

  it('resposta gera avaliação por turno com rubrica e próxima pergunta', async () => {
    mockPrisma.interviewSession.findUnique.mockResolvedValue(activeSession(0));
    mockPrisma.$transaction.mockResolvedValue([{}, {}]);
    mockLlm.complete.mockResolvedValue(
      JSON.stringify({
        feedback: 'Boa intuição, mas faltou o custo.',
        scores: {
          correcao: { score: 4, evidence: 'dois números' },
          complexidade: { score: 2, evidence: 'não citou O(n)' },
          casosDeBorda: { score: 1, evidence: 'não evidenciado' },
          clareza: { score: 4, evidence: 'explicação direta' },
        },
        nextQuestion: 'E se a lista tiver 1 milhão de itens?',
      }),
    );

    await service.answer('user-1', 'sess-1', 'uso hash map');

    expect(mockUsage.reserve).toHaveBeenCalledWith('user-1', 'pro');
    // Reserva feita aqui; o LlmClient é chamado SEM userId (sem dupla cobrança).
    expect(mockLlm.complete).toHaveBeenCalledTimes(1);
    expect(mockLlm.complete.mock.calls[0][0]).not.toHaveProperty('userId');
    const candidateTurn = mockPrisma.$transaction.mock.calls[0][0][0];
    expect(candidateTurn.data.evaluation.correcao.score).toBe(4);
    expect(candidateTurn.data.evaluation.casosDeBorda.score).toBe(1);
    const interviewerTurn = mockPrisma.$transaction.mock.calls[0][0][1];
    expect(interviewerTurn.data.content).toContain('1 milhão de itens');
  });

  it('falha do provedor estorna a reserva e não registra o turno', async () => {
    mockPrisma.interviewSession.findUnique.mockResolvedValue(activeSession(0));
    mockLlm.complete.mockRejectedValue(new Error('upstream down'));
    await expect(service.answer('user-1', 'sess-1', 'resposta')).rejects.toThrow(
      'indisponível no momento',
    );
    expect(mockUsage.refund).toHaveBeenCalledWith('user-1');
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('finish gera relatório persistido com pontos fortes, fracos e próximos passos', async () => {
    mockPrisma.interviewSession.findUnique.mockResolvedValue(activeSession(1));
    const report = { id: 'rep-1' };
    mockPrisma.$transaction.mockResolvedValue([report, {}]);
    mockLlm.complete.mockResolvedValue(
      JSON.stringify({
        scores: { correcao: { score: 5, evidence: 'ok' } },
        strengths: ['Correção'],
        gaps: ['Casos de borda'],
        nextSteps: ['testes de borda', 'complexidade'],
      }),
    );

    const result = await service.finish('user-1', 'sess-1');

    expect(result).toBe(report);
    expect(mockUsage.reserve).toHaveBeenCalledTimes(1);
    const created = mockPrisma.$transaction.mock.calls[0][0][0];
    expect(created.data.gaps).toContain('Casos de borda');
    expect(created.data.nextSteps).toContain('complexidade');
  });

  it('finish sem LLM usa a agregação das avaliações por turno, sem inventar nota', async () => {
    mockPrisma.interviewSession.findUnique.mockResolvedValue(activeSession(1));
    const report = { id: 'rep-1' };
    mockPrisma.$transaction.mockResolvedValue([report, {}]);
    mockLlm.complete.mockRejectedValue(new Error('upstream down'));

    await service.finish('user-1', 'sess-1');

    expect(mockUsage.refund).toHaveBeenCalledWith('user-1');
    const created = mockPrisma.$transaction.mock.calls[0][0][0];
    // complexidade e casosDeBorda com média 2 viram gaps; correcao 5 vira forte.
    expect(created.data.gaps).toContain('Complexidade');
    expect(created.data.strengths).toContain('Correção');
  });

  it('finish sem nenhuma resposta é rejeitado', async () => {
    mockPrisma.interviewSession.findUnique.mockResolvedValue(activeSession(0));
    await expect(service.finish('user-1', 'sess-1')).rejects.toThrow(
      'ao menos uma pergunta',
    );
  });
});
