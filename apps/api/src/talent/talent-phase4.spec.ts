import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementsService } from '../plans/entitlements.service';
import { computeMatch, MatchService } from './match.service';
import { parseResearchJobs, JobPostingService } from './job-posting.service';
import { TalentProfileService } from './talent-profile.service';
import { IntroductionService } from './introduction.service';
import { UpdateTalentProfileDto } from './dto/talent-phase4.dto';
import { OrganizationsService } from '../organizations/organizations.service';

/**
 * Fase 4 premium (desenho §5) — specs.
 * Cobrem o que o QA vai verificar na ponta: match determinístico, regras
 * de idade/expiração das vagas, consentimento com efeito imediato,
 * e-mail nunca exposto e teto de licenças B2B.
 */

function makePrisma(overrides: Record<string, any> = {}) {
  const base: Record<string, any> = {
    user: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    submission: { findMany: jest.fn() },
    talentProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    jobPosting: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), delete: jest.fn() },
    talentIntroduction: { findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    organization: { findUnique: jest.fn(), create: jest.fn() },
    orgMember: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), delete: jest.fn() },
    company: { findUnique: jest.fn() },
  };
  for (const [model, methods] of Object.entries(overrides)) {
    Object.assign(base[model], methods);
  }
  return base;
}

describe('computeMatch (determinístico, sem ML)', () => {
  it('sobreposição total no nível = 1', () => {
    const result = computeMatch(['javascript', 'react'], ['javascript', 'react'], 'junior', 'junior');
    expect(result.score).toBe(1);
    expect(result.missingSkills).toEqual([]);
  });

  it('sobreposição parcial + um nível abaixo pondera 0,8', () => {
    const result = computeMatch(['javascript'], ['javascript', 'react'], 'beginner', 'junior');
    expect(result.score).toBe(0.4); // 0,5 * 0,8
    expect(result.matchedSkills).toEqual(['javascript']);
    expect(result.missingSkills).toEqual(['react']);
  });

  it('dois níveis abaixo pondera 0,5 e sem sobreposição = 0', () => {
    expect(computeMatch(['javascript'], ['javascript', 'react'], 'beginner', 'senior').score).toBe(0.25);
    expect(computeMatch(['python'], ['javascript'], 'senior', 'junior').score).toBe(0);
  });

  it('skills são normalizadas (caixa/espaço) e sem duplicata', () => {
    const result = computeMatch([' JavaScript '], ['javascript', 'JAVASCRIPT'], 'junior', 'junior');
    expect(result.score).toBe(1);
  });
});

describe('parseResearchJobs (regras de idade/expiração)', () => {
  const now = new Date('2026-10-24T12:00:00Z');
  it('descarta vaga com mais de 2 anos, vaga expirada e nível inválido', () => {
    const { candidates, skipped } = parseResearchJobs(
      {
        id: 'research-x',
        status: 'approved',
        jobs: [
          { title: 'Velha', skills: ['java'], level: 'junior', postedAt: '2020-01-01' },
          { title: 'Expirada', skills: ['java'], level: 'junior', postedAt: '2026-09-01' },
          { title: 'Sem nível', skills: ['java'], level: 'pleno', postedAt: '2026-10-01' },
          { title: 'Boa', skills: ['Java', 'java'], level: 'junior', postedAt: '2026-10-20', externalUrl: 'https://exemplo.com/vaga' },
        ],
      },
      now,
    );
    expect(candidates.map((c) => c.title)).toEqual(['Boa']);
    expect(candidates[0].skills).toEqual(['java']);
    expect(skipped.map((s) => s.title)).toEqual(['Velha', 'Expirada', 'Sem nível']);
  });

  it('payload sem lista de vagas não fabrica vagas', () => {
    const { candidates } = parseResearchJobs(
      { id: 'research-y', status: 'approved', market: { skills: [{ skill: 'java' }] } },
      now,
    );
    expect(candidates).toEqual([]);
  });
});

