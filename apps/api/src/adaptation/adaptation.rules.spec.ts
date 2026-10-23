import { readFileSync } from 'fs';
import { join } from 'path';
import { QUESTIONS } from '../diagnostic/data/quiz-v1';
import {
  TRACK_TO_COURSE_SLUG,
  computeCoursePath,
  computeFragileConcepts,
  diagnosticShowsCodeKnowledge,
  primaryModuleTag,
  type PathActivity,
  type RemediationActivity,
} from './adaptation.rules';
import { CONCEPT_SPINE_MODULES } from './data/concept-spine';

// ---------------------------------------------------------------------------
// Fixtures — mini-trilha de 3 módulos (espinha real) + boss
// ---------------------------------------------------------------------------

function act(
  id: string,
  order: number,
  conceptTags: string[],
): PathActivity {
  return { id, slug: id, title: id, order, conceptTags };
}

/** M1: a1,a2,a3(verificação) · M3(operadores): b1,b2(verificação) · boss: z1 */
const TRACK: PathActivity[] = [
  act('a1', 1, ['saida-e-variaveis']),
  act('a2', 2, ['saida-e-variaveis', 'entrada-e-strings']),
  act('a3', 3, ['saida-e-variaveis']),
  act('b1', 4, ['operadores']),
  act('b2', 5, ['operadores', 'funcoes']),
  act('z1', 6, ['projeto-final', 'loops']),
];

function remediationActivity(
  partial: Partial<RemediationActivity> & { id: string },
): RemediationActivity {
  return {
    slug: partial.id,
    title: partial.id,
    language: 'python',
    order: 1,
    conceptTags: [],
    courseId: 'course-x',
    courseSlug: 'curso-x',
    courseTitle: 'Curso X',
    ...partial,
  };
}

// ---------------------------------------------------------------------------

describe('espinha (espelho da API × fonte canônica)', () => {
  it('é idêntica a content/concept-spine.json (tag, título e ordem)', () => {
    const canonical = JSON.parse(
      readFileSync(
        join(__dirname, '..', '..', '..', '..', 'content', 'concept-spine.json'),
        'utf8',
      ),
    );
    expect(canonical.version).toBe(1);
    expect(CONCEPT_SPINE_MODULES).toHaveLength(canonical.modules.length);
    for (const [index, mod] of canonical.modules.entries()) {
      expect(CONCEPT_SPINE_MODULES[index]).toEqual({
        tag: mod.tag,
        title: mod.title,
        order: mod.order,
      });
    }
  });
});

describe('primaryModuleTag', () => {
  it('retorna a PRIMEIRA tag que pertence à espinha', () => {
    expect(primaryModuleTag(['funcoes', 'loops'])).toBe('funcoes');
    expect(primaryModuleTag(['arrays', 'loops'])).toBe('loops');
  });

  it('retorna null para tags só do vocabulário legado ou lista vazia', () => {
    expect(primaryModuleTag(['arrays', 'recursao'])).toBeNull();
    expect(primaryModuleTag([])).toBeNull();
  });
});

