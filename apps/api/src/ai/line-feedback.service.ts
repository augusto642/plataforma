import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from './ai.service';
import { LlmClient } from './llm-client';
import { UNTRUSTED_DATA_SYSTEM_NOTE, wrapUntrusted } from './prompt-guard';

export interface LineFeedbackItem {
  line: number;
  comment: string;
  severity: 'info' | 'warning';
}

const MAX_FEEDBACK_ITEMS = 15;
const MAX_FUNCTION_LINES = 25;
const MAX_NESTING_DEPTH = 3;
const SIMPLE_NUMBERS = new Set(['0', '1']);

@Injectable()
export class LineFeedbackService {
  private readonly logger = new Logger(LineFeedbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly llm: LlmClient,
  ) {}

  async analyze(
    submissionId: string,
    userId: string,
    role: string,
  ): Promise<LineFeedbackItem[]> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        activity: {
          select: {
            id: true,
            language: true,
            initialCode: true,
            course: { select: { instructorId: true } },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submissão não encontrada');
    }

    const isOwner = submission.userId === userId;
    const isAdmin = role === 'admin';
    const isCourseInstructor =
      role === 'instructor' && submission.activity.course.instructorId === userId;
    if (!isOwner && !isAdmin && !isCourseInstructor) {
      throw new ForbiddenException('Acesso não autorizado a esta submissão');
    }

    if (submission.aiLineFeedback) {
      try {
        const cached = JSON.parse(submission.aiLineFeedback);
        if (Array.isArray(cached)) {
          return cached;
        }
      } catch {}
    }

    const code = submission.codeSnapshot ?? submission.activity.initialCode ?? '';
    const heuristicItems = this.analyzeHeuristics(code, submission.activity.language);
    const items = await this.enrichWithExternalAI(code, submission.activity.language, heuristicItems);

    await this.prisma.submission.update({
      where: { id: submissionId },
      data: { aiLineFeedback: JSON.stringify(items) },
    });

    return items;
  }

  analyzeHeuristics(code: string, language: string): LineFeedbackItem[] {
    if (!code || !code.trim()) {
      return [];
    }
    const lines = code.split(/\r?\n/);
    const items: LineFeedbackItem[] = [];

    if (language === 'python') {
      this.analyzePython(lines, items);
    } else {
      this.analyzeJsLike(lines, items);
    }

    return items.sort((a, b) => a.line - b.line).slice(0, MAX_FEEDBACK_ITEMS);
  }

  private add(items: LineFeedbackItem[], line: number, severity: 'info' | 'warning', comment: string) {
    if (items.some((item) => item.line === line)) {
      return;
    }
    if (items.length >= MAX_FEEDBACK_ITEMS) {
      return;
    }
    items.push({ line, comment, severity });
  }

  private stripInlineComment(raw: string): string {
    const trimmedStart = raw.trimStart();
    if (trimmedStart.startsWith('//') || trimmedStart.startsWith('#')) {
      return '';
    }
    return raw.split('//')[0];
  }

  private countChar(text: string, char: string): number {
    let count = 0;
    for (const current of text) {
      if (current === char) count++;
    }
    return count;
  }

