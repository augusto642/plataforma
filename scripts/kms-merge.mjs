#!/usr/bin/env node
/**
 * KMS merge (DESIGN §13.2) — CLI do operador, nunca rota.
 *   node scripts/kms-merge.mjs --lesson <lessonId> [--content content] [--supersede-reason outdated|corrected|merged] [--dry-run]
 *   node scripts/kms-merge.mjs --research <researchId> [--content content] [--dry-run]
 *
 * Regras invioláveis (o merge só PROPÕE, nunca ativa):
 * - só conteúdo APROVADO entra (lição approved / pesquisa approved); draft => erro explícito;
 * - merge NUNCA escreve versão active, nunca marca superseded, nunca cria entrada active
 *   (entradas novas nascem draft; versões novas nascem draft; ativação é do admin, via
 *   rota approve ou kms-apply --approve);
 * - pesquisa aprovada nunca cria entrada própria (Q11): sem entrada-alvo => fila new-or-enrich;
 * - re-execução é no-op por contribution id estável (already-fed), e completa o lado
 *   do registro que porventura tenha ficado para trás (§13.3).
 * Escrita: entrada primeiro (atômica), registro depois; falha no registro => exit ≠ 0.
 */
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  KMS_MATCH_THRESHOLDS, KMS_MATCH_VERSION, addRegistryEntrySlug, appendChangelog, contributionId,
  decideMatch, entryHasContribution, entrySlugForLesson, kmsPaths, loadEntries, loadLessons,
  loadResearch, newDraftVersion, newEntryFromLesson, nextReviewId, scoreEntry, sha256Text, slugify, writeJsonAtomic,
} from './kms-lib.mjs';
import { validateKnowledge } from './validate-knowledge.mjs';

export function entryCourseSlug(entry, lessonsById) {
  for (const v of [...(entry.versions || [])].reverse()) {
    for (const c of v.contributions || []) {
      if (c.kind === 'drive') {
        const lesson = lessonsById.get(c.lessonId);
        if (lesson) return lesson.courseSlug;
      }
    }
  }
  return undefined;
}

function scoreCandidates(source, entries, lessonsById) {
  return entries
    .filter((e) => ['active', 'draft'].includes(e.status))
    .map((e) => {
      const scored = scoreEntry(source, { ...e, courseSlugForScoring: entryCourseSlug(e, lessonsById) });
      return { entrySlug: e.slug, score: scored.score, matchReasons: scored.matchReasons };
    })
    .sort((a, b) => b.score - a.score);
}

export function writeReviewItem(paths, { kind, sourceRef, candidates, confidence }) {
  mkdirSync(paths.reviewDir, { recursive: true });
  const id = nextReviewId(paths.reviewDir);
  const item = {
    id, kind, sourceRef, candidates, confidence, status: 'open', decision: null,
    resolvedBy: null, resolvedAt: null, createdAt: new Date().toISOString(),
  };
  writeJsonAtomic(join(paths.reviewDir, `${id}.json`), item);
  return item;
}

/**
 * Decide + (salvo --dry-run) materializa a proposta de uma fonte aprovada.
 * Retorna o relatório da operação. `source` = { kind: 'lesson'|'research', lesson?, research? }.
 */
export function proposeForSource(paths, source, { supersedeReason = null, dryRun = false } = {}) {
  // Guarda na função (não só no CLI): draft nunca alimenta o KMS, em nenhum caminho.
  if (source.kind === 'lesson' && source.lesson.reviewStatus !== 'approved') {
    throw new Error(`merge recusa conteúdo não aprovado: lição ${source.lesson.id} está ${source.lesson.reviewStatus} (só approved alimenta o KMS)`);
  }
  if (source.kind === 'research' && source.research.status !== 'approved') {
    throw new Error(`merge recusa conteúdo não aprovado: pesquisa ${source.research.id} está ${source.research.status} (só approved alimenta o KMS)`);
  }
  const entries = loadEntries(paths.entriesDir).map(({ entry }) => entry);
  const lessons = loadLessons(paths.lessonsDir);
  const lessonsById = new Map(lessons.map((l) => [l.id, l]));
  const now = new Date().toISOString();
  const before = validateKnowledgeContent(paths);

  if (source.kind === 'lesson') {
    const lesson = source.lesson;
    const contrib = {
      kind: 'drive', driveFileId: lesson.driveFileId, lessonId: lesson.id,
      contributedAt: now, changeKind: supersedeReason ? (supersedeReason === 'corrected' ? 'corrected' : 'superseding') : 'enriched',
      summaryHash: sha256Text(lesson.summary || ''),
    };
    return proposeLesson(paths, { lesson, contrib, supersedeReason, dryRun, entries, lessonsById, before });
  }
  return proposeResearch(paths, { research: source.research, dryRun, entries, lessonsById, before });
}

