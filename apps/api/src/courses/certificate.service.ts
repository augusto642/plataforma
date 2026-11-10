import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CertificateKind } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Fase 1 premium (desenho §2.5) — certificado verificável.
 * Estende o padrão que já funciona (`Enrollment.certificateCode` +
 * `GET /courses/certificates/verify/:code` + `/verify/[hash]`), sem
 * criar um segundo sistema:
 * - emissão exige conclusão REAL (todas as atividades com submission
 *   `passed`) — nunca por micro-módulo ou sem concluir;
 * - verificação consulta `Certificate` primeiro, `Enrollment` depois
 *   (retrocompatibilidade: códigos antigos continuam válidos);
 * - código desconhecido OU revogado = "não encontrado", sem vazar o
 *   motivo (mesma semântica do verify atual);
 * - nenhum texto promete "reconhecido pelo MEC" ou emprego: a
 *   credibilidade vem da verificação pública, não do selo.
 * O formato do código é o mesmo do atual: SHA-256 hex
 * (`userId:refId:completedAt`).
 */
@Injectable()
export class CertificateService {
  constructor(private readonly prisma: PrismaService) {}

  /** Código no mesmo formato do certificateCode atual. */
  static buildCode(userId: string, refId: string, completedAt: Date): string {
    return createHash('sha256')
      .update(`${userId}:${refId}:${completedAt.toISOString()}`)
      .digest('hex');
  }

  /**
   * Emite (ou devolve o existente) o certificado de módulo de um curso
   * concluído. Reutiliza o código já persistido na matrícula quando
   * houver, para o código antigo e o novo verificarem o mesmo registro.
   */
  async issueModuleCertificate(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    });
    if (!course) {
      throw new NotFoundException('Curso não encontrado');
    }
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true, certificateCode: true, certificateIssuedAt: true },
    });
    if (!enrollment) {
      throw new ForbiddenException('Você precisa estar matriculado neste curso para emitir o certificado');
    }
    const activitiesCount = await this.prisma.activity.count({ where: { courseId } });
    const passed = await this.prisma.submission.findMany({
      where: { userId, status: 'passed', activity: { courseId } },
      select: { activityId: true, createdAt: true },
    });
    const passedActivityIds = new Set(passed.map((s) => s.activityId));
    if (activitiesCount === 0 || passedActivityIds.size < activitiesCount) {
      throw new BadRequestException('Complete todas as atividades para emitir o certificado');
    }
    const completedAt = passed.reduce<Date>(
      (latest, s) => (s.createdAt > latest ? s.createdAt : latest),
      passed[0].createdAt,
    );
    const code =
      enrollment.certificateCode ??
      CertificateService.buildCode(userId, courseId, completedAt);

    const certificate = await this.prisma.certificate.upsert({
      where: { code },
      update: { title: course.title },
      create: {
        code,
        userId,
        kind: CertificateKind.module,
        refId: courseId,
        title: course.title,
        issuedAt: enrollment.certificateIssuedAt ?? completedAt,
      },
    });
    if (!enrollment.certificateCode) {
      await this.prisma.enrollment.update({
        where: { userId_courseId: { userId, courseId } },
        data: { certificateCode: code, certificateIssuedAt: completedAt },
      });
    }
    return this.toView(certificate);
  }

  /**
   * Sincroniza a linha `Certificate` a partir de uma emissão já feita
   * pelo fluxo legado (`CoursesService.getCertificate`). Usado para
   * que certificados emitidos pelo caminho antigo apareçam em
   * `GET /certificates/me` sem duplicar a regra de conclusão.
   */
  async syncModuleCertificate(
    userId: string,
    courseId: string,
    code: string,
    title: string,
    issuedAt: Date,
  ) {
    const certificate = await this.prisma.certificate.upsert({
      where: { code },
      update: { title },
      create: {
        code,
        userId,
        kind: CertificateKind.module,
        refId: courseId,
        title,
        issuedAt,
      },
    });
    return this.toView(certificate);
  }

  /** Verificação pública: Certificate (não revogado) → Enrollment. */
  async verifyByCode(rawCode: string) {
    const code = (rawCode ?? '').trim().toLowerCase().replace(/^sha256:/, '');
    if (!/^[a-f0-9]{64}$/.test(code)) {
      throw new NotFoundException('Certificado não encontrado');
    }

    const certificate = await this.prisma.certificate.findUnique({
      where: { code },
      include: { user: { select: { name: true } } },
    });
    // Revogado = não encontrado, sem vazar o motivo — e sem cair no
    // fallback da matrícula (a revogação tem que valer nas duas rotas).
    if (certificate && certificate.revokedAt) {
      throw new NotFoundException('Certificado não encontrado');
    }
    if (certificate) {
      return {
        valid: true as const,
        studentName: certificate.user.name,
        title: certificate.title,
        // Alias para a rota legada (/courses/certificates/verify/:code),
        // que devolve courseTitle.
        courseTitle: certificate.title,
        kind: certificate.kind,
        completedAt: certificate.issuedAt,
        verificationCode: certificate.code,
      };
    }

    // Fallback retrocompatível: códigos emitidos antes da tabela Certificate.
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { certificateCode: code },
      select: {
        certificateCode: true,
        certificateIssuedAt: true,
        user: { select: { name: true } },
        course: { select: { title: true, slug: true } },
      },
    });
    if (!enrollment) {
      throw new NotFoundException('Certificado não encontrado');
    }
    return {
      valid: true as const,
      studentName: enrollment.user.name,
      title: enrollment.course.title,
      courseTitle: enrollment.course.title,
      courseSlug: enrollment.course.slug,
      kind: CertificateKind.module,
      completedAt: enrollment.certificateIssuedAt,
      verificationCode: enrollment.certificateCode,
    };
  }

  async listMine(userId: string) {
    const certificates = await this.prisma.certificate.findMany({
      where: { userId, revokedAt: null },
      orderBy: { issuedAt: 'desc' },
    });
    return certificates.map((c) => this.toView(c));
  }

  async revoke(id: string) {
    const certificate = await this.prisma.certificate.findUnique({ where: { id } });
    if (!certificate) {
      throw new NotFoundException('Certificado não encontrado');
    }
    const revoked = await this.prisma.certificate.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return this.toView(revoked);
  }

  private toView(c: {
    id: string;
    code: string;
    kind: CertificateKind;
    refId: string;
    title: string;
    issuedAt: Date;
    revokedAt: Date | null;
  }) {
    return {
      id: c.id,
      code: c.code,
      kind: c.kind,
      refId: c.refId,
      title: c.title,
      issuedAt: c.issuedAt,
      revokedAt: c.revokedAt,
    };
  }
}
