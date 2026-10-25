#!/usr/bin/env node
/**
 * Importação do sistema de conhecimento para o banco (DESIGN §5, decisão D7).
 * CLI EXPLÍCITO do operador — nunca chamado por seed, deploy, postinstall ou boot da API.
 *
 *   node scripts/import-knowledge.mjs --source content/knowledge [--dry-run] [--check]
 *     [--only lessons|registry|research|tracks|kms|changelog|review-queue] [--limit N]
 *     [--help]
 * --help: imprime o uso e sai 0, sem validar conteúdo nem tocar no banco.
 *
 * --dry-run: valida tudo, não escreve nada (funciona SEM banco).
 * --check: só pré-condições (tabelas existem? JSON válido? registry consistente?) — sai ≠0
 *   com mensagem explícita se as tabelas de conhecimento estiverem ausentes (a migration
 *   fica SÓ como arquivo até ordem do Augusto; db push em produção é proibido aqui).
 * Upsert por id estável (stableId/slug); conteúdo igual => unchanged, sem tocar updatedAt.
 * Nunca apaga dados do banco ausentes no repo: lista-os como orphaned.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { validateKnowledge } from './validate-knowledge.mjs';

const apiRequire = createRequire(new URL('../apps/api/package.json', import.meta.url));
try { apiRequire('dotenv').config(); } catch { /* dotenv opcional */ }

