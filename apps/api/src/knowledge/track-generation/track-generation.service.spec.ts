/**
 * TrackGenerationService (DESIGN §4.5, Fase H — H2/H3/H4/H5/H8).
 * Sem rede, sem banco real, sem LLM real: provedor stub, fila falsa,
 * Prisma falso, diretório temporário. O worker real (BullMQ/Redis) é
 * verificado no boot + QA com stack local, não aqui.
 */
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  TrackGenerationService,
  assertSegmentActivatable,
  exerciseFloor,
  filterJobSamples,
  planFreshResearch,
} from './track-generation.service';
import { TechVersionResolver } from './tech-version.resolver';
import { loadBudget, reserveCall } from './pipeline-budget';

const GEN_AT = '2026-10-24T00:00:00.000Z';

function draftSegment(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    trackSlug: 'desenvolvedor-java',
    stageSlug: 'java-basico',
    title: 'Java básico',
    order: 1,
    segmentVersion: 1,
    status: 'draft',
    generatedAt: GEN_AT,
    activities: [
      {
        slug: 'java-basico-sintaxe-ex1', title: 'Ex 1', conceptTags: ['sintaxe'],
        testCode: 'assert soma(2, 3) == 5', hiddenTests: '', referenceSolution: 'def soma(a, b):\n    return a + b\n',
        lessonPayload: { activityKind: 'exercise' },
      },
    ],
    ...over,
  };
}

describe('TrackGenerationService — regras puras', () => {
  it('filtro de vagas: 730 dentro, 731 fora, sem data excluída', () => {
    const { valid, stale, undated } = filterJobSamples(
      [
        { postedAt: '2024-10-24' },
        { postedAt: '2024-10-23' },
        { postedAt: null },
        { postedAt: '2025-06-01' },
      ],
      GEN_AT,
    );
    expect(valid.length).toBe(2);
    expect(stale).toBe(1);
    expect(undated).toBe(1);
  });

  it('piso: 40% reprova; 60% com tópico a 1 reprova; 3 por tópico + 50% aprova', () => {
    const mk = (kind: string, topic: string) => ({ conceptTags: [topic], lessonPayload: { activityKind: kind } });
    expect(exerciseFloor([mk('exercise', 'a'), mk('theory', 'a'), mk('theory', 'a'), mk('theory', 'a'), mk('theory', 'a')]).ok).toBe(false);
    const thin = [mk('exercise', 'a'), mk('exercise', 'a'), mk('exercise', 'a'), mk('exercise', 'b'), mk('theory', 'a')];
    expect(exerciseFloor(thin).ok).toBe(false); // tópico b com 1
    const ok = [mk('exercise', 'a'), mk('exercise', 'a'), mk('exercise', 'a'), mk('exercise', 'b'), mk('exercise', 'b'), mk('exercise', 'b')];
    expect(exerciseFloor(ok).ok).toBe(true);
  });

  it('gate de ativação: PENDENTE reprova; testes reais + solução aprovam', () => {
    const pending = draftSegment({
      activities: [{ slug: 'x', testCode: '# PENDENTE-AUTORIA-ADMIN: testes', hiddenTests: '', referenceSolution: '', lessonPayload: { activityKind: 'exercise' } }],
    });
    expect(assertSegmentActivatable(pending as never).length).toBeGreaterThan(0);
    expect(assertSegmentActivatable(draftSegment() as never)).toEqual([]);
  });

  it('frescor: vagas sempre frescas; roadmap 90d; vídeos/repos 30d', () => {
    const plan = planFreshResearch({ collectedAt: GEN_AT, id: 'research-x' }, '2026-12-01T00:00:00.000Z');
    expect(plan.jobs.mode).toBe('fresh');
    expect(plan.web.mode).toBe('reused');
    expect(plan.videosRepos.mode).toBe('fresh');
  });
});