describe('JobPostingService.extractFromApprovedResearch', () => {
  it('recusa pesquisa draft (fail-closed) e publica a aprovada sem duplicar', async () => {
    const prisma = makePrisma();
    const service = new JobPostingService(prisma as unknown as PrismaService);
    await expect(
      service.extractFromApprovedResearch({ id: 'research-draft', status: 'draft', jobs: [] }),
    ).rejects.toThrow('Só pesquisa aprovada gera vagas');
    prisma.jobPosting.findFirst.mockResolvedValueOnce(null);
    prisma.jobPosting.create.mockResolvedValue({ id: 'job-1', title: 'Boa' });
    const result = await service.extractFromApprovedResearch({
      id: 'research-ok',
      status: 'approved',
      jobs: [{ title: 'Boa', skills: ['java'], level: 'junior', postedAt: new Date().toISOString() }],
    });
    expect(result.created).toEqual([{ id: 'job-1', title: 'Boa' }]);
    prisma.jobPosting.findFirst.mockResolvedValueOnce({ id: 'job-1' });
    const again = await service.extractFromApprovedResearch({
      id: 'research-ok',
      status: 'approved',
      jobs: [{ title: 'Boa', skills: ['java'], level: 'junior', postedAt: new Date().toISOString() }],
    });
    expect(again.created).toEqual([]);
    expect(prisma.jobPosting.create).toHaveBeenCalledTimes(1);
  });
});

describe('TalentProfileService', () => {
  it('deriva skills de submissões passed, mais comprovada primeiro', async () => {
    const prisma = makePrisma({
      submission: {
        findMany: jest.fn().mockResolvedValue([
          { activity: { conceptTags: ['React', 'javascript'] } },
          { activity: { conceptTags: ['javascript'] } },
          { activity: { conceptTags: ['python'] } },
        ]),
      },
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TalentProfileService,
        { provide: PrismaService, useValue: prisma },
        { provide: EntitlementsService, useValue: { assertFeature: jest.fn() } },
      ],
    }).compile();
    const service = module.get<TalentProfileService>(TalentProfileService);
    expect(await service.deriveProvenSkills('user-1')).toEqual(['javascript', 'python', 'react']);
  });

  it('toggle de visibilidade espelha talentVisible (efeito imediato nos dois)', async () => {
    const prisma = makePrisma({
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1', talentVisible: false }),
        update: jest.fn().mockResolvedValue({ id: 'user-1', talentVisible: true }),
      },
      talentProfile: {
        findUnique: jest.fn().mockResolvedValue({ id: 'p-1', userId: 'user-1', visible: false }),
        update: jest.fn().mockResolvedValue({ id: 'p-1', visible: true }),
      },
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TalentProfileService,
        { provide: PrismaService, useValue: prisma },
        { provide: EntitlementsService, useValue: { assertFeature: jest.fn() } },
      ],
    }).compile();
    const service = module.get<TalentProfileService>(TalentProfileService);
    await service.updateMe('user-1', { visible: true });
    expect(prisma.talentProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ visible: true }) }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { talentVisible: true } }),
    );
  });

  it('spotlight exige entitlement Carreira (free/Pro não passam)', async () => {
    const prisma = makePrisma({
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1', talentVisible: false }) },
    });
    const assertFeature = jest.fn().mockRejectedValue(new Error('plano pago'));
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TalentProfileService,
        { provide: PrismaService, useValue: prisma },
        { provide: EntitlementsService, useValue: { assertFeature } },
      ],
    }).compile();
    const service = module.get<TalentProfileService>(TalentProfileService);
    await expect(service.updateMe('user-1', { spotlight: true })).rejects.toThrow('plano pago');
  });
});

