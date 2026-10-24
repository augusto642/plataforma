#!/usr/bin/env node
/**
 * Gerador da trilha ideal (DESIGN §4) — CLI do operador + lógica pura testável.
 * Entrada: pesquisa APROVADA + lições APROVADAS (fixtures ou snapshot real).
 *   node scripts/knowledge-generate-track.mjs --goal "..." --research <json> --lessons <dir-ou-json> [--out <json>]
 * Regras aplicadas (validadas, não revisadas à mão):
 *  1. pesquisa não-aprovada => erro (gerador recusa, §3.4);
 *  2. lição draft nunca vira atividade; 3. skill sem sampleSize é removida;
 *  4. ordem topológica por prerequisites; ciclo => erro;
 *  5. advanced entre as 2 primeiras => erro; 6. saída toda draft;
 *  7. skill sem lição => GapEntry, nunca conteúdo inventado.
 * Limite honesto: testCode de comportamento é marcado como pendente de autoria
 * do admin (o gerador não inventa testes — ver prompt versionado).
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export function slugify(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function generateTrack({ goal, research, lessons }) {
  if (!goal || !goal.trim()) throw new Error('gerador exige meta explícita (não assume meta do aluno)');
  if (!research || research.status !== 'approved') throw new Error(`gerador recusa pesquisa não aprovada (status=${research?.status})`);
  const approved = (lessons || []).filter((l) => l.reviewStatus === 'approved');
  // Skills com amostra; sem sampleSize => removidas.
  const skills = ((research.market && research.market.skills) || []).filter((s) => typeof s.sampleSize === 'number');
  const removedSkills = ((research.market && research.market.skills) || []).filter((s) => typeof s.sampleSize !== 'number').map((s) => s.skill);
  // Ordem topológica: lição B depois de A se B.prerequisites ∩ A.topics ≠ ∅.
  const byTopic = new Map();
  for (const l of approved) for (const t of l.topics || []) { if (!byTopic.has(t)) byTopic.set(t, []); byTopic.get(t).push(l.id); }
  const deps = new Map(approved.map((l) => [l.id, new Set()]));
  for (const l of approved) {
    for (const p of l.prerequisites || []) for (const src of byTopic.get(p) || []) if (src !== l.id) deps.get(l.id).add(src);
  }
  const ordered = [];
  const done = new Set();
  const visiting = new Set();
  const visit = (id) => {
    if (done.has(id)) return;
    if (visiting.has(id)) throw new Error(`ciclo de pré-requisitos detectado envolvendo a lição ${id} — gerador recusa ordenar arbitrariamente`);
    visiting.add(id);
    for (const d of deps.get(id) || []) visit(d);
    visiting.delete(id); done.add(id);
    ordered.push(approved.find((l) => l.id === id));
  };
  for (const l of approved) visit(l.id);
  if (ordered[0]?.difficulty === 'advanced' || ordered[1]?.difficulty === 'advanced') {
    throw new Error('progressão inválida: atividade advanced entre as duas primeiras da trilha');
  }
  const activities = ordered.map((l, i) => ({
    courseSlug: `trilha-python-${slugify(goal).slice(0, 40) || 'mercado'}`,
    slug: slugify(l.lessonTitle),
    title: `${i + 1}. ${l.lessonTitle}`,
    description: l.summary,
    instructions: `Estude o resumo e resolva o exercício análogo. Fonte de referência: ${l.courseName} — ${l.lessonTitle}.`,
    language: 'python',
    initialCode: '# Escreva sua solução aqui\n',
    testCode: '# PENDENTE-AUTORIA-ADMIN: testes de comportamento específicos desta atividade (o gerador não inventa testes)',
    hiddenTests: '',
    referenceSolution: '',
    conceptTags: l.topics,
    lessonPayload: {
      reviewStatus: 'draft',
      generatedTrack: true,
      knowledgeSources: [{ lessonId: l.id, courseName: l.courseName, lessonTitle: l.lessonTitle }],
      marketSkills: skills.filter((s) => (l.topics || []).includes(slugify(s.skill))).map((s) => ({ skill: s.skill, sampleSize: s.sampleSize })),
      analogousExample: { title: `Exemplo análogo: ${l.lessonTitle}`, statement: 'Exercício autorado a partir do resumo (revisão do admin).', solution: '', explanation: 'Análogo, não cópia do curso.', concept: (l.topics || [])[0] || '' },
    },
    order: i + 1,
  }));
  const coveredTopics = new Set(ordered.flatMap((l) => l.topics || []));
  const gaps = skills.filter((s) => !coveredTopics.has(slugify(s.skill))).map((s) => ({ skill: s.skill, sampleSize: s.sampleSize, reason: 'no-approved-lesson' }));
  const coverage = [{ objective: goal, lessonIds: ordered.map((l) => l.id), marketSkills: skills.map((s) => ({ skill: s.skill, sampleSize: s.sampleSize })) }];
  return { course: { slug: activities[0]?.courseSlug || 'trilha-python-mercado', title: `Trilha Python — ${goal}`, description: `Trilha gerada a partir de pesquisa aprovada (${research.id}) e ${ordered.length} lição(ões) aprovada(s).` }, activities, coverage, gaps, removedSkills, researchId: research.id };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const args = process.argv.slice(2);
  const get = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
  try {
    const goal = get('--goal');
    const research = JSON.parse(readFileSync(resolve(get('--research')), 'utf8'));
    const lessonsArg = resolve(get('--lessons'));
    let lessons;
    const st = existsSync(lessonsArg) ? statSync(lessonsArg) : null;
    if (st && st.isDirectory()) {
      lessons = [];
      const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.json')) lessons.push(JSON.parse(readFileSync(p, 'utf8'))); } };
      walk(lessonsArg);
    } else lessons = JSON.parse(readFileSync(lessonsArg, 'utf8')).lessons || JSON.parse(readFileSync(lessonsArg, 'utf8'));
    const out = generateTrack({ goal, research, lessons });
    const outPath = get('--out');
    if (outPath) writeFileSync(resolve(outPath), `${JSON.stringify(out, null, 2)}\n`);
    console.log(`generate-track: atividades=${out.activities.length} lacunas=${out.gaps.length} skills-removidas-sem-amostra=${out.removedSkills.length} (tudo draft)`);
    if (out.gaps.length) for (const g of out.gaps) console.log(`  lacuna: ${g.skill} (amostra ${g.sampleSize})`);
  } catch (err) { console.error(`generate-track: FALHOU: ${err.message}`); process.exit(1); }
}
