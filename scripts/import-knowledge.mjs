#!/usr/bin/env node
/**
 * Importação do sistema de conhecimento para o banco (DESIGN §5, decisão D7).
 * CLI EXPLÍCITO do operador — nunca chamado por seed, deploy, postinstall ou boot da API.
 *
 *   node scripts/import-knowledge.mjs --source content/knowledge [--dry-run] [--check]
 *     [--only lessons|registry|research|tracks] [--limit N]
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
  return `sha256:${createHash('sha256').update(JSON.stringify(obj)).digest('hex')}`;
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
  const capped = (arr) => (limit ? arr.slice(0, limit) : arr);
  return { lessons: capped(lessons), research: capped(research), registryRecords: registry ? capped(registry.records || []) : [] };
}

async function checkTables(prisma) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public.knowledge_sources')::text AS sources, to_regclass('public.knowledge_lessons')::text AS lessons, to_regclass('public.knowledge_research')::text AS research`,
  );
  const row = rows[0] || {};
  const missing = Object.entries(row).filter(([, v]) => !v).map(([k]) => k);
  return missing;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const args = process.argv.slice(2);
  const get = (flag, dflt) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : dflt; };
  const dryRun = args.includes('--dry-run');
  const check = args.includes('--check');
  const only = get('--only', null);
  const limit = get('--limit', null) ? Number(get('--limit', null)) : null;
  const sourceDir = resolve(get('--source', 'content/knowledge'));
  try {
    const plan = await planImport(sourceDir, { only, limit });
    if (dryRun || check) {
      console.log(`import-knowledge ${check ? '--check' : '--dry-run'}: lições=${plan.lessons.length} pesquisas=${plan.research.length} registros=${plan.registryRecords.length}${check ? '' : ' (nada escrito)'}`);
      if (check) {
        // --check sonda o banco; sem DATABASE_URL, falha explicitamente (não finge ok).
        if (!process.env.DATABASE_URL) { console.error('import-knowledge --check: DATABASE_URL ausente — não é possível sondar as tabelas'); process.exit(2); }
        const { PrismaClient } = apiRequire('@prisma/client');
        const { PrismaPg } = apiRequire('@prisma/adapter-pg');
        const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
        try {
          const missing = await checkTables(prisma);
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
      const missing = await checkTables(prisma);
      if (missing.length) throw new Error(`tabelas de conhecimento ausentes (${missing.join(', ')}); a migration está só como arquivo — importação real bloqueada até ordem do Augusto`);
      const report = { inserted: 0, updated: 0, unchanged: 0, orphaned: 0, errors: [] };
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
      });
      console.log(`import-knowledge: inseridos=${report.inserted} atualizados=${report.updated} inalterados=${report.unchanged} órfãos=${report.orphaned} erros=${report.errors.length}`);
    } finally { await prisma.$disconnect(); }
  } catch (err) {
    console.error(`import-knowledge: FALHOU: ${err.message}`);
    process.exit(1);
  }
}
