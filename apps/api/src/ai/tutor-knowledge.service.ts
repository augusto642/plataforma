import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeService, type KnowledgeEntryView } from '../knowledge/knowledge.service';
import { ResearchService } from '../knowledge/research/research.service';

/**
 * M12 — Encaixe da tutora com a base de conhecimento (extraído do
 * AiService god service): lições aprovadas (DESIGN §6.1, D8), entradas
 * KMS (§13.5) e o gatilho "modelo" de pesquisa profunda (B3, DESIGN §3.5).
 * KnowledgeService/ResearchService são opcionais: sem eles, as buscas
 * devolvem [] e o pedido de pesquisa responde com aviso honesto — o
 * comportamento Sprint 22 fica inalterado (regressão zero).
 */
@Injectable()
export class TutorKnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly knowledge?: KnowledgeService,
    @Optional() private readonly research?: ResearchService,
  ) {}

  /**
   * Encaixe da tutora com a base de conhecimento (DESIGN §6.1, D8).
   * Base vazia => [] => comportamento Sprint 22 inalterado (regressão zero).
   * Com lição aprovada, o resumo + citação entram no prompt antes do fallback.
   */
  async findKnowledgeForTopics(topics: string[]) {
    if (!this.knowledge || !topics.length) return [];
    return this.knowledge.findByTopics(topics, { limit: 3 });
  }

  /** KMS (§13.5): passo novo após o §6.1 — só versões active de entradas active. */
  async findKmsEntriesForTopics(topics: string[]): Promise<KnowledgeEntryView[]> {
    if (!this.knowledge || !topics.length) return [];
    return this.knowledge.findEntriesByTopics(topics, { limit: 3 });
  }

  /**
   * B3 — gatilho "modelo" ligado ao caminho real (DESIGN §3.5): o aluno
   * define uma meta, o serviço consulta pesquisa aprovada ou cria o pedido
   * pendente, e devolve a trilha existente mais próxima (por sobreposição
   * de tokens no título/slug) + aviso honesto — nunca trilha fabricada.
   * Sem ResearchService configurado, a resposta diz isso explicitamente.
   */
  async requestResearchForGoal(goal: string) {
    if (!this.research) {
      return {
        approved: null, request: null, nearestTrack: null,
        message: 'Pesquisa profunda indisponível nesta instância (serviço de pesquisa não configurado); nenhuma trilha foi fabricada.',
      };
    }
    // KMS (K1/K2) — ResearchService.requestForGoal é async (o store do
    // pedido pendente é assíncrono); sem o await, o spread abaixo espalharia
    // uma Promise e approved/request/message chegariam undefined em runtime
    // (o P6 foi escrito contra a versão síncrona pré-KMS).
    const res = await this.research.requestForGoal(goal);
    let nearestTrack: { id: string; title: string; slug: string } | null = null;
    try {
      const tokens = goal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter((t) => t.length > 2);
      const courses = await this.prisma.course.findMany({ select: { id: true, title: true, slug: true } });
      let bestScore = 0;
      for (const c of courses) {
        const hay = `${c.title} ${c.slug}`.toLowerCase();
        const score = tokens.filter((t) => hay.includes(t)).length;
        if (score > bestScore) { bestScore = score; nearestTrack = { id: c.id, title: c.title, slug: c.slug }; }
      }
    } catch {
      nearestTrack = null;
    }
    return { ...res, nearestTrack };
  }
}
