#!/usr/bin/env node
/**
 * Instância do aluno de uma trilha incremental (DESIGN §4.5 / delta §I1).
 * Template compartilhado (arquivos versionados) + instância por
 * aluno+objetivo: Course com isPublicLibrary=false + Enrollment, via o
 * MESMO padrão de upsert do seed-data.mjs (upsert por slug e por
 * [courseId, slug] — regenerar não duplica, preserva Activity.id e, com
 * ele, o Submission passed do aluno).
 *
 * Gate de ativação (§I6.3, sem deadlock): só semeia segmento ACTIVE cujo
 * toda atividade exercise/project tenha testCode autorado (sem
 * PENDENTE-AUTORIA-ADMIN, com expressão real de teste) + referenceSolution.
 * Exercício sem teste nunca dá `passed` e travaria o gatilho T1 — por isso
 * o segmento draft (ou com teste pendente) é RECUSADO aqui, não semeado
 * "para depois". A autoria é do admin, na aprovação; o gerador nunca
 * inventa testes.
 *
 *   node scripts/seed-track-instance.mjs --segment <segment.json>
 *     --course-slug <slug> --instructor-id <uuid> --student-id <uuid>
 *     [--title "..."] [--dry-run]
 * Sem --dry-run exige DATABASE_URL. Nunca toca em introducao-python nem
 * em curso público: a instância nasce com isPublicLibrary=false.
 */
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { assertGeneratedActivitySeedable, realTestExpressions } from './validate-knowledge.mjs';

const apiRequire = createRequire(new URL('../apps/api/package.json', import.meta.url));
try { apiRequire('dotenv').config(); } catch { /* dotenv opcional */ }

export function assertSegmentSeedable(segment) {
  const problems = [];
  if (!segment || typeof segment !== 'object') return ['segmento inválido'];
  if (segment.status !== 'active') problems.push(`segmento ${segment.stageSlug} está ${segment.status} (só active semeia — draft é revisão, planned é plano)`);
  for (const a of segment.activities || []) {
    const kind = a.lessonPayload?.activityKind;
    if (kind !== 'exercise' && kind !== 'project') continue;
    if ((a.testCode || '').includes('PENDENTE-AUTORIA-ADMIN')) {
      problems.push(`atividade ${a.slug}: testCode com PENDENTE-AUTORIA-ADMIN — autoria do admin exigida antes de ativar`);
    } else {
      try {
        if (realTestExpressions(a.testCode, a.hiddenTests).length === 0) problems.push(`atividade ${a.slug}: sem expressão real de teste`);
      } catch (err) { problems.push(`atividade ${a.slug}: ${err.message}`); }
    }
    if (typeof a.referenceSolution !== 'string' || !a.referenceSolution.trim()) {
      problems.push(`atividade ${a.slug}: referenceSolution vazio — sem ela não há como provar que os testes passam`);
    }
    // Gate V6 completo para trilhas geradas (mesma regra do gate 4).
    if (a.lessonPayload?.generatedTrack === true) {
      for (const p of assertGeneratedActivitySeedable(a)) problems.push(`atividade ${a.slug}: ${p}`);
    }
  }
  return [...new Set(problems)];
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const args = process.argv.slice(2);
  const get = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
  try {
    if (args.includes('--help') || args.includes('-h')) {
      console.log([
        'Uso: node scripts/seed-track-instance.mjs --segment <segment.json> --course-slug <slug>',
        '       --instructor-id <uuid> --student-id <uuid> [--title "..."] [--dry-run]',
        'Só semeia segmento ACTIVE com testes autorados (gate §I6.3). Instância: Course',
        'isPublicLibrary=false + Enrollment (upsert, sem duplicata, progresso preservado).',
      ].join('\n'));
      process.exit(0);
    }
    const segmentPath = get('--segment');
    const courseSlug = get('--course-slug');
    const instructorId = get('--instructor-id');
    const studentId = get('--student-id');
    if (!segmentPath || !courseSlug || !instructorId || !studentId) throw new Error('uso: --segment, --course-slug, --instructor-id e --student-id são obrigatórios');
    if (!existsSync(resolve(segmentPath))) throw new Error(`segmento não encontrado: ${segmentPath}`);
    const segment = JSON.parse(readFileSync(resolve(segmentPath), 'utf8'));
    const problems = assertSegmentSeedable(segment);
    if (problems.length) {
      console.log(`seed-track-instance: RECUSADO (gate de ativação §I6.3):\n${problems.map((p) => `  - ${p}`).join('\n')}`);
      process.exit(1);
    }
    if (args.includes('--dry-run')) {
      console.log(`seed-track-instance --dry-run: segmento ${segment.trackSlug}/${segment.stageSlug} v${segment.segmentVersion} semeável (${segment.activities.length} atividades) → curso ${courseSlug} (isPublicLibrary=false) + matrícula (nada escrito)`);
      process.exit(0);
    }
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ausente — seed de instância exige banco configurado');
    const { PrismaClient } = apiRequire('@prisma/client');
    const { PrismaPg } = apiRequire('@prisma/adapter-pg');
    const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const course = await prisma.course.upsert({
        where: { slug: courseSlug },
        update: { title: get('--title') || courseSlug, isPublicLibrary: false, instructorId },
        create: { slug: courseSlug, title: get('--title') || courseSlug, description: `Instância da trilha ${segment.trackSlug} (segmento ${segment.stageSlug}).`, instructorId, isPublicLibrary: false, enrollmentCode: `TRK-${courseSlug.slice(0, 20).toUpperCase()}` },
      });
      let upserted = 0;
      for (const a of segment.activities) {
        const { courseSlug: _cs, ...content } = a;
        await prisma.activity.upsert({
          where: { courseId_slug: { courseId: course.id, slug: a.slug } },
          update: content,
          create: { courseId: course.id, ...content },
        });
        upserted++;
      }
      await prisma.enrollment.upsert({
        where: { userId_courseId: { userId: studentId, courseId: course.id } },
        update: {},
        create: { userId: studentId, courseId: course.id },
      });
      console.log(`seed-track-instance: curso ${courseSlug} (isPublicLibrary=false) + ${upserted} atividades (upsert, sem duplicata) + matrícula do aluno`);
    } finally { await prisma.$disconnect(); }
  } catch (err) { console.error(`seed-track-instance: FALHOU: ${err.message}`); process.exit(1); }
}
