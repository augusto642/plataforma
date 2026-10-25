#!/usr/bin/env node
/**
 * Validador do sistema de conhecimento (DESIGN §6.4 + §13) — 9 gates.
 * Gates 6–9 (KMS, Fase G): entradas, versões, fila de revisão e changelog.
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
/**
 * V6 (integridade de XP) — espelha `collectTestExpressions` do runner
 * (runner.service.ts): linhas vazias e comentários (`//`, `#`) NÃO são
 * testes; blocos separados por `---TEST---` ou `\n---\n` contam como
 * expressões. Atividade gerada cujo testCode+hiddenTests não produz
 * nenhuma expressão cai em `evaluateWithoutTests` — qualquer código que
 * rode tira 100 e recebe XP. Por isso o gate 4 reprova e nenhum seed
 * pode semeá-la (não existe caminho de seed de trilha gerada que não
 * passe por este validador; ver DESIGN §4).
 */
export function realTestExpressions(testCode, hiddenTests) {
  const parse = (script) => {
    if (!script || !script.trim()) return [];
    if (script.includes('---TEST---') || script.includes('\n---\n')) {
      const delimiter = script.includes('---TEST---') ? /---TEST---/g : /\n---\n/g;
      return script.split(delimiter).map((b) => b.trim()).filter((b) => b.length > 0);
    }
    return script.split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith('//') && !l.startsWith('#'));
  };
  return [...parse(testCode), ...parse(hiddenTests)];
}

