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
 *
 * V2 COMPLETO (rodada 3, padrão decisão-no-banco, mesmo que o KMS/V1):
 * sem checkout (researchDir indisponível), a mutação NÃO vive em memória
 * nem some no restart: ela é registrada NO BANCO (knowledge_research, com
 * payload completo) e devolvida com `sync: 'pending-sync'`. O operador
 * materializa a decisão no arquivo versionado com
 * `kms-apply.mjs --sync-research` e então re-importa. Com checkout, o
 * arquivo segue canônico (comportamento provado pelo QA2, mantido). Sem
 * checkout E sem banco/tabelas, a mutação falha explicitamente — nunca
 * 200 com estado volátil. Leituras (list/get) seguem o cache em memória /
 * arquivo; em modo DB, o documento decidido fica visível no processo até
 * o sync (mesma limitação documentada do pending-sync do KMS).
 */
import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderUnavailable, type MarketResearchProvider, type RepoResearchProvider, type VideoResearchProvider } from './providers';
import { GitHubRestProvider } from './github.provider';
import { WebSearchJobsProvider } from './web-search.provider';
import { YouTubeDataProvider } from './youtube.provider';

export type ResearchStatus = 'draft' | 'approved' | 'rejected' | 'requested';

export interface ResearchDoc {
  id: string;
  goal: string;
  status: ResearchStatus;
  /** Modo DB (V2): decisão registrada no banco, arquivo ainda não sincronizado. */
  sync?: string;
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
    @Optional() private readonly prisma?: PrismaService,
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
    // D5 (laudo QA2, BAIXO): researchDir apontando para um ARQUIVO antes
    // explodia com ENOTDIR no readdirSync do construtor. Erro de
    // configuração do operador vira erro claro aqui, não crash obscuro.
    let stat: { isDirectory(): boolean };
    try {
      stat = statSync(this.researchDir);
    } catch (err) {
      throw new Error(`diretório de pesquisa ilegível (${this.researchDir}): ${(err as Error).message}`);
    }
    if (!stat.isDirectory()) {
      throw new Error(`researchDir aponta para um arquivo, não um diretório (${this.researchDir}): configure RESEARCH_CONTENT_DIR ou KNOWLEDGE_CONTENT_DIR para um diretório de pesquisa válido`);
    }
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

  private async researchTablesPresent(): Promise<boolean> {
    if (!this.prisma) return false;
    try {
      const db = this.prisma as unknown as { $queryRawUnsafe(q: string): Promise<Array<Record<string, string | null>>> };
      const rows = await db.$queryRawUnsafe(`SELECT to_regclass('public.knowledge_research')::text AS research`);
      return Boolean((rows[0] || {}).research);
    } catch {
      return false;
    }
  }

  /** Doc decidido no banco (modo DB, V2): payload + colunas vencem o cache. */
  private async dbDoc(id: string): Promise<ResearchDoc | null> {
    if (!this.prisma) return null;
    try {
      const db = this.prisma as unknown as { knowledgeResearch: { findUnique(args: unknown): Promise<{ payload?: unknown; status?: string; approvedBy?: string | null; approvedAt?: Date | null } | null> } };
      const row = await db.knowledgeResearch.findUnique({ where: { stableId: id } });
      if (!row || !row.payload || typeof row.payload !== 'object') return null;
      const payload = row.payload as ResearchDoc;
      return {
        ...payload,
        status: (row.status as ResearchStatus) || payload.status,
        approvedBy: row.approvedBy ?? payload.approvedBy ?? null,
        approvedAt: row.approvedAt ? new Date(row.approvedAt).toISOString() : payload.approvedAt ?? null,
      };
    } catch {
      return null;
    }
  }

  private async storeInDb(doc: ResearchDoc): Promise<ResearchDoc> {
    const db = this.prisma as unknown as { knowledgeResearch: { upsert(args: unknown): Promise<unknown> } };
    const payload = { ...doc };
    delete payload.sync;
    await db.knowledgeResearch.upsert({
      where: { stableId: doc.id },
      update: { goal: doc.goal, status: doc.status, payload, approvedBy: doc.approvedBy || null, approvedAt: doc.approvedAt ? new Date(doc.approvedAt) : null, collectedAt: new Date(doc.collectedAt) },
      create: { stableId: doc.id, goal: doc.goal, status: doc.status, payload, approvedBy: doc.approvedBy || null, approvedAt: doc.approvedAt ? new Date(doc.approvedAt) : null, collectedAt: new Date(doc.collectedAt) },
    });
    const decided = { ...doc, sync: 'pending-sync' };
    this.docs.set(doc.id, decided);
    return decided;
  }

