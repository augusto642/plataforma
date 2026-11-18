import { CANONICAL_JOB_SKILLS, JobsMarketProvider } from '../knowledge/research/jobs-market.provider';
import { SkillEvidenceService } from './skill-evidence.service';
import { PistonRunnerService } from '../submissions/runner/runner.service';
import { EvaluatorService } from '../submissions/evaluator/evaluator.service';

describe('market to practice and private evidence', () => {
  it('classifies every canonical skill as an assessed recommendation or an explicit exclusion', async () => {
    const expected = ['JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Python', 'Java', 'SQL', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes', 'Git'];
    expect(CANONICAL_JOB_SKILLS.map((skill) => skill.name)).toEqual(expected);
    const provider = new JobsMarketProvider(
      { id: 'TEST_FIXTURE_NOT_MARKET', isConfigured: () => true, searchDocuments: async () => [
        { id: 'fixture', title: 'fixture', text: expected.join(' ') },
      ] } as any, { id: 'disabled', isConfigured: () => false } as any,
    );
    const signals = await provider.searchJobs({ goal: 'fixture', region: 'BR' });
    const languages = ['javascript', 'typescript', 'python', 'java'];
    const prisma = { activity: { findMany: jest.fn().mockResolvedValue(languages.map((language) => ({
      id: language, courseId: 'fixture', title: 'Funções', language, conceptTags: ['funcoes'], testCode: 'test',
    }))) } };
    const service = new SkillEvidenceService(prisma as any, { getMyInvestigation: async () => ({
      status: 'ready', startCourse: { slug: 'fixture' }, marketSkillEvidence: signals,
    }) } as any);
    const goals = await service.goals('test');
    expect(goals.map((goal) => goal.signal.skill)).toEqual(expected);
    for (const goal of goals) {
      if (['JavaScript', 'TypeScript', 'Python'].includes(goal.signal.skill)) {
        expect(goal.practice).toEqual(expect.objectContaining({ objective: expect.any(String), criterion: expect.any(String), id: expect.any(String) }));
        expect(goal.excludedReason).toBeNull();
      } else {
        expect(goal.practice).toBeNull();
        expect(goal.excludedReason).toEqual(expect.any(String));
        if (goal.signal.skill === 'Java') expect(goal.excludedReason).toContain('não é garantida');
      }
    }
  });

  it('maps observed language skills to tested activities and only returns the learner’s assessed results', async () => {
    const jobs = new JobsMarketProvider(
      { id: 'fixture', isConfigured: () => true, searchDocuments: async () => [
        { id: '1', title: 'Desenvolvedor', text: 'Python e React', url: 'https://jobs.example/1' },
      ] } as any,
      { id: 'disabled', isConfigured: () => false } as any,
    );
    const signals = await jobs.searchJobs({ goal: 'backend', region: 'BR' });
    const track = { getMyInvestigation: jest.fn().mockResolvedValue({
      status: 'ready', startCourse: { slug: 'python' }, marketSkillEvidence: signals,
    }) };
    const prisma = {
      activity: { findMany: jest.fn().mockResolvedValue([
        { id: 'a', courseId: 'c', title: 'Funções', language: 'python', conceptTags: ['funcoes'], testCode: 'assert f(1) == 1' },
      ]) },
      submission: { findMany: jest.fn().mockResolvedValue([
        { id: 's', createdAt: new Date('2026-01-01'), score: 100, maxScore: 100,
          activity: { id: 'a', title: 'Funções', language: 'python', conceptTags: ['funcoes'], testCode: 'assert f(1) == 1' },
          testResults: [{ name: 'Caso de Teste 1', passed: true }, { name: 'Caso de Teste 2 (Oculto)', passed: true }] },
        { id: 'no-tests', activity: { testCode: null }, testResults: [] },
        { id: 'syntax', activity: { testCode: 'assert f(1)' }, testResults: [{ name: 'Verificação de Sintaxe', passed: true }] },
        { id: 'failed-case', activity: { testCode: 'assert f(1)' }, testResults: [{ name: 'Caso de Teste 1', passed: false }] },
        { id: 'java-class', activity: { language: 'java' }, testResults: [{ name: 'Caso de Teste 1', passed: true }] },
      ]) },
    };
    const service = new SkillEvidenceService(prisma as any, track as any);
    const goals = await service.goals('learner');
    expect(goals).toEqual(expect.arrayContaining([
      expect.objectContaining({ signal: expect.objectContaining({ skill: 'Python', mentions: 1, sampleSize: 1 }), practice: expect.objectContaining({ id: 'a', criterion: expect.stringContaining('teste') }) }),
      expect.objectContaining({ signal: expect.objectContaining({ skill: 'React' }), practice: null }),
    ]));
    const portfolio = await service.portfolio('learner');
    expect(prisma.submission.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'learner', status: 'passed', isBattleRun: false },
    }));
    expect(portfolio).toEqual([expect.objectContaining({ submissionId: 's', testsPassed: 2, independence: 'não verificada' })]);
    expect(JSON.stringify(portfolio)).not.toContain('assert');
  });

  it('does not fabricate practice or query activities without market signals', async () => {
    const prisma = { activity: { findMany: jest.fn() } };
    const service = new SkillEvidenceService(prisma as any, {
      getMyInvestigation: jest.fn().mockResolvedValue({ status: 'ready', startCourse: null, marketSkillEvidence: [] }),
    } as any);
    await expect(service.goals('learner')).resolves.toEqual([]);
    expect(prisma.activity.findMany).not.toHaveBeenCalled();
  });

  it('passes fixture outcomes through the runner and evaluator into private evidence', async () => {
    const activity = {
      id: 'a', courseId: 'c', title: 'Funções', language: 'python',
      conceptTags: ['funcoes'], testCode: 'assert f(1) == 1', hiddenTests: null,
      timeLimitMs: 5000, memoryLimitMb: 256,
    };
    const submission = {
      id: 's', userId: 'learner', activityId: 'a', activity,
      codeSnapshot: 'def f(x): return x', xpAwarded: false,
      createdAt: new Date('2026-01-01'), testResults: [] as any[],
      status: 'queued', score: null as number | null, maxScore: 100,
    };
    const tx = {
      submission: {
        updateMany: jest.fn(async ({ data }) => { Object.assign(submission, data); return { count: 1 }; }),
        update: jest.fn(async ({ data }) => Object.assign(submission, data)),
      },
      testCaseResult: {
        deleteMany: jest.fn(async () => { submission.testResults = []; }),
        createMany: jest.fn(async ({ data }) => { submission.testResults = data; }),
      },
    };
    const prisma = {
      submission: {
        findUnique: jest.fn().mockResolvedValue(submission),
        update: jest.fn(async ({ data }) => Object.assign(submission, data)),
        findMany: jest.fn(async ({ where }) => where.userId === submission.userId && submission.status === 'passed' ? [submission] : []),
      },
      $transaction: jest.fn(async (callback) => callback(tx)),
    };
    const runner = new PistonRunnerService({ get: () => undefined } as any);
    jest.spyOn(runner, 'execute').mockResolvedValue({
      kind: 'passed', status: 'passed', durationMs: 1, stdout: '', stderr: '',
    } as any);
    const evaluator = new EvaluatorService(prisma as any, runner, {
      awardSubmissionXp: jest.fn(),
    } as any, { delPattern: jest.fn() } as any);
    await evaluator.processSubmission('s');
    const evidence = new SkillEvidenceService(prisma as any, {} as any);
    expect(await evidence.portfolio('learner')).toEqual([
      expect.objectContaining({ submissionId: 's', testsPassed: 1 }),
    ]);
    expect(await evidence.portfolio('other-user')).toEqual([]);
  });
});
