#!/usr/bin/env node
/**
 * Trilha incremental (DESIGN §4.5, delta §§I1–I7 — fundido no DESIGN.md).
 * Lógica PURA do gerador incremental, testável sem banco, sem LLM e sem rede:
 * o CLI e o TrackGenerationService da API consomem as mesmas regras aqui
 * (o serviço TS espelha estas funções; divergência entre os dois é defeito).
 *
 * Regras implementadas (nada inventado além do desenho):
 * - Segmentos: planned (só esqueleto) → draft (gerado, sem acesso do aluno)
 *   → active (aprovado pelo admin, único jogável) → completed DERIVADO
 *   (todas as atividades com Submission passed) → superseded (nova versão).
 *   `completed` nunca é gravado: é consulta sobre Submission (§I1.3).
 * - Vagas: filtro 730 dias inclusivo contra a data de geração; sem postedAt
 *   ⇒ excluída e segregada (undatedExcluded); skill com amostra válida
 *   zerada ⇒ removida e listada como stale-skill-removed, nunca GapEntry.
 * - Piso de exercícios (gate 11): ≥ 50% exercise/project E ≥ 3 por tópico.
 * - Gate de ativação (§I6.3): exercise/project só ativa com testCode
 *   autorado (sem PENDENTE-AUTORIA-ADMIN) + referenceSolution — o gerador
 *   NUNCA inventa testes; segmento draft pode carregar o marcador, mas
 *   nunca ativa com ele (o validador impõe, gates 4/11).
 * - Pesquisa fresca por segmento (§I2.3): vagas NUNCA reutilizadas;
 *   roadmap web reutilizável até 90 dias (registrado); vídeos/repos até
 *   30 dias (registrado); web indisponível sem roadmap ⇒ job falha e o
 *   segmento fica `planned` (fail-closed, §I7.2).
 * - Aprovação (§I3): segmento nasce draft, só ativa com ato do admin;
 *   nenhuma auto-aprovação como default (Q12 aberta); fatos (techVersions,
 *   marketContext) podem atualizar o RELATÓRIO sem aprovação editorial,
 *   nunca o conteúdo (enunciado/exercício/teste).
 * - Conteúdo: resumo ≤ 1200 chars em linguagem própria; nenhum campo
 *   transcript ou correlato em artefato novo (o validador varre).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';

export const TRACK_WINDOW_DAYS = 730;
export const ROADMAP_REUSE_DAYS = 90;
export const VIDEO_REPO_REUSE_DAYS = 30;
export const EXERCISE_MIN_RATIO = 0.5;
export const EXERCISES_PER_TOPIC = 3;
export const SEGMENT_LLM_CALL_CAP = 3;
export const SEGMENT_STATUSES = new Set(['planned', 'draft', 'active', 'superseded']);
export const ACTIVITY_KINDS = new Set(['theory', 'exercise', 'project', 'video-reference']);

export function slugify(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Diferença em dias (calendário) entre duas datas ISO. Negativa = futuro. */
export function daysBetween(earlierIso, laterIso) {
  const a = Date.parse(earlierIso);
  const b = Date.parse(laterIso);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.floor((b - a) / 86400000);
}

/**
 * Filtro de vagas §I4.1 (gate 10): válida ⟺ postedAt existe E
 * 0 ≤ (geração − postedAt) ≤ 730 dias (limite inclusivo). Sem postedAt ⇒
 * undated; fora da janela (ou no futuro) ⇒ stale. Nunca estima data.
 */
export function filterJobSamples(samples, generatedAt) {
  const valid = [];
  let stale = 0;
  let undated = 0;
  for (const s of samples || []) {
    if (!s || !s.postedAt) { undated++; continue; }
    const diff = daysBetween(s.postedAt, generatedAt);
    if (diff !== null && diff >= 0 && diff <= TRACK_WINDOW_DAYS) valid.push(s);
    else stale++;
  }
  return { valid, stale, undated };
}

