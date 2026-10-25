import { SkillDiagnosticService } from './skill-diagnostic.service';
import { LearnerModelService } from '../adaptation/learner-model.service';

/**
 * Fase 5 — mapa de gaps + modelo do aluno sobre o mesmo prisma mockado.
 * Atividades com conceptTags; submissões passed/failed; rubrica de
 * revisão embutida numa submissão para provar a mistura 0,6/0,4.
 */
function buildPrisma() {
  const activities = [
    { id: 'a1', slug: 'saida', title: 'Saída', conceptTags: ['saida-e-variaveis'] },
    { id: 'a2', slug: 'loops-1', title: 'Loops 1', conceptTags: ['loops'] },
    { id: 'a3', slug: 'loops-2', title: 'Loops 2', conceptTags: ['loops'] },
  ];
  const submissions = [
    { id: 's1', activityId: 'a1', status: 'passed', createdAt: new Date(), codeReviews: [] },
    { id: 's2', activityId: 'a2', status: 'failed', createdAt: new Date(), codeReviews: [] },
    { id: 's3', activityId: 'a2', status: 'failed', createdAt: new Date(), codeReviews: [] },
    { id: 's4', activityId: 'a2', status: 'failed', createdAt: new Date(), codeReviews: [] },
    {
      id: 's5', activityId: 'a3', status: 'passed', createdAt: new Date(),
      codeReviews: [{ rubric: { legibilidade: { score: 5 }, estrutura: { score: 5 } } }],
    },
  ];
  return {
    activity: { findMany: jest.fn().mockResolvedValue(activities) },
    submission: { findMany: jest.fn().mockResolvedValue(submissions) },
    diagnosticResult: { findFirst: jest.fn().mockResolvedValue(null) },
    jobPosting: { findUnique: jest.fn().mockResolvedValue(null) },
    diagnosticSkillResult: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    learnerSkillMastery: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  };
}

describe('SkillDiagnosticService (Fase 5, §6.1)', () => {
  it('gera o mapa por tag da espinha, com weakSpot em loops e estimativa por pouca evidência', async () => {
    const service = new SkillDiagnosticService(buildPrisma() as any);
    const map = await service.getSkillMap('user-1');
    expect(map.skills).toHaveLength(10);
    const loops = map.skills.find((s) => s.skillTag === 'loops')!;
    expect(loops.weakSpot).toBe(true);
    // 3 falhas + 1 acerto com rubrica 5/5: a rubrica puxa 1/3 para 0,6
    // (developing) — mas o weakSpot (erra sempre) segue sinalizado.
    expect(loops.level).toBe('developing');
    const saida = map.skills.find((s) => s.skillTag === 'saida-e-variaveis')!;
    expect(saida.level).toBe('developing'); // 1 acerto, Laplace -> 2/3
    const semEvidencia = map.skills.find((s) => s.skillTag === 'funcoes')!;
    expect(semEvidencia.score).toBeNull();
    expect(semEvidencia.level).toBe('unknown');
    expect(map.estimate).toBe(true); // 5 submissões < 10
    expect(map.evidenceTotal).toBe(5);
  });

  it('targetGaps lista as skills da vaga-alvo que não estão proficientes', async () => {
    const prisma = buildPrisma();
    prisma.jobPosting.findUnique.mockResolvedValue({
      skills: ['loops', 'funcoes', 'saida-e-variaveis'],
    });
    const service = new SkillDiagnosticService(prisma as any);
    const map = await service.getSkillMap('user-1', 'job-1');
    expect(map.targetGaps).toEqual(
      expect.arrayContaining(['loops', 'funcoes', 'saida-e-variaveis']),
    );
  });

  it('nextSteps aponta a primeira atividade não concluída da tag', async () => {
    const service = new SkillDiagnosticService(buildPrisma() as any);
    const map = await service.getSkillMap('user-1');
    const loops = map.skills.find((s) => s.skillTag === 'loops')!;
    // a2 falhou, a3 passou: a próxima pendente de loops é a2.
    expect(loops.nextSteps?.activityId).toBe('a2');
  });
});

describe('LearnerModelService (Fase 5, §6.4 — interface, não motor)', () => {
  it('buildTutorPromptBlock cita o que domina e onde erra sempre; vazio sem dados', async () => {
    const service = new LearnerModelService(buildPrisma() as any);
    const block = await service.buildTutorPromptBlock('user-1', ['loops']);
    expect(block).toContain('Loops');
    expect(block).toContain('Erra com frequência');
    const emptyPrisma = buildPrisma();
    emptyPrisma.submission.findMany.mockResolvedValue([]);
    const empty = new LearnerModelService(emptyPrisma as any);
    await expect(empty.buildTutorPromptBlock('user-1')).resolves.toBe('');
  });

  it('falha de leitura do modelo nunca quebra o prompt (fail-open)', async () => {
    const prisma = buildPrisma();
    prisma.submission.findMany.mockRejectedValue(new Error('banco fora'));
    const service = new LearnerModelService(prisma as any);
    await expect(service.buildTutorPromptBlock('user-1')).resolves.toBe('');
  });
});