describe('TrackGenerationService — draft determinístico', () => {
  it('buildSegmentDraft: 1 tópico ⇒ 4 atividades, piso ok, marketAligned só com amostra válida', () => {
    const svc = new TrackGenerationService(undefined, undefined, undefined, undefined, undefined, undefined);
    const { segment, report } = svc.buildSegmentDraft(
      {
        goal: 'desenvolvedor Java', goalSlug: 'desenvolvedor-java', stageSlug: 'java-basico',
        stageTitle: 'Java básico', topics: ['sintaxe'], stageOrder: 1, language: 'java', trigger: 'T4',
      },
      {
        id: 'research-x', collectedAt: GEN_AT, sourcesUnavailable: [],
        market: {
          skills: [
            { skill: 'sintaxe', samples: [{ postedAt: '2025-06-01', sourceUrl: 'https://vagas.example/1' }, { postedAt: '2024-10-23', sourceUrl: 'https://vagas.example/velha' }] },
          ],
        },
      } as never,
      GEN_AT,
    );
    expect((segment.activities as unknown[]).length).toBe(4);
    expect((report as { marketAligned: boolean }).marketAligned).toBe(true);
    expect((report as { sources: { jobs: { skills: Array<{ skill: string; sampleSize: number }> } } }).sources.jobs.skills[0].sampleSize).toBe(1);
  });

  it('buildSegmentDraft: jobs em sourcesUnavailable ⇒ sem selo de mercado (fail-closed por fonte)', () => {
    const svc = new TrackGenerationService(undefined, undefined, undefined, undefined, undefined, undefined);
    const { report } = svc.buildSegmentDraft(
      {
        goal: 'g', goalSlug: 'g', stageSlug: 's', stageTitle: 'S', topics: ['sintaxe'], stageOrder: 1, trigger: 'T4',
      },
      { id: 'research-x', collectedAt: GEN_AT, sourcesUnavailable: ['jobs'], market: { skills: [{ skill: 'sintaxe', samples: [{ postedAt: '2025-06-01' }] }] } } as never,
      GEN_AT,
    );
    expect((report as { marketAligned: boolean }).marketAligned).toBe(false);
  });
});

describe('TrackGenerationService — redação LLM com teto e backoff', () => {
  it('redação válida aplica descrições; 429 duas vezes ⇒ 3ª tentativa vence (teto 3)', async () => {
    let calls = 0;
    const llm = {
      complete: async () => {
        calls++;
        if (calls < 3) throw new Error('429 rate limit exceeded');
        return JSON.stringify({ activities: [{ slug: 'java-basico-sintaxe-ex1', description: 'Enunciado redigido pelo modelo.', instructions: 'Resolva.' }] });
      },
    };
    const dir = mkdtempSync(join(tmpdir(), 'track-llm-'));
    const svc = new TrackGenerationService(undefined, undefined, undefined, llm as never, undefined, undefined);
    const segment = draftSegment();
    const out = await svc.redactSegmentWithLlm(segment as never, { budgetDir: dir, delayMs: async () => undefined });
    expect(out.calls).toBe(3);
    expect(out.applied).toBe(1);
    expect((segment.activities as Array<{ description: string }>)[0].description).toBe('Enunciado redigido pelo modelo.');
    expect(loadBudget(dir).used).toBe(3); // cada tentativa reserva do orçamento (retry consome)
  });

  it('429 sempre ⇒ falha após 3 tentativas e nada é aplicado', async () => {
    const llm = { complete: async () => { throw new Error('429 rate limit exceeded'); } };
    const dir = mkdtempSync(join(tmpdir(), 'track-llm-fail-'));
    const svc = new TrackGenerationService(undefined, undefined, undefined, llm as never, undefined, undefined);
    await expect(svc.redactSegmentWithLlm(draftSegment() as never, { budgetDir: dir, delayMs: async () => undefined })).rejects.toThrow(/após 3 tentativas/);
  });

  it('sem LLM ⇒ erro explícito (fail-closed, sem redação fingida)', async () => {
    const svc = new TrackGenerationService(undefined, undefined, undefined, undefined, undefined, undefined);
    await expect(svc.redactSegmentWithLlm(draftSegment() as never, { budgetDir: mkdtempSync(join(tmpdir(), 'track-nollm-')) })).rejects.toThrow(/LLM provider unavailable/);
  });

  it('redação com slug desconhecido é rejeitada (nunca cria atividade)', async () => {
    const llm = { complete: async () => JSON.stringify({ activities: [{ slug: 'atividade-inventada', description: 'x', instructions: 'y' }] }) };
    const svc = new TrackGenerationService(undefined, undefined, undefined, llm as never, undefined, undefined);
    await expect(svc.redactSegmentWithLlm(draftSegment() as never, { budgetDir: mkdtempSync(join(tmpdir(), 'track-badslug-')), delayMs: async () => undefined })).rejects.toThrow(/slug desconhecido/);
  });
});