describe('MatchService.candidatesForCompany', () => {
  it('só perfis com consentimento duplo e saída sem e-mail/nome/userId', async () => {
    const prisma = makePrisma({
      talentProfile: {
        findMany: jest.fn().mockResolvedValue([
          {
            userId: 'aaaabbbb1111',
            headline: 'Dev JS',
            skillsProven: ['javascript'],
            projectUrls: [],
            spotlight: true,
            user: { id: 'aaaabbbb1111', name: 'Maria Silva', careerTier: 'junior', xp: 100, level: 2 },
          },
        ]),
      },
    });
    const profiles = {
      deriveProvenSkillsBatch: jest.fn().mockResolvedValue(new Map([['aaaabbbb1111', ['javascript']]])),
    } as unknown as TalentProfileService;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchService,
        { provide: PrismaService, useValue: prisma },
        { provide: TalentProfileService, useValue: profiles },
      ],
    }).compile();
    const service = module.get<MatchService>(MatchService);
    const result = await service.candidatesForCompany({ skill: 'javascript' });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({ candidateId: 'cand_aaaabbbb', initials: 'MS', spotlight: true }),
    );
    expect(result[0]).not.toHaveProperty('email');
    expect(result[0]).not.toHaveProperty('name');
    expect(result[0]).not.toHaveProperty('userId');
    // A query em si já exige os dois consentimentos.
    expect(prisma.talentProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { visible: true, user: { talentVisible: true } },
      }),
    );
  });

  it('R1: skill recém-comprovada aparece SEM refresh — ignora o armazenado defasado, uma query em lote', async () => {
    const prisma = makePrisma({
      talentProfile: {
        findMany: jest.fn().mockResolvedValue([
          {
            userId: 'aaaabbbb1111',
            headline: 'Dev QA',
            // Armazenado DEFASADO (perfil criado antes da aprovação):
            // filtrar por ele faria a empresa perder o candidato.
            skillsProven: ['python'],
            projectUrls: [],
            spotlight: false,
            user: { id: 'aaaabbbb1111', name: 'Maria Silva', careerTier: 'junior', xp: 100, level: 2 },
          },
          {
            userId: 'ccccdddd2222',
            headline: 'Dev JS',
            skillsProven: ['javascript'],
            projectUrls: [],
            spotlight: false,
            user: { id: 'ccccdddd2222', name: 'João Souza', careerTier: 'junior', xp: 50, level: 1 },
          },
        ]),
      },
    });
    const deriveProvenSkillsBatch = jest
      .fn()
      .mockResolvedValue(
        new Map([
          ['aaaabbbb1111', ['qa-skill-nova']],
          ['ccccdddd2222', ['javascript']],
        ]),
      );
    const profiles = { deriveProvenSkillsBatch } as unknown as TalentProfileService;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchService,
        { provide: PrismaService, useValue: prisma },
        { provide: TalentProfileService, useValue: profiles },
      ],
    }).compile();
    const service = module.get<MatchService>(MatchService);
    const result = await service.candidatesForCompany({ skill: 'qa-skill-nova' });
    expect(result).toHaveLength(1);
    expect(result[0].candidateId).toBe('cand_aaaabbbb');
    // Exibe a skill derivada, não a armazenada defasada.
    expect(result[0].skillsProven).toEqual(['qa-skill-nova']);
    // Uma única chamada em lote com os dois userIds visíveis (sem N+1).
    expect(deriveProvenSkillsBatch).toHaveBeenCalledTimes(1);
    expect(deriveProvenSkillsBatch).toHaveBeenCalledWith(['aaaabbbb1111', 'ccccdddd2222']);
  });

  it('R1: sem perfis visíveis, não há query de derivação', async () => {
    const prisma = makePrisma({
      talentProfile: { findMany: jest.fn().mockResolvedValue([]) },
    });
    const deriveProvenSkillsBatch = jest.fn();
    const profiles = { deriveProvenSkillsBatch } as unknown as TalentProfileService;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchService,
        { provide: PrismaService, useValue: prisma },
        { provide: TalentProfileService, useValue: profiles },
      ],
    }).compile();
    const service = module.get<MatchService>(MatchService);
    expect(await service.candidatesForCompany({ skill: 'qa-skill-nova' })).toEqual([]);
    expect(deriveProvenSkillsBatch).not.toHaveBeenCalled();
  });
});

