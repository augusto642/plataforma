import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  LlmClient,
  LlmQuotaExceededError,
  LlmQuotaUnavailableError,
  type LlmUnavailableReason,
  type TutorResponseSource,
} from './llm-client';
import { UNTRUSTED_DATA_SYSTEM_NOTE, buildFullContentRefusal, buildUntrustedStudentContext, formatKmsCitation, formatKmsSources, isFullContentRequest } from './prompt-guard';
import { LearnerModelService } from '../adaptation/learner-model.service';
import type { SocraticTier } from './socratic-tier.service';
import { SocraticTierService } from './socratic-tier.service';
import { TutorKnowledgeService } from './tutor-knowledge.service';
import { PromptSafetyService } from './prompt-safety.service';
import { ChatWithTutorDto } from './dto/chat-with-tutor.dto';

/** Sprint 22 — evento de proveniência emitido ao controller do chat/stream. */
export interface TutorSourceInfo {
  source: TutorResponseSource;
  provider?: string;
  model?: string;
  fallbackReason?: LlmUnavailableReason;
}

/**
 * M12 — Chat da tutora (extraído do AiService god service): histórico,
 * chat síncrono e streaming SSE. Guardrails preservados: jailbreak
 * inspecionado no `code` e na última mensagem, pedido de conteúdo
 * integral recusado antes do LLM (A2/prompt-guard), código do aluno
 * sanitizado, resposta final sob o guardrail anti-spoiler e proveniência
 * honesta via callback `onSource` (Sprint 22). Quota indisponível (M17)
 * vira fallback heurístico rotulado, nunca erro ao aluno.
 */
@Injectable()
export class TutorChatService {
  private readonly logger = new Logger(TutorChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmClient,
    private readonly tier: SocraticTierService,
    private readonly knowledge: TutorKnowledgeService,
    private readonly safety: PromptSafetyService,
    // Fase 5 (§6.4) — INTERFACE do tutor adaptativo: o modelo do aluno
    // alimenta o prompt da tutora. @Optional para não quebrar testes
    // que constroem o serviço sem o módulo de adaptação; sem ele, o
    // bloco é '' e o comportamento Sprint 22 fica inalterado.
    // O motor adaptativo completo está DEFERIDO (ver learner-model.service).
    @Optional() private readonly learnerModel?: LearnerModelService,
  ) {}

