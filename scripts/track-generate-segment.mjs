#!/usr/bin/env node
/**
 * CLI determinístico do gerador incremental (DESIGN §4.5 / delta §I9.1).
 * Caminho de teste/fixture do gerador: monta o segmento a partir de
 * arquivos (esqueleto, lições aprovadas, entradas KMS active, pesquisa
 * fresca) SEM chamar LLM — a redação por LLM vive no TrackGenerationService
 * da API (LlmProvider Sprint 22). O segmento nasce draft; a ativação é ato
 * do admin (kms-apply não ativa segmento; a aprovação do segmento é a rota
 * admin tracks, que marca o template como active — ver TrackGenerationService).
 *
 *   node scripts/track-generate-segment.mjs --goal "desenvolvedor Java"
 *     --stage <stage-slug> --topics sintaxe,lacos,... --tracks <dir>
 *     --lessons <dir> --kms <dir> --research <json> [--tech-versions <json>]
 *     [--web-roadmap <json>] [--generated-at <ISO>] [--out <dir>]
 * Sem --web-roadmap e sem pesquisa com roadmap reutilizável, o comando
 * falha explicitamente (web indisponível ⇒ segmento fica planned).
 * Saída: <tracks>/<goal-slug>/segments/<n>-<stage>.json + .report.json.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTrackSkeleton, generateIncrementalSegment, slugify, writeSegmentFiles } from './track-incremental.mjs';

function readDirJson(dir) {
  if (!dir || !existsSync(dir)) return [];
  const out = [];
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.json')) { try { out.push(JSON.parse(readFileSync(p, 'utf8'))); } catch { /* arquivo inválido: o validador reprova depois */ } } } };
  walk(dir);
  return out;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(new URL(import.meta.url)));
if (isMain) {
  const args = process.argv.slice(2);
  const get = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
  try {
    if (args.includes('--help') || args.includes('-h')) {
      console.log([
        'Uso: node scripts/track-generate-segment.mjs --goal "..." --stage <slug> --topics a,b,c',
        '       --tracks <dir> [--lessons <dir>] [--kms <dir>] [--research <json>]',
        '       [--tech-versions <json>] [--web-roadmap <json>] [--generated-at <ISO>]',
        'Caminho determinístico (zero LLM). O segmento nasce draft; web indisponível sem',
        'roadmap reutilizável ⇒ falha explícita e o segmento fica planned.',
      ].join('\n'));
      process.exit(0);
    }
    const goal = get('--goal');
    const stageSlug = get('--stage');
    const topics = (get('--topics') || '').split(',').map((t) => t.trim()).filter(Boolean);
    if (!goal || !stageSlug || !topics.length) throw new Error('uso: --goal <objetivo> --stage <slug> --topics <a,b,c> são obrigatórios');
    const goalSlug = slugify(goal);
    const tracksDir = resolve(get('--tracks') || join(fileURLToPath(new URL('..', import.meta.url)), 'content', 'knowledge', 'tracks'));
    const lessons = readDirJson(get('--lessons') ? resolve(get('--lessons')) : null);
    const kmsEntries = readDirJson(get('--kms') ? resolve(get('--kms')) : null);
    const research = get('--research') ? JSON.parse(readFileSync(resolve(get('--research')), 'utf8')) : null;
    const techVersions = get('--tech-versions') ? JSON.parse(readFileSync(resolve(get('--tech-versions')), 'utf8')) : {};
    let web = null;
    if (get('--web-roadmap')) {
      const doc = JSON.parse(readFileSync(resolve(get('--web-roadmap')), 'utf8'));
      web = { status: 'available', roadmapTopics: doc.topics || topics, researchId: doc.researchId || null, collectedAt: doc.collectedAt || null };
    } else if (research && research.webRoadmap) {
      web = { status: 'reused', reusedFrom: research.id, roadmapTopics: research.webRoadmap.topics || topics, researchId: research.id, collectedAt: research.collectedAt };
    }
    const skeleton = buildTrackSkeleton(goal, [{ stageSlug, title: get('--stage-title') || stageSlug, topics, language: get('--language') || 'python' }]);
    const stage = skeleton.stages[0];
    const { segment, report } = generateIncrementalSegment({
      goal, goalSlug, stage, topics, kmsEntries, lessons, research, techVersions,
      generatedAt: get('--generated-at') || undefined, web,
    });
    if (!report.exerciseFloor.ok) {
      throw new Error(`piso de exercícios violado no segmento ${stageSlug} (gate 11): exercícios=${report.exerciseFloor.exercises}/${report.exerciseFloor.total} (razão ${report.exerciseFloor.ratio.toFixed(2)}), mínimo por tópico=${report.exerciseFloor.perTopicMin} — segmento NÃO escrito como draft válido`);
    }
    const out = writeSegmentFiles(get('--out') ? resolve(get('--out')) : tracksDir, segment, report);
    console.log(`track-generate-segment: segmento ${segment.trackSlug}/${segment.stageSlug} draft com ${segment.activities.length} atividades (exercícios ${report.exerciseFloor.exercises}, razão ${report.exerciseFloor.ratio.toFixed(2)}, marketAligned=${report.marketAligned})`);
    console.log(`  segmento: ${out.segPath}`);
    console.log(`  relatório: ${out.repPath}`);
  } catch (err) { console.error(`track-generate-segment: FALHOU: ${err.message}`); process.exit(1); }
}