describe('TalentProfileService.deriveProvenSkillsBatch (R1)', () => {
  it('uma única query passed para N usuários, agrupada em memória, mesmo ordenamento', async () => {
    const prisma = makePrisma({
      submission: {
        findMany: jest.fn().mockResolvedValue([
          { userId: 'u1', activity: { conceptTags: ['React', 'javascript'] } },
          { userId: 'u1', activity: { conceptTags: ['javascript'] } },
          { userId: 'u2', activity: { conceptTags: ['python'] } },
          { userId: 'u2', activity: null },
        ]),
      },
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TalentProfileService,
        { provide: PrismaService, useValue: prisma },
        { provide: EntitlementsService, useValue: { assertFeature: jest.fn() } },
      ],
    }).compile();
    const service = module.get<TalentProfileService>(TalentProfileService);
    const result = await service.deriveProvenSkillsBatch(['u1', 'u2', 'u3']);
    expect(prisma.submission.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.submission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: { in: ['u1', 'u2', 'u3'] }, status: 'passed' } }),
    );
    expect(result.get('u1')).toEqual(['javascript', 'react']);
    expect(result.get('u2')).toEqual(['python']);
    expect(result.has('u3')).toBe(false);
  });

  it('lista vazia não consulta o banco', async () => {
    const prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TalentProfileService,
        { provide: PrismaService, useValue: prisma },
        { provide: EntitlementsService, useValue: { assertFeature: jest.fn() } },
      ],
    }).compile();
    const service = module.get<TalentProfileService>(TalentProfileService);
    expect(await service.deriveProvenSkillsBatch([])).toEqual(new Map());
    expect(prisma.submission.findMany).not.toHaveBeenCalled();
  });
});

describe('MatchService.matchesForUser (Fase 4 fix D3 — /vagas sempre fresca)', () => {
  it('deriva skills na leitura: ignora o skillsProven armazenado defasado', async () => {
    const prisma = makePrisma({
      user: {
        findUnique: jest.fn().mockResolvedValue({
          careerTier: 'junior',
          // Valor armazenado DEFASADO (perfil criado antes da aprovação):
          // se o match o usasse, a vaga de javascript teria score 0.
          talentProfile: { skillsProven: ['python'] },
        }),
      },
      jobPosting: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'job-1',
            title: 'Dev JS',
            skills: ['javascript'],
            level: 'junior',
            source: 'partner',
            externalUrl: null,
            postedAt: new Date('2026-10-24T10:00:00Z'),
            expiresAt: new Date('2026-11-23T10:00:00Z'),
          },
        ]),
      },
    });
    const profiles = {
      deriveProvenSkills: jest.fn().mockResolvedValue(['javascript']),
    } as unknown as TalentProfileService;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchService,
        { provide: PrismaService, useValue: prisma },
        { provide: TalentProfileService, useValue: profiles },
      ],
    }).compile();
    const service = module.get<MatchService>(MatchService);
    const result = await service.matchesForUser('user-1');
    expect(profiles.deriveProvenSkills).toHaveBeenCalledWith('user-1');
    expect(result).toHaveLength(1);
    expect(result[0].job.id).toBe('job-1');
    expect(result[0].match.score).toBe(1);
    expect(result[0].match.matchedSkills).toEqual(['javascript']);
  });
});

