import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  LlmClient,
  LlmQuotaExceededError,
  LlmQuotaUnavailableError,
  type LlmUnavailableReason,
} from './llm-client';
import { UNTRUSTED_DATA_SYSTEM_NOTE, buildUntrustedStudentContext, formatKmsCitation, formatKmsSources, formatKnowledgeSources, KNOWLEDGE_CITATION_RULES } from './prompt-guard';
import { HIDDEN_TEST_FAILED_MESSAGE } from '../submissions/runner/runner.service';
import type { SocraticTier } from './socratic-tier.service';
import { SocraticTierService } from './socratic-tier.service';
import { TutorKnowledgeService } from './tutor-knowledge.service';
import { PromptSafetyService } from './prompt-safety.service';
import { HeuristicTutorService, type PedagogicalFeedback } from './heuristic-tutor.service';

/**
 * M12 — Dicas pedagógicas por submissão (extraído do AiService god
 * service): carrega a submissão, decide o tier socrático, devolve o
 * feedback cacheado (com o escape recalculado a cada requisição) ou
 * produz um novo via LLM (com citações da base) ou via engine heurística
 * offline — sempre rotulado com a proveniência honesta (Sprint 22).
 * Quota indisponível (M17) vira fallback rotulado, nunca erro ao aluno.
 */
@Injectable()
export class PedagogicalHintService {
  private readonly logger = new Logger(PedagogicalHintService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmClient,
    private readonly tier: SocraticTierService,
    private readonly knowledge: TutorKnowledgeService,
    private readonly safety: PromptSafetyService,
    private readonly heuristic: HeuristicTutorService,
  ) {}

  async generatePedagogicalHint(submissionId: string, userId: string): Promise<PedagogicalFeedback> {
    const submission = await this.prisma.submission.findFirst({
      where: { id: submissionId, userId },
      include: {
        activity: true,
        testResults: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('Submissão não encontrada ou acesso não autorizado');
    }

    // Sinais contados uma única vez: o tier decide o estágio da dica e a
    // contagem de falhas decide o esgotamento do Tier 3 (escape do B03).
    let tier: SocraticTier = 1;
    let failedCount = 0;
    try {
      const signals = await this.tier.countTierSignals(userId, submission.activityId);
      failedCount = signals.failedCount;
      tier = this.tier.tierFromSignals(signals.failedCount, signals.chatCount);
    } catch {
      tier = 1;
    }

    // Return cached feedback if available. O escape é calculado a cada
    // requisição (não é persistido): se o aluno esgotou o Tier 3 depois que
    // o feedback foi cacheado, ele é anexado aqui mesmo assim.
    if (submission.aiFeedback && submission.aiHints) {
      try {
        const cached: PedagogicalFeedback = {
          summary: submission.aiFeedback,
          hints: JSON.parse(submission.aiHints),
          suggestedConcept: 'Revisão Pedagógica',
          tier,
        };
        const escape = this.heuristic.buildPostTier3Escape(
          submission.activity,
          tier,
          failedCount,
          cached.suggestedConcept,
        );
        if (escape) cached.escape = escape;
        return cached;
      } catch {}
    }

    const failedTests = submission.testResults.filter((t) => !t.passed);
    const feedback = await this.produceSocraticHint(
      submission.activity.title,
      submission.activity.description,
      submission.codeSnapshot || '',
      failedTests,
      tier,
      userId,
      submission.activity.conceptTags || [],
    );

    // Persist AI feedback (só summary/hints: o escape é dinâmico, calculado
    // por requisição a partir da atividade e dos sinais atuais)
    await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        aiFeedback: feedback.summary,
        aiHints: JSON.stringify(feedback.hints),
      },
    });

    const escape = this.heuristic.buildPostTier3Escape(
      submission.activity,
      tier,
      failedCount,
      feedback.suggestedConcept,
    );
    if (escape) feedback.escape = escape;

    // Pacote 1.2: Registra o uso da dica com a penalidade correspondente
    await this.tier.recordHintUsage(userId, submission.activityId, tier).catch(() => null);

