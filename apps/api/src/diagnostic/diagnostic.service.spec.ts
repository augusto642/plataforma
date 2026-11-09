import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DiagnosticService } from './diagnostic.service';
import {
  ARCHETYPES,
  AXES,
  QUESTIONS,
  TRACK_NAMES,
  type AxisId,
} from './data/quiz-v1';

// ---------------------------------------------------------------------------
// Fixtures de respostas
// ---------------------------------------------------------------------------

type Answer = { questionId: string; optionId: string };

/** Respostas que maximizam um eixo: conhecimento dele certo, resto errado;
 *  em cada preferência, a opção de maior peso para o eixo. */
function answersForAxis(target: AxisId): Answer[] {
  return QUESTIONS.map((q) => {
    if (q.type === 'knowledge') {
      const optionId =
        q.axis === target
          ? (q.correctOptionId as string)
          : q.options.find((o) => o.id !== q.correctOptionId)?.id;
      return { questionId: q.id, optionId: optionId as string };
    }
    let best = q.options[0];
    for (const o of q.options) {
      if ((o.weights?.[target] ?? 0) > (best.weights?.[target] ?? 0)) best = o;
    }
    return { questionId: q.id, optionId: best.id };
  });
}

/** Respostas "equilibradas": conhecimento tudo errado e, nas preferências,
 *  escolha gulosa que minimiza a concentração em qualquer eixo. */
function balancedAnswers(): Answer[] {
  const totals: Record<AxisId, number> = {
    logica: 0,
    codigo: 0,
    web: 0,
    dados: 0,
    automacao: 0,
    jogos: 0,
  };
  return QUESTIONS.map((q) => {
    if (q.type === 'knowledge') {
      const wrong = q.options.find((o) => o.id !== q.correctOptionId);
      return { questionId: q.id, optionId: wrong?.id as string };
    }
    let best = q.options[0];
    let bestPeak = Number.POSITIVE_INFINITY;
    for (const o of q.options) {
      const peak = Math.max(
        ...AXES.map((a) => totals[a] + (o.weights?.[a] ?? 0)),
      );
      if (peak < bestPeak) {
        bestPeak = peak;
        best = o;
      }
    }
    for (const a of AXES) totals[a] += best.weights?.[a] ?? 0;
    return { questionId: q.id, optionId: best.id };
  });
}

// ---------------------------------------------------------------------------