/** Agregado de uma skill a partir das amostras desagregadas (auditável). */
export function summarizeMarketSignal(signal, generatedAt) {
  const samples = signal.samples || signal.jobSamples || null;
  if (!samples) return null; // sem desagregação, não sustenta selo de mercado (gate 10)
  const { valid, stale, undated } = filterJobSamples(samples, generatedAt);
  return {
    skill: signal.skill,
    mentions: valid.length,
    sampleSize: valid.length,
    totalSamplesSeen: samples.length,
    staleSamples: stale,
    undatedSamples: undated,
    samples: valid,
    sources: valid.map((s) => s.sourceUrl).filter(Boolean),
    collectedAt: signal.collectedAt || null,
  };
}

/**
 * Resumo de mercado de uma pesquisa para um segmento: skills válidas +
 * skills removidas por vencimento (stale-skill-removed, nunca GapEntry) +
 * totais de descarte para o relatório.
 */
export function summarizeResearchJobs(research, generatedAt) {
  const rawSkills = (research?.market?.skills) || [];
  const skills = [];
  const staleSkillsRemoved = [];
  let samplesSeen = 0;
  let staleDiscarded = 0;
  let undatedExcluded = 0;
  for (const s of rawSkills) {
    const summarized = summarizeMarketSignal(s, generatedAt);
    if (!summarized) {
      // Pesquisa antiga sem desagregação: não sustenta selo, mas não some
      // em silêncio — o relatório a lista como sem-amostra-desagregada.
      staleSkillsRemoved.push({ skill: s.skill, stale: null, undated: null, reason: 'no-disaggregated-samples' });
      continue;
    }
    samplesSeen += summarized.totalSamplesSeen;
    staleDiscarded += summarized.staleSamples;
    undatedExcluded += summarized.undatedSamples;
    if (summarized.sampleSize === 0) staleSkillsRemoved.push({ skill: s.skill, stale: summarized.staleSamples, undated: summarized.undatedSamples });
    else skills.push(summarized);
  }
  return { skills, staleSkillsRemoved, samplesSeen, staleDiscarded, undatedExcluded };
}

/** Piso duplo §I6.2 (gate 11): proporção + por tópico. */
export function exerciseFloor(activities) {
  const total = (activities || []).length;
  const exercises = (activities || []).filter((a) => a.lessonPayload?.activityKind === 'exercise' || a.lessonPayload?.activityKind === 'project').length;
  const perTopic = {};
  for (const a of activities || []) {
    if (a.lessonPayload?.activityKind !== 'exercise' && a.lessonPayload?.activityKind !== 'project') continue;
    for (const t of a.conceptTags || []) perTopic[t] = (perTopic[t] || 0) + 1;
  }
  const topics = [...new Set((activities || []).flatMap((a) => a.conceptTags || []))];
  const perTopicMin = topics.length ? Math.min(...topics.map((t) => perTopic[t] || 0)) : 0;
  const ratio = total ? exercises / total : 0;
  return {
    exercises, total, ratio,
    perTopic, perTopicMin,
    ok: total > 0 && ratio >= EXERCISE_MIN_RATIO && (topics.length === 0 || perTopicMin >= EXERCISES_PER_TOPIC),
    topics,
  };
}

/**
 * Derivação do progresso (§I1.3, sem modelo novo): a partir dos segmentos
 * do esqueleto (ordem) + atividades semeadas + conjunto de slugs com
 * Submission passed, devolve por segmento { completed } e o segmento atual
 * (primeiro active não completed). Segmentos planned/draft nunca são
 * "atuais jogáveis": o atual é o primeiro active incompleto, ou null se
 * todos os active estão completed (o próximo é planned → gatilho T1).
 */
