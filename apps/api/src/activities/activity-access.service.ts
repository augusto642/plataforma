import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireCourse(courseId: string, userId: string, role: string): Promise<void> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true, isPublicLibrary: true },
    });
    if (!course) throw new NotFoundException('Curso não encontrado.');
    if (role === 'admin' || course.isPublicLibrary ||
        (role === 'instructor' && course.instructorId === userId)) return;
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true },
    });
    if (!enrollment) throw new ForbiddenException('É necessário estar matriculado neste curso.');
  }

  async requireActivity(activityId: string, userId: string, role: string): Promise<void> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { courseId: true },
    });
    if (!activity) throw new NotFoundException('Atividade não encontrada.');
    const now = new Date();
    const challenge = await this.prisma.challenge.findFirst({
      where: { activityId, startsAt: { lte: now }, endsAt: { gte: now } },
      select: { id: true },
    });
    if (challenge) return;
    await this.requireCourse(activity.courseId, userId, role);
  }
}
