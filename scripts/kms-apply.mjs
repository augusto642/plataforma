#!/usr/bin/env node
/**
 * KMS apply (DESIGN §13.3/§13.4) — aplica decisões do admin aos ARQUIVOS.
 *   node scripts/kms-apply.mjs --approve <slug> --version <n> [--actor admin:<id>] [--content dir]
 *   node scripts/kms-apply.mjs --review <reviewId> [--action enrich|create|supersede|dismiss] [--target <slug>] [--reason ...] [--supersede-reason outdated|corrected|merged] [--actor ...] [--content dir]
 *   node scripts/kms-apply.mjs --deprecate <slug> --reason ... [--content dir]
 *   node scripts/kms-apply.mjs --merge-entry <loserSlug> --into <winnerSlug> --reason ... [--content dir]
 *   node scripts/kms-apply.mjs --sync-db [--content dir]
 *     Aplica aos arquivos as decisões registradas NO BANCO pela API (§13.4,
 *     V1): versões active no espelho cuja versão no arquivo segue draft são
 *     ativadas; entradas superseded/deprecated no espelho sincronizam o
 *     status; itens da fila resolved no banco e open no arquivo são
 *     materializados. Exige DATABASE_URL + tabelas KMS (fail-closed sem
 *     elas). Após o sync, re-importe para o espelho refletir o changelog
 *     novo do arquivo.
 *
 * Semântica de sincronização (G4/G6):
 * - a rota POST /admin/knowledge/review-queue/:id/resolve REGISTRA a decisão no item
 *   da fila, sem tocar em entradas; até o kms-apply materializá-la, o relatório de
 *   evolução a mostra como `pending-sync` (nunca como aplicada);
 * - o kms-apply, ao materializar, registra no changelog um item `review-resolved`
 *   com source { type: 'admin-decision', decisionId: <reviewId> } — é esse item que
 *   tira a decisão da lista pending-sync;
 * - sem banco, o kms-apply NÃO recusa por isso: o arquivo é a fonte canônica e o
 *   banco é o espelho (importador). O que ele recusa, fail-closed, é decisão sem
 *   ação, supersessão sem motivo enumerado e aprovação de versão que não é draft.
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  appendChangelog, kmsPaths, loadEntries, loadLessons, loadResearch, newDraftVersion,
  newEntryFromLesson, sha256Text, writeJsonAtomic,
} from './kms-lib.mjs';

function loadEntry(paths, slug) {
  const found = loadEntries(paths.entriesDir).find(({ entry }) => entry.slug === slug);
  if (!found) throw new Error(`entrada não encontrada: ${slug}`);
  return found;
}

function loadReview(paths, id) {
  const p = join(paths.reviewDir, `${id}.json`);
  if (!existsSync(p)) throw new Error(`item da fila não encontrado: ${id}`);
  return { path: p, item: JSON.parse(readFileSync(p, 'utf8')) };
}

export function approveVersion(paths, slug, versionNum, actor) {
  const { entry, path } = loadEntry(paths, slug);
  const version = entry.versions.find((v) => v.version === versionNum);
  if (!version) throw new Error(`versão ${versionNum} inexistente na entrada ${slug}`);
  if (version.status !== 'draft') throw new Error(`só draft pode ser aprovada (versão ${versionNum} está ${version.status})`);
  const now = new Date().toISOString();
  const prevActive = entry.versions.find((v) => v.status === 'active');
  // D1 (laudo QA2, ALTO): a versão ATIVADA nunca carrega campo de
  // supersessão — o motivo da proposta vive na versão superada + changelog
  // (é o que o gate 7 exige). O motivo é capturado ANTES de zerar, para a
  // versão anterior recebê-lo; sem isso, draft com supersedeReason (forma
  // exata de uma decisão `supersede`) → approve → validador REPROVA a
  // árvore e o importador trava antes de qualquer escrita.
  const proposalReason = version.supersedeReason || 'enriched';
  const versions = entry.versions.map((v) => {
    if (v.version === versionNum) {
      return { ...v, status: 'active', supersededBy: null, supersededAt: null, supersedeReason: null };
    }
    if (prevActive && v.version === prevActive.version) {
      return { ...v, status: 'superseded', supersededBy: versionNum, supersededAt: now, supersedeReason: proposalReason };
    }
    return v;
  });
  const next = { ...entry, status: 'active', currentVersion: versionNum, versions };
  writeJsonAtomic(path, next);
  if (prevActive) {
    appendChangelog(paths.changelogPath, {
      entrySlug: slug, changeType: 'superseded', version: prevActive.version,
      source: { type: 'admin-decision', decisionId: `approve:${slug}:${versionNum}` },
      actor, detail: `Versão ${prevActive.version} superada pela aprovação da v${versionNum} (motivo: ${proposalReason}).`,
    });
  }
  appendChangelog(paths.changelogPath, {
    entrySlug: slug, changeType: 'enriched', version: versionNum,
    source: { type: 'admin-decision', decisionId: `approve:${slug}:${versionNum}` },
    actor, detail: `Versão ${versionNum} aprovada e ativada.`,
  });
  return { slug, version: versionNum, approvedBy: actor, approvedAt: now, previousActive: prevActive?.version ?? null };
}

export function applyReview(paths, reviewId, { action, targetEntrySlug, reason, supersedeReason, actor }) {
  const review = loadReview(paths, reviewId);
  const decision = action
    ? { action, targetEntrySlug: targetEntrySlug || null, reason }
    : review.item.decision;
  if (!decision || !decision.action) throw new Error(`item ${reviewId} sem decisão: informe --action ou resolva-o antes pela rota admin`);
  if (!decision.reason && !reason) throw new Error(`decisão sem motivo (reason obrigatório)`);
  const finalDecision = { action: decision.action, targetEntrySlug: targetEntrySlug || decision.targetEntrySlug || null, reason: reason || decision.reason };
  if (finalDecision.action === 'supersede' && !supersedeReason && !decision.supersedeReason) {
    throw new Error('supersessão exige --supersede-reason (outdated|corrected|merged)');
  }
  const finalSupersede = supersedeReason || decision.supersedeReason || null;

  let materialized = null;
  if (finalDecision.action !== 'dismiss') {
    const ref = review.item.sourceRef || {};
    if (ref.kind === 'research' && finalDecision.action === 'create') {
      throw new Error('pesquisa aprovada nunca cria entrada própria (Q11): use enrich (marketContext) ou dismiss');
    }
    let source;
    if (ref.kind === 'drive') {
      const lesson = loadLessons(paths.lessonsDir).find((l) => l.id === ref.lessonId || l.driveFileId === ref.driveFileId);
      if (!lesson) throw new Error(`lição da fila não encontrada: ${ref.lessonId || ref.driveFileId}`);
      source = { kind: 'lesson', lesson };
    } else if (ref.kind === 'research') {
      const research = loadResearch(paths.researchDir).find((r) => r.id === ref.researchId);
      if (!research) throw new Error(`pesquisa da fila não encontrada: ${ref.researchId}`);
      source = { kind: 'research', research };
    } else throw new Error(`sourceRef da fila sem kind válido: ${ref.kind}`);
    // Decisão do admin sobrepõe o scoring: materializa direto no alvo.
    materialized = materializeDecision(paths, source, finalDecision, finalSupersede);
  }
  const saved = { ...review.item, decision: finalDecision, status: 'resolved', resolvedBy: actor, resolvedAt: new Date().toISOString() };
  writeJsonAtomic(review.path, saved);
  appendChangelog(paths.changelogPath, {
    entrySlug: finalDecision.targetEntrySlug || materialized?.entrySlug || review.item.candidates?.[0]?.entrySlug || 'unknown',
    changeType: 'review-resolved', version: materialized?.version ?? null,
    source: { type: 'admin-decision', decisionId: reviewId },
    actor, detail: `Fila ${reviewId} resolvida: ${finalDecision.action}${finalDecision.targetEntrySlug ? ` → ${finalDecision.targetEntrySlug}` : ''} (${finalDecision.reason}).`,
  });
  return { reviewId, decision: finalDecision, materialized };
}

function materializeDecision(paths, source, decision, supersedeReason) {
  if (decision.action === 'create') {
    if (source.kind !== 'lesson') throw new Error('create só a partir de lição');
    const slug = source.lesson.id.replace(/\//g, '-').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (loadEntries(paths.entriesDir).some(({ entry }) => entry.slug === slug)) throw new Error(`entrada ${slug} já existe — create recusado (use enrich ou funda via merge-entry)`);
    const entry = newEntryFromLesson(source.lesson, slug);
    mkdirSync(paths.entriesDir, { recursive: true });
    writeJsonAtomic(join(paths.entriesDir, `${slug}.json`), entry);
    appendChangelog(paths.changelogPath, {
      entrySlug: slug, changeType: 'created', version: 1,
      source: { type: 'drive', driveFileId: source.lesson.driveFileId, lessonId: source.lesson.id },
      actor: 'kms-apply', detail: `Entrada draft criada por decisão do admin (fila) a partir da lição ${source.lesson.id}.`,
    });
    return { entrySlug: slug, version: 1 };
  }
  if (decision.action === 'enrich' || decision.action === 'supersede') {
    const targetSlug = decision.targetEntrySlug;
    if (!targetSlug) throw new Error(`${decision.action} exige targetEntrySlug`);
    const { entry } = loadEntry(paths, targetSlug);
    const now = new Date().toISOString();
    if (source.kind === 'lesson') {
      const contrib = {
        kind: 'drive', driveFileId: source.lesson.driveFileId, lessonId: source.lesson.id,
        contributedAt: now, changeKind: decision.action === 'supersede' ? (supersedeReason === 'corrected' ? 'corrected' : 'superseding') : 'enriched',
        summaryHash: sha256Text(source.lesson.summary || ''),
      };
      const draft = newDraftVersion(entry, {
        summary: source.lesson.summary, keyExamples: source.lesson.keyExamples,
        newContributions: [contrib], newMarketContext: [],
        supersedeReason: decision.action === 'supersede' ? supersedeReason : null,
      });
      const next = { ...entry, versions: [...entry.versions, draft] };
      writeJsonAtomic(join(paths.entriesDir, `${entry.slug}.json`), next);
      appendChangelog(paths.changelogPath, {
        entrySlug: entry.slug, changeType: 'enriched', version: draft.version,
        source: { type: 'drive', driveFileId: source.lesson.driveFileId, lessonId: source.lesson.id },
        actor: 'kms-apply', detail: `Versão draft ${draft.version} criada por decisão do admin (${decision.action}).`,
      });
      return { entrySlug: entry.slug, version: draft.version };
    }
    // research enrich/supersede: marketContext sobre a versão draft nova (ou draft existente).
    const research = source.research;
    const skills = ((research.market && research.market.skills) || []).filter((s) => typeof s.sampleSize === 'number');
    const marketContext = skills.map((s) => ({ skill: s.skill, sampleSize: s.sampleSize, researchId: research.id, collectedAt: research.collectedAt }));
    const contrib = { kind: 'research', researchId: research.id, contributedAt: now, changeKind: 'market-context' };
    const latest = entry.versions[entry.versions.length - 1];
    let next; let versionNum;
    if (latest.status === 'draft') {
      const versions = [...entry.versions];
      versions[versions.length - 1] = {
        ...latest, contributions: [...latest.contributions, contrib],
        marketContext: [...(latest.marketContext || []), ...marketContext],
        supersedeReason: decision.action === 'supersede' ? supersedeReason : latest.supersedeReason,
      };
      next = { ...entry, versions }; versionNum = latest.version;
    } else {
      const draft = newDraftVersion(entry, {
        summary: latest.summary, keyExamples: latest.keyExamples, newContributions: [contrib], newMarketContext: marketContext,
        supersedeReason: decision.action === 'supersede' ? supersedeReason : null,
      });
      next = { ...entry, versions: [...entry.versions, draft] }; versionNum = draft.version;
    }
    writeJsonAtomic(join(paths.entriesDir, `${entry.slug}.json`), next);
    appendChangelog(paths.changelogPath, {
      entrySlug: entry.slug, changeType: 'enriched', version: versionNum,
      source: { type: 'research', researchId: research.id },
      actor: 'kms-apply', detail: `marketContext acrescentado por decisão do admin (${decision.action}) a partir da pesquisa ${research.id}.`,
    });
    return { entrySlug: entry.slug, version: versionNum };
  }
  throw new Error(`ação desconhecida: ${decision.action}`);
}

/**
 * Aplica decisões do banco aos arquivos (§13.4, V1). `prisma` é o cliente
 * Prisma (qualquer objeto com knowledgeEntry/knowledgeReviewItem +
 * $queryRawUnsafe — o CLI constrói o real; testes podem injetar um falso).
 */