export function deriveTrackProgress(stages, activities, passedSlugs) {
  const passed = new Set(passedSlugs || []);
  const byStage = new Map();
  for (const a of activities || []) {
    const stageSlug = a.lessonPayload?.segment?.stageSlug;
    if (!stageSlug) continue;
    if (!byStage.has(stageSlug)) byStage.set(stageSlug, []);
    byStage.get(stageSlug).push(a);
  }
  const segments = (stages || []).map((st) => {
    const acts = byStage.get(st.stageSlug) || [];
    const completed = acts.length > 0 && acts.every((a) => passed.has(a.slug));
    return { stageSlug: st.stageSlug, title: st.title, order: st.order, status: st.status, activities: acts.length, completed };
  });
  const current = segments.find((s) => s.status === 'active' && !s.completed) || null;
  const nextToGenerate = segments.find((s) => s.status === 'planned' && segments.filter((x) => x.order < s.order && x.status === 'active').length > 0) || null;
  return { segments, current, nextToGenerate };
}

/** Esqueleto do roadmap (§I1.2): plano, não conteúdo — exibível rotulado. */
export function buildTrackSkeleton(goal, stages) {
  if (!goal || !goal.trim()) throw new Error('trilha incremental exige objetivo explícito (não assume meta do aluno)');
  if (!Array.isArray(stages) || stages.length === 0) throw new Error('esqueleto exige pelo menos uma etapa do roadmap (web ou reutilizado)');
  return {
    goalSlug: slugify(goal),
    goal,
    createdAt: new Date().toISOString(),
    stages: stages.map((s, i) => ({
      order: s.order ?? i + 1,
      stageSlug: slugify(s.stageSlug || s.title),
      title: s.title,
      topics: s.topics || [],
      status: 'planned',
    })),
  };
}

/**
 * Política de frescor por fonte (§I2.3, pura e testável): vagas sempre
 * frescas; roadmap reutilizável até 90 dias (mesmo objetivo); vídeos/repos
 * até 30 dias. `previous` = pesquisa do segmento anterior (ou null).
 * Retorna o plano de coleta com reuso REGISTRADO (nunca silencioso).
 */
export function planFreshResearch(previous, nowIso) {
  const now = nowIso || new Date().toISOString();
  const ageDays = previous?.collectedAt ? daysBetween(previous.collectedAt, now) : null;
  return {
    jobs: { mode: 'fresh', reason: 'vagas nunca reutilizadas entre segmentos (§I2.3)' },
    web: ageDays !== null && ageDays <= ROADMAP_REUSE_DAYS
      ? { mode: 'reused', reusedFrom: previous.id || previous.researchId || null, ageDays }
      : { mode: 'fresh', reason: ageDays === null ? 'sem pesquisa anterior' : `roadmap com ${ageDays} dias (> ${ROADMAP_REUSE_DAYS})` },
    videosRepos: ageDays !== null && ageDays <= VIDEO_REPO_REUSE_DAYS
      ? { mode: 'reused', reusedFrom: previous.id || previous.researchId || null, ageDays }
      : { mode: 'fresh', reason: ageDays === null ? 'sem pesquisa anterior' : `documento com ${ageDays} dias (> ${VIDEO_REPO_REUSE_DAYS})` },
  };
}

/**
 * Geração DETERMINÍSTICA de um segmento (caminho do CLI, §I9.1): monta
 * atividades a partir de lições aprovadas + entradas KMS active + pesquisa
 * fresca. NÃO chama LLM, NÃO inventa testes (exercícios nascem com o
 * marcador PENDENTE-AUTORIA-ADMIN e o segmento nasce draft; a ativação
 * exige autoria do admin — gate §I6.3). Web indisponível sem roadmap
 * reutilizável ⇒ erro explícito (o job falha, o segmento fica planned).
 */