  async getChatHistory(userId: string, activityId: string) {
    return this.prisma.aiChatMessage.findMany({
      where: { userId, activityId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });
  }

  async *streamChatWithTutor(
    dto: ChatWithTutorDto,
    userId?: string,
    /**
     * Sprint 22 — callback de proveniência: disparado UMA vez, antes do
     * primeiro delta de conteúdo, quando a origem da resposta já é
     * conhecida (o controller o traduz no evento SSE de metadados).
     * Respostas de guardrail (jailbreak) não disparam: não são nem LLM
     * nem heurística pedagógica.
     */
    onSource?: (info: TutorSourceInfo) => void,
  ): AsyncGenerator<string, void, unknown> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: dto.activityId },
    });

    if (!activity) {
      throw new NotFoundException('Atividade não encontrada');
    }

    const lastUserMessage = dto.messages[dto.messages.length - 1]?.content || '';

    // Guardrail ampliado (finding MÉDIA — AppSec): antes só a última mensagem
    // do chat era inspecionada; `code` também é conteúdo não confiável e pode
    // carregar prompt injection (ex.: comentário "// ignore previous
    // instructions").
    const untrustedCode = dto.code || '';
    if (this.safety.detectJailbreakOrBypass(untrustedCode)) {
      const redirectMessage =
        'Notei instruções escondidas no código enviado. Como seu tutor socrático, meu papel é te guiar no raciocínio — vamos focar na lógica da atividade?';
      if (userId) {
        await this.prisma.aiChatMessage.create({
          data: {
            userId,
            activityId: dto.activityId,
            role: 'assistant',
            content: redirectMessage,
          },
        });
      }
      for (const word of redirectMessage.split(' ')) {
        yield `${word} `;
      }
      return;
    }

    // Persist user message
    if (userId && lastUserMessage) {
      await this.prisma.aiChatMessage.create({
        data: {
          userId,
          activityId: dto.activityId,
          role: 'user',
          content: lastUserMessage,
        },
      });
    }

    // Check jailbreak
    if (this.safety.detectJailbreakOrBypass(lastUserMessage)) {
      const redirectMessage =
        'Como seu tutor socrático, meu papel é te guiar no raciocínio e não fornecer o código pronto. Qual conceito específico da atividade você gostaria de explorar juntos?';
      if (userId) {
        await this.prisma.aiChatMessage.create({
          data: {
            userId,
            activityId: dto.activityId,
            role: 'assistant',
            content: redirectMessage,
          },
        });
      }
      for (const word of redirectMessage.split(' ')) {
        yield `${word} `;
      }
      return;
    }

    let fullAssistantContent = '';
    const tier = userId ? await this.tier.calculateTier(userId, dto.activityId) : 1;

    // Pacote 1.2: Limite estrito de 3 dicas graduais por atividade com penalidade de XP
    if (userId) {
      const hintUsage = await this.tier.getHintUsage(userId, dto.activityId);
      if (!hintUsage.canRequestHint) {
        const limitMessage =
          'Você já utilizou as 3 dicas graduais disponíveis para esta atividade! Agora é a sua vez de testar a solução na prática e submeter o código. Se travar, releia os apontamentos conceituais das dicas anteriores!';
        if (userId) {
          await this.prisma.aiChatMessage.create({
            data: {
              userId,
              activityId: dto.activityId,
              role: 'assistant',
              content: limitMessage,
            },
          });
        }
        for (const word of limitMessage.split(' ')) {
          yield `${word} `;
        }
        return;
      }
      await this.tier.recordHintUsage(userId, dto.activityId, tier);
    }

    const tierInstructions: Record<SocraticTier, string> = {
      1: 'DIRETRIZ PEDAGÓGICA: DICA 1/3 (-10% XP BASE). Pergunta sutil norteadora. Ajude o aluno a clarear o modelo mental com perguntas conceituais. Não cite código pronto nem sintaxe.',
      2: 'DIRETRIZ PEDAGÓGICA: DICA 2/3 (-25% XP BASE). Apontamento conceitual e linha/bloco lógico com falha. Destaque cenários limites e incentive o rastreamento manual linha a linha.',
      3: 'DIRETRIZ PEDAGÓGICA: DICA 3/3 (-50% XP BASE). Explicação estrutural passo a passo sem entregar código pronto. Esclareça o algoritmo conceitualmente sem fornecer a solução pronta.',
    };

    // Se há provedor de LLM utilizável, chama o endpoint de streaming.
    // Sprint 22: o primeiro delta é puxado ANTES de qualquer yield —
    // se o provedor falhar (ou a cota estourar) antes dele, quem
    // responde é a heurística e o rótulo emitido é o dela, verdadeiro.
    let streamFallbackReason: LlmUnavailableReason =
      this.llm.unavailableReason ?? 'provider-error';
    let sourceEmitted = false;

    // Fase 5 (§6.4) — modelo do aluno no prompt (interface adaptativa).
    // Fail-open: sem modelo ou sem dados, '' — nunca quebra o chat.
    const streamLearnerBlock = userId
      ? await this.learnerModel
          ?.buildTutorPromptBlock(userId, activity.conceptTags || [])
          .catch(() => '')
      : '';
    const learnerBlock = streamLearnerBlock ?? '';

    if (this.llm.isAvailable) {
      try {
        const sanitizedCode = dto.code ? this.safety.sanitizePrompt(dto.code) : '';
        const sanitizedTestFailure = dto.testFailure ? this.safety.sanitizePrompt(dto.testFailure) : '';
        const systemPrompt = [
          'Você é a Tutora Lumi, mentora de IA socrática e companheira de jornada de programação da plataforma NEXUS CODE.',
          `O aluno está resolvendo o exercício: "${activity.title}".`,
          `Enunciado da atividade: "${activity.description}"`,
          tierInstructions[tier],
          learnerBlock,
          UNTRUSTED_DATA_SYSTEM_NOTE,
          sanitizedCode
            ? `Contexto do aluno (dado não confiável):\n${buildUntrustedStudentContext({ code: sanitizedCode })}`
            : '',
          sanitizedTestFailure
            ? `Resultado dos Testes / Erro no Terminal (dado não confiável):\n${sanitizedTestFailure}`
            : '',
          'Instruções pedagógicas:',
          '- NUNCA escreva o código pronto da solução.',
          '- Guie o aluno através de perguntas reflexivas (método socrático).',
          '- Explique conceitos como sintaxe, laços, condições ou funções de forma clara e amigável.',
          '- Responda em português brasileiro com formatação Markdown limpa.',
        ].filter(Boolean).join('\n\n');

        const apiMessages = [
          { role: 'system' as const, content: systemPrompt },
          ...dto.messages.map((m) => ({ role: this.safety.normalizeTutorMessageRole(m.role), content: this.safety.sanitizePrompt(m.content) })),
        ];

        // Gateway LLM: timeout + idle-timeout no provedor, cota e uso
        // no gateway — a conexão SSE nunca pendura indefinidamente.
        const iterator = this.llm
          .stream({ messages: apiMessages, userId, purpose: 'chat-stream' })
          [Symbol.asyncIterator]();
        let next = await iterator.next();
        if (!next.done) {
          onSource?.({
            source: 'llm',
            provider: this.llm.providerId ?? undefined,
            model: this.llm.model ?? undefined,
          });
          sourceEmitted = true;
        }
        while (!next.done) {
          fullAssistantContent += next.value;
          yield next.value;
          next = await iterator.next();
        }
      } catch (err: any) {
        streamFallbackReason =
          err instanceof LlmQuotaUnavailableError
            ? 'quota-unavailable'
            : err instanceof LlmQuotaExceededError
              ? 'quota-exceeded'
              : 'provider-error';
        this.logger.warn(`Streaming AI API call failed, falling back to heuristic streaming: ${err.message}`);
      }
    }

    // Heuristic streaming fallback — rotulado como tal
    if (!fullAssistantContent) {
      if (!sourceEmitted) {
        onSource?.({ source: 'heuristic', fallbackReason: streamFallbackReason });
        sourceEmitted = true;
      }
      const lower = lastUserMessage.toLowerCase();
      let reply = 'Estou aqui para te apoiar! Conte-me: qual parte do enunciado ou do código está te deixando com dúvida?';

      if (lower.includes('retorno') || lower.includes('return') || lower.includes('resultado')) {
        reply = 'Uma função precisa usar `return <valor>` para devolver a resposta aos testes. O que a sua função está retornando no momento?';
      } else if (lower.includes('loop') || lower.includes('repetição') || lower.includes('for') || lower.includes('while')) {
        reply = 'Ao trabalhar com laços de repetição, observe três pontos: o valor inicial da variável, a condição para continuar o laço e o incremento a cada volta.';
      } else if (lower.includes('teste') || lower.includes('falha') || lower.includes('erro')) {
        reply = 'Quando um teste falha, tente simular no papel o passo a passo com os valores que o teste enviou. Que saída seu código está gerando para essa entrada?';
      } else if (lower.includes('complexidade') || lower.includes('big-o') || lower.includes('performance') || lower.includes('tempo')) {
        reply = `Para o exercício "${activity.title}", uma solução ótima geralmente opera em tempo O(N) ou O(N log N) com espaço O(1) ou O(N). Analise se você possui laços aninhados desnecessários!`;
      } else if (lower.includes('como') || lower.includes('ajuda') || lower.includes('começar') || lower.includes('dica')) {
        reply = `Para o exercício "${activity.title}", comece dividindo em etapas: 1) Identifique os parâmetros de entrada, 2) Pense na operação lógica necessária e 3) Retorne o resultado final com a tipagem esperada.`;
      }

      const guardedReply = this.safety.applyAntiSpoilerGuardrail(reply);
      fullAssistantContent = guardedReply;

      const chunks = guardedReply.split(' ');
      for (const chunk of chunks) {
        yield `${chunk} `;
      }
    }

    const finalGuarded = this.safety.applyAntiSpoilerGuardrail(fullAssistantContent);

    // Persist final assistant response
    if (userId && finalGuarded) {
      await this.prisma.aiChatMessage.create({
        data: {
          userId,
          activityId: dto.activityId,
          role: 'assistant',
          content: finalGuarded,
        },
      });
    }
  }

  async chatWithTutor(
    dto: ChatWithTutorDto,
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
    const activity = await this.prisma.activity.findUnique({
      where: { id: dto.activityId },
    });

    if (!activity) {
      throw new NotFoundException('Atividade não encontrada');
    }

    const lastUserMessage = dto.messages[dto.messages.length - 1]?.content || '';

    // Guardrail ampliado: `code` também é conteúdo não confiável (prompt
    // injection via comentário de código), não apenas a última mensagem.
    const untrustedCode = dto.code || '';
    if (this.safety.detectJailbreakOrBypass(untrustedCode)) {
      const redirectMessage =
        'Notei instruções escondidas no código enviado. Como seu tutor socrático, meu papel é te guiar no raciocínio — vamos focar na lógica da atividade?';
      if (userId) {
        await this.prisma.aiChatMessage.create({
          data: {
            userId,
            activityId: dto.activityId,
            role: 'assistant',
            content: redirectMessage,
          },
        });
      }
      return { role: 'assistant', content: redirectMessage };
    }

    // Persist User Message if userId provided
    if (userId && lastUserMessage) {
      await this.prisma.aiChatMessage.create({
        data: {
          userId,
          activityId: dto.activityId,
          role: 'user',
          content: lastUserMessage,
        },
      });
    }

    if (this.safety.detectJailbreakOrBypass(lastUserMessage)) {
      const redirectMessage = 'Como seu tutor socrático, meu papel é te guiar no raciocínio e não fornecer o código pronto. Qual conceito específico da atividade você gostaria de explorar juntos?';
      if (userId) {
        await this.prisma.aiChatMessage.create({
          data: {
            userId,
            activityId: dto.activityId,
            role: 'assistant',
            content: redirectMessage,
          },
        });
      }
      return { role: 'assistant', content: redirectMessage };
    }

    // A2 — prompt-guard ligado ao caminho real: pedido de transcrição ou
    // conteúdo integral NUNCA chega ao LLM — recusa honesta + resumo
    // condensado (lição ou entrada KMS) + fonte original, sem entregar
    // mais que o resumo. Sem base, a recusa diz isso explicitamente.
    if (isFullContentRequest(lastUserMessage)) {
      const refusalLessons = await this.knowledge.findKnowledgeForTopics(activity.conceptTags || []);
      let refusalSource: Array<{ id: string; title: string; courseName: string; summary: string }> = refusalLessons;
      if (!refusalSource.length) {
        const kmsForRefusal = await this.knowledge.findKmsEntriesForTopics(activity.conceptTags || []);
        refusalSource = kmsForRefusal.map((e) => ({ id: e.slug, title: e.title, courseName: e.courseName || 'KMS', summary: e.summary }));
      }
      const refusal = buildFullContentRefusal(refusalSource);
      if (userId) {
        await this.prisma.aiChatMessage.create({
          data: {
            userId,
            activityId: dto.activityId,
            role: 'assistant',
            content: refusal,
          },
        });
      }
      return { role: 'assistant', content: refusal };
    }

    let assistantContent = '';
    // Sprint 22 — proveniência da resposta (rótulo honesto).
    let source: TutorResponseSource | undefined;
    let fallbackReason: LlmUnavailableReason | undefined;
    const tier = userId ? await this.tier.calculateTier(userId, dto.activityId) : 1;

    // Pacote 1.2: Limite estrito de 3 dicas graduais por atividade com penalidade de XP
    if (userId) {
      const hintUsage = await this.tier.getHintUsage(userId, dto.activityId);
      if (!hintUsage.canRequestHint) {
        const limitMessage =
          'Você já utilizou as 3 dicas graduais disponíveis para esta atividade! Agora é a sua vez de testar a solução na prática e submeter o código. Se travar, releia os apontamentos conceituais das dicas anteriores!';
        await this.prisma.aiChatMessage.create({
          data: {
            userId,
            activityId: dto.activityId,
            role: 'assistant',
            content: limitMessage,
          },
        });
        return { role: 'assistant', content: limitMessage };
      }
      await this.tier.recordHintUsage(userId, dto.activityId, tier);
    }

    const tierInstructions: Record<SocraticTier, string> = {
      1: 'DIRETRIZ PEDAGÓGICA: DICA 1/3 (-10% XP BASE). Pergunta sutil norteadora. Ajude o aluno a clarear o modelo mental com perguntas conceituais. Não cite código pronto nem sintaxe.',
      2: 'DIRETRIZ PEDAGÓGICA: DICA 2/3 (-25% XP BASE). Apontamento conceitual e linha/bloco lógico com falha. Destaque cenários limites e incentive o rastreamento manual linha a linha.',
      3: 'DIRETRIZ PEDAGÓGICA: DICA 3/3 (-50% XP BASE). Explicação estrutural passo a passo sem entregar código pronto. Esclareça o algoritmo conceitualmente sem fornecer a solução pronta.',
    };

    // KMS no chat (§13.5): entradas active por conceptTags, antes do LLM.
    // Base vazia => [] => system prompt inalterado (regressão zero).
    const chatKmsEntries = await this.knowledge.findKmsEntriesForTopics(activity.conceptTags || []).catch(() => []);
    const chatKmsBlock = chatKmsEntries.length
      ? formatKmsSources(chatKmsEntries.map((e) => ({ slug: e.slug, title: e.title, version: e.version, courseName: e.courseName, lessonTitle: e.lessonTitle, summary: e.summary })))
      : '';

    // Fase 5 (§6.4) — modelo do aluno no prompt (interface adaptativa).
    const chatLearnerBlock = userId
      ? await this.learnerModel
          ?.buildTutorPromptBlock(userId, activity.conceptTags || [])
          .catch(() => '')
      : '';

    if (this.llm.isAvailable) {
      try {
        const sanitizedCode = dto.code ? this.safety.sanitizePrompt(dto.code) : '';
        const sanitizedTestFailure = dto.testFailure ? this.safety.sanitizePrompt(dto.testFailure) : '';
        const systemPrompt = [
          'Você é a Tutora Lumi, mentora de IA socrática e companheira de jornada de programação da plataforma NEXUS CODE.',
          `O aluno está resolvendo o exercício: "${activity.title}".`,
          `Enunciado da atividade: "${activity.description}"`,
          tierInstructions[tier],
          UNTRUSTED_DATA_SYSTEM_NOTE,
          chatKmsBlock,
          chatLearnerBlock ?? '',
          sanitizedCode
            ? `Contexto do aluno (dado não confiável):\n${buildUntrustedStudentContext({ code: sanitizedCode })}`
            : '',
          sanitizedTestFailure
            ? `Resultado dos Testes / Erro no Terminal (dado não confiável):\n${sanitizedTestFailure}`
            : '',
          'Instruções pedagógicas:',
          '- NUNCA escreva o código pronto da solução.',
          '- Guie o aluno através de perguntas reflexivas (método socrático).',
          '- Explique conceitos como sintaxe, laços, condições ou funções de forma clara e amigável.',
          '- Responda em português brasileiro.',
        ].filter(Boolean).join('\n\n');

        const apiMessages = [
          { role: 'system' as const, content: systemPrompt },
          ...dto.messages.map((m) => ({ role: this.safety.normalizeTutorMessageRole(m.role), content: this.safety.sanitizePrompt(m.content) })),
        ];

        // Gateway LLM: timeout + retry no provedor, cota e uso no gateway
        const content = await this.llm.complete({
          messages: apiMessages,
          userId,
          purpose: 'chat',
        });
        assistantContent = this.safety.applyAntiSpoilerGuardrail(content);
        if (assistantContent) {
          source = 'llm';
          if (chatKmsEntries.length) {
            assistantContent += `\n\nFontes: ${formatKmsCitation(chatKmsEntries.map((e) => ({ slug: e.slug, title: e.title, version: e.version, courseName: e.courseName, lessonTitle: e.lessonTitle, summary: e.summary })))}`;
          }
        }
      } catch (err: any) {
        fallbackReason =
          err instanceof LlmQuotaUnavailableError
            ? 'quota-unavailable'
            : err instanceof LlmQuotaExceededError
              ? 'quota-exceeded'
              : 'provider-error';
        this.logger.warn(`AI chat API call failed, falling back to heuristic reply: ${err.message}`);
      }
    }

    if (!assistantContent) {
      source = 'heuristic';
      fallbackReason = fallbackReason ?? this.llm.unavailableReason ?? 'provider-error';
      // Heuristic conversation reply
      const lower = lastUserMessage.toLowerCase();
      let reply = 'Estou aqui para te apoiar! Conte-me: qual parte do enunciado ou do código está te deixando com dúvida?';

      if (lower.includes('retorno') || lower.includes('return') || lower.includes('resultado')) {
        reply = 'Uma função precisa usar `return <valor>` para devolver a resposta aos testes. O que a sua função está retornando no momento?';
      } else if (lower.includes('loop') || lower.includes('repetição') || lower.includes('for') || lower.includes('while')) {
        reply = 'Ao trabalhar com laços de repetição, observe três pontos: o valor inicial da variável, a condição para continuar o laço e o incremento a cada volta.';
      } else if (lower.includes('teste') || lower.includes('falha') || lower.includes('erro')) {
        reply = 'Quando um teste falha, tente simular no papel o passo a passo com os valores que o teste enviou. Que saída seu código está gerando para essa entrada?';
      } else if (lower.includes('complexidade') || lower.includes('big-o') || lower.includes('performance')) {
        reply = `Para o exercício "${activity.title}", observe a contagem de iterações em função de N. Soluções lineares O(N) são preferíveis a quadráticas O(N^2).`;
      } else if (lower.includes('como') || lower.includes('ajuda') || lower.includes('começar')) {
        reply = `Para o exercício "${activity.title}", comece dividindo em etapas: 1) Identifique os parâmetros de entrada, 2) Pense na operação lógica necessária e 3) Retorne o resultado final.`;
      }
      assistantContent = reply;
    }

    assistantContent = this.safety.applyAntiSpoilerGuardrail(assistantContent);

    // Persist Assistant Response if userId provided
    if (userId && assistantContent) {
      await this.prisma.aiChatMessage.create({
        data: {
          userId,
          activityId: dto.activityId,
          role: 'assistant',
          content: assistantContent,
        },
      });
    }

    return {
      role: 'assistant',
      content: assistantContent,
      // Sprint 22 — rótulo honesto de proveniência (ver PedagogicalFeedback.source)
      source,
      ...(source === 'llm'
        ? {
            provider: this.llm.providerId ?? undefined,
            model: this.llm.model ?? undefined,
          }
        : {}),
      ...(source === 'heuristic' ? { fallbackReason } : {}),
    };
  }
}