/** Gate de seed de trilha gerada: testes reais + referenceSolution não vazio. */
export function assertGeneratedActivitySeedable(activity) {
  const problems = [];
  if (realTestExpressions(activity.testCode, activity.hiddenTests).length === 0) {
    problems.push('testCode/hiddenTests sem nenhuma expressão real de teste (só comentários/placeholder) — cairia em evaluateWithoutTests e daria 100 por qualquer código que rode');
  }
  if (!activity.referenceSolution || !activity.referenceSolution.trim()) {
    problems.push('referenceSolution vazio — sem solução de referência não há como provar que os testes passam');
  }
  return problems;
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
      // 'requested' = pedido do gatilho modelo (B3): vive no mesmo diretório, nunca alimenta o gerador.
      if (!['draft', 'approved', 'rejected', 'requested'].includes(doc.status)) fail(`research ${doc.id}: status inválido: ${doc.status}`);
    }
  }

  // Gates 6–9 — KMS (§13). Diretórios ausentes = base pré-KMS: passam em vacuo.
  const KMS_VERSION_STATUSES = new Set(['draft', 'active', 'superseded']);
  const KMS_CHANGE_KINDS = new Set(['created', 'enriched', 'example-added', 'market-context', 'corrected', 'superseding']);
  const KMS_SUPERSEDE_REASONS = new Set(['enriched', 'corrected', 'outdated', 'merged']);
  const KMS_CHANGE_TYPES = new Set(['created', 'enriched', 'superseded', 'deprecated', 'merged', 'review-resolved']);
  const KMS_REVIEW_KINDS = new Set(['ambiguous-match', 'new-or-enrich', 'supersede-candidate']);
  const normTitle = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const entriesBySlug = new Map();
  const researchById = new Map();
  if (existsSync(researchDir)) {
    for (const f of readdirSync(researchDir).filter((x) => x.endsWith('.json'))) {
      try { const d = loadJson(join(researchDir, f)); if (d.id) researchById.set(d.id, d); } catch { /* gate 3 já reprova */ }
    }
  }
  const entriesDir = join(kdir, 'entries');
  if (existsSync(entriesDir)) {
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.json')) {
          let entry;
          try { entry = loadJson(p); } catch (err) { fail(`entrada ${p}: JSON inválido (${err.message})`); continue; }
          const label = entry.slug || p;
          const forbidden = forbiddenFieldsDeep(entry);
          if (forbidden.length) fail(`entrada ${label}: campo PROIBIDO presente (${forbidden.join(', ')})`);
          if (!entry.slug) { fail(`entrada ${p}: slug obrigatório`); continue; }
          if (entry.slug !== e.name.replace(/\.json$/, '')) fail(`entrada ${label}: slug diverge do nome do arquivo (${e.name})`);
          if (entriesBySlug.has(entry.slug)) fail(`entrada duplicada: ${entry.slug}`);
          entriesBySlug.set(entry.slug, { path: p, entry });
          if (!entry.title) fail(`entrada ${label}: title obrigatório`);
          if (!Array.isArray(entry.topicIds) || entry.topicIds.length === 0) fail(`entrada ${label}: topicIds obrigatório`);
          else for (const t of entry.topicIds) if (!universe.has(t)) fail(`entrada ${label}: tópico fora do universo: ${t}`);
          // 'draft' = entrada nascida de backfill, ainda sem versão aprovada (D12, §13.6).
          if (!['active', 'superseded', 'deprecated', 'draft'].includes(entry.status)) fail(`entrada ${label}: status inválido: ${entry.status}`);
          if (entry.status === 'superseded' && (!entry.supersededByEntry || !entry.supersededAt || !entry.supersedeReason)) fail(`entrada ${label}: superseded exige supersededByEntry + supersededAt + motivo`);
          if (entry.status === 'deprecated' && !entry.supersedeReason) fail(`entrada ${label}: deprecated exige motivo (supersedeReason)`);
          if (!Array.isArray(entry.versions) || entry.versions.length === 0) { fail(`entrada ${label}: versions obrigatório`); continue; }
          const nums = entry.versions.map((v) => v.version);
          if (new Set(nums).size !== nums.length) fail(`entrada ${label}: número de versão duplicado`);
          if (JSON.stringify([...nums].sort((a, b) => a - b)) !== JSON.stringify(nums)) fail(`entrada ${label}: versões fora de ordem crescente`);
          if (nums[0] !== 1) fail(`entrada ${label}: primeira versão deve ser 1`);
          const actives = entry.versions.filter((v) => v.status === 'active');
          if (actives.length > 1) fail(`entrada ${label}: mais de uma versão active`);
          // Entrada active => exatamente uma active e currentVersion = ela.
          // Entrada draft => nenhuma active, currentVersion 0. Entrada
          // superseded/deprecated => currentVersion 0, versões históricas
          // intactas para auditoria (§13.3) — o status da versão antiga não
          // é reescrito pela fusão/deprecação da entrada inteira.
          if (entry.status === 'active') {
            if (actives.length !== 1) fail(`entrada ${label}: entrada active sem exatamente uma versão active`);
            else if (entry.currentVersion !== actives[0].version) fail(`entrada ${label}: currentVersion (${entry.currentVersion}) diverge da versão active (${actives[0].version})`);
          } else if (entry.status === 'draft') {
            if (actives.length !== 0 || entry.currentVersion !== 0) fail(`entrada ${label}: entrada draft não pode ter versão active nem currentVersion ≠ 0`);
          } else if (entry.currentVersion !== 0) fail(`entrada ${label}: entrada ${entry.status} deve ter currentVersion 0 (atual: ${entry.currentVersion})`);
          for (const v of entry.versions) {
            const vlabel = `${label} v${v.version}`;
            if (!KMS_VERSION_STATUSES.has(v.status)) fail(`entrada ${vlabel}: status de versão inválido: ${v.status}`);
            if (typeof v.summary !== 'string' || !v.summary.trim()) fail(`entrada ${vlabel}: summary obrigatório`);
            else if (v.summary.length > 1200) fail(`entrada ${vlabel}: summary com ${v.summary.length} chars (teto 1200)`);
            if (Array.isArray(v.keyExamples) && v.keyExamples.length > 2) fail(`entrada ${vlabel}: keyExamples > 2`);
            // Gate 6 — procedência: toda versão tem ≥ 1 contribuição.
            if (!Array.isArray(v.contributions) || v.contributions.length === 0) fail(`entrada ${vlabel}: versão sem procedência (contributions vazio)`);
            for (const c of v.contributions || []) {
              if (!['drive', 'research'].includes(c.kind)) fail(`entrada ${vlabel}: contribuição sem kind válido`);
              if (c.kind === 'drive' && !c.driveFileId) fail(`entrada ${vlabel}: contribuição drive sem driveFileId`);
              if (c.kind === 'research' && !c.researchId) fail(`entrada ${vlabel}: contribuição research sem researchId`);
              if (!KMS_CHANGE_KINDS.has(c.changeKind)) fail(`entrada ${vlabel}: changeKind inválido: ${c.changeKind}`);
            }
            for (const m of v.marketContext || []) {
              if (!m.skill || typeof m.sampleSize !== 'number' || !m.researchId || !m.collectedAt) fail(`entrada ${vlabel}: marketContext incompleto (skill/sampleSize/researchId/collectedAt)`);
              else {
                const doc = researchById.get(m.researchId);
                if (!doc) fail(`entrada ${vlabel}: marketContext sem pesquisa correspondente: ${m.researchId}`);
                else if (doc.status !== 'approved') fail(`entrada ${vlabel}: marketContext de pesquisa não aprovada: ${m.researchId} (${doc.status})`);
              }
            }
            // Gate 7 — ciclo de vida da versão.
            if (v.status === 'active' && (v.supersededBy != null || v.supersededAt != null || v.supersedeReason != null)) fail(`entrada ${vlabel}: versão active com campo de supersessão`);
            if (v.status === 'draft' && (v.supersededBy != null || v.supersededAt != null)) fail(`entrada ${vlabel}: versão draft com supersededBy/At`);
            if (v.status === 'draft' && v.supersedeReason != null && !KMS_SUPERSEDE_REASONS.has(v.supersedeReason)) fail(`entrada ${vlabel}: supersedeReason de proposta inválido: ${v.supersedeReason}`);
            if (v.status === 'superseded') {
              if (typeof v.supersededBy !== 'number' || v.supersededBy <= v.version) fail(`entrada ${vlabel}: superada sem supersededBy válido (nº da sucessora)`);
              else if (!nums.includes(v.supersededBy)) fail(`entrada ${vlabel}: supersededBy aponta versão inexistente: ${v.supersededBy}`);
              if (!v.supersededAt || !v.supersedeReason) fail(`entrada ${vlabel}: superada sem supersededAt/motivo`);
              else if (!KMS_SUPERSEDE_REASONS.has(v.supersedeReason)) fail(`entrada ${vlabel}: supersedeReason inválido: ${v.supersedeReason}`);
            }
          }
        }
      }
    };
    walk(entriesDir);
  }

  // Gate 8 — duplicatas aparentes + fila de revisão.
  const reviewItems = [];
  const reviewDir = join(kdir, 'review-queue');
  if (existsSync(reviewDir)) {
    for (const f of readdirSync(reviewDir).filter((x) => x.endsWith('.json'))) {
      let item;
      try { item = loadJson(join(reviewDir, f)); } catch (e) { fail(`review-queue ${f}: JSON inválido`); continue; }
      reviewItems.push(item);
      const label = item.id || f;
      if (!KMS_REVIEW_KINDS.has(item.kind)) fail(`review ${label}: kind inválido: ${item.kind}`);
      if (!['open', 'resolved'].includes(item.status)) fail(`review ${label}: status inválido: ${item.status}`);
      if (typeof item.confidence !== 'number') fail(`review ${label}: confidence obrigatório (melhor score)`);
      for (const c of item.candidates || []) {
        if (!entriesBySlug.has(c.entrySlug)) fail(`review ${label}: candidato aponta entrada inexistente: ${c.entrySlug}`);
        if (typeof c.score !== 'number' || !Array.isArray(c.matchReasons)) fail(`review ${label}: candidato sem score/matchReasons: ${c.entrySlug}`);
      }
      if (item.sourceRef) {
        if (!['drive', 'research'].includes(item.sourceRef.kind)) fail(`review ${label}: sourceRef.kind inválido`);
        if (item.sourceRef.kind === 'drive' && !item.sourceRef.driveFileId) fail(`review ${label}: sourceRef drive sem driveFileId`);
        if (item.sourceRef.kind === 'research' && !item.sourceRef.researchId) fail(`review ${label}: sourceRef research sem researchId`);
      }
      if (item.status === 'resolved') {
        if (!item.decision || !['enrich', 'create', 'supersede', 'dismiss'].includes(item.decision.action) || !item.decision.reason) fail(`review ${label}: resolved exige decision (action + reason)`);
        if (!item.resolvedBy || !item.resolvedAt) fail(`review ${label}: resolved exige resolvedBy + resolvedAt`);
      } else if (item.decision != null) fail(`review ${label}: item open com decision (decisão sem resolução)`);
    }
  }
  {
    const groups = new Map();
    for (const [slug, { entry }] of entriesBySlug) {
      const key = `${normTitle(entry.title)}|${[...(entry.topicIds || [])].sort().join(',')}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(slug);
    }
    for (const [key, slugs] of groups) {
      if (slugs.length < 2) continue;
      const linked = slugs.some((s) => {
        const e = entriesBySlug.get(s).entry;
        return e.status === 'superseded' && slugs.includes(e.supersededByEntry);
      }) || reviewItems.some((it) => {
        const covered = (it.candidates || []).map((c) => c.entrySlug).filter((s) => slugs.includes(s));
        return covered.length >= 2;
      });
      if (!linked) fail(`duplicata aparente sem vínculo: entradas ${slugs.join(', ')} têm mesmo título + tópicos (funda via supersededByEntry ou fila de revisão)`);
    }
  }

  // Gate 9 — changelog + ligação nos dois sentidos (registro ↔ entrada).
  const changelogPath = join(kdir, 'changelog.json');
  if (existsSync(changelogPath)) {
    let doc;
    try { doc = loadJson(changelogPath); } catch (e) { fail(`changelog.json inválido: ${e.message}`); }
    if (doc) {
      let prevSeq = 0;
      for (const it of doc.entries || []) {
        const label = `changelog seq=${it.seq}`;
        if (typeof it.seq !== 'number' || it.seq <= prevSeq) fail(`${label}: seq não único e crescente`);
        prevSeq = it.seq;
        if (!it.occurredAt) fail(`${label}: sem data (occurredAt)`);
        if (!it.source || !['drive', 'research', 'admin-decision'].includes(it.source.type)) fail(`${label}: sem fonte válida (source.type)`);
        else {
          if (it.source.type === 'drive' && !it.source.driveFileId) fail(`${label}: fonte drive sem driveFileId`);
          if (it.source.type === 'research' && !it.source.researchId) fail(`${label}: fonte research sem researchId`);
          if (it.source.type === 'admin-decision' && !it.source.decisionId) fail(`${label}: decisão administrativa sem decisionId`);
        }
        if (!it.actor || !(/^(kms-merge|kms-backfill|kms-apply)$/.test(it.actor) || it.actor.startsWith('admin:'))) fail(`${label}: actor ausente ou anônimo`);
        if (!KMS_CHANGE_TYPES.has(it.changeType)) fail(`${label}: changeType inválido: ${it.changeType}`);
        if (!it.entrySlug) fail(`${label}: sem entrySlug`);
        else if (entriesBySlug.size && !entriesBySlug.has(it.entrySlug)) warnings.push(`changelog seq=${it.seq}: entrySlug sem entrada correspondente (${it.entrySlug})`);
        if (typeof it.version === 'number' && entriesBySlug.has(it.entrySlug)) {
          const nums = entriesBySlug.get(it.entrySlug).entry.versions.map((v) => v.version);
          if (!nums.includes(it.version)) fail(`${label}: version inexistente na entrada ${it.entrySlug}`);
        }
      }
    }
  }
  if (registry) {
    for (const r of registry.records || []) {
      for (const s of r.entrySlugs || []) if (!entriesBySlug.has(s)) fail(`registro ${r.driveFileId}: entrySlugs aponta entrada inexistente: ${s}`);
    }
    // Sentido inverso: contribuição drive de entrada exige o registro com o slug.
    for (const [slug, { entry }] of entriesBySlug) {
      for (const v of entry.versions || []) for (const c of v.contributions || []) {
        if (c.kind !== 'drive') continue;
        const rec = (registry.records || []).find((x) => x.driveFileId === c.driveFileId);
        if (rec && !(rec.entrySlugs || []).includes(slug)) fail(`entrada ${slug}: contribuição drive ${c.driveFileId} sem o slug no entrySlugs do registro`);
      }
    }
  }
  const topicsPath = join(kdir, 'topics.json');
  if (existsSync(topicsPath)) {
    try {
      const tdoc = loadJson(topicsPath);
      const topicEntries = [];
      if (tdoc.topics && !Array.isArray(tdoc.topics)) for (const t of Object.values(tdoc.topics)) topicEntries.push(...(t.entrySlugs || []));
      else if (Array.isArray(tdoc.topics)) for (const t of tdoc.topics) topicEntries.push(...(t.entrySlugs || []));
      for (const s of topicEntries) if (!entriesBySlug.has(s)) fail(`topics.json: entrySlugs aponta entrada inexistente: ${s}`);
    } catch (e) { fail(`topics.json ilegível: ${e.message}`); }
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
        // V6 — atividade gerada (lessonPayload.generatedTrack) NUNCA vai ao
        // banco sem testes reais: o placeholder '# PENDENTE-AUTORIA-ADMIN'
        // é só comentário e produziria 100 por sintaxe no runner.
        if (a.lessonPayload?.generatedTrack === true) {
          for (const p of assertGeneratedActivitySeedable(a)) {
            fail(`trilha ${doc.course?.slug}/${a.slug}: NÃO SEMEÁVEL — ${p}`);
          }
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
  console.log('validate-knowledge: APROVADO (9 gates)');
}
