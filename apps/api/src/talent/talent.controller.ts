import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ResearchService } from '../knowledge/research/research.service';
import { CompanyTokenGuard } from './company-token.guard';
import { CreateCompanyDto } from './dto/create-company.dto';
import {
  CreateJobPostingDto,
  RequestIntroductionDto,
  UpdateTalentProfileDto,
} from './dto/talent-phase4.dto';
import { IntroductionService } from './introduction.service';
import { JobPostingService } from './job-posting.service';
import { MatchService } from './match.service';
import { TalentProfileService } from './talent-profile.service';
import { TalentService } from './talent.service';

/**
 * Fase 4 premium (desenho §5.1) — controller ESTENDIDO, não substituído.
 * As 4 rotas originais (empresas + leaderboard anonimizado) seguem
 * intactas abaixo; as novas rotas de vagas, perfil, match, candidatos e
 * introduções são aditivas.
 *
 * Privacidade em todas as respostas para empresa: candidato aparece só
 * como `cand_<8>` + iniciais; e-mail, nome completo e userId nunca saem.
 * Nenhum texto promete emprego ou contratação — matching é visibilidade
 * + introdução mediada.
 */
@Controller('talent')
export class TalentController {
  constructor(
    private readonly talent: TalentService,
    private readonly jobs: JobPostingService,
    private readonly profiles: TalentProfileService,
    private readonly matches: MatchService,
    private readonly introductions: IntroductionService,
    private readonly research: ResearchService,
  ) {}

  @Post('companies')
  @Roles(Role.admin)
  createCompany(@Body() dto: CreateCompanyDto) {
    return this.talent.createCompany(dto);
  }

  @Get('companies')
  @Roles(Role.admin)
  listCompanies() {
    return this.talent.listCompanies();
  }

  @Delete('companies/:id')
  @Roles(Role.admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCompany(@Param('id', ParseUUIDPipe) id: string) {
    return this.talent.deleteCompany(id);
  }

  @Get('courses/:courseId/leaderboard')
  @Public()
  @UseGuards(CompanyTokenGuard)
  getCourseLeaderboard(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.talent.getCourseLeaderboard(courseId);
  }

  // ── Radar de vagas ──────────────────────────────────────────────────

  /** Radar do aluno: vagas não expiradas (agregadas aprovadas + parceiras). */
  @Get('jobs')
  listJobs() {
    return this.jobs.listRadar();
  }

  @Get('jobs/:id')
  getJob(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobs.getById(id);
  }

  /** Admin publica vaga agregada — a rota admin É a aprovação. */
  @Post('jobs')
  @Roles(Role.admin)
  createAggregatedJob(@Body() dto: CreateJobPostingDto) {
    return this.jobs.createAggregated(dto);
  }

  /**
   * Extração de vagas de pesquisa APROVADA. Recusa draft/rejeitada
   * (fail-closed); o admin aprova primeiro em
   * POST /admin/knowledge/research/:id/approve.
   */
  @Post('jobs/extract/:researchId')
  @Roles(Role.admin)
  extractJobs(@Param('researchId') researchId: string) {
    const doc = this.research.get(researchId);
    return this.jobs.extractFromApprovedResearch(doc);
  }

  /** Empresa parceira publica vaga com o token existente. */
  @Post('jobs/partner')
  @Public()
  @UseGuards(CompanyTokenGuard)
  createPartnerJob(@Req() req: any, @Body() dto: CreateJobPostingDto) {
    return this.jobs.createPartner(req.company.id, dto);
  }

  @Delete('jobs/:id')
  @Roles(Role.admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteJob(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobs.deleteJob(id);
  }

  // ── Perfil do aluno ─────────────────────────────────────────────────

  @Get('profile/me')
  getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.profiles.getMe(user.sub);
  }

  @Put('profile/me')
  updateMyProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateTalentProfileDto) {
    return this.profiles.updateMe(user.sub, dto);
  }

  /** Recalcula skills comprovadas a partir de submissões `passed`. */
  @Post('profile/me/refresh')
  refreshMyProfile(@CurrentUser() user: JwtPayload) {
    return this.profiles.refreshProvenSkills(user.sub);
  }

  // ── Match ───────────────────────────────────────────────────────────

  /** Vagas compatíveis do aluno, com score explicado. */
  @Get('matches/me')
  getMyMatches(@CurrentUser() user: JwtPayload) {
    return this.matches.matchesForUser(user.sub);
  }

  /**
   * Candidatos para a empresa (token). `level` = nível de carreira do
   * aluno. Só perfis com consentimento duplo (perfil + talentVisible).
   */
  @Get('candidates')
  @Public()
  @UseGuards(CompanyTokenGuard)
  listCandidates(@Query('skill') skill?: string, @Query('level') level?: string) {
    return this.matches.candidatesForCompany({ skill, level });
  }

  // ── Introdução mediada ──────────────────────────────────────────────

  @Post('introductions')
  @Public()
  @UseGuards(CompanyTokenGuard)
  requestIntroduction(@Req() req: any, @Body() dto: RequestIntroductionDto) {
    return this.introductions.request(req.company.id, dto);
  }

  @Get('introductions')
  @Public()
  @UseGuards(CompanyTokenGuard)
  listCompanyIntroductions(@Req() req: any) {
    return this.introductions.listForCompany(req.company.id);
  }

  @Get('introductions/me')
  listMyIntroductions(@CurrentUser() user: JwtPayload) {
    return this.introductions.listForStudent(user.sub);
  }

  @Post('introductions/:id/accept')
  acceptIntroduction(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.introductions.decide(user.sub, id, true);
  }

  @Post('introductions/:id/decline')
  declineIntroduction(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.introductions.decide(user.sub, id, false);
  }
}
