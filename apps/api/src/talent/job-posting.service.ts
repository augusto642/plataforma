import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JobSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobPostingDto } from './dto/talent-phase4.dto';

/**
 * Fase 4 premium (desenho §5.1) — vagas estruturadas.
 *
 * Correção do desenho (§0.4 item 4): as vagas do KMS hoje são documentos
 * (`KnowledgeResearch.payload` / arquivo de pesquisa), não tabela. Esta
 * fase cria a tabela consultável. Regras que valem para TODA origem:
 * - vaga agregada só entra por rota admin (aprovação obrigatória);
 * - vaga com `postedAt` há mais de 2 anos é descartada (regra vigente
 *   da frente KMS/trilhas) — na extração ela é pulada, na criação
 *   direta ela é rejeitada;
 * - vaga agregada expira em 30 dias a partir de `postedAt` (salvo
 *   `expiresAt` explícito); vaga expirada nunca aparece no radar.
 *
 * O que NÃO é feito aqui (e por quê): o `ResearchDoc` atual não contém
 * lista de vagas — `market.skills` é agregado de menções, não vaga.
 * Fabricar linhas de vaga a partir de agregados inventaria emprego.
 * Por isso a extração só publica itens explícitos em `payload.jobs`
 * (formato do provedor futuro / importação manual) e, fora isso,
 * retorna 0 criadas — o caminho operacional de hoje é a rota admin.
 */

export const JOB_MAX_AGE_DAYS = 730; // 2 anos
export const AGGREGATED_TTL_DAYS = 30;

export interface ResearchDocLike {
  id: string;
  status: string;
  jobs?: unknown;
  market?: unknown;
}

export interface ExtractedJobCandidate {
  title: string;
  skills: string[];
  level: string;
  postedAt: Date;
  externalUrl?: string;
}

function normalizeSkills(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const item of raw) {
    const skill = String(item ?? '').trim().toLowerCase();
    if (skill) seen.add(skill);
  }
  return [...seen].slice(0, 30);
}

function isJobLevel(value: string): value is 'junior' | 'mid' | 'senior' {
  return value === 'junior' || value === 'mid' || value === 'senior';
}

/**
 * Parser puro (testável sem banco): extrai candidatas de um payload de
 * pesquisa, aplicando as regras de idade/expiração. Nunca lança por
 * item ruim — item ruim vira `skipped` com motivo.
 */