describe('TrackGenerationService — fila, aprovação e progresso', () => {
  it('enqueue dedupa job existente (T1+T2 ⇒ 1 job)', async () => {
    const added: Array<unknown> = [];
    const fakeQueue = {
      getJob: async () => ({ getState: async () => 'waiting' }),
      add: async (...a: unknown[]) => { added.push(a); return {}; },
    };
    const svc = new TrackGenerationService(fakeQueue as never, undefined, undefined, undefined, undefined, undefined);
    const res = await svc.enqueueSegment({
      goal: 'g', goalSlug: 'g', stageSlug: 's', stageTitle: 'S', topics: ['a'], stageOrder: 1, trigger: 'T2',
    });
    expect(res.deduped).toBe(true);
    expect(added.length).toBe(0);
    const fakeQueue2 = { getJob: async () => null, add: async (...a: unknown[]) => { added.push(a); return {}; } };
    const svc2 = new TrackGenerationService(fakeQueue2 as never, undefined, undefined, undefined, undefined, undefined);
    const res2 = await svc2.enqueueSegment({
      goal: 'g', goalSlug: 'g', stageSlug: 's', stageTitle: 'S', topics: ['a'], stageOrder: 1, trigger: 'T1',
    });
    expect(res2.queued).toBe(true);
    expect(res2.jobId).toBe('track:g:seg:1');
    // H2 (complemento): o job é criado com retry até 3 + backoff exponencial.
    expect((added[0] as Array<unknown>)[2]).toMatchObject({ jobId: 'track:g:seg:1', attempts: 3, backoff: { type: 'exponential' } });
  });

  it('approveSegment: draft com testes autorados ativa; com PENDENTE recusa', () => {
    const root = mkdtempSync(join(tmpdir(), 'track-approve-'));
    const content = join(root, 'content');
    const segDir = join(content, 'knowledge', 'tracks', 'desenvolvedor-java', 'segments');
    mkdirSync(segDir, { recursive: true });
    writeFileSync(join(content, 'knowledge', 'tracks', 'desenvolvedor-java', 'track.json'), JSON.stringify({
      goalSlug: 'desenvolvedor-java', goal: 'desenvolvedor Java',
      stages: [{ order: 1, stageSlug: 'java-basico', title: 'Java básico', topics: ['sintaxe'], status: 'draft' }],
    }));
    writeFileSync(join(segDir, '1-java-basico.json'), JSON.stringify(draftSegment()));
    const svc = new TrackGenerationService(undefined, undefined, undefined, undefined, content, undefined);
    const out = svc.approveSegment('desenvolvedor-java', 'java-basico', 'admin-1');
    expect(out.approvedBy).toBe('admin-1');
    const saved = JSON.parse(readFileSync(join(segDir, '1-java-basico.json'), 'utf8'));
    expect(saved.status).toBe('active');
    const track = JSON.parse(readFileSync(join(content, 'knowledge', 'tracks', 'desenvolvedor-java', 'track.json'), 'utf8'));
    expect(track.stages[0].status).toBe('active');
    // PENDENTE recusa.
    writeFileSync(join(segDir, '1-java-basico.json'), JSON.stringify(draftSegment({
      status: 'draft',
      activities: [{ slug: 'x', testCode: '# PENDENTE-AUTORIA-ADMIN: testes', hiddenTests: '', referenceSolution: '', lessonPayload: { activityKind: 'exercise' } }],
    })));
    expect(() => svc.approveSegment('desenvolvedor-java', 'java-basico', 'admin-1')).toThrow(/NÃO ATIVÁVEL/);
  });

  it('T1 (complemento): concluir seg. 1 enfileira seg. 2 planned; anterior incompleto ⇒ no-op', async () => {
    const root = mkdtempSync(join(tmpdir(), 'track-t1-'));
    const content = join(root, 'content');
    const dir = join(content, 'knowledge', 'tracks', 'desenvolvedor-java');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'track.json'), JSON.stringify({
      goalSlug: 'desenvolvedor-java', goal: 'desenvolvedor Java',
      stages: [
        { order: 1, stageSlug: 'java-basico', title: 'Java básico', topics: ['sintaxe'], status: 'active' },
        { order: 2, stageSlug: 'spring-boot', title: 'Spring Boot', topics: ['spring-boot'], status: 'planned' },
      ],
    }));
    const fakePrisma = {
      course: {
        findUnique: async () => ({
          id: 'course-1',
          activities: [
            { id: 'a1', slug: 'jb-ex1', order: 1, lessonPayload: { segment: { stageSlug: 'java-basico' } } },
            { id: 'a2', slug: 'jb-ex2', order: 2, lessonPayload: { segment: { stageSlug: 'java-basico' } } },
          ],
        }),
      },
      submission: { findMany: async () => [{ activityId: 'a1' }, { activityId: 'a2' }] },
    };
    const added: Array<unknown> = [];
    const fakeQueue = { getJob: async () => null, add: async (...a: unknown[]) => { added.push(a); return {}; } };
    const svc = new TrackGenerationService(fakeQueue as never, undefined, undefined, undefined, content, fakePrisma as never);
    const res = await svc.triggerNextAfterCompletion({ goalSlug: 'desenvolvedor-java', courseSlug: 'curso-x', userId: 'user-1' });
    expect(res.action).toBe('queued');
    expect(res.completedStageSlug).toBe('java-basico');
    expect(res.nextStageSlug).toBe('spring-boot');
    expect(res.jobId).toBe('track:desenvolvedor-java:seg:2');
    expect((added[0] as Array<unknown>)[1]).toMatchObject({ trigger: 'T1', stageSlug: 'spring-boot' });
    // Anterior incompleto ⇒ no-op, sem job.
    const fakePrisma2 = {
      course: { findUnique: async () => ({
        id: 'course-1',
        activities: [{ id: 'a1', slug: 'jb-ex1', order: 1, lessonPayload: { segment: { stageSlug: 'java-basico' } } }],
      }) },
      submission: { findMany: async () => [] },
    };
    const added2: Array<unknown> = [];
    const svc2 = new TrackGenerationService({ getJob: async () => null, add: async (...a: unknown[]) => { added2.push(a); return {}; } } as never, undefined, undefined, undefined, content, fakePrisma2 as never);
    const res2 = await svc2.triggerNextAfterCompletion({ goalSlug: 'desenvolvedor-java', courseSlug: 'curso-x', userId: 'user-1' });
    expect(res2.action).toBe('noop');
    expect(added2.length).toBe(0);
  });

  it('segmentProgress deriva completed de Submission passed (sem campo novo)', async () => {
    const fakePrisma = {
      course: {
        findUnique: async () => ({
          id: 'course-1',
          activities: [
            { id: 'a1', slug: 's1-ex1', order: 1, lessonPayload: { segment: { stageSlug: 's1' } } },
            { id: 'a2', slug: 's1-ex2', order: 2, lessonPayload: { segment: { stageSlug: 's1' } } },
            { id: 'a3', slug: 's2-ex1', order: 3, lessonPayload: { segment: { stageSlug: 's2' } } },
          ],
        }),
      },
      submission: {
        findMany: async () => [{ activityId: 'a1' }, { activityId: 'a2' }],
      },
    };
    const svc = new TrackGenerationService(undefined, undefined, undefined, undefined, undefined, fakePrisma as never);
    const progress = await svc.segmentProgress('user-1', 'curso-x');
    expect(progress.segments.find((s) => s.stageSlug === 's1')?.completed).toBe(true);
    expect(progress.segments.find((s) => s.stageSlug === 's2')?.completed).toBe(false);
    expect(progress.currentStageSlug).toBe('s2');
  });
});