export async function syncFromDb(paths, prisma) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public.knowledge_entries')::text AS entries, to_regclass('public.knowledge_entry_versions')::text AS versions, to_regclass('public.knowledge_review_items')::text AS review`,
  );
  const row = rows[0] || {};
  if (!row.entries || !row.versions || !row.review) {
    throw new Error('tabelas KMS ausentes no banco (migration só-arquivo, §5.4) — sync-db recusado');
  }
  const report = { versionsActivated: [], entriesSynced: [], reviewsApplied: [], skipped: [], errors: [] };
  const dbEntries = await prisma.knowledgeEntry.findMany({ include: { versions: true } });
  for (const de of dbEntries) {
    const filePath = join(paths.entriesDir, `${de.slug}.json`);
    if (!existsSync(filePath)) { report.skipped.push(`entrada ${de.slug}: sem arquivo no checkout`); continue; }
    if ((de.status === 'superseded' || de.status === 'deprecated')) {
      const entry = JSON.parse(readFileSync(filePath, 'utf8'));
      if (entry.status !== de.status) {
        entry.status = de.status; entry.currentVersion = 0;
        entry.supersededByEntry = de.supersededByEntry ?? entry.supersededByEntry ?? null;
        entry.supersededAt = de.supersededAt ? new Date(de.supersededAt).toISOString() : entry.supersededAt;
        entry.supersedeReason = de.supersedeReason ?? entry.supersedeReason ?? null;
        writeJsonAtomic(filePath, entry);
        appendChangelog(paths.changelogPath, {
          entrySlug: de.slug, changeType: de.status === 'superseded' ? 'merged' : 'deprecated', version: null,
          source: { type: 'admin-decision', decisionId: `sync-db:${de.slug}` },
          actor: 'kms-apply', detail: `Status da entrada sincronizado do banco: ${de.status}.`,
        });
        report.entriesSynced.push(de.slug);
      }
      continue;
    }
    for (const dv of (de.versions || [])) {
      if (dv.status !== 'active') continue;
      const entry = JSON.parse(readFileSync(filePath, 'utf8'));
      const fv = (entry.versions || []).find((v) => v.version === dv.version);
      if (!fv) { report.skipped.push(`entrada ${de.slug} v${dv.version}: sem versão no arquivo`); continue; }
      if (fv.status === 'draft') {
        approveVersion(paths, de.slug, dv.version, 'kms-apply');
        report.versionsActivated.push(`${de.slug} v${dv.version}`);
      }
    }
  }
  const dbItems = await prisma.knowledgeReviewItem.findMany();
  for (const item of dbItems) {
    if (item.status !== 'resolved' || !item.decision) continue;
    const filePath = join(paths.reviewDir, `${item.stableId}.json`);
    if (!existsSync(filePath)) { report.skipped.push(`review ${item.stableId}: sem item no arquivo`); continue; }
    const fileItem = JSON.parse(readFileSync(filePath, 'utf8'));
    if (fileItem.status === 'resolved') continue;
    try {
      applyReview(paths, item.stableId, {
        action: item.decision.action, targetEntrySlug: item.decision.targetEntrySlug,
        reason: item.decision.reason, supersedeReason: item.decision.supersedeReason || null,
        actor: item.resolvedBy ? `admin:${item.resolvedBy}` : 'kms-apply',
      });
      report.reviewsApplied.push(item.stableId);
    } catch (err) {
      report.errors.push(`review ${item.stableId}: ${err.message}`);
    }
  }
  return report;
}