export function generateIncrementalSegment({
  goal, goalSlug, stage, topics, kmsEntries = [], lessons = [],
  research = null, techVersions = {}, generatedAt = null,
  web = null, // { status: 'available'|'unavailable', roadmapTopics?, researchId?, collectedAt?, reusedFrom? }
}) {
  const genAt = generatedAt || new Date().toISOString();
  if (!goal || !stage?.stageSlug) throw new Error('segmento exige objetivo e etapa (stageSlug)');
  if (!Array.isArray(topics) || topics.length === 0) throw new Error(`segmento ${stage.stageSlug}: sem tópicos — o gerador não inventa cobertura`);
  if (!web || (web.status !== 'available' && !web.reusedFrom)) {
    throw new Error(`web indisponível sem roadmap reutilizável para o segmento ${stage.stageSlug}: job falha, segmento fica planned (§I7.2)`);
  }
  const activeKms = (kmsEntries || []).filter((e) => e.status === 'active'
    && (e.versions || []).some((v) => v.version === e.currentVersion && v.status === 'active'));
  const approvedLessons = (lessons || []).filter((l) => l.reviewStatus === 'approved');
  const jobsSummary = research ? summarizeResearchJobs(research, genAt) : null;
  const jobsAvailable = Boolean(jobsSummary) && (research.sourcesUnavailable || []).indexOf('jobs') === -1;
  const marketSkills = jobsAvailable ? jobsSummary.skills : [];
  const marketAligned = jobsAvailable && marketSkills.length > 0;

  const activities = [];
  let order = 1;
  for (const topic of topics) {
    const topicKms = activeKms.filter((e) => (e.topicIds || []).includes(topic));
    const topicLessons = approvedLessons.filter((l) => (l.topics || []).includes(topic));
    const topicSkills = marketSkills.filter((s) => slugify(s.skill) === slugify(topic));
    const base = {
      courseSlug: `trilha-${goalSlug}`,
      conceptTags: [topic],
      lessonPayload: {
        reviewStatus: 'draft',
        generatedTrack: true,
        segment: { trackSlug: goalSlug, stageSlug: stage.stageSlug, segmentVersion: 1 },
        techVersions,
        kmsEntries: topicKms.map((e) => ({ slug: e.slug, version: e.currentVersion })),
        knowledgeSources: topicLessons.map((l) => ({ lessonId: l.id, courseName: l.courseName, lessonTitle: l.lessonTitle })),
        marketSkills: topicSkills.map((s) => ({ skill: s.skill, sampleSize: s.sampleSize })),
      },
    };
    activities.push({
      ...base,
      slug: `${stage.stageSlug}-${slugify(topic)}-teoria`,
      title: `${stage.title} — ${topic} (teoria)`,
      description: topicLessons[0]?.summary || `Teoria de ${topic} (a partir de fontes aprovadas; redação final pelo admin).`,
      instructions: 'Estude o resumo e resolva os exercícios do tópico.',
      language: stage.language || 'python',
      initialCode: '',
      testCode: '',
      hiddenTests: '',
      referenceSolution: '',
      lessonPayload: { ...base.lessonPayload, activityKind: 'theory' },
      order: order++,
    });
    for (let n = 1; n <= EXERCISES_PER_TOPIC; n++) {
      activities.push({
        ...base,
        slug: `${stage.stageSlug}-${slugify(topic)}-ex${n}`,
        title: `${stage.title} — ${topic} (exercício ${n})`,
        description: `Exercício ${n} de ${topic}.`,
        instructions: 'Escreva a solução e submeta; a correção usa testes ocultos autorados pelo admin.',
        language: stage.language || 'python',
        initialCode: '# Escreva sua solução aqui\n',
        // O gerador NUNCA inventa testes: o marcador é o que impede a
        // ativação até o admin autorar testes reais (gate §I6.3).
        testCode: '# PENDENTE-AUTORIA-ADMIN: testes de comportamento específicos desta atividade (o gerador não inventa testes)',
        hiddenTests: '',
        referenceSolution: '',
        lessonPayload: { ...base.lessonPayload, activityKind: 'exercise' },
        order: order++,
      });
    }
  }
  const floor = exerciseFloor(activities);
  const coveredTopics = new Set(approvedLessons.flatMap((l) => l.topics || []));
  const gaps = [];
  for (const s of marketSkills) {
    if (!coveredTopics.has(slugify(s.skill)) && !gaps.some((g) => g.skill === s.skill)) {
      gaps.push({ skill: s.skill, sampleSize: s.sampleSize, reason: 'no-approved-lesson' });
    }
  }
  if (kmsEntries && kmsEntries.length) {
    const kmsTopics = new Set(activeKms.flatMap((e) => e.topicIds || []));
    for (const s of marketSkills) {
      if (!kmsTopics.has(slugify(s.skill)) && !gaps.some((g) => g.skill === s.skill)) {
        gaps.push({ skill: s.skill, sampleSize: s.sampleSize, reason: 'no-kms-entry' });
      }
    }
  }
  const segment = {
    trackSlug: goalSlug, stageSlug: stage.stageSlug, title: stage.title,
    order: stage.order ?? 1, segmentVersion: 1, status: 'draft', generatedAt: genAt,
    activities,
  };
  const report = {
    trackSlug: goalSlug, segment: 1, stageSlug: stage.stageSlug, generatedAt: genAt, goal,
    sources: {
      web: {
        status: web.status === 'available' ? 'available' : 'reused',
        roadmapTopics: web.roadmapTopics || topics,
        researchId: web.researchId || research?.id || null,
        collectedAt: web.collectedAt || research?.collectedAt || null,
        ...(web.reusedFrom ? { reusedFrom: web.reusedFrom } : {}),
      },
      kms: {
        status: activeKms.length ? 'available' : 'empty',
        entriesUsed: [...new Set(activities.flatMap((a) => (a.lessonPayload.kmsEntries || []).map((k) => k.slug)))].map((slug) => {
          const e = activeKms.find((x) => x.slug === slug);
          return { slug, version: e?.currentVersion };
        }),
        entriesConsidered: activeKms.length,
      },
      jobs: {
        status: jobsAvailable ? 'available' : 'unavailable',
        skills: marketSkills.map((s) => ({ skill: s.skill, sampleSize: s.sampleSize })),
        samplesSeen: jobsSummary?.samplesSeen ?? 0,
        staleDiscarded: jobsSummary?.staleDiscarded ?? 0,
        undatedExcluded: jobsSummary?.undatedExcluded ?? 0,
        researchId: research?.id || null,
        collectedAt: research?.collectedAt || null,
      },
    },
    marketAligned,
    coverage: topics.map((topic) => ({
      topic,
      activitySlugs: activities.filter((a) => (a.conceptTags || []).includes(topic)).map((a) => a.slug),
      kmsEntries: activeKms.filter((e) => (e.topicIds || []).includes(topic)).map((e) => ({ slug: e.slug, version: e.currentVersion })),
      jobSkills: marketSkills.filter((s) => slugify(s.skill) === slugify(topic)).map((s) => s.skill),
    })),
    gaps,
    staleSkillsRemoved: jobsSummary?.staleSkillsRemoved || [],
    techVersions,
    exerciseFloor: floor,
    versionChanges: [],
  };
  return { segment, report };
}

/** Escreve segmento + relatório no layout versionado (§I1.4). */
export function writeSegmentFiles(tracksDir, segment, report) {
  const dir = join(tracksDir, segment.trackSlug, 'segments');
  mkdirSync(dir, { recursive: true });
  const segPath = join(dir, `${segment.order}-${segment.stageSlug}.json`);
  const repPath = join(dir, `${segment.order}-${segment.stageSlug}.report.json`);
  writeFileSync(segPath, `${JSON.stringify(segment, null, 2)}\n`);
  writeFileSync(repPath, `${JSON.stringify(report, null, 2)}\n`);
  return { segPath, repPath };
}

const isMain = process.argv[1] && resolvePath(process.argv[1]) === resolvePath(new URL(import.meta.url).pathname);
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log([
      'Uso: este módulo é biblioteca (importado pelo CLI determinístico e pelos testes).',
      'Geração incremental por segmento: node scripts/track-generate-segment.mjs --help',
      'Regras: vagas ≤ 730 dias; piso ≥50% exercícios e ≥3 por tópico; segmento nasce draft.',
    ].join('\n'));
    process.exit(0);
  }
  console.log('track-incremental: módulo puro — use track-generate-segment.mjs (CLI) ou os testes node --test.');
}
