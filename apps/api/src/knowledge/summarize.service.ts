/**
 * Resumo de lições (DESIGN §1.5, §6.3 — V3/V4 da auditoria de reuso).
 * O resumo é produção do PIPELINE OFFLINE, não consumo do aluno:
 * - roda sobre o `LlmClient` da Sprint 22 (provedor agnóstico, mesma camada
 *   da tutora), nunca via `fetch` direto em `scripts/` — scripts não falam
 *   com provedores de LLM;
 * - NUNCA recebe `userId`: qualquer chamada com `userId` é rejeitada com
 *   erro (a sumarização não consome a cota 20/200 do aluno nem atribui uso
 *   a estudante; `LlmClient.complete` sem `userId` não reserva cota);
 * - `purpose: 'knowledge-pipeline'` no registro de uso do gateway;
 * - ledger operacional (§6.3): cada resumo acrescenta uma linha JSONL em
 *   `data/knowledge-usage.jsonl` (fora do repo, `.gitignore` já contém
 *   `data/`) ou no caminho de `KNOWLEDGE_USAGE_LOG` — modelo, provedor,
 *   tamanhos de entrada/saída, data. O ledger nunca falha o resumo
 *   (best-effort, log de warning).
 * A transcrição é insumo transitório: entra aqui como texto, sai como
 * resumo ≤ 1200 chars em linguagem própria — nunca é persistida por este
 * serviço (o extrator a descarta do diretório temporário).
 */
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { LlmClient } from '../ai/llm-client';
import { resolveKnowledgeContentDir } from './knowledge.service';

export interface LessonSummaryInput {
  transcript: string;
  fileName: string;
  courseName: string;
}

export interface LessonSummary {
  summary: string;
  topics: string[];
  prerequisites: string[];
  keyExamples: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

const DIFFICULTIES = new Set(['beginner', 'intermediate', 'advanced']);

@Injectable()
export class KnowledgeSummarizeService {
  private readonly logger = new Logger(KnowledgeSummarizeService.name);

  constructor(
    private readonly llm: LlmClient,
    @Optional() @Inject('KNOWLEDGE_USAGE_LOG_PATH') private readonly usageLogPath?: string,
  ) {}

  async summarize(
    input: LessonSummaryInput & { userId?: unknown },
    opts?: { usageLogPath?: string },
  ): Promise<LessonSummary> {
    // Assert de pipeline offline (V3): userId aqui é erro de arquitetura.
    if ((input as any).userId !== undefined || (opts as any)?.userId !== undefined) {
      throw new Error('pipeline offline: userId proibido na sumarização — o resumo não consome cota de aluno nem atribui uso a estudante');
    }
    if (!input.transcript || !input.transcript.trim()) {
      throw new Error('sumarização exige transcrição não vazia (insumo transitório do extrator)');
    }
    const prompt = [
      'Você resume aulas de programação em linguagem própria, sem reproduzir o conteúdo original.',
      `Curso: ${input.courseName}. Aula: ${input.fileName}.`,
      'Regras absolutas:',
      '- summary: resumo condensado em linguagem própria, MÁXIMO 1200 caracteres, nunca transcrição nem falas do instrutor;',
      '- topics: até 8 tópicos conceituais (ids curtos, ex.: funcoes, listas);',
      '- prerequisites: tópicos prévios necessários (podem ser vazios);',
      '- keyExamples: até 2 exemplos ANÁLOGOS autorados (nunca código copiado da aula);',
      '- difficulty: beginner | intermediate | advanced.',
      'Responda SOMENTE JSON com as chaves: summary, topics, prerequisites, keyExamples, difficulty.',
      `Transcrição (insumo transitório, não reproduzir):\n${input.transcript}`,
    ].join('\n');
    const content = await this.llm.complete({
      messages: [{ role: 'user', content: prompt }],
      jsonMode: true,
      purpose: 'knowledge-pipeline',
    });
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error('sumarização: o provedor não devolveu JSON válido');
    }
    if (typeof parsed.summary !== 'string' || !parsed.summary.trim()) {
      throw new Error('sumarização: summary vazio');
    }
    if (parsed.summary.length > 1200) {
      throw new Error(`sumarização: summary com ${parsed.summary.length} chars (teto 1200)`);
    }
    const out: LessonSummary = {
      summary: parsed.summary,
      topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 8) : [],
      prerequisites: Array.isArray(parsed.prerequisites) ? parsed.prerequisites : [],
      keyExamples: Array.isArray(parsed.keyExamples) ? parsed.keyExamples.slice(0, 2) : [],
      difficulty: DIFFICULTIES.has(parsed.difficulty) ? parsed.difficulty : 'beginner',
    };
    this.appendUsageLedger({ input, out, usageLogPath: opts?.usageLogPath });
    return out;
  }

  /** Ledger §6.3 (V4): append-only JSONL, best-effort. */
  private appendUsageLedger({ input, out, usageLogPath }: { input: LessonSummaryInput; out: LessonSummary; usageLogPath?: string }): void {
    try {
      const path =
        usageLogPath ||
        process.env.KNOWLEDGE_USAGE_LOG ||
        this.usageLogPath ||
        join(resolveKnowledgeContentDir(), '..', 'data', 'knowledge-usage.jsonl');
      mkdirSync(dirname(path), { recursive: true });
      appendFileSync(path, `${JSON.stringify({
        occurredAt: new Date().toISOString(),
        purpose: 'knowledge-pipeline',
        provider: (this.llm as any).providerId ?? null,
        model: (this.llm as any).model ?? null,
        courseName: input.courseName,
        fileName: input.fileName,
        inputChars: input.transcript.length,
        outputChars: out.summary.length,
      })}\n`);
    } catch (err) {
      this.logger.warn(`knowledge-pipeline: ledger de uso falhou (best-effort): ${(err as Error).message}`);
    }
  }
}