function validateKnowledgeContent(paths) {
  try {
    const contentDir = resolve(paths.kdir, '..');
    return validateKnowledge(contentDir).failures;
  } catch { return []; }
}

function checkNewFailures(paths, before) {
  const after = validateKnowledgeContent(paths);
  const beforeSet = new Set(before);
  return after.filter((f) => !beforeSet.has(f));
}

function proposeLesson(paths, { lesson, contrib, supersedeReason, dryRun, entries, lessonsById, before }) {
  const fed = entries.find((e) => entryHasContribution(e, contrib));
  if (fed) {
    // No-op, mas completa o lado do registro se ele ficou para trás (§13.3).
    let registryCompleted = false;
    if (!dryRun) registryCompleted = addRegistryEntrySlug(paths.registryPath, lesson.driveFileId, fed.slug);
    return { outcome: 'already-fed', entrySlug: fed.slug, registryCompleted };
  }
  const source = { primaryTopic: (lesson.topics || [])[0], topics: lesson.topics || [], title: lesson.lessonTitle, courseSlug: lesson.courseSlug };
  const candidates = scoreCandidates(source, entries, lessonsById);
  const decision = decideMatch(candidates);
  const report = {
    outcome: decision.outcome, matchVersion: KMS_MATCH_VERSION, thresholds: { ...KMS_MATCH_THRESHOLDS },
    candidates, entrySlug: null, reviewId: null, dryRun,
  };
  if (decision.outcome === 'new') {
    const slug = entrySlugForLesson(lesson.id);
    const existing = entries.find((e) => e.slug === slug);
    if (existing) {
      // Slug 1:1 com lessonId: se a entrada existe mas sem esta contribuição, é enriquecimento dela.
      return enrichEntry(paths, { entry: existing, lesson, contrib, supersedeReason, dryRun, before, report });
    }
    const entry = newEntryFromLesson(lesson, slug);
    report.outcome = 'new'; report.entrySlug = slug;
    if (!dryRun) {
      mkdirSync(paths.entriesDir, { recursive: true });
      writeJsonAtomic(join(paths.entriesDir, `${slug}.json`), entry);
      try { addRegistryEntrySlug(paths.registryPath, lesson.driveFileId, slug); }
      catch (err) { throw new Error(`merge: entrada escrita, mas o registro falhou (${err.message}) — re-execute para completar o lado do registro`); }
      appendChangelog(paths.changelogPath, {
        entrySlug: slug, changeType: 'created', version: 1,
        source: { type: 'drive', driveFileId: lesson.driveFileId, lessonId: lesson.id },
        actor: 'kms-merge', detail: `Entrada draft criada a partir da lição aprovada ${lesson.id} (pendente de aprovação do admin).`,
      });
      const newFails = checkNewFailures(paths, before);
      if (newFails.length) throw new Error(`merge: validação reprovou a proposta:\n${newFails.join('\n')}`);
    }
    return report;
  }
  if (decision.outcome === 'enrich') {
    const target = entries.find((e) => e.slug === decision.best.entrySlug);
    return enrichEntry(paths, { entry: target, lesson, contrib, supersedeReason, dryRun, before, report });
  }
  // Fila: nenhuma escrita em entrada.
  report.reviewId = null;
  if (!dryRun) {
    const item = writeReviewItem(paths, {
      kind: 'ambiguous-match',
      sourceRef: { kind: 'drive', driveFileId: lesson.driveFileId, lessonId: lesson.id },
      candidates, confidence: decision.best ? decision.best.score : 0,
    });
    report.reviewId = item.id;
  }
  return report;
}

