import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}  async create(dto: CreateActivityDto, userId?: string, userRole?: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    if (userRole !== 'admin' && userId && course.instructorId !== userId) {
      throw new ForbiddenException('Apenas o instrutor responsável pelo curso ou administradores podem adicionar atividades');
    }

    const existing = await this.prisma.activity.findUnique({
      where: {
        courseId_slug: {
          courseId: dto.courseId,
          slug: dto.slug,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        'Activity with this slug already exists in the course',
      );
    }

    return this.prisma.activity.create({
      data: {
        courseId: dto.courseId,
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        instructions: dto.instructions,
        language: dto.language ?? 'javascript',
        initialCode: dto.initialCode,
        testCode: dto.testCode,
        hiddenTests: dto.hiddenTests,
        timeLimitMs: dto.timeLimitMs ?? 5000,
        memoryLimitMb: dto.memoryLimitMb ?? 256,
        order: dto.order ?? 0,
        conceptTags: dto.conceptTags ?? [],
        referenceSolution: dto.referenceSolution,
        giteaTemplateRepo: dto.giteaTemplateRepo,
      },
    });
  }

  async getConcepts(): Promise<string[]> {
    const activities = await this.prisma.activity.findMany({
      select: { conceptTags: true },
    });
    const concepts = new Set<string>();
    for (const activity of activities) {
      for (const tag of activity.conceptTags) {
        concepts.add(tag);
      }
    }
    return Array.from(concepts).sort();
  }

  async getLibrary() {
    return this.prisma.activity.findMany({
      where: { course: { isPublicLibrary: true } },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        language: true,
        order: true,
        conceptTags: true,
        course: { select: { id: true, title: true, slug: true } },
      },
    });
  }

  async copyToCourse(
    courseId: string,
    activityId: string,
    userId: string,
    userRole: string,
  ) {
    const targetCourse = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!targetCourse) {
      throw new NotFoundException('Course not found');
    }
    if (userRole !== 'admin' && targetCourse.instructorId !== userId) {
      throw new ForbiddenException('Apenas o instrutor responsável pelo curso ou administradores podem copiar atividades para ele');
    }

    const source = await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: { course: { select: { instructorId: true, isPublicLibrary: true } } },
    });
    if (!source) {
      throw new NotFoundException('Activity not found');
    }
    const isOwnActivity = source.course.instructorId === userId;
    if (userRole !== 'admin' && !isOwnActivity && !source.course.isPublicLibrary) {
      throw new ForbiddenException('Apenas atividades da biblioteca pública ou do seu próprio curso podem ser copiadas');
    }

    const lastOrder = await this.prisma.activity.aggregate({
      where: { courseId },
      _max: { order: true },
    });
    const nextOrder = (lastOrder._max.order ?? 0) + 1;

    const slugExists = await this.prisma.activity.findUnique({
      where: { courseId_slug: { courseId, slug: source.slug } },
      select: { id: true },
    });
    let slug = source.slug;
    let title = source.title;
    if (slugExists) {
      const existingSlugs = await this.prisma.activity.findMany({
        where: { courseId, slug: { startsWith: `${source.slug}-` } },
        select: { slug: true },
      });
      const taken = new Set(existingSlugs.map((a) => a.slug));
      let suffix = 2;
      while (taken.has(`${source.slug}-${suffix}`)) {
        suffix++;
      }
      slug = `${source.slug}-${suffix}`;
      title = `${source.title} (cópia)`;
    }

    return this.prisma.activity.create({
      data: {
        courseId,
        title,
        slug,
        description: source.description,
        instructions: source.instructions,
        language: source.language,
        initialCode: source.initialCode,
        testCode: source.testCode,
        hiddenTests: source.hiddenTests,
        timeLimitMs: source.timeLimitMs,
        memoryLimitMb: source.memoryLimitMb,
        order: nextOrder,
        conceptTags: source.conceptTags,
        referenceSolution: source.referenceSolution,
      },
    });
  }

  async findByCourse(courseId: string, userRole: string = 'student', conceptTag?: string) {
    const activities = await this.prisma.activity.findMany({
      where: {
        courseId,
        ...(conceptTag ? { conceptTags: { has: conceptTag } } : {}),
      },
      orderBy: { order: 'asc' },
    });

    return activities.map((act) => {
      const { referenceSolution, ...rest } = act;
      if (userRole === 'student') {
        const { hiddenTests, ...studentRest } = rest;
        return studentRest;
      }
      return rest;
    });
  }

  async findById(id: string, userRole: string = 'student') {
    const activity = await this.prisma.activity.findUnique({
      where: { id },
      include: {
        course: {
          select: { id: true, title: true, slug: true },
        },
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const { referenceSolution, ...rest } = activity;

    if (userRole === 'student') {
      const { hiddenTests, ...studentRest } = rest;
      return studentRest;
    }

    return rest;
  }

  async getDaily(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      select: { courseId: true },
    });
    const courseIds = enrollments.map((e) => e.courseId);
    if (courseIds.length === 0) {
      return { activity: null };
    }

    const activities = await this.prisma.activity.findMany({
      where: { courseId: { in: courseIds } },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        title: true,
        language: true,
        description: true,
        order: true,
        course: { select: { id: true, title: true, slug: true } },
      },
    });
    if (activities.length === 0) {
      return { activity: null };
    }

    const passedActivityIds = new Set(
      (
        await this.prisma.submission.findMany({
          where: {
            userId,
            status: 'passed',
            activityId: { in: activities.map((a) => a.id) },
          },
          distinct: ['activityId'],
          select: { activityId: true },
        })
      ).map((s) => s.activityId),
    );

    const pending = activities.find((a) => !passedActivityIds.has(a.id));
    const chosen = pending ?? activities[activities.length - 1];

    return {
      activity: {
        id: chosen.id,
        title: chosen.title,
        language: chosen.language,
        description: chosen.description,
        course: chosen.course,
      },
    };
  }

  async getReferenceSolution(id: string, userId: string, userRole: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id },
      include: {
        course: { select: { instructorId: true } },
      },
    });
    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const isOwnerOrAdmin = userRole === 'admin' || activity.course.instructorId === userId;
    if (!isOwnerOrAdmin) {
      const passedSubmission = await this.prisma.submission.findFirst({
        where: { activityId: id, userId, status: 'passed' },
        select: { id: true },
      });
      if (!passedSubmission) {
        throw new ForbiddenException('Disponível após passar na atividade');
      }
    }

    return { referenceSolution: activity.referenceSolution };
  }

  async update(id: string, dto: UpdateActivityDto, userId?: string, userRole?: string) {
    const act = await this.prisma.activity.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!act) {
      throw new NotFoundException('Activity not found');
    }
    if (userRole !== 'admin' && userId && act.course.instructorId !== userId) {
      throw new ForbiddenException('Apenas o instrutor responsável ou administradores podem modificar esta atividade');
    }
    return this.prisma.activity.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, userId?: string, userRole?: string) {
    const act = await this.prisma.activity.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!act) {
      throw new NotFoundException('Activity not found');
    }
    if (userRole !== 'admin' && userId && act.course.instructorId !== userId) {
      throw new ForbiddenException('Apenas o instrutor responsável ou administradores podem excluir esta atividade');
    }
    await this.prisma.activity.delete({ where: { id } });
  }
}
