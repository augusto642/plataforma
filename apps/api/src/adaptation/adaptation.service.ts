import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  computeCoursePath,
  computeFragileConcepts,
  REMEDIATION_FAILURE_THRESHOLD,
  type FragileConcept,
  type PathActivity,
  type RemediationActivity,
} from './adaptation.rules';

export interface CoursePathView {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  isSyntaxTrack: boolean;
  modules: {
    tag: string;
    title: string;
    order: number;
    status: string;
    totalActivities: number;
    passedActivities: number;
    effectiveCompletedActivities: number;
    testOutActivity: { id: string; slug: string; title: string } | null;
  }[];
  nextActivity: {
    id: string;
    slug: string;
    title: string;
    order: number;
    moduleTag: string | null;
  } | null;
  entryModuleTag: string | null;
}

export interface RemediationView {
  threshold: number;
  fragileConcepts: FragileConcept[];
}

const ACTIVITY_SELECT = {
  id: true,
  slug: true,
  title: true,
  language: true,
  order: true,
  conceptTags: true,
  courseId: true,
  course: { select: { slug: true, title: true, isPublicLibrary: true } },
} as const;

type ActivityRow = {
  id: string;
  slug: string;
  title: string;
  language: string;
  order: number;
  conceptTags: string[];
  courseId: string;
  course: { slug: string; title: string; isPublicLibrary: boolean };
};

function toRemediationActivity(row: ActivityRow): RemediationActivity {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    language: row.language,
    order: row.order,
    conceptTags: row.conceptTags,
    courseId: row.courseId,
    courseSlug: row.course.slug,
    courseTitle: row.course.title,
  };
}

@Injectable()
export class AdaptationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Caminho do aluno num curso: módulos da espinha com estado derivado
   * das submissões reais (computeCoursePath) e o próximo passo que a
   * interface deve apresentar. Sem matrícula, o caminho é o do aluno
   * sem nenhuma conclusão (a página do curso decide o que exibir).
   */
  async getCoursePath(
    userId: string,
    courseId: string,
  ): Promise<CoursePathView> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        slug: true,
        title: true,
        activities: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            slug: true,
            title: true,
            order: true,
            conceptTags: true,
          },
        },
      },
    });
    if (!course) {
      throw new NotFoundException('Curso não encontrado.');
    }

    const activities: PathActivity[] = course.activities;
    const passed = await this.prisma.submission.findMany({
      where: {
        userId,
        status: 'passed',
        activityId: { in: activities.map((a) => a.id) },
      },
      distinct: ['activityId'],
      select: { activityId: true },
    });
    const passedIds = new Set(passed.map((s) => s.activityId));

    const path = computeCoursePath(activities, passedIds);
    const byId = new Map(activities.map((a) => [a.id, a]));

    return {
      courseId: course.id,
      courseSlug: course.slug,
      courseTitle: course.title,
      isSyntaxTrack: path.modules.length > 0,
      modules: path.modules.map((m) => {
        const testOut = byId.get(m.testOutActivityId);
        return {
          tag: m.tag,
          title: m.title,
          order: m.order,
          status: m.status,
          totalActivities: m.totalActivities,
          passedActivities: m.passedActivities,
          effectiveCompletedActivities: m.activityIds.filter((id) =>
            path.effectiveCompletedIds.has(id),
          ).length,
          testOutActivity: testOut
            ? { id: testOut.id, slug: testOut.slug, title: testOut.title }
            : null,
        };
      }),
      nextActivity: path.nextActivityId
        ? (() => {
            const next = byId.get(path.nextActivityId);
            if (!next) return null;
            const module =
              path.modules.find((m) => m.activityIds.includes(next.id)) ??
              null;
            return {
              id: next.id,
              slug: next.slug,
              title: next.title,
              order: next.order,
              moduleTag: module ? module.tag : null,
            };
          })()
        : null,
      entryModuleTag: path.entryModuleTag,
    };
  }

  /**
   * Conceitos frágeis do aluno (regra 3) com a atividade de reforço
   * escolhida — consumido pela IDE (oferta após a falha) e pelo painel
   * do aluno ("conceitos para reforçar"). Lista derivada de submissões
   * reais; nenhum score é inventado.
   */
  async getRemediation(userId: string): Promise<RemediationView> {
    const submissions = await this.prisma.submission.findMany({
      where: { userId },
      select: { activityId: true, status: true, createdAt: true },
    });
    const passedActivityIds = new Set(
      submissions
        .filter((s) => s.status === 'passed')
        .map((s) => s.activityId),
    );

    const referencedIds = [...new Set(submissions.map((s) => s.activityId))];
    const referenced =
      referencedIds.length > 0
        ? await this.prisma.activity.findMany({
            where: { id: { in: referencedIds } },
            select: ACTIVITY_SELECT,
          })
        : [];
    const activitiesById = new Map(
      referenced.map((row) => [
        row.id,
        toRemediationActivity(row as ActivityRow),
      ]),
    );

    const libraryRows = await this.prisma.activity.findMany({
      where: { course: { isPublicLibrary: true } },
      select: ACTIVITY_SELECT,
    });
    const libraryActivities = (libraryRows as ActivityRow[]).map(
      toRemediationActivity,
    );

    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      select: { courseId: true },
    });
    const enrolledCourseIds = enrollments.map((e) => e.courseId);
    const enrolledRows =
      enrolledCourseIds.length > 0
        ? await this.prisma.activity.findMany({
            where: {
              courseId: { in: enrolledCourseIds },
              course: { isPublicLibrary: false },
            },
            select: ACTIVITY_SELECT,
          })
        : [];
    const enrolledActivities = (enrolledRows as ActivityRow[]).map(
      toRemediationActivity,
    );

    const fragileConcepts = computeFragileConcepts({
      submissions,
      activitiesById,
      passedActivityIds,
      libraryActivities,
      enrolledActivities,
    });

    return { threshold: REMEDIATION_FAILURE_THRESHOLD, fragileConcepts };
  }
}
