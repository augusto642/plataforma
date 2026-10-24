/**
 * Pesquisa profunda — orquestração (DESIGN §3.3/§3.5).
 * Todo resultado nasce draft; publicação só com aprovação do admin (Q1).
 * O gatilho "modelo" (B3) NUNCA chama provedores nem publica nada: consulta
 * pesquisa aprovada, ou cria ResearchRequest pendente e devolve a trilha
 * existente mais próxima + aviso honesto de pendência.
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { ProviderUnavailable, type MarketResearchProvider, type RepoResearchProvider, type VideoResearchProvider } from './providers';
import { GitHubRestProvider } from './github.provider';
import { WebSearchJobsProvider } from './web-search.provider';
import { YouTubeDataProvider } from './youtube.provider';

export type ResearchStatus = 'draft' | 'approved' | 'rejected' | 'requested';

export interface ResearchDoc {
  id: string;
  goal: string;
  status: ResearchStatus;
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectReason?: string | null;
  sourcesAvailable: string[];
  sourcesUnavailable: string[];
  market: { sampleSize: number; skills: { skill: string; mentions: number; sampleSize: number; sources: string[] }[]; note?: string };
  videos: unknown[];
  channels: unknown[];
  repos: unknown[];
  collectedAt: string;
}

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);
  private readonly docs = new Map<string, ResearchDoc>();
  private readonly video: VideoResearchProvider;
  private readonly repos: RepoResearchProvider;
  private readonly jobs: MarketResearchProvider;

  constructor(
    @InjectQueue('research') private readonly queue?: Queue,
    video?: VideoResearchProvider,
    repos?: RepoResearchProvider,
    jobs?: MarketResearchProvider,
  ) {
    this.video = video ?? new YouTubeDataProvider();
    this.repos = repos ?? new GitHubRestProvider();
    this.jobs = jobs ?? new WebSearchJobsProvider();
  }

  /** Coleta síncrona (usada pelo worker e pelos testes). Fail-closed por fonte. */
  async collect(goal: string): Promise<ResearchDoc> {
    const available: string[] = [];
    const unavailable: string[] = [];
    let videos: unknown[] = [];
    let repos: unknown[] = [];
    let skills: ResearchDoc['market']['skills'] = [];
    try { videos = await this.video.searchVideos(goal, { maxResults: 10 }); available.push('youtube'); }
    catch (err) { unavailable.push('youtube'); this.logger.warn(`research: youtube indisponível: ${(err as Error).message}`); }
    try { repos = await this.repos.searchRepos(goal, { language: 'python', minStars: 100 }); available.push('github'); }
    catch (err) { unavailable.push('github'); this.logger.warn(`research: github indisponível: ${(err as Error).message}`); }
    try { skills = await this.jobs.searchJobs({ goal, region: 'BR', seniority: 'junior' }); available.push('jobs'); }
    catch (err) { unavailable.push('jobs'); this.logger.warn(`research: jobs indisponível: ${(err as Error).message}`); }
    if (available.length === 0) {
      this.logger.warn('research: todas as fontes indisponíveis — pesquisa registrada draft com sourcesAvailable vazio; o gerador recusará gerar trilha a partir dela');
    }
    const doc: ResearchDoc = {
      id: `research-${slugify(goal)}`,
      goal,
      status: 'draft',
      createdAt: new Date().toISOString(),
      approvedAt: null,
      approvedBy: null,
      sourcesAvailable: available,
      sourcesUnavailable: unavailable,
      market: { sampleSize: 0, skills, note: unavailable.includes('jobs') ? 'fonte indisponível: sem chave de busca web (Q3 pendente)' : undefined },
      videos,
      channels: [],
      repos,
      collectedAt: new Date().toISOString(),
    };
    this.docs.set(doc.id, doc);
    return doc;
  }

  /** Rota admin: cria a pesquisa draft e enfileira a coleta (BullMQ 'research').
   *  A coleta roda SÓ no worker: coletar inline aqui e de novo no worker
   *  gastaria cota de API duas vezes (YouTube: 100 un/busca). */
  async createResearch(goal: string): Promise<ResearchDoc> {
    const doc: ResearchDoc = {
      id: `research-${slugify(goal)}`,
      goal,
      status: 'draft',
      createdAt: new Date().toISOString(),
      approvedAt: null,
      approvedBy: null,
      sourcesAvailable: [],
      sourcesUnavailable: ['youtube', 'github', 'jobs'],
      market: { sampleSize: 0, skills: [], note: 'coleta pendente (fila research)' },
      videos: [],
      channels: [],
      repos: [],
      collectedAt: new Date().toISOString(),
    };
    this.docs.set(doc.id, doc);
    if (this.queue) await this.queue.add('collect', { researchId: doc.id, goal });
    return doc;
  }

  list(): ResearchDoc[] { return [...this.docs.values()]; }

  get(id: string): ResearchDoc {
    const doc = this.docs.get(id);
    if (!doc) throw new NotFoundException(`pesquisa ${id} não encontrada`);
    return doc;
  }

  approve(id: string, adminId: string): ResearchDoc {
    const doc = this.get(id);
    if (doc.status !== 'draft') throw new Error(`só draft pode ser aprovado (status atual: ${doc.status})`);
    doc.status = 'approved';
    doc.approvedBy = adminId;
    doc.approvedAt = new Date().toISOString();
    return doc;
  }

  reject(id: string, reason: string): ResearchDoc {
    const doc = this.get(id);
    if (doc.status !== 'draft') throw new Error(`só draft pode ser rejeitado (status atual: ${doc.status})`);
    doc.status = 'rejected';
    doc.rejectReason = reason;
    return doc;
  }

  /** B3 — gatilho "modelo": só pesquisa APROVADA alimenta o gerador. */
  findApprovedForGoal(goal: string): ResearchDoc | null {
    const needle = slugify(goal);
    return this.list().find((d) => d.status === 'approved' && (d.id.includes(needle) || needle.includes(slugify(d.goal)))) ?? null;
  }

  /** B3 — sem pesquisa aprovada: pedido pendente + resposta honesta ao aluno. */
  requestForGoal(goal: string): { approved: ResearchDoc | null; request: ResearchDoc | null; message: string } {
    const approved = this.findApprovedForGoal(goal);
    if (approved) return { approved, request: null, message: 'Pesquisa aprovada encontrada para a sua meta.' };
    const request: ResearchDoc = {
      id: `research-request-${slugify(goal)}`,
      goal,
      status: 'requested',
      createdAt: new Date().toISOString(),
      approvedAt: null,
      approvedBy: null,
      sourcesAvailable: [],
      sourcesUnavailable: ['youtube', 'github', 'jobs'],
      market: { sampleSize: 0, skills: [], note: 'pedido pendente de pesquisa — nenhuma fonte consultada ainda' },
      videos: [],
      channels: [],
      repos: [],
      collectedAt: new Date().toISOString(),
    };
    this.docs.set(request.id, request);
    return {
      approved: null,
      request,
      message: 'Ainda não há pesquisa aprovada para a sua meta. Seu pedido entrou na fila do admin; por enquanto, use a trilha existente mais próxima — nenhuma trilha foi fabricada a partir de dados inventados.',
    };
  }
}

// Re-export para o worker/processor sem acoplamento ao Nest.
export { ProviderUnavailable };
