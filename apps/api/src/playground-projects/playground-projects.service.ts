import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeProjectFiles } from '../submissions/dto/project-files.dto';
import { CreateProjectDto, UpdateProjectDto } from './dto/save-project.dto';

const MAX_PROJECTS = 20;

@Injectable()
export class PlaygroundProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.playgroundProject.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, language: true, revision: true, updatedAt: true },
    });
  }

  async get(userId: string, id: string) {
    const project = await this.prisma.playgroundProject.findFirst({ where: { id, userId } });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    return project;
  }

  async create(userId: string, dto: CreateProjectDto) {
    const files = normalizeProjectFiles(dto).map(({ name, content }) => ({ name, content }));
    const title = dto.title.trim();
    if (!title) throw new BadRequestException('Informe o nome do projeto.');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      const count = await tx.playgroundProject.count({ where: { userId } });
      if (count >= MAX_PROJECTS) throw new BadRequestException('Limite de 20 projetos atingido.');
      return tx.playgroundProject.create({
        data: { userId, title, language: dto.language, files },
      });
    });
  }

  async update(userId: string, id: string, dto: UpdateProjectDto) {
    const files = normalizeProjectFiles(dto).map(({ name, content }) => ({ name, content }));
    const title = dto.title.trim();
    if (!title) throw new BadRequestException('Informe o nome do projeto.');
    const result = await this.prisma.playgroundProject.updateMany({
      where: { id, userId, revision: dto.revision },
      data: { title, language: dto.language, files, revision: { increment: 1 } },
    });
    if (result.count !== 1) {
      await this.get(userId, id);
      throw new ConflictException('O projeto foi alterado em outro dispositivo.');
    }
    return { id, revision: dto.revision + 1 };
  }

  async remove(userId: string, id: string, revision: number) {
    const result = await this.prisma.playgroundProject.deleteMany({ where: { id, userId, revision } });
    if (result.count !== 1) {
      await this.get(userId, id);
      throw new ConflictException('O projeto foi alterado em outro dispositivo.');
    }
  }
}
