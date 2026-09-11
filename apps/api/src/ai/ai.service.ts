import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface PedagogicalFeedback {
  summary: string;
  hints: string[];
  suggestedConcept: string;
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
    this.apiUrl = this.config.get<string>('AI_API_URL') || 'https://api.openai.com/v1/chat/completions';
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

    // Return cached feedback if available
    if (submission.aiFeedback && submission.aiHints) {
      try {
        return {
          summary: submission.aiFeedback,
          hints: JSON.parse(submission.aiHints),
          suggestedConcept: 'Revisão Pedagógica',
        };
      } catch {}
    }

    const failedTests = submission.testResults.filter((t) => !t.passed);
    const feedback = await this.produceSocraticHint(
      submission.activity.title,
      submission.activity.description,
      submission.codeSnapshot || '',
      failedTests,
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
  ): Promise<PedagogicalFeedback> {
    const sanitizedStudentCode = this.sanitizePrompt(studentCode);

    // If external AI LLM API key is configured, call it
    if (this.apiKey) {
      try {
        const failedSummary = failedTests
          .map((t) => `- ${t.name}: ${t.errorMessage || 'Falha de asserção'}`)
          .join('\n');

        const prompt = [
          'Você é um tutor de programação socrático e paciente.',
          `O aluno está resolvendo o exercício: "${activityTitle}".`,
          `Enunciado: ${instructions}`,
          '',
          'Código do aluno:',
          sanitizedStudentCode,
          '',
          'Testes que falharam:',
          failedSummary,
          '',
          'Regras estritas:',
          '1. NUNCA forneça o código pronto ou a resposta final.',
          '2. Explique a causa conceitual do erro de forma amigável.',
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
            model: this.config.get<string>('AI_MODEL', 'gpt-4o-mini'),
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
          };
        }
      } catch (err: any) {
        this.logger.warn(`AI API call failed, falling back to heuristic tutor: ${err.message}`);
      }
    }

    // Heuristic Socratic Engine (offline & default)
    return this.generateHeuristicSocraticHints(studentCode, failedTests, activityTitle);
  }

  private generateHeuristicSocraticHints(
    code: string,
    failedTests: any[],
    title: string,
  ): PedagogicalFeedback {
    const hints: string[] = [];
    let summary = 'Notei que o seu código ainda não passou em todos os testes. Vamos analisar juntos!';
    let concept = 'Fluxo de Execução e Retorno';

    if (!code || code.trim().length === 0) {
      summary = 'Seu arquivo de resposta está em branco.';
      hints.push('Comece declarando a função solicitada no enunciado.');
      hints.push('Certifique-se de que o nome da função e a quantidade de parâmetros correspondem exatamente ao solicitado.');
      return { summary, hints, suggestedConcept: 'Declaração de Funções' };
    }

    if (!code.includes('return')) {
      hints.push('Lembre-se de que a função precisa explicitamente usar a palavra-chave `return` para devolver o resultado calculado.');
      hints.push('Sem o `return`, a função em JavaScript devolve `undefined` por padrão.');
    }

    if (code.includes('for') || code.includes('while')) {
      concept = 'Laços de Repetição e Condicionais';
      hints.push('Verifique os limites do seu laço (condição de parada e índices iniciais).');
      hints.push('Cuidado com loops infinitos ou acessos fora do tamanho do array.');
    }

    if (failedTests.length > 0) {
      const firstError = failedTests[0].errorMessage || '';
      if (firstError.includes('function')) {
        hints.push('Verifique a ortografia do nome da função; ela precisa ser exportada ou definida no escopo global.');
      } else {
        hints.push(`Observe o primeiro teste com falha: "${firstError}". Tente simular a execução manualmente com esses valores.`);
      }
    }

    if (hints.length === 0) {
      hints.push('Revise se você considerou casos especiais, como números negativos, arrays vazios ou textos com caracteres repetidos.');
      hints.push('Adicione mensagens de depuração intermediárias para acompanhar o valor das suas variáveis.');
    }

    return {
      summary,
      hints,
      suggestedConcept: concept,
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

    // If API key is available, call streaming endpoint
    if (this.apiKey) {
      try {
        const sanitizedCode = dto.code ? this.sanitizePrompt(dto.code) : '';
        const systemPrompt = [
          'Você é o Tutor de IA da plataforma de ensino de programação.',
          `O aluno está resolvendo o exercício: "${activity.title}".`,
          `Enunciado da atividade: "${activity.description}"`,
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
            model: this.config.get<string>('AI_MODEL', 'gpt-4o-mini'),
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

    if (this.apiKey) {
      try {
        const sanitizedCode = dto.code ? this.sanitizePrompt(dto.code) : '';
        const systemPrompt = [
          'Você é o Tutor de IA da plataforma de ensino de programação.',
          `O aluno está resolvendo o exercício: "${activity.title}".`,
          `Enunciado da atividade: "${activity.description}"`,
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
            model: this.config.get<string>('AI_MODEL', 'gpt-4o-mini'),
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