  private analyzeJsLike(lines: string[], items: LineFeedbackItem[]) {
    let depth = 0;
    const functionStack: Array<{ start: number; depth: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      const lineNo = i + 1;
      const raw = lines[i];
      if (!raw.trim()) continue;
      const codeOnly = this.stripInlineComment(raw);
      if (!codeOnly.trim()) continue;

      if (/\bvar\s+[A-Za-z_$]/.test(codeOnly)) {
        this.add(items, lineNo, 'warning', 'Evite `var`: prefira `let` ou `const` para escopo previsível.');
      }

      const strippedEquality = codeOnly.replace(/===|!==|<=|>=|!=/g, '');
      if (strippedEquality.includes('==')) {
        this.add(items, lineNo, 'warning', 'Comparação frouxa com `==`: use `===` ou `!==` para evitar coerções inesperadas.');
      }

      if (/catch\s*(?:\([^)]*\))?\s*\{\s*\}/.test(codeOnly)) {
        this.add(items, lineNo, 'warning', 'Bloco `catch` vazio: registre ou trate o erro em vez de silenciá-lo.');
      }

      if (codeOnly.includes('console.log')) {
        this.add(items, lineNo, 'info', 'Depuração esquecida: remova o `console.log` antes da entrega final.');
      }

      if (depth > MAX_NESTING_DEPTH) {
        this.add(items, lineNo, 'info', 'Aninhamento muito profundo: considere extrair este trecho para uma função.');
      }

      if (!/\b(const|let|var)\b/.test(codeOnly)) {
        const numberMatches = codeOnly.match(/(?<![\w"'.])\d+(?:\.\d+)?(?![\w"'])/g) || [];
        const magic = numberMatches.find((n) => !SIMPLE_NUMBERS.has(n));
        if (magic !== undefined) {
          this.add(items, lineNo, 'info', 'Número mágico detectado: considere nomeá-lo em uma constante com significado claro.');
        }
      }

      const loopVar = codeOnly.match(/\bfor\s*\(\s*(?:let|var|const)?\s*([a-zA-Z])\s*(?:=|;|\bof\b|\bin\b)/);
      if (loopVar && !['i', 'j', 'k'].includes(loopVar[1])) {
        this.add(items, lineNo, 'info', 'Nome de variável de uma letra em laço: use um nome descritivo (exceto índices i, j, k).');
      }

      const depthBefore = depth;
      depth += this.countChar(codeOnly, '{') - this.countChar(codeOnly, '}');

      const opensFunction = /\bfunction\b|=>\s*\{/.test(codeOnly) && codeOnly.includes('{');
      if (opensFunction) {
        functionStack.push({ start: lineNo, depth });
      }

      while (functionStack.length > 0 && depth < functionStack[functionStack.length - 1].depth && depth <= depthBefore) {
        const fn = functionStack.pop()!;
        const length = lineNo - fn.start + 1;
        if (length > MAX_FUNCTION_LINES) {
          this.add(items, fn.start, 'info', `Esta função tem cerca de ${length} linhas: considere dividi-la em funções menores.`);
        }
      }
    }
  }

  private analyzePython(lines: string[], items: LineFeedbackItem[]) {
    const defStack: Array<{ start: number; indent: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      const lineNo = i + 1;
      const raw = lines[i];
      if (!raw.trim()) continue;
      if (raw.trimStart().startsWith('#')) continue;
      const codeOnly = this.stripInlineComment(raw).replace(/#.*$/, '');
      if (!codeOnly.trim()) continue;

      const leading = raw.match(/^[\t ]*/)![0];
      if (leading.includes('\t') && leading.includes(' ')) {
        this.add(items, lineNo, 'warning', 'Indentação mista com tabs e espaços: padronize (PEP 8 recomenda 4 espaços).');
      }

      if (/;\s*$/.test(codeOnly)) {
        this.add(items, lineNo, 'warning', 'Ponto e vírgula no fim da linha não é necessário em Python.');
      }

      if (/\bexcept\s*:/.test(codeOnly)) {
        this.add(items, lineNo, 'warning', 'Evite `except:` genérico: capture exceções específicas (ex.: `except ValueError:`).');
      } else if (/\bexcept\b[^:]*:\s*pass\s*$/.test(codeOnly)) {
        this.add(items, lineNo, 'warning', 'Tratamento de exceção silencioso com `pass`: registre ou trate o erro.');
      }

      if (/\bprint\s*\(/.test(codeOnly)) {
        this.add(items, lineNo, 'info', 'Depuração esquecida: remova o `print` antes da entrega final.');
      }

      const indentLevel = Math.floor(leading.replace(/\t/g, '    ').length / 4);
      if (indentLevel > MAX_NESTING_DEPTH) {
        this.add(items, lineNo, 'info', 'Aninhamento muito profundo: considere extrair este trecho para uma função.');
      }

      const magicMatches = codeOnly.match(/(?<![\w"'.])\d+(?:\.\d+)?(?![\w"'])/g) || [];
      const magic = magicMatches.find((n) => !SIMPLE_NUMBERS.has(n));
      if (magic !== undefined && !/\b(const|def)\b/.test(codeOnly)) {
        this.add(items, lineNo, 'info', 'Número mágico detectado: considere nomeá-lo em uma constante com significado claro.');
      }

      const loopVar = codeOnly.match(/\bfor\s+([a-zA-Z])\s+in\b/);
      if (loopVar && !['i', 'j', 'k'].includes(loopVar[1])) {
        this.add(items, lineNo, 'info', 'Nome de variável de uma letra em laço: use um nome descritivo (exceto índices i, j, k).');
      }

      if (/\bdef\s+\w+\s*\(/.test(codeOnly)) {
        const nextNonEmpty = lines.slice(i + 1).find((l) => l.trim());
        const hasDocstring = nextNonEmpty !== undefined && nextNonEmpty.trimStart().startsWith('"""');
        if (!hasDocstring) {
          this.add(items, lineNo, 'info', 'Função sem docstring: adicione uma breve descrição do seu propósito.');
        }
      }

      while (defStack.length > 0 && indentLevel <= defStack[defStack.length - 1].indent) {
        const fn = defStack.pop()!;
        const length = lineNo - fn.start + 1;
        if (length > MAX_FUNCTION_LINES) {
          this.add(items, fn.start, 'info', `Esta função tem cerca de ${length} linhas: considere dividi-la em funções menores.`);
        }
      }

      if (/\bdef\s+\w+\s*\(/.test(codeOnly)) {
        defStack.push({ start: lineNo, indent: indentLevel });
      }
    }
  }

  private async enrichWithExternalAI(
    code: string,
    language: string,
    heuristicItems: LineFeedbackItem[],
  ): Promise<LineFeedbackItem[]> {
    if (!this.llm.hasApiKey) {
      return heuristicItems;
    }
    try {
      const prompt = [
        'Você é um revisor de código didático para uma plataforma de ensino.',
        `A linguagem do código é ${language}. Analise linha a linha e aponte problemas pontuais de estilo, clareza ou possíveis erros.`,
        'Responda em formato JSON com a chave "items", um array de objetos { line, comment, severity }, onde severity é "info" ou "warning".',
        'Responda em português brasileiro. Máximo de 10 itens. Se não houver nada relevante, devolva um array vazio.',
        UNTRUSTED_DATA_SYSTEM_NOTE,
        '',
        wrapUntrusted('CODIGO_DO_ALUNO', this.ai.sanitizePrompt(code)),
      ].join('\n');

      // LlmClient: timeout (30s) + 1 retry com backoff p/ 429/5xx
      const content = await this.llm.complete({
        messages: [{ role: 'user', content: prompt }],
        jsonMode: true,
      });

      const parsed = JSON.parse(content);
      const externalItems: unknown = parsed?.items;
      if (!Array.isArray(externalItems)) {
        return heuristicItems;
      }

      const merged = [...heuristicItems];
      for (const item of externalItems) {
        const line = (item as LineFeedbackItem)?.line;
        const comment = (item as LineFeedbackItem)?.comment;
        if (
          typeof line === 'number' &&
          typeof comment === 'string' &&
          comment.trim() &&
          !merged.some((existing) => existing.line === line)
        ) {
          merged.push({
            line,
            comment,
            severity: (item as LineFeedbackItem).severity === 'warning' ? 'warning' : 'info',
          });
        }
      }

      return merged.sort((a, b) => a.line - b.line).slice(0, MAX_FEEDBACK_ITEMS);
    } catch (err: any) {
      this.logger.warn(`AI line feedback enrichment failed, using heuristics only: ${err.message}`);
      return heuristicItems;
    }
  }
}
