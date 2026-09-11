import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export type SocraticTier = 1 | 2 | 3;

export interface PedagogicalFeedback {
  summary: string;
  hints: string[];
  suggestedConcept: string;
  tier?: SocraticTier;
}

export interface ComplexityAnalysisResult {
  timeComplexity: string;
  spaceComplexity: string;
  summary: string;
  bottlenecks: string[];
  recommendations: string[];
  score: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.apiKey = this.config.get<string>('AI_API_KEY') || '';
    this.apiUrl = this.config.get<string>('AI_API_URL') || 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
  }

  async calculateTier(userId: string, activityId: string): Promise<SocraticTier> {
    try {
      const [failedCount, chatCount] = await Promise.all([
        this.prisma.submission.count({
          where: { userId, activityId, status: { in: ['failed', 'error'] } },
        }),
        this.prisma.aiChatMessage.count({
          where: { userId, activityId },
        }),
      ]);

      if (failedCount >= 3 || chatCount >= 6) return 3;
      if (failedCount >= 2 || chatCount >= 3) return 2;
      return 1;
    } catch {
      return 1;
    }
  }

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

    const tier = await this.calculateTier(userId, submission.activityId);

    // Return cached feedback if available
    if (submission.aiFeedback && submission.aiHints) {
      try {
        return {
          summary: submission.aiFeedback,
          hints: JSON.parse(submission.aiHints),
          suggestedConcept: 'Revisão Pedagógica',
          tier,
        };
      } catch {}
    }

    const failedTests = submission.testResults.filter((t) => !t.passed);
    const feedback = await this.produceSocraticHint(
      submission.activity.title,
      submission.activity.description,
      submission.codeSnapshot || '',
      failedTests,
      tier,
    );

    // Persist AI feedback
    await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        aiFeedback: feedback.summary,
        aiHints: JSON.stringify(feedback.hints),
      },
    });

    return feedback;
  }

  sanitizePrompt(text: string): string {
    if (!text) return '';
    return text
      // Redact emails
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]')
      // Redact Brazilian CPFs
      .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF_REDACTED]')
      // Redact Brazilian CNPJs
      .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[CNPJ_REDACTED]')
      // Redact Brazilian Phones
      .replace(/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}\b/g, '[PHONE_REDACTED]')
      // Redact IPv4 addresses
      .replace(/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g, '[IP_REDACTED]')
      // Redact API keys and tokens
      .replace(/(?:sk-|ghp_|Bearer\s+)[A-Za-z0-9_\-]{16,}/g, '[TOKEN_REDACTED]')
      // Redact potential passwords in strings
      .replace(/(?:password|senha)\s*[:=]\s*["'][^"']+["']/gi, 'password: "[REDACTED]"');
  }

  detectJailbreakOrBypass(text: string): boolean {
    if (!text) return false;
    const lower = text.toLowerCase();
    const jailbreakPatterns = [
      'ignore previous instructions',
      'ignore all instructions',
      'ignore as regras',
      'esqueça as regras',
      'give me the full solution',
      'give me the code',
      'escreva o codigo completo',
      'resolva para mim',
      'me dê a resposta pronta',
      'bypass guardrails',
      'system prompt',
      'developer mode',
      'modo desenvolvedor',
    ];
    return jailbreakPatterns.some((pattern) => lower.includes(pattern));
  }

  private async produceSocraticHint(
    activityTitle: string,
    instructions: string,
    studentCode: string,
    failedTests: any[],
    tier: SocraticTier = 1,
  ): Promise<PedagogicalFeedback> {
    const sanitizedStudentCode = this.sanitizePrompt(studentCode);

    const tierPrompts: Record<SocraticTier, string> = {
      1: 'ESTÁGIO SOCRÁTICO TIER 1 (MODELO MENTAL & INVARIANTES): O aluno está na primeira tentativa. Conduza o aluno com perguntas sobre o modelo mental e a invariante de saída esperada. Não mencione código pronto nem sintaxe.',
      2: 'ESTÁGIO SOCRÁTICO TIER 2 (CASOS DE BORDA & TESTE DE MESA): O aluno já errou anteriormente. Aponte a natureza do caso limite ou asserção que falhou e estimule o aluno a simular a execução passo a passo no papel (teste de mesa). Não forneça o código.',
      3: 'ESTÁGIO SOCRÁTICO TIER 3 (COMPLEXIDADE BIG-O & TRADE-OFFS): O aluno persiste com dificuldades ou atingiu limites de tempo/memória. Discuta a ordem de complexidade O(N) vs O(N²), loops aninhados e uso de estruturas eficientes (Maps, Sets). Nunca entregue a resposta final.',
    };

    // If external AI LLM API key is configured, call it
    if (this.apiKey) {
      try {
        const failedSummary = failedTests
          .map((t) => `- ${t.name}: ${t.errorMessage || 'Falha de asserção'}`)
          .join('\n');

        const prompt = [
          'Você é um tutor de programação socrático e rigoroso da NEXUS CODE.',
          `O aluno está resolvendo o exercício: "${activityTitle}".`,
          `Enunciado: ${instructions}`,
          '',
          tierPrompts[tier],
          '',
          'Código do aluno:',
          sanitizedStudentCode || '// Arquivo em branco',
          '',
          'Testes que falharam:',
          failedSummary || 'Nenhuma falha de teste detalhada.',
          '',
          'Regras estritas:',
          '1. NUNCA forneça o código pronto ou a resposta final.',
          '2. Explique a causa conceitual do erro de forma amigável e provocativa.',
          '3. Forneça 2 ou 3 dicas passo a passo (hints) para o aluno descobrir o erro sozinho.',
          '4. Responda em formato JSON com as chaves: summary (string), hints (array de strings), suggestedConcept (string).',
        ].join('\n');

        const res = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.config.get<string>('AI_MODEL', 'gemini-2.0-flash'),
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const parsed = JSON.parse(data.choices[0].message.content);
          return {
            summary: parsed.summary,
            hints: parsed.hints || [],
            suggestedConcept: parsed.suggestedConcept || 'Lógica e Algoritmos',
            tier,
          };
        }
      } catch (err: any) {
        this.logger.warn(`AI API call failed, falling back to heuristic tutor: ${err.message}`);
      }
    }

    // Heuristic Socratic Engine (offline & default)
    return this.generateHeuristicSocraticHints(studentCode, failedTests, activityTitle, tier);
  }

  private generateHeuristicSocraticHints(
    code: string,
    failedTests: any[],
    title: string,
    tier: SocraticTier = 1,
  ): PedagogicalFeedback {
    const hints: string[] = [];
    let summary = 'Notei que o seu código ainda não passou em todos os testes. Vamos analisar juntos!';
    let concept = 'Fluxo de Execução e Retorno';

    if (!code || code.trim().length === 0) {
      summary = 'Seu arquivo de resposta está em branco.';
      hints.push('Comece declarando a função solicitada no enunciado.');
      hints.push('Certifique-se de que o nome da função e a quantidade de parâmetros correspondem exatamente ao solicitado.');
      return { summary, hints, suggestedConcept: 'Declaração de Funções', tier };
    }

    if (tier === 1) {
      summary = `Tier 1 (Modelo Mental) — Exercício: "${title}". Antes de mexer na sintaxe, vamos entender a invariante.`;
      concept = 'Modelo Mental e Invariantes';
      hints.push('Em suas próprias palavras: qual transformação o algoritmo deve produzir entre os parâmetros recebidos e a saída esperada?');
      if (!code.includes('return')) {
        hints.push('Pense no momento em que a função termina: você está usando `return` para devolver explicitamente o valor aos testes?');
      } else {
        hints.push('Quais condições lógicas precisam ser satisfeitas para cada caso de teste ser aprovado?');
      }
    } else if (tier === 2) {
      summary = `Tier 2 (Casos de Borda & Teste de Mesa) — Exercício: "${title}". Identificando asserções que falharam.`;
      concept = 'Casos de Borda e Simulação Passo a Passo';
      if (failedTests.length > 0) {
        const firstError = failedTests[0].errorMessage || failedTests[0].name || '';
        hints.push(`Observe o teste que falhou: "${firstError}". Que valores causaram essa divergência?`);
      }
      hints.push('Realize um teste de mesa: anote em um papel o valor das variáveis linha a linha simulando a entrada do teste.');
      hints.push('Você considerou valores extremos como zero, negativos, listas vazias ou limites de tamanho?');
    } else {
      summary = `Tier 3 (Complexidade Big-O & Eficiência) — Exercício: "${title}". Otimizando trade-offs de tempo e espaço.`;
      concept = 'Complexidade Assintótica e Estruturas de Dados';
      if (code.includes('for') || code.includes('while')) {
        hints.push('Quantas iterações seu algoritmo realiza no pior caso? Se houver laços aninhados, a complexidade pode ser O(N²).');
        hints.push('Considere se uma tabela hash (Map/Set) ou ordenação prévia permite reduzir o tempo de busca para O(1) ou O(log N).');
      } else {
        hints.push('Avalie os limites de tempo e memória: a sua solução atual escala bem se o volume de dados aumentar significativamente?');
      }
    }

    return {
      summary,
      hints,
      suggestedConcept: concept,
      tier,
    };
  }

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
    dto: { activityId: string; code?: string; messages: Array<{ role: 'user' | 'assistant'; content: string }> },
    userId?: string,
  ): AsyncGenerator<string, void, unknown> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: dto.activityId },
    });

    if (!activity) {
      throw new NotFoundException('Atividade não encontrada');
    }

    const lastUserMessage = dto.messages[dto.messages.length - 1]?.content || '';

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
    if (this.detectJailbreakOrBypass(lastUserMessage)) {
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
    const tier = userId ? await this.calculateTier(userId, dto.activityId) : 1;
    const tierInstructions: Record<SocraticTier, string> = {
      1: 'DIRETRIZ PEDAGÓGICA ATUAL: TIER 1 (MODELO MENTAL & INVARIANTES). Ajude o aluno a clarear o modelo mental com perguntas conceituais. Não cite código pronto nem sintaxe.',
      2: 'DIRETRIZ PEDAGÓGICA ATUAL: TIER 2 (CASOS DE BORDA & TESTE DE MESA). O aluno já tentou e falhou. Destaque cenários limites e incentive o rastreamento manual linha a linha.',
      3: 'DIRETRIZ PEDAGÓGICA ATUAL: TIER 3 (COMPLEXIDADE BIG-O & TRADE-OFFS). Discuta a ordem de complexidade temporal/espacial O(N) vs O(N²) e estruturas mais eficientes.',
    };

    // If API key is available, call streaming endpoint
    if (this.apiKey) {
      try {
        const sanitizedCode = dto.code ? this.sanitizePrompt(dto.code) : '';
        const systemPrompt = [
          'Você é o Tutor de IA socrático e rigoroso da plataforma NEXUS CODE.',
          `O aluno está resolvendo o exercício: "${activity.title}".`,
          `Enunciado da atividade: "${activity.description}"`,
          tierInstructions[tier],
          sanitizedCode ? `Código atual do aluno:\n${sanitizedCode}` : '',
          'Instruções pedagógicas:',
          '- NUNCA escreva o código pronto da solução.',
          '- Guie o aluno através de perguntas reflexivas (método socrático).',
          '- Explique conceitos como sintaxe, laços, condições ou funções de forma clara e amigável.',
          '- Responda em português brasileiro com formatação Markdown limpa.',
        ].filter(Boolean).join('\n\n');

        const apiMessages = [
          { role: 'system', content: systemPrompt },
          ...dto.messages.map((m) => ({ role: m.role, content: this.sanitizePrompt(m.content) })),
        ];

        const res = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.config.get<string>('AI_MODEL', 'gemini-2.0-flash'),
            messages: apiMessages,
            stream: true,
          }),
        });

        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const dataStr = trimmed.replace(/^data:\s*/, '');
              if (dataStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataStr);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullAssistantContent += delta;
                  yield delta;
                }
              } catch {}
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(`Streaming AI API call failed, falling back to heuristic streaming: ${err.message}`);
      }
    }

    // Heuristic streaming fallback
    if (!fullAssistantContent) {
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

      const guardedReply = this.applyAntiSpoilerGuardrail(reply);
      fullAssistantContent = guardedReply;

      const chunks = guardedReply.split(' ');
      for (const chunk of chunks) {
        yield `${chunk} `;
      }
    }

    const finalGuarded = this.applyAntiSpoilerGuardrail(fullAssistantContent);

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

  async chatWithTutor(dto: { activityId: string; code?: string; messages: Array<{ role: 'user' | 'assistant'; content: string }> }, userId?: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: dto.activityId },
    });

    if (!activity) {
      throw new NotFoundException('Atividade não encontrada');
    }

    const lastUserMessage = dto.messages[dto.messages.length - 1]?.content || '';

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

    if (this.detectJailbreakOrBypass(lastUserMessage)) {
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

    let assistantContent = '';
    const tier = userId ? await this.calculateTier(userId, dto.activityId) : 1;
    const tierInstructions: Record<SocraticTier, string> = {
      1: 'DIRETRIZ PEDAGÓGICA ATUAL: TIER 1 (MODELO MENTAL & INVARIANTES). Ajude o aluno a clarear o modelo mental com perguntas conceituais. Não cite código pronto nem sintaxe.',
      2: 'DIRETRIZ PEDAGÓGICA ATUAL: TIER 2 (CASOS DE BORDA & TESTE DE MESA). O aluno já tentou e falhou. Destaque cenários limites e incentive o rastreamento manual linha a linha.',
      3: 'DIRETRIZ PEDAGÓGICA ATUAL: TIER 3 (COMPLEXIDADE BIG-O & TRADE-OFFS). Discuta a ordem de complexidade temporal/espacial O(N) vs O(N²) e estruturas mais eficientes.',
    };

    if (this.apiKey) {
      try {
        const sanitizedCode = dto.code ? this.sanitizePrompt(dto.code) : '';
        const systemPrompt = [
          'Você é o Tutor de IA socrático e rigoroso da plataforma NEXUS CODE.',
          `O aluno está resolvendo o exercício: "${activity.title}".`,
          `Enunciado da atividade: "${activity.description}"`,
          tierInstructions[tier],
          sanitizedCode ? `Código atual do aluno:\n${sanitizedCode}` : '',
          'Instruções pedagógicas:',
          '- NUNCA escreva o código pronto da solução.',
          '- Guie o aluno através de perguntas reflexivas (método socrático).',
          '- Explique conceitos como sintaxe, laços, condições ou funções de forma clara e amigável.',
          '- Responda em português brasileiro.',
        ].filter(Boolean).join('\n\n');

        const apiMessages = [
          { role: 'system', content: systemPrompt },
          ...dto.messages.map((m) => ({ role: m.role, content: this.sanitizePrompt(m.content) })),
        ];

        const res = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.config.get<string>('AI_MODEL', 'gemini-2.0-flash'),
            messages: apiMessages,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          assistantContent = this.applyAntiSpoilerGuardrail(data.choices[0].message.content);
        }
      } catch (err: any) {
        this.logger.warn(`AI chat API call failed, falling back to heuristic reply: ${err.message}`);
      }
    }

    if (!assistantContent) {
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

    assistantContent = this.applyAntiSpoilerGuardrail(assistantContent);

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

    return { role: 'assistant', content: assistantContent };
  }

  async analyzeComplexity(code: string, activityId: string): Promise<ComplexityAnalysisResult> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });

    const trimmed = code.trim();
    if (!trimmed) {
      return {
        timeComplexity: 'O(1)',
        spaceComplexity: 'O(1)',
        summary: 'Arquivo sem código para análise.',
        bottlenecks: ['Nenhuma instrução implementada.'],
        recommendations: ['Escreva a implementação inicial para calcular a complexidade assintótica.'],
        score: 0,
      };
    }

    // Static Heuristic Complexity Analysis
    let timeComplexity = 'O(1)';
    let spaceComplexity = 'O(1)';
    const bottlenecks: string[] = [];
    const recommendations: string[] = [];
    let score = 95;

    // Detect nested loops
    const forCount = (code.match(/\bfor\s*\(/g) || []).length;
    const whileCount = (code.match(/\bwhile\s*\(/g) || []).length;
    const totalLoops = forCount + whileCount;

    // Check for nested loops regex
    const hasNestedLoops = /for\s*\([^)]*\)\s*\{[^}]*for\s*\([^)]*\)/s.test(code) ||
                          /while\s*\([^)]*\)\s*\{[^}]*while\s*\([^)]*\)/s.test(code);

    // Check for recursion
    const hasRecursion = /\bfunction\s+([a-zA-Z0-9_$]+)[\s\S]*?\1\s*\(/s.test(code);

    // Check for array allocations
    const hasArrayAlloc = /new\s+Array|\[\]|\.map\(|\.filter\(|\.reduce\(|\.split\(/i.test(code);

    if (hasNestedLoops) {
      timeComplexity = 'O(N²)';
      score = 65;
      bottlenecks.push('Detectado laço aninhado (loop duplo) gerando complexidade quadrática no pior caso.');
      recommendations.push('Considere usar uma Hash Map ou Set para buscas O(1) e reduzir a complexidade para linear O(N).');
    } else if (totalLoops > 0) {
      timeComplexity = 'O(N)';
      score = 88;
      bottlenecks.push('Iteração linear percorrendo a estrutura de dados de entrada.');
      recommendations.push('A complexidade linear O(N) é excelente para a maioria dos cenários práticos.');
    } else if (hasRecursion) {
      timeComplexity = 'O(2^N) ou O(N)';
      score = 70;
      bottlenecks.push('Chamadas recursivas detectadas na pilha de execução (Call Stack).');
      recommendations.push('Verifique a profundidade de recursão para evitar estouro de pilha (Stack Overflow) ou aplique memoization.');
    }

    if (hasArrayAlloc) {
      spaceComplexity = 'O(N)';
      bottlenecks.push('Alocação dinâmica de novos arrays/buffers na memória Heap.');
      recommendations.push('Se a memória for crítica, tente realizar operações in-place para atingir O(1) de espaço auxiliar.');
    }

    return {
      timeComplexity,
      spaceComplexity,
      summary: `Análise assintótica concluída para "${activity?.title || 'Atividade'}": Tempo estimado em ${timeComplexity} e Espaço auxiliar em ${spaceComplexity}.`,
      bottlenecks: bottlenecks.length > 0 ? bottlenecks : ['Nenhum gargalo crítico detectado.'],
      recommendations: recommendations.length > 0 ? recommendations : ['Código com excelente eficiência assintótica.'],
      score,
    };
  }

  applyAntiSpoilerGuardrail(content: string): string {
    if (!content) return '';
    const codeBlockRegex = /```(?:[a-zA-Z]*\n)?([\s\S]*?)```/g;
    return content.replace(codeBlockRegex, (match, codeInside) => {
      const lines = codeInside.trim().split('\n');
      if (lines.length > 3) {
        return '*(Dica Socrática: O código completo da solução foi omitido para estimular seu raciocínio. Tente estruturar os passos da lógica por conta própria!)*';
      }
      return match;
    });
  }
}
