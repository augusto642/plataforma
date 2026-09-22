import {
  CURRICULUM_TRACKS,
  getLessonByStage,
  getLessonById,
  PYTHON_LESSONS,
  JAVASCRIPT_LESSONS,
  JAVA_LESSONS,
} from '../PedagogyCurriculum';

import {
  BEGINNER_BOSS_BATTLES,
  getAllBeginnerBosses,
  getBossChallengeForLanguage,
  INFINITE_LOOP_DRAKE,
  SYNTAX_ERROR_HYDRA,
  OFF_BY_ONE_GOBLIN,
} from '../BossBattlesData';

import { getClientSocraticHint, CAT_SOUND_CUES } from '../SocraticCatPrompts';

describe('PedagogyCurriculum — Matriz Curricular dos 3 Starters', () => {
  it('deve possuir 5 lições modulares em cada uma das 3 trilhas', () => {
    expect(PYTHON_LESSONS).toHaveLength(5);
    expect(JAVASCRIPT_LESSONS).toHaveLength(5);
    expect(JAVA_LESSONS).toHaveLength(5);
    expect(CURRICULUM_TRACKS.python).toHaveLength(5);
    expect(CURRICULUM_TRACKS.javascript).toHaveLength(5);
    expect(CURRICULUM_TRACKS.java).toHaveLength(5);
  });

  it('todas as lições devem ter Modo Zen ativado com leitura sem contagem regressiva', () => {
    const allLessons = [...PYTHON_LESSONS, ...JAVASCRIPT_LESSONS, ...JAVA_LESSONS];
    for (const lesson of allLessons) {
      expect(lesson.zenMode.enabled).toBe(true);
      expect(lesson.zenMode.description).toContain('Modo Zen');
      expect(lesson.visualMetaphor).toBeDefined();
      expect(lesson.memoryDiagram.ascii.trim().length).toBeGreaterThan(10);
      expect(lesson.stepByStepCode.code.trim().length).toBeGreaterThan(10);
      expect(lesson.socraticReflection.question.trim().length).toBeGreaterThan(10);
    }
  });

  it('deve buscar lições corretamente por estágio e por ID global', () => {
    const pyStage1 = getLessonByStage('python', 1);
    expect(pyStage1).toBeDefined();
    expect(pyStage1?.slug).toBe('variaveis-caixas-etiquetadas');

    const jsStage3 = getLessonByStage('javascript', 3);
    expect(jsStage3).toBeDefined();
    expect(jsStage3?.slug).toBe('condicionais-estritas');

    const javaStage5 = getLessonById('java-lesson-5');
    expect(javaStage5).toBeDefined();
    expect(javaStage5?.title).toContain('Métodos');
  });
});

describe('BossBattlesData — Batalhas de Chefões Iniciantes', () => {
  it('deve disponibilizar os 3 bosses épicos para o nível iniciante', () => {
    const bosses = getAllBeginnerBosses();
    expect(bosses).toHaveLength(3);
    expect(BEGINNER_BOSS_BATTLES['infinite_loop_drake']).toBe(INFINITE_LOOP_DRAKE);
    expect(BEGINNER_BOSS_BATTLES['syntax_error_hydra']).toBe(SYNTAX_ERROR_HYDRA);
    expect(BEGINNER_BOSS_BATTLES['off_by_one_goblin']).toBe(OFF_BY_ONE_GOBLIN);
  });

  it('cada boss deve suportar as 3 linguagens com baterias visíveis e ocultas', () => {
    const languages: Array<'python' | 'javascript' | 'java'> = ['python', 'javascript', 'java'];

    for (const boss of getAllBeginnerBosses()) {
      for (const lang of languages) {
        const impl = getBossChallengeForLanguage(boss.slug.replace(/-/g, '_'), lang) || boss.implementations[lang];
        expect(impl).toBeDefined();
        expect(impl.language).toBe(lang);
        expect(impl.buggedStarterCode.trim().length).toBeGreaterThan(10);
        expect(impl.referenceSolution.trim().length).toBeGreaterThan(10);

        const visibleTests = impl.testCases.filter((t) => !t.hidden);
        const hiddenTests = impl.testCases.filter((t) => t.hidden);

        expect(visibleTests.length).toBeGreaterThanOrEqual(2);
        expect(hiddenTests.length).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe('SocraticCatPrompts — Frontend Heuristics & Audio Cues', () => {
  it('deve responder a timeout com alerta e sound cue correto', () => {
    const hint = getClientSocraticHint('Time limit exceeded', '', 1, 'Pythox');
    expect(hint.mood).toBe('alert');
    expect(hint.metaphor).toContain('Pista de Corrida');
    expect(hint.soundCue).toEqual(CAT_SOUND_CUES.alert_chirp);
  });

  it('deve responder a erros de sintaxe orientando sobre chaves e dois-pontos', () => {
    const hint = getClientSocraticHint('Syntax error: invalid syntax', '', 2, 'Pythox');
    expect(hint.speech).toContain('dois-pontos');
    expect(hint.metaphor).toContain('Régua de Indentação');
  });

  it('deve responder a erros de indexação alertando sobre base zero', () => {
    const hint = getClientSocraticHint('Index out of bounds', '', 1, 'Scripty');
    expect(hint.mood).toBe('curious');
    expect(hint.question).toContain('começou a contar no 0 ou no 1');
  });
});