describe('computeCoursePath', () => {
  it('diagnóstico zerado: nada concluído, entrada no módulo 1, próximo passo é a 1ª atividade', () => {
    const path = computeCoursePath(TRACK, new Set());
    expect(path.entryModuleTag).toBe('saida-e-variaveis');
    expect(path.nextActivityId).toBe('a1');
    expect(path.effectiveCompletedIds.size).toBe(0);
    expect(path.modules.map((m) => m.status)).toEqual([
      'not-started',
      'not-started',
      'not-started',
    ]);
  });

  it('diagnóstico completo (tudo passed): tudo completed, sem próximo passo nem entrada', () => {
    const path = computeCoursePath(
      TRACK,
      new Set(TRACK.map((a) => a.id)),
    );
    expect(path.modules.every((m) => m.status === 'completed')).toBe(true);
    expect(path.nextActivityId).toBeNull();
    expect(path.entryModuleTag).toBeNull();
    expect(path.effectiveCompletedIds.size).toBe(TRACK.length);
  });

  it('test-out aprovado: passar na verificação do módulo conclui o módulo inteiro e move o próximo passo', () => {
    const path = computeCoursePath(TRACK, new Set(['a3']));
    const m1 = path.modules[0];
    expect(m1.status).toBe('tested-out');
    expect(m1.testOutActivityId).toBe('a3');
    expect([...path.effectiveCompletedIds].sort()).toEqual(['a1', 'a2', 'a3']);
    expect(path.nextActivityId).toBe('b1');
    expect(path.entryModuleTag).toBe('operadores');
  });

  it('test-out reprovado NÃO pula nada: passar numa atividade comum do módulo só a conclui', () => {
    const path = computeCoursePath(TRACK, new Set(['a1']));
    expect(path.modules[0].status).toBe('in-progress');
    expect([...path.effectiveCompletedIds]).toEqual(['a1']);
    expect(path.nextActivityId).toBe('a2');
    expect(path.entryModuleTag).toBe('saida-e-variaveis');
  });

  it('atividade sem tag da espinha não é pulável nem entra em módulo', () => {
    const track = [act('x0', 0, ['recursao']), ...TRACK];
    const path = computeCoursePath(track, new Set(['a3']));
    expect(path.modules).toHaveLength(3);
    expect(path.effectiveCompletedIds.has('x0')).toBe(false);
    expect(path.nextActivityId).toBe('x0');
  });

  it('ids passados de OUTRO curso não vazam para a derivação deste', () => {
    const path = computeCoursePath(TRACK, new Set(['a3', 'foreign-1']));
    expect(path.effectiveCompletedIds.has('foreign-1')).toBe(false);
  });

  it('módulo de atividade única: passar nela é completed (não tested-out)', () => {
    const path = computeCoursePath(TRACK, new Set(['z1']));
    const boss = path.modules.find((m) => m.tag === 'projeto-final');
    expect(boss?.status).toBe('completed');
  });

  it('atividade multi-tag conta só no módulo primário', () => {
    const path = computeCoursePath(TRACK, new Set());
    const entrada = path.modules.find((m) => m.tag === 'entrada-e-strings');
    expect(entrada).toBeUndefined(); // a2 é de saida-e-variaveis (primário)
    expect(path.modules[0].activityIds).toEqual(['a1', 'a2', 'a3']);
  });
});

describe('diagnóstico → caminho', () => {
  it('TRACK_TO_COURSE_SLUG mapeia os 4 TrackIds para cursos do catálogo', () => {
    expect(TRACK_TO_COURSE_SLUG).toEqual({
      frontend: 'algoritmos-javascript',
      backend: 'introducao-python',
      ai: 'introducao-python',
      web3: 'algoritmos-javascript',
    });
  });

  const codigoKnowledge = QUESTIONS.filter(
    (q) => q.type === 'knowledge' && q.axis === 'codigo',
  );

  function answersWithCodigoKnowledge(correctCount: number) {
    let seen = 0;
    return QUESTIONS.map((q) => {
      if (q.type !== 'knowledge') {
        return { questionId: q.id, optionId: q.options[0].id };
      }
      if (q.axis === 'codigo') {
        seen += 1;
        const optionId =
          seen <= correctCount
            ? (q.correctOptionId as string)
            : (q.options.find((o) => o.id !== q.correctOptionId)?.id as string);
        return { questionId: q.id, optionId };
      }
      const wrong = q.options.find((o) => o.id !== q.correctOptionId);
      return { questionId: q.id, optionId: wrong?.id as string };
    });
  }

  it('sinal de conhecimento só com TODAS as de código corretas', () => {
    expect(codigoKnowledge.length).toBeGreaterThan(0);
    expect(
      diagnosticShowsCodeKnowledge(
        answersWithCodigoKnowledge(codigoKnowledge.length),
      ),
    ).toBe(true);
    expect(
      diagnosticShowsCodeKnowledge(
        answersWithCodigoKnowledge(codigoKnowledge.length - 1),
      ),
    ).toBe(false);
    expect(diagnosticShowsCodeKnowledge([])).toBe(false);
  });
});

