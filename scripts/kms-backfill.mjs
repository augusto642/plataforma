#!/usr/bin/env node
/**
 * KMS backfill (DESIGN §13.6) — migração dos dados existentes, sem re-extrair nada.
 *   node scripts/kms-backfill.mjs [--content dir] [--apply]
 * --dry-run é o DEFAULT: só relata, não escreve nada. --apply escreve.
 *
 * Algoritmo (idempotente; re-rodar é no-op):
 * 1. lições reviewStatus=approved => uma entrada por lição (slug = lessonId com
 *    '/' → '-', §13.1). O backfill é MECÂNICO e NÃO funde lições do mesmo
 *    tópico: slug derivado da lição (não do tópico) garante 1:1 e nenhuma
 *    decisão de curadoria silenciosa. Duplicatas aparentes (mesmo título +
 *    tópicos) vão para a fila de revisão, decididas pelo admin.
 * 2. pesquisas approved: cada skill com sampleSize procura entradas cujos
 *    topicIds casam com a skill — casa => marketContext (contribuição
 *    market-context; se a entrada ainda é só draft, o draft acumula; senão,
 *    nova versão draft para aprovação, nunca ativação direta); não casa =>
 *    item de fila new-or-enrich.
 * 3. changelog (created/enriched, actor kms-backfill), registry.entrySlugs e
 *    topics.json entrySlugs são atualizados junto.
 * 4. entradas backfilladas nascem DRAFT (D12): o admin as aprova em lote
 *    (rota approve ou kms-apply --approve). Nada aqui vira active sozinho.
 * Estado real em 2026-10-24: lessons/ e research/ vazios, registro com 0
 * records — o dry-run de hoje deve provar 0 entradas, e 0 é o resultado
 * correto (não um defeito).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  addRegistryEntrySlug, appendChangelog, entrySlugForLesson, kmsPaths,
  loadEntries, loadLessons, loadResearch, newDraftVersion, newEntryFromLesson,
  slugify, writeJsonAtomic,
} from './kms-lib.mjs';
import { validateKnowledge } from './validate-knowledge.mjs';
import { writeReviewItem } from './kms-merge.mjs';

export function runBackfill(contentDir, { apply = false } = {}) {
  const paths = kmsPaths(contentDir);
  const lessons = loadLessons(paths.lessonsDir);
  const research = loadResearch(paths.researchDir);
  const existingEntries = loadEntries(paths.entriesDir).map(({ entry }) => entry);
  const bySlug = new Map(existingEntries.map((e) => [e.slug, e]));
  const report = {
    dryRun: !apply, lessonsApproved: 0, lessonsSkippedDraft: 0, researchApproved: 0,
    entriesCreated: 0, entriesUnchanged: 0, marketContextsAdded: 0, reviewItemsCreated: 0,
    skippedCollisions: [], wouldCreate: 0, wouldAddMarketContext: 0, wouldCreateReviewItems: 0,
  };
  const createdEntries = []; // entradas novas (em memória) para o passo de pesquisa
  const normTitle = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

  for (const lesson of lessons) {
    if (lesson.reviewStatus !== 'approved') { report.lessonsSkippedDraft++; continue; }
    report.lessonsApproved++;
    const slug = entrySlugForLesson(lesson.id);
    const existing = bySlug.get(slug);
    if (existing) {
      // Backfill compara por driveFileId+lessonId (a lição aprovada é única por slug).
      const fed = (existing.versions || []).some((v) => (v.contributions || []).some((c) => c.kind === 'drive' && c.driveFileId === lesson.driveFileId && c.lessonId === lesson.id));
      if (fed) { report.entriesUnchanged++; continue; }
      report.skippedCollisions.push(slug); // slug ocupado por outra lição: decisão do admin, não do backfill
      continue;
    }
    const entry = newEntryFromLesson(lesson, slug);
    createdEntries.push(entry);
    bySlug.set(slug, entry);
    if (apply) {
      mkdirSync(paths.entriesDir, { recursive: true });
      writeJsonAtomic(join(paths.entriesDir, `${slug}.json`), entry);
      try { addRegistryEntrySlug(paths.registryPath, lesson.driveFileId, slug); } catch { /* registro ausente: o gate 9 só cobra quando o registro existe */ }
      appendChangelog(paths.changelogPath, {
        entrySlug: slug, changeType: 'created', version: 1,
        source: { type: 'drive', driveFileId: lesson.driveFileId, lessonId: lesson.id },
        actor: 'kms-backfill', detail: `Entrada draft criada pelo backfill a partir da lição aprovada ${lesson.id}.`,
      });
      report.entriesCreated++;
    } else report.wouldCreate++;
  }

  // Passo de pesquisa (sobre entradas existentes + criadas nesta execução).
  const allEntries = [...existingEntries, ...createdEntries];
  const entryBySlugLive = new Map(allEntries.map((e) => [e.slug, e]));
  for (const doc of research) {
    if (doc.status !== 'approved') continue;
    report.researchApproved++;
    const seenSkills = new Set();
    const skills = ((doc.market && doc.market.skills) || []).filter((s) => {
      if (typeof s.sampleSize !== 'number') return false;
      const k = slugify(s.skill);
      if (seenSkills.has(k)) return false;
      seenSkills.add(k);
      return true;
    });
    for (const skill of skills) {
      const topic = slugify(skill.skill);
      const targets = allEntries.filter((e) => (e.topicIds || []).includes(topic));
      if (!targets.length) {
        if (apply) {
          writeReviewItem(paths, {
            kind: 'new-or-enrich',
            sourceRef: { kind: 'research', researchId: doc.id },
            candidates: [], confidence: 0,
          });
          report.reviewItemsCreated++;
        } else report.wouldCreateReviewItems++;
        continue;
      }
      for (const target of targets) {
        const already = (target.versions || []).some((v) =>
          (v.marketContext || []).some((m) => m.researchId === doc.id && m.skill === skill.skill) ||
          (v.contributions || []).some((c) => c.kind === 'research' && c.researchId === doc.id));
        if (already) continue;
        const ctx = { skill: skill.skill, sampleSize: skill.sampleSize, researchId: doc.id, collectedAt: doc.collectedAt };
        const contrib = { kind: 'research', researchId: doc.id, contributedAt: new Date().toISOString(), changeKind: 'market-context' };
        if (apply) {
          const live = entryBySlugLive.get(target.slug);
          const latest = live.versions[live.versions.length - 1];
          let next; let versionNum;
          if (latest.status === 'draft') {
            const versions = [...live.versions];
            versions[versions.length - 1] = {
              ...latest, contributions: [...latest.contributions, contrib],
              marketContext: [...(latest.marketContext || []), ctx],
            };
            next = { ...live, versions }; versionNum = latest.version;
          } else {
            const draft = newDraftVersion(live, {
              summary: latest.summary, keyExamples: latest.keyExamples,
              newContributions: [contrib], newMarketContext: [ctx],
            });
            next = { ...live, versions: [...live.versions, draft] }; versionNum = draft.version;
          }
          writeJsonAtomic(join(paths.entriesDir, `${target.slug}.json`), next);
          entryBySlugLive.set(target.slug, next);
          appendChangelog(paths.changelogPath, {
            entrySlug: target.slug, changeType: 'enriched', version: versionNum,
            source: { type: 'research', researchId: doc.id },
            actor: 'kms-backfill', detail: `marketContext acrescentado pelo backfill (skill ${skill.skill}, n=${skill.sampleSize}) a partir da pesquisa aprovada ${doc.id}.`,
          });
          report.marketContextsAdded++;
        } else report.wouldAddMarketContext++;
      }
    }
  }

  // Duplicatas aparentes entre entradas backfilladas => fila (nunca fusão silenciosa).
  if (apply) {
    const groups = new Map();
    for (const e of bySlug.values()) {
      const key = `${normTitle(e.title)}|${[...(e.topicIds || [])].sort().join(',')}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e.slug);
    }
    const existingQueue = existsSync(paths.reviewDir)
      ? loadQueueSlugs(paths)
      : new Set();
    for (const slugs of groups.values()) {
      if (slugs.length < 2) continue;
      const key = [...slugs].sort().join('|');
      if (existingQueue.has(key)) continue;
      const firstEntry = bySlug.get(slugs[0]);
      const firstDrive = (firstEntry.versions || []).flatMap((v) => v.contributions || []).find((c) => c.kind === 'drive');
      writeReviewItem(paths, {
        kind: 'ambiguous-match',
        sourceRef: firstDrive
          ? { kind: 'drive', driveFileId: firstDrive.driveFileId, lessonId: firstDrive.lessonId }
          : { kind: 'research', researchId: 'backfill-duplicate' },
        candidates: slugs.map((s) => ({ entrySlug: s, score: 100, matchReasons: ['titulo-igual', 'topicos-iguais'] })),
        confidence: 100,
      });
      report.reviewItemsCreated++;
    }
    // topics.json: entrySlugs por tópico (gerado, nunca editado à mão).
    if (existsSync(paths.topicsPath) || createdEntries.length) {
      let tdoc = { version: 1, topics: {} };
      if (existsSync(paths.topicsPath)) { try { tdoc = JSON.parse(readFileSync(paths.topicsPath, 'utf8')); } catch { /* mantém default */ } }
      if (!tdoc.topics || Array.isArray(tdoc.topics)) tdoc.topics = {};
      for (const e of bySlug.values()) {
        for (const t of e.topicIds || []) {
          if (!tdoc.topics[t] || typeof tdoc.topics[t] !== 'object') tdoc.topics[t] = {};
          if (!Array.isArray(tdoc.topics[t].entrySlugs)) tdoc.topics[t].entrySlugs = [];
          if (!tdoc.topics[t].entrySlugs.includes(e.slug)) tdoc.topics[t].entrySlugs.push(e.slug);
        }
      }
      writeJsonAtomic(paths.topicsPath, tdoc);
    }
  }
  return report;
}

/** Chaves (slugs ordenados) dos grupos já cobertos por itens da fila. */
function loadQueueSlugs(paths) {
  const out = new Set();
  if (!existsSync(paths.reviewDir)) return out;
  for (const f of readdirSync(paths.reviewDir).filter((x) => x.endsWith('.json'))) {
    try {
      const item = JSON.parse(readFileSync(join(paths.reviewDir, f), 'utf8'));
      const slugs = (item.candidates || []).map((c) => c.entrySlug).sort();
      if (slugs.length >= 2) out.add(slugs.join('|'));
    } catch { /* item inválido: o validador reprova */ }
  }
  return out;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(new URL(import.meta.url)));
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log([
      'Uso: node scripts/kms-backfill.mjs [--content dir] [--apply]',
      'Sem --apply, o default é --dry-run: lista o que criaria sem escrever nada.',
    ].join('\n'));
    process.exit(0);
  }
  const get = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
  const contentDir = resolve(get('--content') || join(fileURLToPath(new URL('..', import.meta.url)), 'content'));
  try {
    const apply = args.includes('--apply');
    const report = runBackfill(contentDir, { apply });
    console.log(`kms-backfill ${apply ? '--apply' : '--dry-run'}: lições-aprovadas=${report.lessonsApproved} lições-draft-ignoradas=${report.lessonsSkippedDraft} pesquisas-aprovadas=${report.researchApproved} entradas-criadas=${report.entriesCreated} entradas-inalteradas=${report.entriesUnchanged} marketContext=${report.marketContextsAdded} fila=${report.reviewItemsCreated} colisões-ignoradas=${report.skippedCollisions.length}`);
    if (!apply) console.log(`  (dry-run: criaria ${report.wouldCreate} entrada(s), ${report.wouldAddMarketContext} marketContext(s), ${report.wouldCreateReviewItems} item(ns) de fila — nada escrito)`);
    if (report.skippedCollisions.length) for (const s of report.skippedCollisions) console.log(`  colisão de slug ignorada (decisão do admin): ${s}`);
    if (apply) {
      const { failures } = validateKnowledge(contentDir);
      const fails = failures.filter((f) => !f.startsWith('__HASH_MISMATCH__'));
      if (fails.length) { console.log(`kms-backfill: validação reprovou após a escrita:\n${fails.join('\n')}`); process.exit(1); }
      console.log('kms-backfill: validação pós-escrita APROVADA');
    }
  } catch (err) { console.error(`kms-backfill: FALHOU: ${err.message}`); process.exit(1); }
}