function enrichEntry(paths, { entry, lesson, contrib, supersedeReason, dryRun, before, report }) {
  const draft = newDraftVersion(entry, {
    summary: lesson.summary, keyExamples: lesson.keyExamples,
    newContributions: [{ ...contrib, changeKind: contrib.changeKind === 'enriched' && !supersedeReason ? 'enriched' : contrib.changeKind }],
    newMarketContext: [], supersedeReason,
  });
  // changeKind da contribuição de enriquecimento: 'enriched' salvo quando há supersedeReason.
  if (!supersedeReason) draft.contributions[draft.contributions.length - 1].changeKind = 'enriched';
  report.outcome = 'enrich'; report.entrySlug = entry.slug; report.version = draft.version;
  if (!dryRun) {
    const next = { ...entry, versions: [...entry.versions, draft] };
    writeJsonAtomic(join(paths.entriesDir, `${entry.slug}.json`), next);
    try { addRegistryEntrySlug(paths.registryPath, lesson.driveFileId, entry.slug); }
    catch (err) { throw new Error(`merge: entrada escrita, mas o registro falhou (${err.message}) — re-execute para completar o lado do registro`); }
    appendChangelog(paths.changelogPath, {
      entrySlug: entry.slug, changeType: 'enriched', version: draft.version,
      source: { type: 'drive', driveFileId: lesson.driveFileId, lessonId: lesson.id },
      actor: 'kms-merge',
      detail: supersedeReason
        ? `Versão draft ${draft.version} proposta (supersessão proposta: ${supersedeReason}; pendente de aprovação).`
        : `Versão draft ${draft.version} proposta a partir da lição aprovada ${lesson.id} (pendente de aprovação).`,
    });
    const newFails = checkNewFailures(paths, before);
    if (newFails.length) throw new Error(`merge: validação reprovou a proposta:\n${newFails.join('\n')}`);
  }
  return report;
}

