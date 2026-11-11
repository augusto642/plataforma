import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { SocraticGuidanceDto } from './dto/socratic-guidance.dto';
import {
  LlmClient,
  type LlmUnavailableReason,
  type TutorResponseSource,
} from './llm-client';
import { KnowledgeService, type KnowledgeEntryView } from '../knowledge/knowledge.service';
import { ResearchService } from '../knowledge/research/research.service';
import { LearnerModelService } from '../adaptation/learner-model.service';
import { SocraticTierService, type SocraticTier } from './socratic-tier.service';
import { TutorKnowledgeService } from './tutor-knowledge.service';
import { PromptSafetyService } from './prompt-safety.service';
import {
  HeuristicTutorService,
  TIER3_EXHAUSTION_FAILURES,
  type HeuristicErrorPattern,
  type PedagogicalFeedback,
  type TutorEscape,
} from './heuristic-tutor.service';
import { PedagogicalHintService } from './pedagogical-hint.service';
import { TutorChatService, type TutorSourceInfo } from './tutor-chat.service';
import { ComplexityAnalysisService, type ComplexityAnalysisResult } from './complexity-analysis.service';
import { SocraticGuidanceService, type SocraticGuidanceResult } from './socratic-guidance.service';

// Re-exports de compatibilidade: o contrato público do AiService (tipos e
// constantes) não muda com o M12 — quem importava de './ai.service'
// continua importando daqui.
export type { SocraticTier };
export {
  TIER3_EXHAUSTION_FAILURES,
  type HeuristicErrorPattern,
  type PedagogicalFeedback,
  type TutorEscape,
};
export type { TutorSourceInfo };
export type { SocraticGuidanceResult };
export type { ComplexityAnalysisResult };

// A1 (Lote 2) — re-export de compatibilidade: quem importava a whitelist
// de papéis de './ai.service' continua importando daqui (a função mora no
// PromptSafetyService desde o M12).
export { normalizeTutorMessageRole } from './prompt-safety.service';

/**
 * M12 — AiService virou FACHADA FINA sobre 8 serviços coesos (antes: god
 * service de 1.213 linhas e 12 métodos públicos/privados entrelaçados).
 *
 * - `PromptSafetyService` — sanitização, jailbreak, anti-spoiler (puro).
 * - `SocraticTierService` — decisão de tier a partir dos sinais.
 * - `HeuristicTutorService` — engine heurística offline + escape pós-Tier 3 (puro).
 * - `TutorKnowledgeService` — lições/KMS/pesquisa profunda.
 * - `PedagogicalHintService` — dicas por submissão (LLM ou heurística).
 * - `TutorChatService` — chat síncrono, streaming SSE e histórico.
 * - `ComplexityAnalysisService` — análise estática de complexidade.
 * - `SocraticGuidanceService` — orientação socrática por palavra-chave + cache.
 *
 * Comportamento público preservado exatamente: mesmas rotas (via
 * AiController), mesmos DTOs, mesmas respostas, mesmos eventos
 * (`ai_llm_blocked` etc. via LlmClient), mesmos fallbacks e mesmas
 * dependências corrigidas no pipeline (prompt-guard A1/M11, quota
 * fail-closed M17, `LlmClient.resolvePlan` M10) — nenhuma delas é tocada
 * aqui; os serviços extraídos só as consomem.
 *
 * A fachada existe para não churnar os chamadores (AiController e
 * LineFeedbackService injetam AiService); quem quiser pode injetar os
 * serviços extraídos diretamente — todos são providers do AiModule.
 */
@Injectable()
export class AiService {
  constructor(
    private readonly hint: PedagogicalHintService,
    private readonly chat: TutorChatService,
    private readonly complexity: ComplexityAnalysisService,
    private readonly guidance: SocraticGuidanceService,
    private readonly knowledge: TutorKnowledgeService,
    private readonly tier: SocraticTierService,
    private readonly safety: PromptSafetyService,
    private readonly heuristic: HeuristicTutorService,
  ) {}

  /**
   * Composição manual para construção fora do Nest (golden specs e testes
   * que instanciavam `new AiService(prisma, llm, ...)`): monta os 8
   * serviços a partir das dependências brutas, com a mesma fiação do
   * AiModule. Em produção, usar injeção de dependência.
   */
  static fromRawDeps(
    prisma: PrismaService,
    llm: LlmClient,
    cache?: CacheService,
    knowledge?: KnowledgeService,
    research?: ResearchService,
    learnerModel?: LearnerModelService,
  ): AiService {
    const safety = new PromptSafetyService();
    const tier = new SocraticTierService(prisma);
    const heuristic = new HeuristicTutorService();
    const tutorKnowledge = new TutorKnowledgeService(prisma, knowledge, research);
    const hint = new PedagogicalHintService(prisma, llm, tier, tutorKnowledge, safety, heuristic);
    const chat = new TutorChatService(prisma, llm, tier, tutorKnowledge, safety, learnerModel);
    const complexity = new ComplexityAnalysisService(prisma);
    const guidance = new SocraticGuidanceService(tier, cache);
    return new AiService(hint, chat, complexity, guidance, tutorKnowledge, tier, safety, heuristic);
  }

  async findKnowledgeForTopics(topics: string[]) {
    return this.knowledge.findKnowledgeForTopics(topics);
  }

  async findKmsEntriesForTopics(topics: string[]): Promise<KnowledgeEntryView[]> {
    return this.knowledge.findKmsEntriesForTopics(topics);
  }

  async requestResearchForGoal(goal: string) {
    return this.knowledge.requestResearchForGoal(goal);
  }

  async calculateTier(userId: string, activityId: string): Promise<SocraticTier> {
    return this.tier.calculateTier(userId, activityId);
  }

  async generatePedagogicalHint(submissionId: string, userId: string): Promise<PedagogicalFeedback> {
    return this.hint.generatePedagogicalHint(submissionId, userId);
  }

  sanitizePrompt(text: string): string {
    return this.safety.sanitizePrompt(text);
  }

  detectJailbreakOrBypass(text: string): boolean {
    return this.safety.detectJailbreakOrBypass(text);
  }

  async getChatHistory(userId: string, activityId: string) {
    return this.chat.getChatHistory(userId, activityId);
  }

  async *streamChatWithTutor(
    dto: { activityId: string; code?: string; messages: Array<{ role: 'user' | 'assistant'; content: string }> },
    userId?: string,
    onSource?: (info: TutorSourceInfo) => void,
  ): AsyncGenerator<string, void, unknown> {
    yield* this.chat.streamChatWithTutor(dto, userId, onSource);
  }

  async chatWithTutor(
    dto: { activityId: string; code?: string; messages: Array<{ role: 'user' | 'assistant'; content: string }> },
    userId?: string,
  ): Promise<{
    role: 'assistant';
    content: string;
    /** Sprint 22 — proveniência; ausente só nas respostas de guardrail. */
    source?: TutorResponseSource;
    provider?: string;
    model?: string;
    fallbackReason?: LlmUnavailableReason;
  }> {
    return this.chat.chatWithTutor(dto, userId);
  }

  async analyzeComplexity(code: string, activityId: string): Promise<ComplexityAnalysisResult> {
    return this.complexity.analyzeComplexity(code, activityId);
  }

  applyAntiSpoilerGuardrail(content: string): string {
    return this.safety.applyAntiSpoilerGuardrail(content);
  }

  async generateSocraticGuidance(
    dto: SocraticGuidanceDto,
    userId?: string,
  ): Promise<SocraticGuidanceResult> {
    return this.guidance.generateSocraticGuidance(dto, userId);
  }
}
