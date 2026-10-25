/**
 * Pesquisa profunda — orquestração (DESIGN §3.3/§3.5).
 * Todo resultado nasce draft; publicação só com aprovação do admin (Q1).
 * O gatilho "modelo" (B3) NUNCA chama provedores nem publica nada: consulta
 * pesquisa aprovada, ou cria ResearchRequest pendente e devolve a trilha
 * existente mais próxima + aviso honesto de pendência.
 *
 * C1 — DI: os provedores video/repos/jobs são INTERFACES (apagadas em
 * runtime); o Nest não tem token para resolvê-las. Por isso são @Optional():
 * sem provider registrado, o Nest injeta undefined e o construtor usa as
 * implementações padrão (YouTube/GitHub/busca web). Registrar tokens de
 * provider seria cerimônia sem benefício: trocar o provedor é trocar a
 * classe padrão aqui, não o consumidor (mesmo padrão da camada LlmProvider).
 *
 * A1 — Persistência e fonte canônica: a fonte canônica é o ARQUIVO
 * versionado `content/knowledge/research/<id>.json` (a mesma que o gerador
 * CLI consome e que o importador espelha para a tabela knowledge_research —
 * a API NÃO escreve direto no banco; o espelho é o importador, §5.4).
 * Cada mutação (create/collect/approve/reject/request) escreve o arquivo
 * atomicamente (temp + rename) e o mapa em memória é só cache; o construtor
 * hidrata o mapa a partir dos arquivos, então restart NÃO apaga aprovação.
 * Se o diretório não for configurável nem detectável, TODA mutação falha
 * explicitamente (V2 da auditoria de reuso): degradar para "só em memória
 * até o restart" escondia perda de aprovação atrás de uma API 200. Sob
 * testes (NODE_ENV=test), a persistência automática é desabilitada salvo
 * diretório explícito, para os specs não poluírem o repo — os specs passam
 * opts (ou testam a falha explícita).
 *
 * Corrida create→collect (A1): collect() NUNCA apaga uma decisão terminal.
 * Se entre o create e a coleta o admin aprovou (ou rejeitou) o doc, a
 * coleta atualiza o conteúdo coletado e PRESERVA status/approvedBy/
 * approvedAt/rejectReason/createdAt. Só draft é substituído.
 */
import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
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

