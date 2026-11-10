#!/usr/bin/env node
/**
 * Biblioteca compartilhada do KMS (DESIGN §13) — usada por kms-merge,
 * kms-apply, kms-backfill e kms-calibration. NÃO é um CLI (não faz nada
 * quando executada diretamente); a lógica pura aqui é testável sem disco.
 *
 * Constantes versionadas (G8): os limiares de casamento vivem AQUI, com
 * versão, e o relatório de calibração (kms-calibration.mjs) os referencia.
 * Recalibrar = mudar a constante + regenerar o relatório, nunca ajustar
 * número solto num script.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const KMS_MATCH_VERSION = 1;
export const KMS_MATCH_THRESHOLDS = Object.freeze({
  enrichMin: 70, // melhor score ≥ 70 para enriquecer
  marginMin: 20, // margem ≥ 20 sobre o 2º colocado
  newMax: 40, // melhor score < 40 (e nenhum candidato ≥ 40) => tema novo
});
export const KMS_STALE_DAYS = 180; // entrada active sem contribuição há > N dias => obsoleta pendente
export const KMS_CHANGE_KINDS = new Set(['created', 'enriched', 'example-added', 'market-context', 'corrected', 'superseding']);
export const KMS_SUPERSEDE_REASONS = new Set(['enriched', 'corrected', 'outdated', 'merged']);
export const KMS_ENTRY_STATUSES = new Set(['active', 'superseded', 'deprecated']);
export const KMS_VERSION_STATUSES = new Set(['draft', 'active', 'superseded']);
export const KMS_CHANGE_TYPES = new Set(['created', 'enriched', 'superseded', 'deprecated', 'merged', 'review-resolved']);
export const KMS_REVIEW_KINDS = new Set(['ambiguous-match', 'new-or-enrich', 'supersede-candidate']);
export const KMS_REVIEW_ACTIONS = new Set(['enrich', 'create', 'supersede', 'dismiss']);

const STOPWORDS = new Set(['de', 'em', 'para', 'com', 'os', 'as', 'um', 'uma', 'o', 'a', 'e', 'do', 'da', 'dos', 'das', 'no', 'na', 'que', 'se']);

export function slugify(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Normalização §13.2: minúsculas, sem acento, sem numeração de aula, sem stopwords PT, tokenização por espaço/hífen. Sem stemming na v1. */
export function normalizeTokens(text) {
  let t = (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  t = t.replace(/\b(aula|parte|modulo|capitulo|lição|licao)\s*\d+\b/g, ' ');
  t = t.replace(/[^a-z0-9]+/g, ' ');
  return t.split(' ').filter((w) => w && !STOPWORDS.has(w));
}

export function jaccard(a, b) {
  const A = new Set(a); const B = new Set(b);
  if (!A.size && !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

/**
 * Scoring §13.2 (determinístico, auditável). Retorna { score, matchReasons }.
 * source: { primaryTopic, topics[], title, courseSlug? } — pesquisa não pontua courseSlug.
 */
export function scoreEntry(source, entry) {
  let score = 0; const matchReasons = [];
  const entryTopics = entry.topicIds || [];
  if (source.primaryTopic && entryTopics.includes(source.primaryTopic)) { score += 50; matchReasons.push('topico-primario'); }
  const extra = (source.topics || []).filter((t) => t !== source.primaryTopic && entryTopics.includes(t)).length;
  if (extra > 0) { score += Math.min(30, extra * 15); matchReasons.push(`topicos-adicionais-${extra}`); }
  const jac = jaccard(normalizeTokens(source.title), normalizeTokens(entry.title));
  if (jac >= 0.5) { score += 20; matchReasons.push(`titulo-jaccard-${jac.toFixed(2)}`); }
  if (source.courseSlug && entry.courseSlugForScoring && source.courseSlug === entry.courseSlugForScoring) { score += 10; matchReasons.push('mesmo-curso'); }
  return { score: Math.min(100, score), matchReasons, jaccard: jac };
}

/** Classifica candidatos ordenados nos 3 desfechos §13.2 (ou fila). */
export function decideMatch(candidates) {
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const best = sorted[0]; const second = sorted[1];
  const { enrichMin, marginMin, newMax } = KMS_MATCH_THRESHOLDS;
  if (!best || best.score < newMax) return { outcome: 'new', best: null, sorted };
  const above = sorted.filter((c) => c.score >= enrichMin);
  const margin = second ? best.score - second.score : 100;
  if (best.score >= enrichMin && above.length === 1 && margin >= marginMin) return { outcome: 'enrich', best, sorted };
  return { outcome: 'review', best, sorted };
}

export function sha256Text(text) {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

/** Id estável da contribuição (§13.2): drive usa driveFileId + hash do resumo; research usa researchId. */
export function contributionId(c) {
  if (c.kind === 'drive') return `drive:${c.driveFileId}:${c.summaryHash || ''}`;
  if (c.kind === 'research') return `research:${c.researchId}`;
  return `${c.kind}:${c.driveFileId || c.researchId || ''}`;
}

export function entryHasContribution(entry, contrib) {
  const id = contributionId(contrib);
  return (entry.versions || []).some((v) => (v.contributions || []).some((c) => contributionId(c) === id));
}

/** Escrita atômica (temp + rename) — nunca deixa JSON parcial no lugar. */
export function writeJsonAtomic(path, obj) {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(obj, null, 2)}\n`);
  renameSync(tmp, path);
}

export function loadJsonIfExists(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function listJsonDir(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.json')) { try { out.push({ path: p, data: JSON.parse(readFileSync(p, 'utf8')) }); } catch { /* inválido: o validador reprova */ } }
    }
  };
  walk(dir);
  return out;
}

export function kmsPaths(contentDir) {
  const kdir = join(contentDir, 'knowledge');
  return {
    kdir,
    entriesDir: join(kdir, 'entries'),
    lessonsDir: join(kdir, 'lessons'),
    researchDir: join(kdir, 'research'),
    reviewDir: join(kdir, 'review-queue'),
    changelogPath: join(kdir, 'changelog.json'),
    registryPath: join(kdir, 'extraction-registry.json'),
    topicsPath: join(kdir, 'topics.json'),
  };
}

export function loadEntries(entriesDir) {
  return listJsonDir(entriesDir).map(({ path, data }) => ({ path, entry: data }));
}

export function loadLessons(lessonsDir) {
  return listJsonDir(lessonsDir).map(({ data }) => data);
}

export function loadResearch(researchDir) {
  return listJsonDir(researchDir).map(({ data }) => data);
}

/** Próximo seq do changelog (max + 1); arquivo ausente => 1. */
export function nextChangelogSeq(changelog) {
  const entries = changelog?.entries || [];
  return entries.reduce((m, e) => Math.max(m, e.seq || 0), 0) + 1;
}

/** Append ao changelog versionado (append-only; nunca edita item antigo). Retorna o item criado. */
export function appendChangelog(changelogPath, item) {
  const doc = loadJsonIfExists(changelogPath, { version: 1, entries: [] });
  // Rodada 3 — changelog malformado (ex.: array em vez de
  // {version, entries[]}) fazia o append ser perdido em silêncio: o
  // JSON.stringify descartava a propriedade entries do array e o CLI
  // anunciava sucesso sem gravar nada. Fail-closed com erro claro.
  if (!doc || typeof doc !== 'object' || Array.isArray(doc) || !Array.isArray(doc.entries)) {
    throw new Error(`changelog malformado em ${changelogPath}: esperado {version, entries[]} (rode o validador antes)`);
  }
  const seq = nextChangelogSeq(doc);
  const full = { occurredAt: new Date().toISOString(), ...item, seq };
  // seq atribuído aqui (não pelo chamador): garante ordem total mesmo se o chamador não souber o próximo.
  doc.entries.push(full);
  mkdirSync(join(changelogPath, '..'), { recursive: true });
  writeJsonAtomic(changelogPath, doc);
  return full;
}

/**
 * Atualiza registry.entrySlugs para um driveFileId (lado arquivo→entrada, D14).
 * Retorna true se atualizou, false se o registro não existe (nada escrito).
 * Falha de escrita propaga (o chamador trata: merge sai ≠ 0, §13.3).
 */
export function addRegistryEntrySlug(registryPath, driveFileId, entrySlug) {
  const reg = loadJsonIfExists(registryPath, null);
  if (!reg) return false;
  const rec = (reg.records || []).find((r) => r.driveFileId === driveFileId);
  if (!rec) return false;
  if (!Array.isArray(rec.entrySlugs)) rec.entrySlugs = [];
  if (!rec.entrySlugs.includes(entrySlug)) rec.entrySlugs.push(entrySlug);
  reg.generatedAt = new Date().toISOString();
  writeJsonAtomic(registryPath, reg);
  return true;
}

/** Slug de entrada derivada de lição (§13.1): lessonId com '/' → '-'. */
export function entrySlugForLesson(lessonId) {
  return slugify(lessonId);
}

/** Próximo id de fila: review-AAAAMMDD-NNN (contador sobre os arquivos existentes). */
export function nextReviewId(reviewDir, now = new Date()) {
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  let max = 0;
  if (existsSync(reviewDir)) {
    for (const f of readdirSync(reviewDir).filter((x) => x.endsWith('.json'))) {
      const m = f.match(new RegExp(`^review-${date}-(\\d+)\\.json$`));
      if (m) max = Math.max(max, Number(m[1]));
    }
  }
  return `review-${date}-${String(max + 1).padStart(3, '0')}`;
}

/** Nova entrada v1 draft a partir de uma lição aprovada (backfill/merge-create). */
export function newEntryFromLesson(lesson, slug) {
  const now = new Date().toISOString();
  const contrib = {
    kind: 'drive', driveFileId: lesson.driveFileId, lessonId: lesson.id,
    contributedAt: now, changeKind: 'created', summaryHash: sha256Text(lesson.summary || ''),
  };
  return {
    version: 1, slug, title: lesson.lessonTitle, topicIds: lesson.topics || [],
    status: 'draft', currentVersion: 0, supersededByEntry: null, supersededAt: null, supersedeReason: null,
    versions: [{
      version: 1, status: 'draft', summary: lesson.summary, keyExamples: (lesson.keyExamples || []).slice(0, 2),
      contributions: [contrib], marketContext: [], createdAt: now,
      supersededBy: null, supersededAt: null, supersedeReason: null,
    }],
  };
}

/** Nova versão draft de enriquecimento: herda contributions + marketContext da versão anterior e acrescenta os novos. */
export function newDraftVersion(entry, { summary, keyExamples, newContributions, newMarketContext, supersedeReason = null }) {
  const prev = entry.versions[entry.versions.length - 1];
  const nextVersion = (prev ? prev.version : 0) + 1;
  return {
    version: nextVersion, status: 'draft', summary, keyExamples: (keyExamples || []).slice(0, 2),
    contributions: [...(prev?.contributions || []), ...(newContributions || [])],
    marketContext: [...(prev?.marketContext || []), ...(newMarketContext || [])],
    createdAt: new Date().toISOString(), supersededBy: null, supersededAt: null, supersedeReason,
  };
}
