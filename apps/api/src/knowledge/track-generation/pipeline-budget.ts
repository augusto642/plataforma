/**
 * Orçamento do pipeline (DESIGN-REUSO §3 — R4; espelho TS de
 * scripts/pipeline-budget.mjs, mesmas constantes, mesmos arquivos).
 * Conta do SISTEMA, sem userId, nunca debitada de aluno (Q5 é outra conta).
 * Teto default 200/dia = PROPOSTA pendente de aprovação do Augusto (Q7).
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const PIPELINE_DAILY_CAP_DEFAULT = 200; // PROPOSTA — pendente de aprovação do Augusto (Q7)
export const PIPELINE_BATCH_SIZE_DEFAULT = 10;

export function resolveBudgetDir(): string {
  if (process.env.PIPELINE_BUDGET_DIR) return resolve(process.env.PIPELINE_BUDGET_DIR);
  if (process.env.KNOWLEDGE_CONTENT_DIR) return resolve(process.env.KNOWLEDGE_CONTENT_DIR, '..', 'data');
  return resolve(process.cwd(), '..', '..', 'data');
}

export function todayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export interface PipelineBudgetStatus {
  date: string;
  cap: number;
  used: number;
  remaining: number;
}

export function loadBudget(dir?: string): PipelineBudgetStatus {
  const base = dir || resolveBudgetDir();
  const capRaw = process.env.PIPELINE_LLM_DAILY_CAP;
  const cap = Number.isFinite(Number(capRaw)) && Number(capRaw) >= 0 ? Number(capRaw) : PIPELINE_DAILY_CAP_DEFAULT;
  const today = todayKey();
  let used = 0;
  const path = join(base, 'pipeline-budget.json');
  if (existsSync(path)) {
    try {
      const doc = JSON.parse(readFileSync(path, 'utf8'));
      if (doc.date === today) used = doc.used || 0;
    } catch { /* corrompido = recomeça o dia, nunca trava por isso */ }
  }
  return { date: today, cap, used, remaining: Math.max(0, cap - used) };
}

/** Reserva 1 chamada antes de executá-la; estourado ⇒ erro claro (pausa). */
export function reserveCall(dir?: string): PipelineBudgetStatus {
  const base = dir || resolveBudgetDir();
  const status = loadBudget(base);
  if (status.used >= status.cap) {
    throw new Error(
      `orçamento do pipeline esgotado (${status.used}/${status.cap} chamadas em ${status.date}) — pipeline PAUSADO; retome após o teto renovar ou ser aprovado novo teto (Q7). Nenhuma cota de aluno foi usada.`,
    );
  }
  mkdirSync(base, { recursive: true });
  const next = { date: status.date, used: status.used + 1, cap: status.cap };
  writeFileSync(join(base, 'pipeline-budget.json'), `${JSON.stringify(next, null, 2)}\n`);
  return { ...next, remaining: Math.max(0, next.cap - next.used) };
}

/** Ledger append-only (best-effort; nunca falha a chamada por causa do log). */
export function recordUsage(
  dir: string | undefined,
  entry: { purpose: string; model?: string; promptTokens?: number; completionTokens?: number; segmentRef?: string; driveFileId?: string },
): void {
  try {
    const base = dir || resolveBudgetDir();
    mkdirSync(base, { recursive: true });
    appendFileSync(join(base, 'pipeline-usage.jsonl'), `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
  } catch { /* best-effort */ }
}
