#!/usr/bin/env node
/**
 * Validador do sistema de conhecimento (DESIGN §6.4) — 5 gates.
 * Uso: node scripts/validate-knowledge.mjs [--content content] [--accept-manual-edit]
 *   --accept-manual-edit: ato consciente do operador — reescreve o summaryHash
 *     do registro quando a lição foi editada à mão (o desenho exige que a
 *     divergência seja reprovada por padrão, nunca silenciada).
 * Saída: exit 0 = tudo válido; exit 1 = pelo menos uma reprovação.
 *
 * Gate 1 — registry: driveFileId único; estados válidos; extracted exige
 *   lessonId + arquivo existente; summaryHash confere com o arquivo.
 * Gate 2 — lições: NENHUM campo proibido (transcript/fullText/captions/
 *   transcription/videoUrl/downloadUrl/content — varredura profunda de chaves);
 *   summary ≤ 1200 chars; topics ≤ 8 e no universo (espinha OU knowledge-topics);
 *   prerequisites no mesmo universo; reviewStatus ∈ draft|approved.
 * Gate 3 — research: sourcesUnavailable obrigatório; nenhuma skill sem
 *   sampleSize; approved exige approvedBy + approvedAt.
 * Gate 4 — trilhas geradas (content/knowledge/generated-tracks/*.json, se houver):
 *   tags no universo; reviewStatus draft|approved; toda atividade tem
 *   knowledgeSources OU synthetic:true com justificativa.
 * Gate 5 — course-map: todo courseSlug usado em lições/registro existe no mapa
 *   ou é 'python-outros'; 'python-outros' exige needsCourseMapping=true no registro.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const FORBIDDEN_LESSON_FIELDS = new Set([
  'transcript', 'fullText', 'captions', 'transcription', 'videoUrl', 'downloadUrl', 'content',
]);
export const LESSON_STATUSES = new Set([
  'pending', 'queued', 'extracting', 'extracted', 'failed', 'skipped', 'superseded',
]);
export const DIFFICULTIES = new Set(['beginner', 'intermediate', 'advanced']);

export function sha256File(path) {
  return `sha256:${createHash('sha256').update(readFileSync(path)).digest('hex')}`;
}
export function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}
export function forbiddenFieldsDeep(value, path = '$', out = []) {
  if (Array.isArray(value)) value.forEach((v, i) => forbiddenFieldsDeep(v, `${path}[${i}]`, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (FORBIDDEN_LESSON_FIELDS.has(k)) out.push(`${path}.${k}`);
      forbiddenFieldsDeep(v, `${path}.${k}`, out);
    }
  }
  return out;
}
export function topicUniverse(contentDir) {
  const spine = loadJson(join(contentDir, 'concept-spine.json'));
  const tags = new Set(spine.modules.map((m) => m.tag));
  const topicsPath = join(contentDir, 'knowledge-topics.json');
  if (existsSync(topicsPath)) {
    for (const t of loadJson(topicsPath).topics || []) tags.add(t.id);
  }
  return tags;
}

export function validateKnowledge(contentDir) {
  const failures = [];
  const warnings = [];
  const fail = (msg) => failures.push(msg);
  const kdir = join(contentDir, 'knowledge');
  let universe = new Set();
  try { universe = topicUniverse(contentDir); } catch (e) { fail(`universo de tópicos ilegível: ${e.message}`); }

  // Gate 5 (mapa) — carregado antes das lições.
  let mapSlugs = new Set(['python-outros']);
  try {
    const map = loadJson(join(kdir, 'course-map.json'));
    for (const m of map.mappings || []) mapSlugs.add(m.courseSlug);
  } catch (e) { fail(`course-map.json ilegível: ${e.message}`); }

  // Gate 2 — lições.
  const lessonsById = new Map();
  const lessonsDir = join(kdir, 'lessons');
  if (existsSync(lessonsDir)) {
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.json')) {
          let lesson;
          try { lesson = loadJson(p); } catch (err) { fail(`lição ${p}: JSON inválido (${err.message})`); continue; }
          const label = lesson.id || p;
          const forbidden = forbiddenFieldsDeep(lesson);
          if (forbidden.length) fail(`lição ${label}: campo PROIBIDO presente (${forbidden.join(', ')}) — transcrição/conteúdo integral nunca entra na base`);
          if (typeof lesson.summary !== 'string' || !lesson.summary.trim()) fail(`lição ${label}: summary obrigatório`);
          else if (lesson.summary.length > 1200) fail(`lição ${label}: summary com ${lesson.summary.length} chars (teto 1200)`);
          if (!Array.isArray(lesson.topics) || lesson.topics.length === 0) fail(`lição ${label}: topics obrigatório`);
          else {
            if (lesson.topics.length > 8) fail(`lição ${label}: topics > 8`);
            for (const t of lesson.topics) if (!universe.has(t)) fail(`lição ${label}: tópico fora do universo: ${t}`);
          }
          for (const t of lesson.prerequisites || []) if (!universe.has(t)) fail(`lição ${label}: prerequisite fora do universo: ${t}`);
          if (!['draft', 'approved'].includes(lesson.reviewStatus)) fail(`lição ${label}: reviewStatus inválido: ${lesson.reviewStatus}`);
          if (!DIFFICULTIES.has(lesson.difficulty)) fail(`lição ${label}: difficulty inválida: ${lesson.difficulty}`);
          if (Array.isArray(lesson.keyExamples) && lesson.keyExamples.length > 2) fail(`lição ${label}: keyExamples > 2`);
          const src = lesson.source || {};
          if (!src.courseName || !src.lessonTitle || !src.driveFileId) fail(`lição ${label}: source incompleto (courseName/lessonTitle/driveFileId)`);
          if (lesson.courseSlug && !mapSlugs.has(lesson.courseSlug)) fail(`lição ${label}: courseSlug fora do course-map: ${lesson.courseSlug}`);
          if (lesson.id) {
            if (lessonsById.has(lesson.id)) fail(`lição duplicada: ${lesson.id}`);
            lessonsById.set(lesson.id, { path: p, lesson });
          }
        }
      }
    };
    walk(lessonsDir);
  }

  // Gate 1 — registry.
  const registryPath = join(kdir, 'extraction-registry.json');
  let registry = null;
  if (existsSync(registryPath)) {
    try { registry = loadJson(registryPath); } catch (e) { fail(`extraction-registry.json inválido: ${e.message}`); }
  } else warnings.push('extraction-registry.json ausente (ok para árvore de fixture sem registro)');
  if (registry) {
    const seen = new Set();
    for (const r of registry.records || []) {
      if (!r.driveFileId) { fail('registro sem driveFileId'); continue; }
      if (seen.has(r.driveFileId)) fail(`driveFileId duplicado no registro: ${r.driveFileId}`);
      seen.add(r.driveFileId);
      if (!LESSON_STATUSES.has(r.status)) fail(`registro ${r.driveFileId}: status inválido: ${r.status}`);
      if (r.status === 'extracted') {
        if (!r.lessonId) fail(`registro ${r.driveFileId}: extracted sem lessonId`);
        else {
          const found = lessonsById.get(r.lessonId);
          if (!found) fail(`registro ${r.driveFileId}: extracted aponta lição inexistente: ${r.lessonId}`);
          else if (r.summaryHash && r.summaryHash !== sha256File(found.path)) {
            failures.push(`__HASH_MISMATCH__:${r.driveFileId}`);
          }
        }
      } else if (r.lessonId) fail(`registro ${r.driveFileId}: lessonId presente com status ${r.status} (só extracted pode ter)`);
      if (r.courseSlug && !mapSlugs.has(r.courseSlug)) fail(`registro ${r.driveFileId}: courseSlug fora do course-map: ${r.courseSlug}`);
      if (r.courseSlug === 'python-outros' && r.needsCourseMapping !== true) fail(`registro ${r.driveFileId}: python-outros exige needsCourseMapping=true`);
    }
  }

  // Gate 3 — research.
  const researchDir = join(kdir, 'research');
  if (existsSync(researchDir)) {
    for (const f of readdirSync(researchDir).filter((x) => x.endsWith('.json'))) {
      let doc;
      try { doc = loadJson(join(researchDir, f)); } catch (e) { fail(`research ${f}: JSON inválido`); continue; }
      if (!Array.isArray(doc.sourcesUnavailable)) fail(`research ${doc.id || f}: sourcesUnavailable obrigatório (campo de honestidade)`);
      for (const s of (doc.market && doc.market.skills) || []) {
        if (typeof s.sampleSize !== 'number') fail(`research ${doc.id}: skill sem sampleSize: ${s.skill}`);
      }
      if (doc.status === 'approved' && (!doc.approvedBy || !doc.approvedAt)) fail(`research ${doc.id}: approved exige approvedBy + approvedAt`);
      if (!['draft', 'approved', 'rejected'].includes(doc.status)) fail(`research ${doc.id}: status inválido: ${doc.status}`);
    }
  }

  // Gate 4 — trilhas geradas.
  const genDir = join(kdir, 'generated-tracks');
  if (existsSync(genDir)) {
    for (const f of readdirSync(genDir).filter((x) => x.endsWith('.json'))) {
      let doc;
      try { doc = loadJson(join(genDir, f)); } catch (e) { fail(`trilha gerada ${f}: JSON inválido`); continue; }
      for (const a of doc.activities || []) {
        for (const t of a.conceptTags || []) if (!universe.has(t)) fail(`trilha ${doc.course?.slug}/${a.slug}: tag fora do universo: ${t}`);
        if (!['draft', 'approved'].includes(a.lessonPayload?.reviewStatus)) fail(`trilha ${doc.course?.slug}/${a.slug}: reviewStatus inválido`);
        const ks = a.lessonPayload?.knowledgeSources;
        if ((!Array.isArray(ks) || ks.length === 0) && !(a.lessonPayload?.synthetic === true && a.lessonPayload?.syntheticReason)) {
          fail(`trilha ${doc.course?.slug}/${a.slug}: sem knowledgeSources e sem synthetic justificado`);
        }
      }
    }
  }
  return { failures, warnings, registry, registryPath, lessonsById };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const args = process.argv.slice(2);
  const contentIdx = args.indexOf('--content');
  const contentDir = contentIdx >= 0 ? resolve(args[contentIdx + 1]) : resolve(new URL('../content', import.meta.url).pathname);
  const acceptManual = args.includes('--accept-manual-edit');
  const { failures, warnings, registry, registryPath, lessonsById } = validateKnowledge(contentDir);
  const hashFails = failures.filter((f) => f.startsWith('__HASH_MISMATCH__:'));
  const realFails = failures.filter((f) => !f.startsWith('__HASH_MISMATCH__:'));
  if (hashFails.length && acceptManual && registry) {
    for (const h of hashFails) {
      const id = h.split(':')[1];
      const rec = registry.records.find((r) => r.driveFileId === id);
      const found = lessonsById.get(rec.lessonId);
      rec.summaryHash = sha256File(found.path);
      console.log(`hash aceito manualmente (edição consciente): ${id}`);
    }
    registry.generatedAt = new Date().toISOString();
    const tmp = `${registryPath}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(registry, null, 2)}\n`);
    const { renameSync } = await import('node:fs');
    renameSync(tmp, registryPath);
  } else if (hashFails.length) {
    for (const h of hashFails) realFails.push(`registro ${h.split(':')[1]}: summaryHash divergente — lição editada sem re-extrair (use --accept-manual-edit para aceitar conscientemente)`);
  }
  for (const w of warnings) console.log(`warning: ${w}`);
  if (realFails.length) {
    for (const f of realFails) console.log(`FAIL: ${f}`);
    console.log(`validate-knowledge: REPROVADO (${realFails.length} falha(s))`);
    process.exit(1);
  }
  console.log('validate-knowledge: APROVADO (5 gates)');
}