/**
 * Aplica decisões de pesquisa do banco aos arquivos (V2 completo, §13.4
 * espelhado para pesquisa): linhas knowledge_research com decisão
 * (approved/rejected, ou draft coletado sem checkout) viram arquivos
 * research/<id>.json a partir do payload + colunas. Depois, re-importe
 * (o importador nunca sobrescreve linhas research existentes, então a
 * decisão do banco não é desfeita pelo re-import).
 */
export async function syncResearchFromDb(paths, prisma) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public.knowledge_research')::text AS research`,
  );
  const row = rows[0] || {};
  if (!row.research) {
    throw new Error('tabela knowledge_research ausente no banco (migration só-arquivo, §5.4) — sync-research recusado');
  }
  const report = { applied: [], skipped: [] };
  const dbRows = await prisma.knowledgeResearch.findMany();
  for (const r of dbRows) {
    const payload = r.payload || {};
    const doc = {
      ...payload,
      id: r.stableId,
      goal: r.goal,
      status: r.status,
      approvedBy: r.approvedBy ?? payload.approvedBy ?? null,
      approvedAt: r.approvedAt ? new Date(r.approvedAt).toISOString() : payload.approvedAt ?? null,
      collectedAt: r.collectedAt ? new Date(r.collectedAt).toISOString() : payload.collectedAt,
    };
    delete doc.sync;
    const filePath = join(paths.researchDir, `${r.stableId}.json`);
    if (existsSync(filePath)) {
      const fileDoc = JSON.parse(readFileSync(filePath, 'utf8'));
      if (fileDoc.status === doc.status && fileDoc.approvedBy === doc.approvedBy && fileDoc.approvedAt === doc.approvedAt) {
        report.skipped.push(`${r.stableId} (já sincronizado)`);
        continue;
      }
    }
    mkdirSync(paths.researchDir, { recursive: true });
    writeJsonAtomic(filePath, doc);
    report.applied.push(`${r.stableId} → ${doc.status}`);
  }
  return report;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(new URL(import.meta.url)));
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log([
      'Uso: node scripts/kms-apply.mjs --approve <slug> --version <n> [--actor admin:<id>] [--content dir]',
      '     node scripts/kms-apply.mjs --review <id> [--action enrich|create|supersede|dismiss] [--target <slug>] [--reason ...] [--supersede-reason outdated|corrected|merged]',
      '     node scripts/kms-apply.mjs --deprecate <slug> --reason ...',
      '     node scripts/kms-apply.mjs --merge-entry <slug> --into <slug> --reason ...',
      '     node scripts/kms-apply.mjs --sync-db [--content dir]  (aplica decisões do banco aos arquivos; depois re-importe)',
      '     node scripts/kms-apply.mjs --sync-research [--content dir]  (V2: decisões de pesquisa do banco → arquivos)',
      'A API nunca escreve o arquivo: a decisão vive no banco (pending-sync) e o kms-apply a materializa.',
    ].join('\n'));
    process.exit(0);
  }
  const get = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
  const contentDir = resolve(get('--content') || join(fileURLToPath(new URL('..', import.meta.url)), 'content'));
  const paths = kmsPaths(contentDir);
  const actor = get('--actor') || 'kms-apply';
  try {
    if (args.includes('--sync-research')) {
      const { createRequire } = await import('node:module');
      const apiRequire = createRequire(new URL('../apps/api/package.json', import.meta.url));
      try { apiRequire('dotenv').config(); } catch { /* dotenv opcional */ }
      if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ausente — sync-research exige banco configurado');
      const { PrismaClient } = apiRequire('@prisma/client');
      const { PrismaPg } = apiRequire('@prisma/adapter-pg');
      const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
      try {
        const report = await syncResearchFromDb(paths, prisma);
        console.log(`kms-apply --sync-research: aplicadas=${report.applied.length} ignoradas=${report.skipped.length}`);
        for (const s of report.applied) console.log(`  aplicada: ${s}`);
        for (const s of report.skipped) console.log(`  ignorada: ${s}`);
        console.log('  lembrete: re-importe (research) para o espelho refletir os arquivos sincronizados');
      } finally { await prisma.$disconnect(); }
    } else if (args.includes('--sync-db')) {
      const { createRequire } = await import('node:module');
      const apiRequire = createRequire(new URL('../apps/api/package.json', import.meta.url));
      try { apiRequire('dotenv').config(); } catch { /* dotenv opcional */ }
      if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ausente — sync-db exige banco configurado');
      const { PrismaClient } = apiRequire('@prisma/client');
      const { PrismaPg } = apiRequire('@prisma/adapter-pg');
      const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
      try {
        const report = await syncFromDb(paths, prisma);
        console.log(`kms-apply --sync-db: versões-ativadas=${report.versionsActivated.length} entradas-sincronizadas=${report.entriesSynced.length} filas-aplicadas=${report.reviewsApplied.length} ignoradas=${report.skipped.length} erros=${report.errors.length}`);
        for (const s of report.skipped) console.log(`  ignorado: ${s}`);
        for (const e of report.errors) console.log(`  erro: ${e}`);
        if (report.errors.length) process.exit(1);
        console.log('  lembrete: re-importe (kms/changelog/review-queue) para o espelho refletir o changelog novo do arquivo');
      } finally { await prisma.$disconnect(); }
    } else if (get('--approve')) {
      const version = Number(get('--version'));
      if (!version) throw new Error('--approve exige --version <n>');
      const out = approveVersion(paths, get('--approve'), version, actor);
      console.log(`kms-apply: aprovada ${out.slug} v${out.version}${out.previousActive ? ` (v${out.previousActive} superada)` : ''}`);
    } else if (get('--review')) {
      const supersedeReason = get('--supersede-reason');
      if (supersedeReason && !['outdated', 'corrected', 'merged'].includes(supersedeReason)) throw new Error(`--supersede-reason inválido: ${supersedeReason}`);
      const out = applyReview(paths, get('--review'), {
        action: get('--action'), targetEntrySlug: get('--target'), reason: get('--reason'),
        supersedeReason, actor,
      });
      console.log(`kms-apply: fila ${out.reviewId} resolvida (${out.decision.action})${out.materialized ? ` → ${out.materialized.entrySlug} v${out.materialized.version}` : ' (dismiss, sem escrita em entrada)'}`);
    } else if (get('--deprecate')) {
      const reason = get('--reason');
      if (!reason) throw new Error('--deprecate exige --reason');
      const { entry, path } = loadEntry(paths, get('--deprecate'));
      const next = { ...entry, status: 'deprecated', currentVersion: 0, supersedeReason: reason, supersededAt: new Date().toISOString() };
      writeJsonAtomic(path, next);
      appendChangelog(paths.changelogPath, {
        entrySlug: entry.slug, changeType: 'deprecated', version: null,
        source: { type: 'admin-decision', decisionId: `deprecate:${entry.slug}` },
        actor, detail: `Entrada deprecada: ${reason}.`,
      });
      console.log(`kms-apply: entrada ${entry.slug} deprecada`);
    } else if (get('--merge-entry')) {
      const loserSlug = get('--merge-entry'); const winnerSlug = get('--into'); const reason = get('--reason');
      if (!winnerSlug || !reason) throw new Error('--merge-entry exige --into <slug> e --reason');
      const { entry, path } = loadEntry(paths, loserSlug);
      loadEntry(paths, winnerSlug); // vencedora tem que existir
      const next = { ...entry, status: 'superseded', currentVersion: 0, supersededByEntry: winnerSlug, supersededAt: new Date().toISOString(), supersedeReason: reason };
      writeJsonAtomic(path, next);
      appendChangelog(paths.changelogPath, {
        entrySlug: loserSlug, changeType: 'merged', version: null,
        source: { type: 'admin-decision', decisionId: `merge-entry:${loserSlug}` },
        actor, detail: `Entrada fundida em '${winnerSlug}': ${reason}.`,
      });
      console.log(`kms-apply: entrada ${loserSlug} fundida em ${winnerSlug}`);
    } else {
      throw new Error('uso: kms-apply.mjs --approve <slug> --version <n> | --review <id> [--action ...] | --deprecate <slug> --reason ... | --merge-entry <slug> --into <slug> --reason ... | --sync-db');
    }
  } catch (err) { console.error(`kms-apply: FALHOU: ${err.message}`); process.exit(1); }
}