describe('computeFragileConcepts', () => {
  const trackAct = remediationActivity({
    id: 't-loops',
    conceptTags: ['loops'],
    language: 'python',
    courseId: 'py',
    courseSlug: 'introducao-python',
  });
  const bibArrays = remediationActivity({
    id: 'bib-arrays',
    conceptTags: ['arrays'],
    language: 'javascript',
    order: 1,
    courseId: 'bib',
    courseSlug: 'biblioteca',
  });
  const bibLoopsPy = remediationActivity({
    id: 'bib-loops-py',
    conceptTags: ['loops'],
    language: 'python',
    order: 4,
    courseId: 'bib',
    courseSlug: 'biblioteca',
  });
  const bibLoopsJs = remediationActivity({
    id: 'bib-loops-js',
    conceptTags: ['loops'],
    language: 'javascript',
    order: 3,
    courseId: 'bib',
    courseSlug: 'biblioteca',
  });
  const trackUntried = remediationActivity({
    id: 't-loops-2',
    conceptTags: ['loops', 'listas'],
    language: 'python',
    order: 9,
    courseId: 'py',
    courseSlug: 'introducao-python',
  });

  const byId = new Map(
    [trackAct, bibArrays, bibLoopsPy, bibLoopsJs, trackUntried].map((a) => [
      a.id,
      a,
    ]),
  );
  const failures = (activityId: string, n: number, day = 1) =>
    Array.from({ length: n }, (_, i) => ({
      activityId,
      status: 'failed',
      createdAt: new Date(2026, 0, day, i),
    }));

  it('abaixo do limiar (2 falhas) não é frágil; no limiar (3) é', () => {
    const base = {
      activitiesById: byId,
      passedActivityIds: new Set<string>(),
      libraryActivities: [bibArrays, bibLoopsPy, bibLoopsJs],
      enrolledActivities: [trackAct, trackUntried],
    };
    expect(
      computeFragileConcepts({ ...base, submissions: failures('t-loops', 2) }),
    ).toEqual([]);
    const fragile = computeFragileConcepts({
      ...base,
      submissions: failures('t-loops', 3),
    });
    expect(fragile).toHaveLength(1);
    expect(fragile[0].conceptTag).toBe('loops');
    expect(fragile[0].failedAttempts).toBe(3);
  });

  it('falhas numa atividade que o aluno depois concluiu não contam', () => {
    const fragile = computeFragileConcepts({
      submissions: failures('t-loops', 5),
      activitiesById: byId,
      passedActivityIds: new Set(['t-loops']),
      libraryActivities: [],
      enrolledActivities: [trackAct],
    });
    expect(fragile).toEqual([]);
  });

  it('status diferentes de failed (error/pending/passed) não contam', () => {
    const submissions = [
      { activityId: 't-loops', status: 'error', createdAt: new Date() },
      { activityId: 't-loops', status: 'pending', createdAt: new Date() },
      { activityId: 't-loops', status: 'passed', createdAt: new Date() },
    ];
    expect(
      computeFragileConcepts({
        submissions,
        activitiesById: byId,
        passedActivityIds: new Set<string>(),
        libraryActivities: [],
        enrolledActivities: [],
      }),
    ).toEqual([]);
  });

  it('pool 1 usa o ALIAS do vocabulário legado (listas → arrays da Biblioteca)', () => {
    const trackListas = remediationActivity({
      id: 't-listas',
      conceptTags: ['listas', 'loops'],
      language: 'python',
      courseId: 'py',
      courseSlug: 'introducao-python',
    });
    const map = new Map(byId);
    map.set(trackListas.id, trackListas);
    const fragile = computeFragileConcepts({
      submissions: failures('t-listas', 3),
      activitiesById: map,
      passedActivityIds: new Set<string>(),
      libraryActivities: [bibArrays],
      enrolledActivities: [trackListas],
    });
    const listas = fragile.find((f) => f.conceptTag === 'listas');
    expect(listas?.reinforcement?.id).toBe('bib-arrays');
    expect(listas?.reinforcement?.source).toBe('library');
  });

  it('pool 1 prefere a linguagem da última falha', () => {
    const fragile = computeFragileConcepts({
      submissions: failures('t-loops', 3),
      activitiesById: byId,
      passedActivityIds: new Set<string>(),
      libraryActivities: [bibLoopsJs, bibLoopsPy],
      enrolledActivities: [trackAct],
    });
    // última falha foi em atividade python → reforço python, não o JS de order menor
    expect(fragile[0].reinforcement?.id).toBe('bib-loops-py');
  });

  it('pool 2: sem Biblioteca, oferece atividade da trilha NUNCA tentada com o conceito', () => {
    const fragile = computeFragileConcepts({
      submissions: failures('t-loops', 3),
      activitiesById: byId,
      passedActivityIds: new Set<string>(),
      libraryActivities: [],
      enrolledActivities: [trackAct, trackUntried],
    });
    expect(fragile[0].reinforcement?.id).toBe('t-loops-2');
    expect(fragile[0].reinforcement?.source).toBe('track');
  });

  it('sem reforço disponível: null COM o motivo declarado', () => {
    const fragile = computeFragileConcepts({
      submissions: failures('t-loops', 4),
      activitiesById: byId,
      passedActivityIds: new Set(['bib-loops-py', 'bib-loops-js']),
      libraryActivities: [bibLoopsPy, bibLoopsJs],
      enrolledActivities: [trackAct],
    });
    expect(fragile[0].reinforcement).toBeNull();
    expect(fragile[0].unavailableReason).toBe('no-reinforcement-available');
  });

  it('submissão em atividade desconhecida é ignorada (sem conceito inventado)', () => {
    const fragile = computeFragileConcepts({
      submissions: failures('ghost', 9),
      activitiesById: byId,
      passedActivityIds: new Set<string>(),
      libraryActivities: [],
      enrolledActivities: [],
    });
    expect(fragile).toEqual([]);
  });
});