    return feedback;
  }

  private async produceSocraticHint(
    activityTitle: string,
    instructions: string,
    studentCode: string,
    failedTests: any[],
    tier: SocraticTier = 1,
    userId?: string,
    conceptTags: string[] = [],
  ): Promise<PedagogicalFeedback> {
    const sanitizedStudentCode = this.safety.sanitizePrompt(studentCode);

    // B01b: o errorMessage de um teste OCULTO é o stderr bruto do harness
    // (entrada + valor esperado = o gabarito) e nunca pode alimentar o
    // tutor: no prompt do LLM o modelo pode ecoá-lo na resposta, e a engine
    // heurística Tier 2 o citava verbatim na dica. Para o tutor, um oculto
    // falho é só "um teste não passou" — conta na estatística de falhas,
    // sem detalhe (mesma máscara do B01). Este é o funil único das duas
    // vias (prompt e heurística), então a troca acontece aqui.
    const safeFailedTests = failedTests.map((t) =>
      t.isHidden ? { ...t, errorMessage: HIDDEN_TEST_FAILED_MESSAGE } : t,
    );

    const tierPrompts: Record<SocraticTier, string> = {
      1: 'ESTÁGIO SOCRÁTICO TIER 1 (MODELO MENTAL & INVARIANTES): O aluno está na primeira tentativa. Conduza o aluno com perguntas sobre o modelo mental e a invariante de saída esperada. Não mencione código pronto nem sintaxe.',
      2: 'ESTÁGIO SOCRÁTICO TIER 2 (CASOS DE BORDA & TESTE DE MESA): O aluno já errou anteriormente. Aponte a natureza do caso limite ou asserção que falhou e estimule o aluno a simular a execução passo a passo no papel (teste de mesa). Não forneça o código.',
      3: 'ESTÁGIO SOCRÁTICO TIER 3 (COMPLEXIDADE BIG-O & TRADE-OFFS): O aluno persiste com dificuldades ou atingiu limites de tempo/memória. Discuta a ordem de complexidade O(N) vs O(N²), loops aninhados e uso de estruturas eficientes (Maps, Sets). Nunca entregue a resposta final.',
    };

    // Sprint 22: a pergunta não é mais "tem chave?" e sim "há um
    // provedor de LLM utilizável?" (modelo local não tem chave). O
    // motivo do fallback é rastreado para o rótulo honesto da resposta.
    let fallbackReason: LlmUnavailableReason =
      this.llm.unavailableReason ?? 'provider-error';

    if (this.llm.isAvailable) {
      try {
        const failedSummary = safeFailedTests
          .map((t) => `- ${t.name}: ${t.errorMessage || 'Falha de asserção'}`)
          .join('\n');

        // Conhecimento (D8): antes do fallback heurístico, a tutora consulta
        // a base por conceptTags; sem lição aprovada, nada é injetado e o
        // prompt fica idêntico ao da Sprint 22 (B1: o bloco vazio NÃO entra
        // no array — um elemento vazio gerava uma linha em branco a mais).
        const knowledgeLessons = await this.knowledge.findKnowledgeForTopics(conceptTags);
        const knowledgeBlock = knowledgeLessons.length
          ? `\n${KNOWLEDGE_CITATION_RULES}\n${formatKnowledgeSources(knowledgeLessons)}\n`
          : '';
        // KMS (§13.5): passo novo após o §6.1; base de entradas vazia => [].
        const kmsEntries = await this.knowledge.findKmsEntriesForTopics(conceptTags);
        const kmsBlock = kmsEntries.length
          ? `\n${formatKmsSources(kmsEntries.map((e) => ({ slug: e.slug, title: e.title, version: e.version, courseName: e.courseName, lessonTitle: e.lessonTitle, summary: e.summary })))}\n`
          : '';

        const prompt = [
          'Você é um tutor de programação socrático e rigoroso da NEXUS CODE.',
          `O aluno está resolvendo o exercício: "${activityTitle}".`,
          `Enunciado: ${instructions}`,
          '',
          tierPrompts[tier],
          ...(knowledgeBlock ? [knowledgeBlock] : []),
          ...(kmsBlock ? [kmsBlock] : []),
          '',
          UNTRUSTED_DATA_SYSTEM_NOTE,
          '',
          buildUntrustedStudentContext({
            code: sanitizedStudentCode || '// Arquivo em branco',
            errorMessage: failedSummary || 'Nenhuma falha de teste detalhada.',
          }),
          '',
          'Regras estritas:',
          '1. NUNCA forneça o código pronto ou a resposta final.',
          '2. Explique a causa conceitual do erro de forma amigável e provocativa.',
          '3. Forneça 2 ou 3 dicas passo a passo (hints) para o aluno descobrir o erro sozinho.',
          '4. Responda em formato JSON com as chaves: summary (string), hints (array de strings), suggestedConcept (string).',
        ].join('\n');

        // Gateway LLM: timeout + retry no provedor, cota e uso no gateway
        const content = await this.llm.complete({
          messages: [{ role: 'user', content: prompt }],
          jsonMode: true,
          userId,
          purpose: 'hint',
        });

        const parsed = JSON.parse(content);
        // Citação estruturada (§6.2 + §13.5): se a resposta usou a base, a
        // fonte vai junto — citação sem lição/entrada correspondente é erro
        // de prompt. KMS primeiro (nível curado), depois lições.
        const citationParts = [
          ...(kmsEntries.length ? [formatKmsCitation(kmsEntries.map((e) => ({ slug: e.slug, title: e.title, version: e.version, courseName: e.courseName, lessonTitle: e.lessonTitle, summary: e.summary })))] : []),
          ...(knowledgeLessons.length ? [knowledgeLessons.map((l) => `${l.courseName} — ${l.title} (referência; resumo em linguagem própria)`).join('; ')] : []),
        ];
        const citation = citationParts.length ? `\n\nFontes: ${citationParts.join('; ')}` : '';
        return {
          summary: `${parsed.summary}${citation}`,
          hints: parsed.hints || [],
          suggestedConcept: parsed.suggestedConcept || 'Lógica e Algoritmos',
          tier,
          source: 'llm',
          provider: this.llm.providerId ?? undefined,
          model: this.llm.model ?? undefined,
        };
      } catch (err: any) {
        fallbackReason =
          err instanceof LlmQuotaUnavailableError
            ? 'quota-unavailable'
            : err instanceof LlmQuotaExceededError
              ? 'quota-exceeded'
              : 'provider-error';
        this.logger.warn(`AI API call failed, falling back to heuristic tutor: ${err.message}`);
      }
    }

    // Heuristic Socratic Engine (offline & default) — rotulada como tal
    return {
      ...this.heuristic.generateHeuristicSocraticHints(studentCode, safeFailedTests, activityTitle, tier),
      source: 'heuristic',
      fallbackReason,
    };
  }
}