describe('PUT /talent/profile/me com skillsProven (Fase 4 fix D2 — 400, sem strip)', () => {
  it('o ValidationPipe global (mesma config do main.ts) rejeita o campo com 400', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    });
    let error: any;
    try {
      await pipe.transform(
        { headline: 'Dev', skillsProven: ['javascript'] },
        { type: 'body', metatype: UpdateTalentProfileDto },
      );
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
    // 400 com o nome do campo no corpo ("property skillsProven should
    // not exist") — é esse corpo que o cliente HTTP vê, não a mensagem
    // genérica da exceção.
    expect(error.getStatus()).toBe(400);
    expect(JSON.stringify(error.getResponse())).toMatch(/skillsProven/);
  });

  it('corpo sem o campo passa normalmente', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    });
    const result = await pipe.transform({ headline: 'Dev' }, { type: 'body', metatype: UpdateTalentProfileDto });
    expect(result.headline).toBe('Dev');
  });
});

describe('IntroductionService', () => {
  it('pedido duplicado pendente é conflito; decisão só do próprio aluno; empresa nunca vê e-mail', async () => {
    const prisma = makePrisma({
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: 'aaaabbbb1111' }]),
      },
      talentIntroduction: {
        findFirst: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'intro-1' }),
        create: jest.fn().mockResolvedValue({
          id: 'intro-1',
          status: 'pending',
          createdAt: new Date(),
          decidedAt: null,
          userId: 'aaaabbbb1111',
          jobPosting: null,
        }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'intro-1',
          userId: 'aaaabbbb1111',
          status: 'pending',
          company: { name: 'Acme' },
          jobPosting: null,
        }),
        update: jest.fn().mockResolvedValue({ id: 'intro-1', status: 'accepted', decidedAt: new Date() }),
      },
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [IntroductionService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    const service = module.get<IntroductionService>(IntroductionService);
    const created = await service.request('company-1', { candidateId: 'cand_aaaabbbb' });
    expect(created).not.toHaveProperty('email');
    expect(created.candidateId).toBe('cand_aaaabbbb');
    await expect(service.request('company-1', { candidateId: 'cand_aaaabbbb' })).rejects.toThrow(
      'Já existe um pedido de introdução pendente',
    );
    await expect(service.decide('outro-user', 'intro-1', true)).rejects.toThrow(
      'Só o próprio aluno decide',
    );
    const decided = await service.decide('aaaabbbb1111', 'intro-1', true);
    expect(decided.status).toBe('accepted');
  });
});

describe('OrganizationsService (enabler B2B)', () => {
  it('criação só por admin da plataforma; convite trava no teto de licenças', async () => {
    const prisma = makePrisma({
      organization: {
        findUnique: jest.fn().mockResolvedValue({ id: 'org-1', name: 'Escola X', seats: 1 }),
      },
      orgMember: {
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn(),
      },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-9' }) },
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrganizationsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    const service = module.get<OrganizationsService>(OrganizationsService);
    await expect(
      service.create({ userId: 'u', role: 'student' }, { name: 'X', seats: 5 }),
    ).rejects.toThrow('Só admin da plataforma cria organizações');
    await expect(
      service.addMember({ userId: 'admin-1', role: 'admin' }, 'org-1', { userId: 'user-9' }),
    ).rejects.toThrow('Limite de licenças atingido (1/1)');
    expect(prisma.orgMember.create).not.toHaveBeenCalled();
  });

  it('dashboard soma assentos e não expõe e-mail de membro', async () => {
    const prisma = makePrisma({
      organization: {
        findUnique: jest.fn().mockResolvedValue({ id: 'org-1', name: 'Escola X', seats: 10, companyId: null }),
      },
      orgMember: {
        findMany: jest.fn().mockResolvedValue([
          {
            role: 'member',
            user: { id: 'u1', name: 'Ana', careerTier: 'junior', xp: 50, level: 2, _count: { enrollments: 3 } },
          },
        ]),
      },
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrganizationsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    const service = module.get<OrganizationsService>(OrganizationsService);
    const dashboard = await service.getDashboard({ userId: 'admin-1', role: 'admin' }, 'org-1');
    expect(dashboard.seatsUsed).toBe(1);
    expect(dashboard.seatsAvailable).toBe(9);
    expect(dashboard.members[0]).not.toHaveProperty('email');
  });
});