describe('TechVersionResolver', () => {
  const fetchStub = (routes: Record<string, unknown>) => async (url: string) => {
    for (const [prefix, body] of Object.entries(routes)) {
      if (url.startsWith(prefix)) return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
    }
    return { ok: false, status: 404, json: async () => null, text: async () => '' };
  };

  it('endoflife confirma versão estável; pré-release nunca vence', async () => {
    const resolver = new TechVersionResolver(fetchStub({
      'https://endoflife.date/api/java.json': { latest: '26-beta1', lts: '25' },
    }) as never);
    const out = await resolver.resolve('java');
    expect(out.version).toBe('25'); // beta descartado, lts estável vence
    expect(out.status).toBe('confirmed');
    expect(out.source).toMatch(/endoflife/);
  });

  it('sem fonte ⇒ unconfirmed com version null e lastKnown rotulado, nunca número chutado', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'tech-versions-'));
    writeFileSync(join(dir, 'tech-versions.json'), JSON.stringify({ java: { version: '25' } }));
    const resolver = new TechVersionResolver(fetchStub({}) as never, join(dir, 'tech-versions.json'));
    const out = await resolver.resolve('java');
    expect(out.version).toBeNull();
    expect(out.status).toBe('unconfirmed');
    expect(out.lastKnown).toBe('25');
  });

  it('orçamento: reserva antes de gastar; cap estourado pausa', () => {
    const dir = mkdtempSync(join(tmpdir(), 'track-budget-'));
    process.env.PIPELINE_BUDGET_DIR = dir;
    process.env.PIPELINE_LLM_DAILY_CAP = '1';
    try {
      reserveCall(dir);
      expect(() => reserveCall(dir)).toThrow(/orçamento do pipeline esgotado/);
    } finally {
      delete process.env.PIPELINE_BUDGET_DIR;
      delete process.env.PIPELINE_LLM_DAILY_CAP;
    }
  });
});