  private async store(doc: ResearchDoc): Promise<ResearchDoc> {
    // Persistir ANTES de cachear (V2): se a persistência falha, o doc não
    // fica no Map fingindo existir — a mutação falha inteira e o list()
    // segue vazio. Antes desta ordem, um collect sem diretório deixava o
    // doc em memória (o spec V2 flagrou).
    if (this.researchDir) {
      this.persist(doc);
      this.docs.set(doc.id, doc);
      return doc;
    }
    // Modo DB (V2 completo): sem checkout, a decisão vive no banco.
    if (await this.researchTablesPresent()) return this.storeInDb(doc);
    throw new Error('persistência de pesquisa indisponível: sem checkout (RESEARCH_CONTENT_DIR/KNOWLEDGE_CONTENT_DIR) e sem tabelas knowledge_research no banco — mutação recusada em vez de viver só em memória até o restart; sincronize via kms-apply --sync-research após aplicar a migration com ordem do Augusto');
  }

  /** Resolve doc: cache em memória, senão linha do banco (modo DB). */
  private async resolveDoc(id: string): Promise<ResearchDoc> {
    const cached = this.docs.get(id);
    if (cached) return cached;
    const fromDb = await this.dbDoc(id);
    if (fromDb) {
      this.docs.set(id, fromDb);
      return fromDb;
    }
    throw new NotFoundException(`pesquisa ${id} não encontrada`);
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
    // Em modo DB, a decisão terminal pode viver só no banco (pós-restart):
    // resolveDoc a traz de volta antes da coleta (A1 preservada nos 2 modos).
    const previous = this.docs.get(id) || (!this.researchDir ? await this.dbDoc(id) : null);
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
    const previous = this.docs.get(id) || (!this.researchDir ? await this.dbDoc(id) : null);
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
    const stored = await this.store(doc);
    if (this.queue) await this.queue.add('collect', { researchId: doc.id, goal });
    return stored;
  }

  list(): ResearchDoc[] { return [...this.docs.values()]; }

  get(id: string): ResearchDoc {
    const doc = this.docs.get(id);
    if (!doc) throw new NotFoundException(`pesquisa ${id} não encontrada`);
    return doc;
  }

  async approve(id: string, adminId: string): Promise<ResearchDoc> {
    const doc = await this.resolveDoc(id);
    if (doc.status !== 'draft') throw new Error(`só draft pode ser aprovado (status atual: ${doc.status})`);
    // Novo objeto (nunca mutar o cache): se persist() falhar, o doc em
    // memória segue draft — aprovação nunca existe só em memória.
    return this.store({ ...doc, status: 'approved', approvedBy: adminId, approvedAt: new Date().toISOString() });
  }

  async reject(id: string, reason: string): Promise<ResearchDoc> {
    const doc = await this.resolveDoc(id);
    if (doc.status !== 'draft') throw new Error(`só draft pode ser rejeitado (status atual: ${doc.status})`);
    return this.store({ ...doc, status: 'rejected', rejectReason: reason });
  }

  /** B3 — gatilho "modelo": só pesquisa APROVADA alimenta o gerador. */
  findApprovedForGoal(goal: string): ResearchDoc | null {
    const needle = slugify(goal);
    return this.list().find((d) => d.status === 'approved' && (d.id.includes(needle) || needle.includes(slugify(d.goal)))) ?? null;
  }

  /** B3 — sem pesquisa aprovada: pedido pendente + resposta honesta ao aluno. */
  async requestForGoal(goal: string): Promise<{ approved: ResearchDoc | null; request: ResearchDoc | null; message: string }> {
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
    const storedRequest = await this.store(request);
    return {
      approved: null,
      request: storedRequest,
      message: 'Ainda não há pesquisa aprovada para a sua meta. Seu pedido entrou na fila do admin; por enquanto, use a trilha existente mais próxima — nenhuma trilha foi fabricada a partir de dados inventados.',
    };
  }
}

// Re-export para o worker/processor sem acoplamento ao Nest.
export { ProviderUnavailable };