export interface ResearchServiceOptions {
  researchDir?: string;
}

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);
  private readonly docs = new Map<string, ResearchDoc>();
  private readonly video: VideoResearchProvider;
  private readonly repos: RepoResearchProvider;
  private readonly jobs: MarketResearchProvider;
  private readonly researchDir: string | null;

  constructor(
    @InjectQueue('research') private readonly queue?: Queue,
    @Optional() video?: VideoResearchProvider,
    @Optional() repos?: RepoResearchProvider,
    @Optional() jobs?: MarketResearchProvider,
    // @Optional(): sem ele, o Nest tenta resolver o tipo apagado (Object) e
    // o boot falha como no C1/KmsService — com ele, injeta undefined.
    @Optional() opts?: ResearchServiceOptions,
  ) {
    this.video = video ?? new YouTubeDataProvider();
    this.repos = repos ?? new GitHubRestProvider();
    this.jobs = jobs ?? new WebSearchJobsProvider();
    this.researchDir = ResearchService.resolveResearchDir(opts);
    if (this.researchDir) this.hydrate();
  }

  static resolveResearchDir(opts?: ResearchServiceOptions): string | null {
    if (opts?.researchDir) return opts.researchDir;
    if (process.env.RESEARCH_CONTENT_DIR) return process.env.RESEARCH_CONTENT_DIR;
    if (process.env.KNOWLEDGE_CONTENT_DIR) return join(process.env.KNOWLEDGE_CONTENT_DIR, 'knowledge', 'research');
    // Sob testes, sem diretório explícito: persistência desligada (não poluir o repo).
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) return null;
    for (const candidate of [
      join(process.cwd(), 'content', 'knowledge', 'research'),
      join(process.cwd(), '..', '..', 'content', 'knowledge', 'research'),
    ]) {
      if (existsSync(candidate)) return candidate;
    }
    return null;
  }

  /** Diretório canônico (null = persistência desabilitada). */
  getResearchDir(): string | null {
    return this.researchDir;
  }

  private hydrate(): void {
    if (!this.researchDir || !existsSync(this.researchDir)) return;
    for (const f of readdirSync(this.researchDir).filter((x) => x.endsWith('.json'))) {
      try {
        const doc = JSON.parse(readFileSync(join(this.researchDir, f), 'utf8')) as ResearchDoc;
        if (doc && doc.id) this.docs.set(doc.id, doc);
      } catch (err) {
        this.logger.warn(`research: arquivo inválido ignorado na hidratação: ${f} (${(err as Error).message})`);
      }
    }
  }

  /** Escreve o doc no arquivo canônico (atômico). Sem diretório, falha
   *  explícita (V2): nunca finge persistir o que só vive em memória. */
  private persist(doc: ResearchDoc): void {
    if (!this.researchDir) {
      throw new Error('persistência de pesquisa indisponível: configure RESEARCH_CONTENT_DIR ou KNOWLEDGE_CONTENT_DIR (ou rode com o checkout do repo) — mutação recusada em vez de viver só em memória até o restart');
    }
    mkdirSync(this.researchDir, { recursive: true });
    const dest = join(this.researchDir, `${doc.id}.json`);
    const tmp = `${dest}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(doc, null, 2)}\n`);
    renameSync(tmp, dest);
  }

  private store(doc: ResearchDoc): ResearchDoc {
    // Persistir ANTES de cachear (V2): se a persistência falha, o doc não
    // fica no Map fingindo existir — a mutação falha inteira e o list()
    // segue vazio. Antes desta ordem, um collect sem diretório deixava o
    // doc em memória (o spec V2 flagrou).
    this.persist(doc);
    this.docs.set(doc.id, doc);
    return doc;
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
    const id = `research-${slugify(goal)}`;
    const previous = this.docs.get(id);
    const doc: ResearchDoc = {
      id,
      goal,
      // Decisão terminal nunca é apagada pela re-coleta (A1): aprovado/rejeitado
      // preserva status, aprovador, data de aprovação e motivo de rejeição.
      status: previous && (previous.status === 'approved' || previous.status === 'rejected') ? previous.status : 'draft',
      createdAt: previous?.createdAt ?? new Date().toISOString(),
      approvedAt: previous?.status === 'approved' ? previous.approvedAt : null,
      approvedBy: previous?.status === 'approved' ? previous.approvedBy : null,
      rejectReason: previous?.status === 'rejected' ? previous.rejectReason ?? null : null,
      sourcesAvailable: available,
      sourcesUnavailable: unavailable,
      market: { sampleSize: 0, skills, note: unavailable.includes('jobs') ? 'fonte indisponível: sem chave de busca web (Q3 pendente)' : undefined },
      videos,
      channels: [],
      repos,
      collectedAt: new Date().toISOString(),
    };
    return this.store(doc);
  }

  /** Rota admin: cria a pesquisa draft e enfileira a coleta (BullMQ 'research').
   *  A coleta roda SÓ no worker: coletar inline aqui e de novo no worker
   *  gastaria cota de API duas vezes (YouTube: 100 un/busca). */
  async createResearch(goal: string): Promise<ResearchDoc> {
    const id = `research-${slugify(goal)}`;
    const previous = this.docs.get(id);
    // Aprovação/rejeição existente nunca é resetada por um novo create.
    if (previous && (previous.status === 'approved' || previous.status === 'rejected')) return previous;
    const doc: ResearchDoc = {
      id,
      goal,
      status: 'draft',
      createdAt: previous?.createdAt ?? new Date().toISOString(),
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
    this.store(doc);
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
    // Novo objeto (nunca mutar o cache): se persist() falhar, o doc em
    // memória segue draft — aprovação nunca existe só em memória.
    return this.store({ ...doc, status: 'approved', approvedBy: adminId, approvedAt: new Date().toISOString() });
  }

  reject(id: string, reason: string): ResearchDoc {
    const doc = this.get(id);
    if (doc.status !== 'draft') throw new Error(`só draft pode ser rejeitado (status atual: ${doc.status})`);
    return this.store({ ...doc, status: 'rejected', rejectReason: reason });
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
    this.store(request);
    return {
      approved: null,
      request,
      message: 'Ainda não há pesquisa aprovada para a sua meta. Seu pedido entrou na fila do admin; por enquanto, use a trilha existente mais próxima — nenhuma trilha foi fabricada a partir de dados inventados.',
    };
  }
}

// Re-export para o worker/processor sem acoplamento ao Nest.
export { ProviderUnavailable };
