#!/usr/bin/env node
/**
 * Orçamento do pipeline (DESIGN-REUSO §3 — R4; DESIGN §6.3 adendo).
 * Duas contas, sem misturar: a do ALUNO (Q5: 20/dia grátis, 200/dia Pro,
 * via LlmClient.reserveQuota com userId) e a do PIPELINE (sistema, sem
 * userId, nunca debitada de aluno). Este módulo é a conta do pipeline.
 *
 * - Teto diário de chamadas LLM do pipeline: default 200/dia — ESPELHA o
 *   teto Pro como ordem de grandeza, mas é um teto DISTINTO, do sistema.
 *   O número é PROPOSTA, claramente marcada como PENDENTE DE APROVAÇÃO do
 *   Augusto (Q7): sem aprovação dele, o teto não autoriza escala (a
 *   extração em massa segue proibida antes de D3) — ele só disciplina o
 *   volume que já pode rodar (checkpoint, geração de segmento).
 *   Override por env PIPELINE_LLM_DAILY_CAP (número) ou pelo arquivo.
 * - Lote default 10, sequencial, concorrência 1 (ordem §7.4 do desenho).
 * - Ledger append-only `data/pipeline-usage.jsonl` (NÃO versionado, 1 linha
 *   por chamada: at, purpose, model, tokens, driveFileId/segmentRef). O
 *   ledger é o controle orçamentário; o evento ai_llm_usage continua
 *   existindo como observabilidade. Nenhuma linha carrega userId de aluno
 *   — o pipeline rejeita userId por construção (ver TrackGenerationService
 *   e KnowledgeSummarizeService).
 * - Se o teto estourar: PAUSA (nada extraído/gerado, relatório diz onde
 *   parou). Retomar = rodar de novo: o registro pula o já feito.
 * - O dia é o dia do servidor (ISO, UTC) — o mesmo critério do ledger.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PIPELINE_DAILY_CAP_DEFAULT = 200; // PROPOSTA — pendente de aprovação do Augusto (Q7)
export const PIPELINE_BATCH_SIZE_DEFAULT = 10;
export const PIPELINE_BUDGET_PENDING_NOTE = 'PENDENTE-Q7: teto diário do pipeline (200/dia) é proposta do Tech Lead, não decisão do Augusto — não autoriza escala antes de D3';

export function resolveBudgetDir(env = process.env) {
  if (env.PIPELINE_BUDGET_DIR) return resolve(env.PIPELINE_BUDGET_DIR);
  // A partir de scripts/: raiz do repo + data/. Sob testes, passe PIPELINE_BUDGET_DIR.
  return resolve(fileURLToPath(new URL('..', import.meta.url)), 'data');
}

export function todayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function budgetPath(dir) { return join(dir, 'pipeline-budget.json'); }
function ledgerPath(dir) { return join(dir, 'pipeline-usage.jsonl'); }

export function loadBudget(dir, env = process.env) {
  const capRaw = env.PIPELINE_LLM_DAILY_CAP;
  const cap = Number.isFinite(Number(capRaw)) && Number(capRaw) >= 0 ? Number(capRaw) : PIPELINE_DAILY_CAP_DEFAULT;
  const today = todayKey();
  let used = 0;
  if (existsSync(budgetPath(dir))) {
    try {
      const doc = JSON.parse(readFileSync(budgetPath(dir), 'utf8'));
      if (doc.date === today) used = doc.used || 0;
    } catch { /* arquivo corrompido = recomeça o dia, nunca trava o pipeline por isso */ }
  }
  return { date: today, cap, used, remaining: Math.max(0, cap - used), pendingApprovalNote: PIPELINE_BUDGET_PENDING_NOTE };
}

/** Reserva 1 chamada antes de executá-la; estourado ⇒ erro claro (pausa). */
export function reserveCall(dir, env = process.env) {
  const status = loadBudget(dir, env);
  if (status.used >= status.cap) {
    throw new Error(`orçamento do pipeline esgotado (${status.used}/${status.cap} chamadas em ${status.date}) — pipeline PAUSADO; retome após o teto renovar ou ser aprovado novo teto (Q7). Nenhuma cota de aluno foi usada.`);
  }
  mkdirSync(dir, { recursive: true });
  const next = { date: status.date, used: status.used + 1, cap: status.cap };
  writeFileSync(budgetPath(dir), `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

/** Ledger append-only (best-effort: nunca falha a chamada por causa do log). */
export function recordUsage(dir, entry) {
  try {
    mkdirSync(dir, { recursive: true });
    if (entry && entry.userId) throw new Error('pipeline nunca registra userId de aluno');
    appendFileSync(ledgerPath(dir), `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
  } catch { /* best-effort */ }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(new URL(import.meta.url)));
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log([
      'Uso: node scripts/pipeline-budget.mjs --status [--dir <dir>]',
      'Mostra o orçamento do pipeline do dia (teto, usado, restante).',
      'Teto default 200/dia = PROPOSTA pendente de aprovação do Augusto (Q7).',
      'Ledger: data/pipeline-usage.jsonl (não versionado, 1 linha por chamada, sem userId).',
    ].join('\n'));
    process.exit(0);
  }
  const get = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
  const dir = get('--dir') ? resolve(get('--dir')) : resolveBudgetDir();
  const s = loadBudget(dir);
  console.log(`pipeline-budget: data=${s.date} teto=${s.cap}/dia usado=${s.used} restante=${s.remaining}`);
  console.log(`  ${s.pendingApprovalNote}`);
}