function hashJson(obj) {
  // Stringify CANÔNICO (chaves ordenadas, recursivo): o Postgres JSONB
  // reordena as chaves dos objetos ao gravar, então comparar por
  // JSON.stringify direto marcaria como "divergente" uma versão idêntica —
  // foi o que o importador 2× real flagrou (versão imutável falsa).
  // Arrays mantêm a ordem (ordem é dado); Date vira ISO.
  const stable = (v) => {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (v instanceof Date) return JSON.stringify(v.toISOString());
    if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`;
  };
  return `sha256:${createHash('sha256').update(stable(obj)).digest('hex')}`;
}
function walkLessons(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkLessons(p, out);
    else if (e.name.endsWith('.json')) out.push(JSON.parse(readFileSync(p, 'utf8')));
  }
  return out;
}

export async function planImport(sourceDir, { only = null, limit = null } = {}) {
  const contentDir = resolve(sourceDir, '..');
  const { failures } = validateKnowledge(contentDir);
  if (failures.filter((f) => !f.startsWith('__HASH_MISMATCH__')).length) {
    throw new Error(`validação reprovou o conteúdo:\n${failures.join('\n')}`);
  }
  const lessons = (only === null || only === 'lessons') ? walkLessons(join(sourceDir, 'lessons')) : [];
  const researchDir = join(sourceDir, 'research');
  const research = (only === null || only === 'research') && existsSync(researchDir)
    ? readdirSync(researchDir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(researchDir, f), 'utf8')))
    : [];
  const registry = (only === null || only === 'registry') && existsSync(join(sourceDir, 'extraction-registry.json'))
    ? JSON.parse(readFileSync(join(sourceDir, 'extraction-registry.json'), 'utf8')) : null;
  const entriesDir = join(sourceDir, 'entries');
  const kmsEntries = (only === null || only === 'kms') && existsSync(entriesDir)
    ? readdirSync(entriesDir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(entriesDir, f), 'utf8')))
    : [];
  const changelogPath = join(sourceDir, 'changelog.json');
  const changelogItems = (only === null || only === 'changelog') && existsSync(changelogPath)
    ? (JSON.parse(readFileSync(changelogPath, 'utf8')).entries || []) : [];
  const reviewDir = join(sourceDir, 'review-queue');
  const reviewItems = (only === null || only === 'review-queue') && existsSync(reviewDir)
    ? readdirSync(reviewDir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(reviewDir, f), 'utf8')))
    : [];
  const capped = (arr) => (limit ? arr.slice(0, limit) : arr);
  return {
    lessons: capped(lessons), research: capped(research), registryRecords: registry ? capped(registry.records || []) : [],
    kmsEntries: capped(kmsEntries), changelogItems: capped(changelogItems), reviewItems: capped(reviewItems),
  };
}

async function checkTables(prisma, only = null) {
  const wanted = { sources: 'knowledge_sources', lessons: 'knowledge_lessons', research: 'knowledge_research' };
  if (only === null || only === 'kms') { wanted.entries = 'knowledge_entries'; wanted.versions = 'knowledge_entry_versions'; }
  if (only === null || only === 'changelog') wanted.changelog = 'knowledge_changelog';
  if (only === null || only === 'review-queue') wanted.review = 'knowledge_review_items';
  const selects = Object.entries(wanted).map(([k, t]) => `to_regclass('public.${t}')::text AS ${k}`).join(', ');
  const rows = await prisma.$queryRawUnsafe(`SELECT ${selects}`);
  const row = rows[0] || {};
  const missing = Object.entries(row).filter(([, v]) => !v).map(([k]) => k);
  return missing;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const args = process.argv.slice(2);
  // --help sai 0 ANTES de qualquer validação ou sonda ao banco (B2).
  if (args.includes('--help') || args.includes('-h')) {
    console.log([
      'Uso: node scripts/import-knowledge.mjs --source content/knowledge [--dry-run] [--check]',
      '       [--only lessons|registry|research|tracks|kms|changelog|review-queue] [--limit N]',
      '  --dry-run   valida tudo, não escreve nada (funciona SEM banco)',
      '  --check     só pré-condições (tabelas existem? JSON válido?)',
      '  --only X    importa só uma parte; kms = entradas+versões, changelog = itens do',
      '              changelog (upsert por seq), review-queue = itens da fila (decisão',
      '              resolved no banco NUNCA é sobrescrita por re-importação)',
      '  --limit N   importa no máximo N registros por parte',
      'Sem flags: importação real (exige DATABASE_URL e tabelas; CLI explícito do operador).',
    ].join('\n'));
    process.exit(0);
  }
  const get = (flag, dflt) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : dflt; };
  const dryRun = args.includes('--dry-run');
  const check = args.includes('--check');
  const only = get('--only', null);
  const limit = get('--limit', null) ? Number(get('--limit', null)) : null;
  const sourceDir = resolve(get('--source', 'content/knowledge'));
  try {
    const plan = await planImport(sourceDir, { only, limit });
    if (dryRun || check) {
      console.log(`import-knowledge ${check ? '--check' : '--dry-run'}: lições=${plan.lessons.length} pesquisas=${plan.research.length} registros=${plan.registryRecords.length} entradas-kms=${plan.kmsEntries.length} changelog=${plan.changelogItems.length} fila=${plan.reviewItems.length}${check ? '' : ' (nada escrito)'}`);
      if (check) {
        // --check sonda o banco; sem DATABASE_URL, falha explicitamente (não finge ok).
        if (!process.env.DATABASE_URL) { console.error('import-knowledge --check: DATABASE_URL ausente — não é possível sondar as tabelas'); process.exit(2); }
        const { PrismaClient } = apiRequire('@prisma/client');
        const { PrismaPg } = apiRequire('@prisma/adapter-pg');
        const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
        try {
          const missing = await checkTables(prisma, only);
          if (missing.length) {
            console.error(`import-knowledge --check: tabelas de conhecimento ausentes (${missing.join(', ')}); rode --dry-run para validar o conteúdo; a aplicação da migration depende de ordem do Augusto`);
            process.exit(2);
          }
          console.log('import-knowledge --check: OK (tabelas presentes, conteúdo válido)');
        } finally { await prisma.$disconnect(); }
      }
      process.exit(0);
    }
    // Importação real — exige tabelas (fail-closed) e cliente Prisma regenerado.
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ausente — importação real exige banco configurado');
    const { PrismaClient } = apiRequire('@prisma/client');
    const { PrismaPg } = apiRequire('@prisma/adapter-pg');
    const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const missing = await checkTables(prisma, only);
      if (missing.length) throw new Error(`tabelas de conhecimento ausentes (${missing.join(', ')}); a migration está só como arquivo — importação real bloqueada até ordem do Augusto`);
      const report = { inserted: 0, updated: 0, unchanged: 0, orphaned: 0, resolvedPreserved: 0, divergences: [], errors: [] };
      await prisma.$transaction(async (tx) => {
        for (const lesson of plan.lessons) {
          const source = await tx.knowledgeSource.upsert({
            where: { slug: lesson.courseSlug },
            update: { name: lesson.courseName },
            create: { slug: lesson.courseSlug, name: lesson.courseName, kind: lesson.source?.type || 'drive-course' },
          });
          const existing = await tx.knowledgeLesson.findUnique({ where: { stableId: lesson.id } });
          const payload = {
            sourceId: source.id, driveFileId: lesson.driveFileId, title: lesson.lessonTitle,
            summary: lesson.summary, topics: lesson.topics, prerequisites: lesson.prerequisites || [],
            difficulty: lesson.difficulty, reviewStatus: lesson.reviewStatus,
            extractedAt: new Date(lesson.extractedAt), extractorVersion: lesson.extractorVersion,
          };
          if (!existing) {
            await tx.knowledgeLesson.create({ data: { stableId: lesson.id, ...payload } });
            report.inserted++;
          } else if (hashJson(payload) !== hashJson({ sourceId: existing.sourceId, driveFileId: existing.driveFileId, title: existing.title, summary: existing.summary, topics: existing.topics, prerequisites: existing.prerequisites, difficulty: existing.difficulty, reviewStatus: existing.reviewStatus, extractedAt: existing.extractedAt, extractorVersion: existing.extractorVersion })) {
            await tx.knowledgeLesson.update({ where: { stableId: lesson.id }, data: payload });
            report.updated++;
          } else report.unchanged++;
        }
        for (const doc of plan.research) {
          const existing = await tx.knowledgeResearch.findUnique({ where: { stableId: doc.id } });
          if (!existing) {
            await tx.knowledgeResearch.create({ data: { stableId: doc.id, goal: doc.goal, status: doc.status, payload: doc, approvedBy: doc.approvedBy || null, approvedAt: doc.approvedAt ? new Date(doc.approvedAt) : null, collectedAt: new Date(doc.collectedAt) } });
            report.inserted++;
          } else report.unchanged++;
        }
        // ── KMS (§13): entradas + versões (versão nunca sobrescrita) ──
        for (const entry of plan.kmsEntries) {
          const entryPayload = {
            title: entry.title, topicIds: entry.topicIds || [], status: entry.status,
            currentVersion: entry.currentVersion ?? 0, supersededByEntry: entry.supersededByEntry || null,
            supersededAt: entry.supersededAt ? new Date(entry.supersededAt) : null, supersedeReason: entry.supersedeReason || null,
          };
          let dbEntry = await tx.knowledgeEntry.findUnique({ where: { slug: entry.slug } });
          if (!dbEntry) {
            dbEntry = await tx.knowledgeEntry.create({ data: { slug: entry.slug, ...entryPayload } });
            report.inserted++;
          } else if (hashJson(entryPayload) !== hashJson({ title: dbEntry.title, topicIds: dbEntry.topicIds, status: dbEntry.status, currentVersion: dbEntry.currentVersion, supersededByEntry: dbEntry.supersededByEntry, supersededAt: dbEntry.supersededAt, supersedeReason: dbEntry.supersedeReason })) {
            await tx.knowledgeEntry.update({ where: { slug: entry.slug }, data: entryPayload });
            report.updated++;
          } else report.unchanged++;
          for (const v of entry.versions || []) {
            const vPayload = {
              version: v.version, status: v.status, summary: v.summary, keyExamples: v.keyExamples || [],
              contributions: v.contributions || [], marketContext: v.marketContext || [],
              supersededBy: v.supersededBy ?? null, supersededAt: v.supersededAt ? new Date(v.supersededAt) : null,
              supersedeReason: v.supersedeReason || null, createdAt: v.createdAt ? new Date(v.createdAt) : new Date(),
            };
            const existingV = await tx.knowledgeEntryVersion.findUnique({ where: { entryId_version: { entryId: dbEntry.id, version: v.version } } });
            if (!existingV) {
              await tx.knowledgeEntryVersion.create({ data: { entryId: dbEntry.id, ...vPayload } });
              report.inserted++;
            } else if (hashJson({ ...vPayload, createdAt: existingV.createdAt }) !== hashJson({ version: existingV.version, status: existingV.status, summary: existingV.summary, keyExamples: existingV.keyExamples, contributions: existingV.contributions, marketContext: existingV.marketContext, supersededBy: existingV.supersededBy, supersededAt: existingV.supersededAt, supersedeReason: existingV.supersedeReason, createdAt: existingV.createdAt })) {
              // Versão é imutável: divergência nunca é sobrescrita — falha explícita, transação desfaz o lote.
              throw new Error(`versão imutável divergente: entrada ${entry.slug} v${v.version} difere do banco; nunca sobrescrita — corrija o arquivo ou o banco manualmente`);
            } else report.unchanged++;
          }
        }
        // ── Changelog (upsert por seq; seq existente nunca é reescrito) ──
        for (const it of plan.changelogItems) {
          const payload = {
            entrySlug: it.entrySlug, changeType: it.changeType, version: it.version ?? null, source: it.source,
            actor: it.actor, occurredAt: new Date(it.occurredAt), detail: it.detail || '',
          };
          const existingC = await tx.knowledgeChangelog.findUnique({ where: { seq: it.seq } });
          if (!existingC) {
            await tx.knowledgeChangelog.create({ data: { seq: it.seq, ...payload } });
            report.inserted++;
          } else report.unchanged++;
        }
        // ── Fila de revisão (decisão resolved no banco nunca sobrescrita) ──
        for (const item of plan.reviewItems) {
          const existingR = await tx.knowledgeReviewItem.findUnique({ where: { stableId: item.id } });
          const payload = {
            kind: item.kind, sourceRef: item.sourceRef || {}, candidates: item.candidates || [],
            confidence: item.confidence ?? 0, status: item.status,
            decision: item.decision || null, resolvedBy: item.resolvedBy || null,
            resolvedAt: item.resolvedAt ? new Date(item.resolvedAt) : null,
            createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
          };
          if (!existingR) {
            await tx.knowledgeReviewItem.create({ data: { stableId: item.id, ...payload } });
            report.inserted++;
          } else if (existingR.status === 'resolved') {
            // Decisão do admin no banco vence o arquivo; divergência só listada (sincronizar via kms-apply).
            report.resolvedPreserved++;
            if (hashJson(existingR.decision) !== hashJson(payload.decision)) report.divergences.push(`review ${item.id}: decisão do banco (resolved) diverge do arquivo — banco preservado, sincronize via kms-apply`);
            else report.unchanged++;
          } else if (item.status === 'resolved') {
            await tx.knowledgeReviewItem.update({ where: { stableId: item.id }, data: payload });
            report.updated++;
          } else report.unchanged++;
        }
        // Órfãos: só listados, nunca apagados.
        if (only === null || only === 'kms') {
          const dbEntries = await tx.knowledgeEntry.findMany({ select: { slug: true } });
          const fileSlugs = new Set(plan.kmsEntries.map((e) => e.slug));
          report.orphaned += dbEntries.filter((e) => !fileSlugs.has(e.slug)).length;
        }
        if (only === null || only === 'review-queue') {
          const dbItems = await tx.knowledgeReviewItem.findMany({ select: { stableId: true } });
          const fileIds = new Set(plan.reviewItems.map((i) => i.id));
          report.orphaned += dbItems.filter((i) => !fileIds.has(i.stableId)).length;
        }
      });
      console.log(`import-knowledge: inseridos=${report.inserted} atualizados=${report.updated} inalterados=${report.unchanged} órfãos=${report.orphaned} resolved-preservados=${report.resolvedPreserved} erros=${report.errors.length}`);
      for (const d of report.divergences) console.log(`  divergência: ${d}`);
    } finally { await prisma.$disconnect(); }
  } catch (err) {
    console.error(`import-knowledge: FALHOU: ${err.message}`);
    process.exit(1);
  }
}
