import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Request, Response } from 'express';
import { ActivitiesService } from '../activities/activities.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { buildCertificateHtml } from './certificate-html';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { JoinCourseDto } from './dto/join-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Controller('courses')
export class CoursesController {
  constructor(
    private readonly courses: CoursesService,
    private readonly activities: ActivitiesService,
  ) {}

  @Post()
  @Roles(Role.instructor, Role.admin)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCourseDto) {
    return this.courses.create(user.sub, dto);
  }

  @Get()
  findAll() {
    return this.courses.findAll();
  }

  /**
   * B74 (Sprint 18 · Volta 3) — catálogo público da vitrine da
   * landing ("Disponível agora"): só os campos que a vitrine exibe
   * (slug, título, descrição, atividades em ordem e a contagem) —
   * nada de instrutor, código de matrícula ou dado de aluno. A
   * landing consome com ISR e FALLBACK HONESTO: sem resposta da API,
   * ela mostra o estado de indisponibilidade, nunca um espelho.
   * Declarada ANTES de @Get(':id') para não cair no ParseUUIDPipe.
   */
  @Public()
  @Get('public-catalog')
  findPublicCatalog() {
    return this.courses.findPublicCatalog();
  }

  /**
   * B77 (Sprint 19 · destravamento B3) — estatísticas públicas da
   * landing: só contagens agregadas com fonte viva no banco (cursos
   * e atividades do catálogo, alunos cadastrados por papel,
   * interessados nos planos pagos). Nenhum dado individual sai por
   * aqui. Declarada ANTES de @Get(':id'), como a public-catalog.
   */
  @Public()
  @Get('public-stats')
  findPublicStats() {
    return this.courses.findPublicStats();
  }

  @Post('join')
  joinByCode(@CurrentUser() user: JwtPayload, @Body() dto: JoinCourseDto) {
    return this.courses.joinByCode(user.sub, dto);
  }

  @Post(':id/git/provision')
  provisionGit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.courses.provisionGit(id, user.sub);
  }

  @Post(':id/activities/:activityId/copy')
  @Roles(Role.instructor, Role.admin)
  copyActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.activities.copyToCourse(id, activityId, user.sub, user.role);
  }

  /**
   * B30 (Sprint 10) — verificação pública de certificado pelo código
   * SHA-256 emitido. Consulta apenas registros reais persistidos na
   * emissão; código desconhecido responde 404 (nunca "válido").
   */
  @Public()
  @Get('certificates/verify/:code')
  verifyCertificate(@Param('code') code: string) {
    return this.courses.verifyCertificateByCode(code);
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.courses.findById(id);
  }

  @Patch(':id')
  @Roles(Role.instructor, Role.admin)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.courses.update(id, dto, user.sub, user.role);
  }

  @Post(':id/enroll')
  enroll(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: EnrollStudentDto,
  ) {
    const isSelfEnrollment =
      user.role === 'student' || (!dto.userId && !dto.email);
    if (isSelfEnrollment) {
      return this.courses.enroll(id, { userId: user.sub }, user.sub, user.role);
    }
    return this.courses.enroll(id, dto, user.sub, user.role);
  }

  @Post(':id/enrollment-code')
  @Roles(Role.instructor, Role.admin)
  regenerateEnrollmentCode(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.courses.regenerateEnrollmentCode(id, user.sub, user.role);
  }

  @Get(':id/enrollment-code')
  @Roles(Role.instructor, Role.admin)
  revealEnrollmentCode(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.courses.revealEnrollmentCode(id, user.sub, user.role);
  }

  @Get(':id/students')
  @Roles(Role.instructor, Role.admin)
  getStudents(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.courses.getEnrollments(id, user.sub, user.role);
  }

  @Get(':id/students/:userId/report')
  @Roles(Role.instructor, Role.admin)
  getStudentReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) studentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.courses.getStudentReport(id, studentId, user.sub, user.role);
  }

  @Get(':id/certificate')
  async getCertificate(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('format') format: string | undefined,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const certificate = await this.courses.getCertificate(id, user.sub);
    if (format === 'html') {
      return res.type('html').send(buildCertificateHtml(certificate));
    }
    return res.json(certificate);
  }

  @Get(':id/analytics')
  @Roles(Role.instructor, Role.admin)
  getAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.courses.getCourseAnalytics(id, user.sub, user.role);
  }

  @Get(':id/leaderboard')
  getLeaderboard(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.courses.getLeaderboard(id, user?.sub, user?.role);
  }

  @Delete(':id')
  @Roles(Role.instructor, Role.admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.courses.delete(id, user.sub, user.role);
  }
}