describe('DiagnosticService', () => {
  let prisma: {
    diagnosticResult: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let jwt: { verifyAsync: jest.Mock };
  let config: { get: jest.Mock };
  let service: DiagnosticService;

  beforeEach(() => {
    prisma = {
      diagnosticResult: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(async ({ data }: any) => ({ id: 'result-1', ...data })),
        update: jest.fn(async ({ data }: any) => ({ id: 'result-1', ...data })),
      },
    };
    jwt = { verifyAsync: jest.fn() };
    config = {
      get: jest.fn((key: string, def?: any) =>
        key === 'JWT_ACCESS_SECRET' ? 'configured-secret' : def,
      ),
    };
    service = new DiagnosticService(prisma as any, jwt as any, config as any);
  });

  describe('getPublicQuiz', () => {
    it('expõe as 24 questões SEM gabarito, pesos ou qualquer resposta', () => {
      const quiz = service.getPublicQuiz();
      expect(quiz.version).toBe('v1');
      expect(quiz.questions).toHaveLength(24);

      const serialized = JSON.stringify(quiz);
      expect(serialized).not.toContain('correctOptionId');
      expect(serialized).not.toContain('weights');

      for (const q of quiz.questions) {
        expect(Object.keys(q).sort()).toEqual(
          ['axis', 'id', 'options', 'prompt', 'type'].sort(),
        );
        expect(q.options).toHaveLength(4);
        for (const o of q.options) {
          expect(Object.keys(o).sort()).toEqual(['id', 'label']);
        }
      }
    });

    it('o banco de questões tem 12 de conhecimento e 12 de preferência, 4 por eixo', () => {
      const knowledge = QUESTIONS.filter((q) => q.type === 'knowledge');
      const preference = QUESTIONS.filter((q) => q.type === 'preference');
      expect(knowledge).toHaveLength(12);
      expect(preference).toHaveLength(12);
      for (const axis of AXES) {
        expect(QUESTIONS.filter((q) => q.axis === axis)).toHaveLength(4);
        for (const q of knowledge.filter((k) => k.axis === axis)) {
          expect(q.correctOptionId).toBeDefined();
          expect(q.options.some((o) => o.id === q.correctOptionId)).toBe(true);
        }
      }
    });
    it('as respostas certas estão distribuídas entre as 4 posições (nenhuma posição sem nenhuma certa)', () => {
      const counts: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };
      for (const q of QUESTIONS.filter((q) => q.type === 'knowledge')) {
        counts[q.correctOptionId as string] += 1;
      }
      // Se uma posição nunca é a certa, ela vaza por eliminação.
      for (const pos of ['a', 'b', 'c', 'd']) {
        expect(counts[pos]).toBeGreaterThanOrEqual(2);
      }
    });

    it('todo arquétipo tem strengths como lista de 3 frases não vazias e trilha com nome legível', () => {
      for (const archetype of Object.values(ARCHETYPES)) {
        expect(Array.isArray(archetype.strengths)).toBe(true);
        expect(archetype.strengths).toHaveLength(3);
        for (const phrase of archetype.strengths) {
          expect(typeof phrase).toBe('string');
          expect(phrase.trim().length).toBeGreaterThan(0);
        }
        expect(TRACK_NAMES[archetype.recommendedTrack]).toBeTruthy();
      }
    });
  });

  describe('score — determinístico, um arquétipo por perfil', () => {
    const cases: { target: AxisId; archetype: string; track: string }[] = [
      { target: 'web', archetype: 'construtor-web', track: 'frontend' },
      { target: 'logica', archetype: 'resolvedor', track: 'backend' },
      { target: 'codigo', archetype: 'resolvedor', track: 'backend' },
      { target: 'automacao', archetype: 'automatizador', track: 'ai' },
      { target: 'jogos', archetype: 'criador-de-jogos', track: 'web3' },
      { target: 'dados', archetype: 'analista', track: 'ai' },
    ];

    for (const { target, archetype, track } of cases) {
      it(`perfil dominante em ${target} → arquétipo ${archetype} (trilha ${track})`, () => {
        const { scores, archetype: result } = service.score(
          answersForAxis(target),
        );
        expect(result.id).toBe(archetype);
        expect(result.recommendedTrack).toBe(track);
        // O eixo alvo é o maior do radar e a folga passa da margem "flat".
        const others = AXES.filter((a) => a !== target).map((a) => scores[a]);
        expect(scores[target]).toBeGreaterThan(Math.max(...others) + 8);
        for (const axis of AXES) {
          expect(scores[axis]).toBeGreaterThanOrEqual(0);
          expect(scores[axis]).toBeLessThanOrEqual(100);
        }
      });
    }

    it('perfil equilibrado (tudo no ponto de partida) → explorador', () => {
      const { archetype } = service.score(balancedAnswers());
      expect(archetype.id).toBe('explorador');
      expect(archetype.recommendedTrack).toBe('frontend');
      expect(archetype.strengths).toHaveLength(3);
      expect(
        archetype.strengths.every((s) => typeof s === 'string' && s.length > 0),
      ).toBe(true);
    });

    it('mesmas respostas → mesmo resultado (determinístico)', () => {
      const answers = answersForAxis('jogos');
      expect(service.score(answers)).toEqual(service.score(answers));
    });
  });

  describe('submit', () => {
    it('anônimo: persiste com userId null e devolve o contrato completo', async () => {
      const res = await service.submit({ answers: answersForAxis('web') });

      expect(prisma.diagnosticResult.create).toHaveBeenCalledTimes(1);
      const createdData = prisma.diagnosticResult.create.mock.calls[0][0].data;
      expect(createdData.userId).toBeNull();
      expect(createdData.quizVersion).toBe('v1');
      expect(createdData.archetype).toBe('construtor-web');
      expect(typeof createdData.sessionToken).toBe('string');
      expect(createdData.sessionToken.length).toBeGreaterThan(10);

      expect(res.sessionToken).toBe(createdData.sessionToken);
      expect(Object.keys(res.scores).sort()).toEqual([...AXES].sort());
      expect(res.archetype).toEqual({
        id: 'construtor-web',
        name: expect.any(String),
        description: expect.any(String),
        strengths: expect.arrayContaining([expect.any(String)]),
      });
      expect(res.archetype.strengths).toHaveLength(3);
      expect(res.recommendedTrack).toBe('frontend');
      expect(res.recommendedTrackName).toBe('Desenvolvimento Front-end');
    });

    it('com JWT válido: vincula o userId do token', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'user-9' });
      await service.submit(
        { answers: answersForAxis('dados') },
        'Bearer token-valido',
      );
      const createdData = prisma.diagnosticResult.create.mock.calls[0][0].data;
      expect(createdData.userId).toBe('user-9');
    });

    it('com JWT inválido: segue anônimo, sem bloquear o quiz', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('invalid'));
      const res = await service.submit({ answers: answersForAxis('dados') });
      const createdData = prisma.diagnosticResult.create.mock.calls[0][0].data;
      expect(createdData.userId).toBeNull();
      expect(res.archetype.id).toBe('analista');
    });

    it('com sessionToken novo: cria usando o token enviado', async () => {
      const res = await service.submit({
        answers: answersForAxis('jogos'),
        sessionToken: 'token-da-sessao',
      });
      const createdData = prisma.diagnosticResult.create.mock.calls[0][0].data;
      expect(createdData.sessionToken).toBe('token-da-sessao');
      expect(res.sessionToken).toBe('token-da-sessao');
    });

    it('com sessionToken de resultado sem dono: atualiza (refazer o quiz)', async () => {
      prisma.diagnosticResult.findUnique.mockResolvedValue({
        id: 'result-7',
        userId: null,
        sessionToken: 'token-da-sessao',
      });
      // O Prisma devolve o registro completo no update (com sessionToken).
      prisma.diagnosticResult.update.mockImplementation(
        async ({ where, data }: any) => ({
          id: where.id,
          sessionToken: 'token-da-sessao',
          ...data,
        }),
      );
      const res = await service.submit({
        answers: answersForAxis('automacao'),
        sessionToken: 'token-da-sessao',
      });
      expect(prisma.diagnosticResult.create).not.toHaveBeenCalled();
      expect(prisma.diagnosticResult.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'result-7' } }),
      );
      expect(res.sessionToken).toBe('token-da-sessao');
      expect(res.archetype.id).toBe('automatizador');
    });

    it('com sessionToken de resultado de OUTRO usuário: cria resultado novo com token novo, sem tocar no original', async () => {
      prisma.diagnosticResult.findUnique.mockResolvedValue({
        id: 'result-alheio',
        userId: 'outro-usuario',
        sessionToken: 'token-alheio',
      });
      const res = await service.submit({
        answers: answersForAxis('web'),
        sessionToken: 'token-alheio',
      });
      // Nunca atualiza o resultado alheio...
      expect(prisma.diagnosticResult.update).not.toHaveBeenCalled();
      // ...e cria um resultado novo, com token novo gerado no servidor.
      expect(prisma.diagnosticResult.create).toHaveBeenCalledTimes(1);
      const createdData = prisma.diagnosticResult.create.mock.calls[0][0].data;
      expect(createdData.sessionToken).not.toBe('token-alheio');
      expect(createdData.userId).toBeNull();
      expect(res.sessionToken).toBe(createdData.sessionToken);
      expect(res.sessionToken).not.toBe('token-alheio');
    });

    it('rejeita questão desconhecida, opção inválida, duplicada e quiz incompleto', async () => {
      const valid = answersForAxis('web');

      const unknown = valid.map((a) => ({ ...a }));
      unknown[0] = { questionId: 'q99', optionId: 'a' };
      await expect(service.submit({ answers: unknown })).rejects.toThrow(
        BadRequestException,
      );

      const badOption = valid.map((a) => ({ ...a }));
      badOption[0] = { questionId: valid[0].questionId, optionId: 'z' };
      await expect(service.submit({ answers: badOption })).rejects.toThrow(
        BadRequestException,
      );

      const duplicated = [...valid.slice(1), valid[1]];
      await expect(service.submit({ answers: duplicated })).rejects.toThrow(
        BadRequestException,
      );

      await expect(
        service.submit({ answers: valid.slice(0, 23) }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getResult', () => {
    it('recupera o resultado persistido pelo sessionToken', async () => {
      const { scores } = service.score(answersForAxis('automacao'));
      prisma.diagnosticResult.findUnique.mockResolvedValue({
        id: 'result-1',
        userId: null,
        sessionToken: 'token-x',
        quizVersion: 'v1',
        answers: [],
        scores,
        archetype: 'automatizador',
        createdAt: new Date(),
      });
      const res = await service.getResult('token-x');
      expect(res.sessionToken).toBe('token-x');
      expect(res.scores).toEqual(scores);
      expect(res.archetype.id).toBe('automatizador');
      expect(res.recommendedTrack).toBe('ai');
      expect(res.recommendedTrackName).toBe('Inteligência Artificial');
    });

    it('token inexistente → 404', async () => {
      await expect(service.getResult('nao-existe')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
