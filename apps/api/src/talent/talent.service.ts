import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { hashToken } from '../auth/tokens.util';
import { CoursesService } from '../courses/courses.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return `${first}${last}`.toUpperCase();
}

@Injectable()
export class TalentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courses: CoursesService,
  ) {}

  async createCompany(dto: CreateCompanyDto) {
    const token = randomBytes(32).toString('hex');
    const company = await this.prisma.company.create({
      data: {
        name: dto.name.trim(),
        tokenHash: hashToken(token),
      },
      select: { id: true, name: true },
    });
    return { id: company.id, name: company.name, token };
  }

  async listCompanies() {
    return this.prisma.company.findMany({
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteCompany(id: string): Promise<void> {
    const company = await this.prisma.company.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }
    await this.prisma.company.delete({ where: { id } });
  }

  async getCourseLeaderboard(courseId: string) {
    const ranked = await this.courses.getLeaderboard(courseId, undefined, undefined);
    const userIds = ranked.map((entry) => entry.userId);
    const visibleUsers = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds }, talentVisible: true },
          select: { id: true },
        })
      : [];
    const visibleIds = new Set(visibleUsers.map((u) => u.id));

    return ranked
      .filter((entry) => visibleIds.has(entry.userId))
      .map((entry, index) => ({
        rank: index + 1,
        initials: getInitials(entry.name),
        name: entry.name,
        xp: entry.xp,
        level: entry.level,
        streakDays: entry.streakDays,
        completedActivitiesCount: entry.completedActivitiesCount,
      }));
  }
}
