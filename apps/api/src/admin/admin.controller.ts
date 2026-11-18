import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AdminService } from './admin.service';
import { AiQueueControlDto } from './dto/ai-queue-control.dto';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { UpdateUserPlanDto } from './dto/update-user-plan.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { Optional } from '@nestjs/common';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { KmsService } from '../knowledge/kms.service';
import { ResearchService } from '../knowledge/research/research.service';
import { TrackGenerationService } from '../knowledge/track-generation/track-generation.service';
import { AiSpecializedRoomsService } from '../ai/ai-specialized-rooms.service';
import { CreateAiSpecializedRoomDto } from '../ai/dto/create-ai-specialized-room.dto';
import { UpdateAiSpecializedRoomDto } from '../ai/dto/update-ai-specialized-room.dto';
import { RunnerDiagnosticsService } from './runner-diagnostics.service';
import { Throttle } from '@nestjs/throttler';
import { KnowledgeReferencesService } from './knowledge-references.service';
import { CreateKnowledgeReferenceDto, PublishKnowledgeReferenceDto, ReviewKnowledgeReferenceDto } from './dto/knowledge-reference.dto';
import { JobResearchPreflightService } from './job-research-preflight.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    @Optional() private readonly knowledge?: KnowledgeService,
    @Optional() private readonly research?: ResearchService,
    @Optional() private readonly kms?: KmsService,
    @Optional() private readonly tracks?: TrackGenerationService,
    @Optional() private readonly aiRooms?: AiSpecializedRoomsService,
    @Optional() private readonly runnerDiagnostics?: RunnerDiagnosticsService,
    @Optional() private readonly references?: KnowledgeReferencesService,
    @Optional() private readonly jobResearchPreflight?: JobResearchPreflightService,
  ) {}

  @Get('metrics')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  getMetrics() {
    return this.adminService.getMetrics();
  }

  @Post('ai/queue-control')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  controlAiQueue(@Body() dto: AiQueueControlDto, @CurrentUser() user: JwtPayload) {
    return this.adminService.controlAiQueue(dto, user.sub);
  }

  @Get('ai/operator-audit')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  listAiOperatorAudit() {
    return this.adminService.listAiOperatorAudit();
  }

  @Get('ai/model-configuration')
  getAiModelConfiguration() {
    return this.aiRooms!.getModelConfiguration();
  }

  @Get('ai/rooms/activities')
  listAiRoomActivities() {
    return this.aiRooms!.listActivityOptions();
  }

  @Get('ai/rooms')
  listAiRooms() {
    return this.aiRooms!.listAdminRooms();
  }

  @Post('ai/rooms')
  createAiRoom(@Body() dto: CreateAiSpecializedRoomDto, @CurrentUser() user: JwtPayload) {
    return this.aiRooms!.create(dto, user.sub);
  }

  @Patch('ai/rooms/:id')
  updateAiRoom(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAiSpecializedRoomDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.aiRooms!.update(id, dto, user.sub);
  }

  @Get('users')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  getUsers(
    @Query('role') role?: Role,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getUsers({
      role,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch('users/:id/role')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  updateUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminService.updateUserRole(id, dto.role, user.sub);
  }

  // B32 (Sprint 10) — plano do usuário (free/pro), gestão manual do
  // admin enquanto não há gateway de pagamento.
  @Patch('users/:id/plan')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  updateUserPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserPlanDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminService.updateUserPlan(id, dto.plan, user.sub);
  }

  @Get('audit')
  listAdminAudit() {
    return this.adminService.listAdminAudit();
  }

  @Post('instructors')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  createInstructor(@Body() dto: CreateInstructorDto) {
    return this.adminService.createInstructor(dto);
  }

  @Get('health')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  getHealth() {
    return this.adminService.getHealth();
  }

  @Get('runner/diagnostics')
  listRunnerDiagnostics() {
    return this.runnerDiagnostics!.list();
  }

  @Post('runner/diagnostics')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  runRunnerDiagnostics(@CurrentUser() user: JwtPayload) {
    return this.runnerDiagnostics!.run(user.sub);
  }

  // ── Sistema de conhecimento (DESIGN §3.5) — mesmas guardas admin ──────
  @Get('knowledge/references')
  listKnowledgeReferences(@Query('status') status?: string) {
    return this.references!.list(status);
  }

  @Post('knowledge/references')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  createKnowledgeReference(@Body() dto: CreateKnowledgeReferenceDto, @CurrentUser() user: JwtPayload) {
    return this.references!.create(dto, user.sub);
  }

  @Post('knowledge/references/:id/review')
  reviewKnowledgeReference(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewKnowledgeReferenceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.references!.review(id, dto, user.sub);
  }

  @Get('knowledge/curation-candidates')
  listCurationCandidates(@Query('status') status?: string) {
    return this.references!.listCuration(status);
  }

  @Get('knowledge/job-research-preflight')
  jobResearchConfiguration() {
    return this.jobResearchPreflight!.getStatus();
  }

  @Post('knowledge/job-research-diagnostics')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  runJobResearchDiagnostic(@CurrentUser() user: JwtPayload) {
    return this.jobResearchPreflight!.runDiagnostic(user.sub);
  }

  @Post('knowledge/references/:id/curation')
  queueReferenceForCuration(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.references!.queueForCuration(id, user.sub);
  }

  @Post('knowledge/curation-candidates/:id/archive')
  archiveCurationCandidate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.references!.archiveCuration(id, user.sub);
  }

  @Post('knowledge/curation-candidates/:id/research')
  async createCurationResearch(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    if (!this.research || !this.references) throw new Error('Serviço de curadoria indisponível.');
    const candidate = await this.references.requestResearchDraft(id, user.sub);
    const reference = candidate.reference;
    return this.research.createReferenceDraft({
      candidateId: candidate.id, kind: reference.kind, title: reference.title,
      url: reference.url, author: reference.author, license: reference.license,
    });
  }

  @Post('knowledge/curation-candidates/:id/publish')
  publishCuration(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishKnowledgeReferenceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.references!.publishCuration(id, dto, user.sub);
  }

  @Post('knowledge/research')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  createResearch(@Body() dto: { goal: string }) {
    return this.research!.createResearch(dto.goal);
  }

  @Get('knowledge/research')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  listResearch() {
    return this.research!.list();
  }

  @Get('knowledge/research/:id')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  getResearch(@Param('id') id: string) {
    return this.research!.get(id);
  }

  @Post('knowledge/research/:id/approve')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  approveResearch(@Param('id') id: string, @Req() req: any) {
    // approvedBy é o admin autenticado (JwtAuthGuard) — nunca opcional:
    // aprovar sem admin autenticado é impossível via API.
    const adminId = req?.user?.sub;
    if (!adminId) throw new Error('approve exige admin autenticado');
    return this.research!.approve(id, adminId);
  }

  @Post('knowledge/research/:id/reject')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  rejectResearch(@Param('id') id: string, @Body() dto: { reason: string }) {
    return this.research!.reject(id, dto.reason);
  }

  @Get('knowledge/registry')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  getRegistryStats() {
    return this.knowledge!.stats();
  }

  // ── KMS (DESIGN §13.4) — mesmas guardas admin ──────────────────────────
  @Get('knowledge/entries')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  listKmsEntries() {
    return this.kms!.listEntries();
  }

  @Get('knowledge/entries/:slug')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  getKmsEntry(@Param('slug') slug: string) {
    return this.kms!.getEntry(slug);
  }

  @Post('knowledge/entries/:slug/versions/:n/approve')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  approveKmsVersion(@Param('slug') slug: string, @Param('n') n: string, @Req() req: any) {
    // approvedBy é o admin autenticado (JwtAuthGuard) — nunca opcional.
    const adminId = req?.user?.sub;
    if (!adminId) throw new Error('approve exige admin autenticado');
    return this.kms!.approveVersion(slug, Number(n), adminId);
  }

  @Get('knowledge/changelog')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  listKmsChangelog(
    @Query('entrySlug') entrySlug?: string,
    @Query('changeType') changeType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.kms!.listChangelog({
      entrySlug, changeType, from, to,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('knowledge/review-queue')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  listKmsReviewQueue() {
    return this.kms!.listReviewQueue();
  }

  @Get('knowledge/review-queue/:id')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  getKmsReviewItem(@Param('id') id: string) {
    return this.kms!.getReviewItem(id);
  }

  @Post('knowledge/review-queue/:id/resolve')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  resolveKmsReviewItem(
    @Param('id') id: string,
    @Body() dto: { action: string; targetEntrySlug?: string; reason: string },
    @Req() req: any,
  ) {
    // resolvedBy é o admin autenticado; a decisão fica pending-sync até o kms-apply.
    const adminId = req?.user?.sub;
    if (!adminId) throw new Error('resolve exige admin autenticado');
    return this.kms!.resolveReviewItem(id, dto, adminId);
  }

  @Get('knowledge/evolution-report')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  getKmsEvolutionReport() {
    return this.kms!.evolutionReport();
  }

  @Post('knowledge/ingest-book')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  ingestBookOrPdf(
    @Body() dto: { title: string; author?: string; contentMd: string; tags?: string[]; level?: string },
  ) {
    if (!this.kms) throw new Error('KmsService indisponível');
    return this.kms.ingestBookOrPdf({
      title: dto.title,
      author: dto.author,
      contentMd: dto.contentMd,
      tags: dto.tags || [],
      level: dto.level,
    });
  }

  // ── Trilhas incrementais (DESIGN §4.5) — mesmas guardas admin ───────
  // T3 = ação do admin (força geração/regeneração de um segmento). NÃO é
  // endpoint de geração para o aluno (R12): o aluno só vê o mapa e o botão
  // "próximos passos" informa o estado; a geração por aluno (T2) segue
  // pendente da decisão de entitlement/cota do Augusto (Q13).
  @Get('knowledge/tracks/:goal/segments')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  listTrackSegments(@Param('goal') goal: string) {
    return this.tracks!.listSegments(goal);
  }

  @Post('knowledge/tracks/:goal/segments/:stage/generate')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  generateTrackSegment(
    @Param('goal') goal: string,
    @Param('stage') stage: string,
    @Body() dto: { title: string; topics: string[]; stageOrder: number; language?: string },
  ) {
    return this.tracks!.enqueueSegment({
      goal, goalSlug: goal, stageSlug: stage, stageTitle: dto.title, topics: dto.topics,
      stageOrder: dto.stageOrder, language: dto.language || 'python', trigger: 'T3',
    });
  }

  @Post('knowledge/tracks/:goal/segments/:stage/approve')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  approveTrackSegment(@Param('goal') goal: string, @Param('stage') stage: string, @Req() req: any) {
    const adminId = req?.user?.sub;
    if (!adminId) throw new Error('approve exige admin autenticado');
    return this.tracks!.approveSegment(goal, stage, adminId);
  }

  @Get('knowledge/tracks/:goal/segments/:stage/progress')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  getSegmentProgress(@Param('goal') goal: string, @Query('courseSlug') courseSlug: string, @Query('userId') userId: string) {
    return this.tracks!.segmentProgress(userId, courseSlug || goal);
  }

  @Get('knowledge/pipeline-budget')
  @Roles(Role.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  getPipelineBudget() {
    return this.tracks!.pipelineBudgetStatus();
  }
}
