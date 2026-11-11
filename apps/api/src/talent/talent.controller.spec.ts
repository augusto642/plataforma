import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ResearchService } from '../knowledge/research/research.service';
import { IntroductionService } from './introduction.service';
import { JobPostingService } from './job-posting.service';
import { MatchService } from './match.service';
import { TalentProfileService } from './talent-profile.service';
import { TalentController } from './talent.controller';
import { TalentService } from './talent.service';

/**
 * A10 (Lote 3 · portões do merge) — TalentController estava em 0%.
 * Delegação fina aos seis services (os gates de empresa são do
 * CompanyTokenGuard, coberto no seu próprio spec): cada rota repassa
 * o id certo — da empresa via `req.company` (token), do aluno via
 * JWT — ao método certo. `extractJobs` lê o documento de pesquisa
 * APROVADO e o entrega à extração (o service recusa draft/rejeitada).
 */
describe('TalentController', () => {
  let controller: TalentController;
  const mockTalent = {
    createCompany: jest.fn(),
    listCompanies: jest.fn(),
    deleteCompany: jest.fn(),
    getCourseLeaderboard: jest.fn(),
  };
  const mockJobs = {
    listRadar: jest.fn(),
    getById: jest.fn(),
    createAggregated: jest.fn(),
    extractFromApprovedResearch: jest.fn(),
    createPartner: jest.fn(),
    deleteJob: jest.fn(),
  };
  const mockProfiles = {
    getMe: jest.fn(),
    updateMe: jest.fn(),
    refreshProvenSkills: jest.fn(),
  };
  const mockMatches = {
    matchesForUser: jest.fn(),
    candidatesForCompany: jest.fn(),
  };
  const mockIntroductions = {
    request: jest.fn(),
    listForCompany: jest.fn(),
    listForStudent: jest.fn(),
    decide: jest.fn(),
  };
  const mockResearch = { get: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TalentController],
      providers: [
        { provide: TalentService, useValue: mockTalent },
        { provide: JobPostingService, useValue: mockJobs },
        { provide: TalentProfileService, useValue: mockProfiles },
        { provide: MatchService, useValue: mockMatches },
        { provide: IntroductionService, useValue: mockIntroductions },
        { provide: ResearchService, useValue: mockResearch },
        { provide: PrismaService, useValue: { company: { findUnique: jest.fn() } } },
      ],
    }).compile();
    controller = module.get<TalentController>(TalentController);
  });

  const user = { sub: 'user-1', role: 'admin' } as JwtPayload;
  const student = { sub: 'user-2', role: 'student' } as JwtPayload;
  const companyReq = { company: { id: 'comp-1', name: 'Acme' } } as never;

  it('createCompany repassa o DTO ao service', async () => {
    mockTalent.createCompany.mockResolvedValue({ id: 'comp-1' });
    const dto = { name: 'Acme', contactEmail: 'a@acme.co' } as never;
    await expect(controller.createCompany(dto)).resolves.toEqual({
      id: 'comp-1',
    });
    expect(mockTalent.createCompany).toHaveBeenCalledWith(dto);
  });

  it('listCompanies devolve a lista do service', async () => {
    mockTalent.listCompanies.mockResolvedValue([{ id: 'comp-1' }]);
    await expect(controller.listCompanies()).resolves.toEqual([
      { id: 'comp-1' },
    ]);
  });

  it('deleteCompany repassa o id', async () => {
    mockTalent.deleteCompany.mockResolvedValue(undefined);
    await controller.deleteCompany('00000000-0000-0000-0000-000000000001');
    expect(mockTalent.deleteCompany).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000001',
    );
  });

  it('getCourseLeaderboard repassa o courseId', async () => {
    mockTalent.getCourseLeaderboard.mockResolvedValue([]);
    await expect(
      controller.getCourseLeaderboard(
        '00000000-0000-0000-0000-000000000002',
      ),
    ).resolves.toEqual([]);
    expect(mockTalent.getCourseLeaderboard).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000002',
    );
  });

  it('listJobs devolve o radar do service', async () => {
    mockJobs.listRadar.mockResolvedValue([{ id: 'job-1' }]);
    await expect(controller.listJobs()).resolves.toEqual([{ id: 'job-1' }]);
  });

  it('getJob repassa o id', async () => {
    mockJobs.getById.mockResolvedValue({ id: 'job-1' });
    await expect(
      controller.getJob('00000000-0000-0000-0000-000000000003'),
    ).resolves.toEqual({ id: 'job-1' });
    expect(mockJobs.getById).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000003',
    );
  });

  it('createAggregatedJob repassa o DTO', async () => {
    mockJobs.createAggregated.mockResolvedValue({ id: 'job-1' });
    const dto = { title: 'Dev Jr', source: 'agregada' } as never;
    await expect(controller.createAggregatedJob(dto)).resolves.toEqual({
      id: 'job-1',
    });
    expect(mockJobs.createAggregated).toHaveBeenCalledWith(dto);
  });

  it('extractJobs lê o documento de pesquisa e o entrega à extração', async () => {
    const doc = { id: 'res-1', status: 'approved' };
    mockResearch.get.mockReturnValue(doc);
    mockJobs.extractFromApprovedResearch.mockResolvedValue([{ id: 'job-1' }]);

    await expect(controller.extractJobs('res-1')).resolves.toEqual([
      { id: 'job-1' },
    ]);
    expect(mockResearch.get).toHaveBeenCalledWith('res-1');
    expect(mockJobs.extractFromApprovedResearch).toHaveBeenCalledWith(doc);
  });

  it('createPartnerJob usa o id da empresa do token (nunca do corpo)', async () => {
    mockJobs.createPartner.mockResolvedValue({ id: 'job-2' });
    const dto = { title: 'Dev Pleno' } as never;
    await expect(controller.createPartnerJob(companyReq, dto)).resolves.toEqual({
      id: 'job-2',
    });
    expect(mockJobs.createPartner).toHaveBeenCalledWith('comp-1', dto);
  });

  it('deleteJob repassa o id', async () => {
    mockJobs.deleteJob.mockResolvedValue(undefined);
    await controller.deleteJob('00000000-0000-0000-0000-000000000004');
    expect(mockJobs.deleteJob).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000004',
    );
  });

  it('getMyProfile usa o userId do JWT', async () => {
    mockProfiles.getMe.mockResolvedValue({ visible: true });
    await expect(controller.getMyProfile(student)).resolves.toEqual({
      visible: true,
    });
    expect(mockProfiles.getMe).toHaveBeenCalledWith('user-2');
  });

  it('updateMyProfile repassa userId e DTO', async () => {
    mockProfiles.updateMe.mockResolvedValue({ visible: false });
    const dto = { talentVisible: false } as never;
    await expect(controller.updateMyProfile(student, dto)).resolves.toEqual({
      visible: false,
    });
    expect(mockProfiles.updateMe).toHaveBeenCalledWith('user-2', dto);
  });

  it('refreshMyProfile usa o userId do JWT', async () => {
    mockProfiles.refreshProvenSkills.mockResolvedValue({ skills: ['js'] });
    await expect(controller.refreshMyProfile(student)).resolves.toEqual({
      skills: ['js'],
    });
    expect(mockProfiles.refreshProvenSkills).toHaveBeenCalledWith('user-2');
  });

  it('getMyMatches usa o userId do JWT', async () => {
    mockMatches.matchesForUser.mockResolvedValue([]);
    await expect(controller.getMyMatches(student)).resolves.toEqual([]);
    expect(mockMatches.matchesForUser).toHaveBeenCalledWith('user-2');
  });

  it('listCandidates repassa os filtros de query ao match', async () => {
    mockMatches.candidatesForCompany.mockResolvedValue([]);
    await expect(
      controller.listCandidates('javascript', 'junior'),
    ).resolves.toEqual([]);
    expect(mockMatches.candidatesForCompany).toHaveBeenCalledWith({
      skill: 'javascript',
      level: 'junior',
    });
  });

  it('requestIntroduction usa o id da empresa do token', async () => {
    mockIntroductions.request.mockResolvedValue({ id: 'intro-1' });
    const dto = { candidateId: 'cand_1', jobId: 'job-1' } as never;
    await expect(
      controller.requestIntroduction(companyReq, dto),
    ).resolves.toEqual({ id: 'intro-1' });
    expect(mockIntroductions.request).toHaveBeenCalledWith('comp-1', dto);
  });

  it('listCompanyIntroductions usa o id da empresa do token', async () => {
    mockIntroductions.listForCompany.mockResolvedValue([]);
    await expect(controller.listCompanyIntroductions(companyReq)).resolves.toEqual(
      [],
    );
    expect(mockIntroductions.listForCompany).toHaveBeenCalledWith('comp-1');
  });

  it('listMyIntroductions usa o userId do JWT', async () => {
    mockIntroductions.listForStudent.mockResolvedValue([]);
    await expect(controller.listMyIntroductions(student)).resolves.toEqual([]);
    expect(mockIntroductions.listForStudent).toHaveBeenCalledWith('user-2');
  });

  it('accept/decline repassam userId, id e a decisão', async () => {
    mockIntroductions.decide.mockResolvedValue({ status: 'accepted' });
    await expect(
      controller.acceptIntroduction(
        student,
        '00000000-0000-0000-0000-000000000005',
      ),
    ).resolves.toEqual({ status: 'accepted' });
    expect(mockIntroductions.decide).toHaveBeenCalledWith(
      'user-2',
      '00000000-0000-0000-0000-000000000005',
      true,
    );

    mockIntroductions.decide.mockResolvedValue({ status: 'declined' });
    await expect(
      controller.declineIntroduction(
        student,
        '00000000-0000-0000-0000-000000000005',
      ),
    ).resolves.toEqual({ status: 'declined' });
    expect(mockIntroductions.decide).toHaveBeenCalledWith(
      'user-2',
      '00000000-0000-0000-0000-000000000005',
      false,
    );
  });
});