function proposeResearch(paths, { research, dryRun, entries, lessonsById, before }) {
  const seenSkills = new Set();
  const skills = ((research.market && research.market.skills) || []).filter((s) => {
    if (typeof s.sampleSize !== 'number') return false;
    const k = slugify(s.skill);
    if (seenSkills.has(k)) return false;
    seenSkills.add(k);
    return true;
  });
  // Já alimentou alguma entrada? (contribuição research ou marketContext com este researchId)
  const fed = entries.find((e) => (e.versions || []).some((v) =>
    (v.contributions || []).some((c) => c.kind === 'research' && c.researchId === research.id) ||
    (v.marketContext || []).some((m) => m.researchId === research.id)));
  if (fed) return { outcome: 'already-fed', entrySlug: fed.slug };
  // Melhor casamento agregado: para cada skill, o melhor candidato; o melhor geral vence.
  let bestOverall = null;
  const allCandidates = [];
  for (const skill of skills) {
    const topic = slugify(skill.skill);
    // O "título" da fonte de pesquisa, para scoring, é a SKILL (não a meta):
    // com a meta, o Jaccard de título seria quase sempre 0 e nenhuma skill
    // chegaria a 70 — toda pesquisa cairia na fila, nunca em enriquecimento.
    const source = { primaryTopic: topic, topics: [topic], title: skill.skill };
    const candidates = scoreCandidates(source, entries, lessonsById);
    allCandidates.push(...candidates.map((c) => ({ ...c, skill: skill.skill })));
    const decision = decideMatch(candidates);
    if (decision.best && (!bestOverall || decision.best.score > bestOverall.score)) {
      bestOverall = { ...decision.best, decision: decision.outcome, skill };
    }
  }
  const report = {
    outcome: null, matchVersion: KMS_MATCH_VERSION, thresholds: { ...KMS_MATCH_THRESHOLDS },
    candidates: allCandidates.sort((a, b) => b.score - a.score).slice(0, 5), entrySlug: null, reviewId: null, dryRun,
  };
  if (!bestOverall || bestOverall.decision === 'new') {
    report.outcome = 'review-new-or-enrich';
    if (!dryRun) {
      const item = writeReviewItem(paths, {
        kind: 'new-or-enrich',
        sourceRef: { kind: 'research', researchId: research.id },
        candidates: report.candidates, confidence: bestOverall ? bestOverall.score : 0,
      });
      report.reviewId = item.id;
    }
    return report;
  }
  if (bestOverall.decision === 'review') {
    report.outcome = 'review';
    if (!dryRun) {
      const item = writeReviewItem(paths, {
        kind: 'ambiguous-match',
        sourceRef: { kind: 'research', researchId: research.id },
        candidates: report.candidates, confidence: bestOverall.score,
      });
      report.reviewId = item.id;
    }
    return report;
  }
  // Enriquecer com marketContext: a pesquisa não autoria resumo novo — a versão
  // draft herda o resumo anterior e acrescenta marketContext + contribuição.
  const target = entries.find((e) => e.slug === bestOverall.entrySlug);
  const marketContext = skills
    .filter((s) => (target.topicIds || []).includes(slugify(s.skill)))
    .map((s) => ({ skill: s.skill, sampleSize: s.sampleSize, researchId: research.id, collectedAt: research.collectedAt }));
  const contrib = { kind: 'research', researchId: research.id, contributedAt: new Date().toISOString(), changeKind: 'market-context' };
  report.outcome = 'enrich'; report.entrySlug = target.slug;
  if (!dryRun) {
    const latest = target.versions[target.versions.length - 1];
    let next;
    if (latest.status === 'draft') {
      // Entrada ainda não publicada: o draft acumula o contexto (sem empilhar drafts).
      const versions = [...target.versions];
      versions[versions.length - 1] = {
        ...latest,
        contributions: [...latest.contributions, contrib],
        marketContext: [...(latest.marketContext || []), ...marketContext],
      };
      next = { ...target, versions };
      report.version = latest.version;
    } else {
      const draft = newDraftVersion(target, {
        summary: latest.summary, keyExamples: latest.keyExamples,
        newContributions: [contrib], newMarketContext: marketContext,
      });
      next = { ...target, versions: [...target.versions, draft] };
      report.version = draft.version;
    }
    writeJsonAtomic(join(paths.entriesDir, `${target.slug}.json`), next);
    appendChangelog(paths.changelogPath, {
      entrySlug: target.slug, changeType: 'enriched', version: report.version,
      source: { type: 'research', researchId: research.id },
      actor: 'kms-merge', detail: `marketContext acrescentado à versão draft ${report.version} a partir da pesquisa aprovada ${research.id} (pendente de aprovação).`,
    });
    const newFails = checkNewFailures(paths, before);
    if (newFails.length) throw new Error(`merge: validação reprovou a proposta:\n${newFails.join('\n')}`);
  }
  return report;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const args = process.argv.slice(2);
  const get = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
  const contentDir = resolve(get('--content') || join(new URL('..', import.meta.url).pathname, 'content'));
  const paths = kmsPaths(contentDir);
  try {
    const lessonId = get('--lesson');
    const researchId = get('--research');
    if (!lessonId && !researchId) throw new Error('uso: kms-merge.mjs --lesson <lessonId> | --research <researchId> [--content dir] [--supersede-reason outdated|corrected|merged] [--dry-run]');
    const supersedeReason = get('--supersede-reason');
    if (supersedeReason && !['outdated', 'corrected', 'merged'].includes(supersedeReason)) throw new Error(`--supersede-reason inválido: ${supersedeReason}`);
    let source;
    if (lessonId) {
      const lesson = loadLessons(paths.lessonsDir).find((l) => l.id === lessonId);
      if (!lesson) throw new Error(`lição não encontrada: ${lessonId}`);
      if (lesson.reviewStatus !== 'approved') throw new Error(`merge recusa conteúdo não aprovado: lição ${lessonId} está ${lesson.reviewStatus} (só approved alimenta o KMS)`);
      source = { kind: 'lesson', lesson };
    } else {
      const research = loadResearch(paths.researchDir).find((r) => r.id === researchId);
      if (!research) throw new Error(`pesquisa não encontrada: ${researchId}`);
      if (research.status !== 'approved') throw new Error(`merge recusa conteúdo não aprovado: pesquisa ${researchId} está ${research.status} (só approved alimenta o KMS)`);
      source = { kind: 'research', research };
    }
    const report = proposeForSource(paths, source, { supersedeReason, dryRun: args.includes('--dry-run') });
    console.log(`kms-merge: desfecho=${report.outcome}${report.entrySlug ? ` entrada=${report.entrySlug}` : ''}${report.version ? ` versão=${report.version}` : ''}${report.reviewId ? ` fila=${report.reviewId}` : ''}`);
    if (report.candidates?.length) for (const c of report.candidates.slice(0, 5)) console.log(`  candidato: ${c.entrySlug} score=${c.score} (${(c.matchReasons || []).join(', ')})`);
  } catch (err) { console.error(`kms-merge: FALHOU: ${err.message}`); process.exit(1); }
}