export function parseResearchJobs(
  doc: ResearchDocLike,
  now = new Date(),
): { candidates: ExtractedJobCandidate[]; skipped: { title: string; reason: string }[] } {
  const candidates: ExtractedJobCandidate[] = [];
  const skipped: { title: string; reason: string }[] = [];
  const rawJobs = Array.isArray(doc.jobs) ? doc.jobs : [];
  const cutoff = new Date(now.getTime() - JOB_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

  for (const raw of rawJobs) {
    const item = raw as Record<string, unknown>;
    const title = String(item?.title ?? '').trim();
    if (!title) {
      skipped.push({ title: '', reason: 'sem título' });
      continue;
    }
    const level = String(item?.level ?? '').trim().toLowerCase();
    if (!isJobLevel(level)) {
      skipped.push({ title, reason: 'nível inválido (esperado junior | mid | senior)' });
      continue;
    }
    const postedAt = item?.postedAt ? new Date(String(item.postedAt)) : null;
    if (!postedAt || Number.isNaN(postedAt.getTime())) {
      skipped.push({ title, reason: 'sem data de publicação válida' });
      continue;
    }
    if (postedAt < cutoff) {
      skipped.push({ title, reason: 'vaga com mais de 2 anos — descartada' });
      continue;
    }
    const expiresAt = new Date(postedAt.getTime() + AGGREGATED_TTL_DAYS * 24 * 60 * 60 * 1000);
    if (expiresAt <= now) {
      skipped.push({ title, reason: 'vaga já expirada (30 dias após publicação)' });
      continue;
    }
    const externalUrl =
      typeof item?.externalUrl === 'string' && /^https?:\/\//.test(item.externalUrl)
        ? item.externalUrl
        : undefined;
    candidates.push({ title, skills: normalizeSkills(item?.skills), level, postedAt, externalUrl });
  }
  return { candidates, skipped };
}

@Injectable()
export class JobPostingService {
  constructor(private readonly prisma: PrismaService) {}

  private validateDates(postedAt: Date, expiresAt: Date, now = new Date()): void {
    if (postedAt > now) {
      throw new BadRequestException('postedAt não pode estar no futuro');
    }
    if (postedAt < new Date(now.getTime() - JOB_MAX_AGE_DAYS * 24 * 60 * 60 * 1000)) {
      throw new BadRequestException('Vaga com mais de 2 anos não é publicada — descartada');
    }
    if (expiresAt <= postedAt) {
      throw new BadRequestException('expiresAt precisa ser posterior a postedAt');
    }
  }

  private normalizeDto(dto: CreateJobPostingDto, source: JobSource) {
    const now = new Date();
    const postedAt = dto.postedAt ? new Date(dto.postedAt) : now;
    if (Number.isNaN(postedAt.getTime())) {
      throw new BadRequestException('postedAt inválida');
    }
    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : new Date(postedAt.getTime() + AGGREGATED_TTL_DAYS * 24 * 60 * 60 * 1000);
    if (dto.expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException('expiresAt inválida');
    }
    this.validateDates(postedAt, expiresAt, now);
    const skills = normalizeSkills(dto.skills);
    if (skills.length === 0) {
      throw new BadRequestException('Informe ao menos uma skill');
    }
    return { title: dto.title.trim(), skills, level: dto.level, postedAt, expiresAt, source };
  }

  /** Rota admin: publica vaga agregada (a aprovação é a própria rota admin). */
  async createAggregated(dto: CreateJobPostingDto, researchId?: string) {
    const data = this.normalizeDto(dto, 'aggregated');
    return this.prisma.jobPosting.create({
      data: { ...data, researchId: researchId ?? null },
    });
  }

  /** Vaga de empresa parceira, via token existente (CompanyTokenGuard). */
  async createPartner(companyId: string, dto: CreateJobPostingDto) {
    const data = this.normalizeDto(dto, 'partner');
    return this.prisma.jobPosting.create({
      data: { ...data, companyId },
    });
  }

  /**
   * Extração a partir de pesquisa APROVADA (reuso da aprovação admin:
   * `POST /admin/knowledge/research/:id/approve` primeiro). Draft ou
   * rejeitada não publica nada — fail-closed. Idempotente por
   * (researchId, título): re-extrair não duplica a vaga.
   */
  async extractFromApprovedResearch(doc: ResearchDocLike) {
    if (doc.status !== 'approved') {
      throw new ForbiddenException(
        'Só pesquisa aprovada gera vagas no radar — aprove-a primeiro em /admin/knowledge/research/:id/approve',
      );
    }
    const { candidates, skipped } = parseResearchJobs(doc);
    const created: { id: string; title: string }[] = [];
    for (const candidate of candidates) {
      const existing = await this.prisma.jobPosting.findFirst({
        where: { researchId: doc.id, title: candidate.title },
        select: { id: true },
      });
      if (existing) {
        skipped.push({ title: candidate.title, reason: 'já publicada a partir desta pesquisa' });
        continue;
      }
      const createdJob = await this.prisma.jobPosting.create({
        data: {
          title: candidate.title,
          skills: candidate.skills,
          level: candidate.level,
          source: 'aggregated',
          researchId: doc.id,
          externalUrl: candidate.externalUrl ?? null,
          postedAt: candidate.postedAt,
          expiresAt: new Date(
            candidate.postedAt.getTime() + AGGREGATED_TTL_DAYS * 24 * 60 * 60 * 1000,
          ),
        },
      });
      created.push({ id: createdJob.id, title: createdJob.title });
    }
    return { researchId: doc.id, created, skipped };
  }

  /** Radar do aluno: só vagas não expiradas, mais recentes primeiro. */
  async listRadar() {
    const now = new Date();
    return this.prisma.jobPosting.findMany({
      where: { expiresAt: { gt: now } },
      orderBy: { postedAt: 'desc' },
      select: {
        id: true,
        title: true,
        skills: true,
        level: true,
        source: true,
        externalUrl: true,
        postedAt: true,
        expiresAt: true,
        company: { select: { name: true } },
      },
    });
  }

  async getById(id: string) {
    const job = await this.prisma.jobPosting.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        skills: true,
        level: true,
        source: true,
        externalUrl: true,
        postedAt: true,
        expiresAt: true,
        company: { select: { name: true } },
      },
    });
    if (!job) throw new NotFoundException('Vaga não encontrada');
    return job;
  }

  async deleteJob(id: string): Promise<void> {
    const job = await this.prisma.jobPosting.findUnique({ where: { id }, select: { id: true } });
    if (!job) throw new NotFoundException('Vaga não encontrada');
    await this.prisma.jobPosting.delete({ where: { id } });
  }
}
