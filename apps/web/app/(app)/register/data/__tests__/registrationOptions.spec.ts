import { describe, expect, it } from 'vitest';
import {
  CAREER_GOALS as SHARED_CAREER_GOALS,
  EXPERIENCE_LEVELS,
  WEEKLY_TIME_COMMITMENTS,
} from '@plataforma/contracts';
import {
  CAREER_GOAL_GROUPS,
  CAREER_GOAL_MAP,
  CAREER_GOALS,
  evaluateChallengeLocally,
  getFallbackChallenge,
  normalizeApiChallenge,
  normalizeApiEvaluation,
  PRIMARY_TECH_MAP,
  PRIMARY_TECHNOLOGIES,
  TIME_COMMITMENTS,
} from '../registrationOptions';

describe('registration options', () => {
  it('covers the shared career and time options without duplicate ids', () => {
    expect(CAREER_GOALS.map(({ id }) => id)).toEqual([...SHARED_CAREER_GOALS]);
    expect(new Set(CAREER_GOALS.map(({ id }) => id)).size).toBe(CAREER_GOALS.length);
    expect(Object.keys(CAREER_GOAL_MAP)).toHaveLength(SHARED_CAREER_GOALS.length);
    expect(TIME_COMMITMENTS.map(({ id }) => id)).toEqual([...WEEKLY_TIME_COMMITMENTS]);
    expect(CAREER_GOAL_GROUPS.map(({ id }) => id)).toEqual([
      'dev_web',
      'ai_data',
      'cloud_infra',
      'specialties',
      'career_product',
    ]);
  });

  it('provides a recommendation for every technology and level value', () => {
    expect(Object.keys(PRIMARY_TECH_MAP)).toHaveLength(PRIMARY_TECHNOLOGIES.length);
    expect(EXPERIENCE_LEVELS).toEqual(['beginner', 'junior', 'mid', 'senior']);
    expect(
      PRIMARY_TECHNOLOGIES.every(
        (tech) => tech.id === 'undecided' || tech.recommendedGoals.length > 0,
      ),
    ).toBe(true);
  });
});

describe('registration challenge normalization and fallback', () => {
  it('normalizes the public API challenge shape without changing its id or code', () => {
    expect(
      normalizeApiChallenge(
        {
          id: 'reg-javascript-v1',
          language: 'javascript',
          languageLabel: 'JavaScript',
          title: 'Leitura de código',
          prompt: 'Explique o código.',
          codeSnippet: 'return true;',
          hint: 'Leia a condição.',
        },
        true,
        'javascript',
      ),
    ).toEqual({
      id: 'reg-javascript-v1',
      language: 'javascript',
      languageLabel: 'JavaScript',
      title: 'Leitura de código',
      prompt: 'Explique o código.',
      code: 'return true;',
      hint: 'Leia a condição.',
      difficultyLabel: 'Leitura de código',
    });
  });

  it('uses backend-compatible challenge IDs when the API is unavailable', () => {
    expect(getFallbackChallenge(false).id).toBe('reg-logic-v1');
    expect(getFallbackChallenge(true, 'javascript').id).toBe('reg-javascript-v1');
    expect(getFallbackChallenge(true, 'python').language).toBe('logic');
  });

  it('labels heuristic evaluation honestly and keeps API evaluation metadata', () => {
    const local = evaluateChallengeLocally({
      hasProgrammedBefore: false,
      explanation: 'A lista percorre cada item; se o valor for maior, soma no total.',
    });
    expect(local.source).toBe('heuristic');
    expect(local.identifiedConcepts.length).toBeGreaterThan(0);

    expect(
      normalizeApiEvaluation(
        {
          detectedLevel: 'junior',
          levelLabel: 'Júnior',
          detectedConcepts: ['Laços'],
          feedback: 'Boa leitura.',
          source: 'llm',
        },
        true,
        'A função percorre a lista.',
      ),
    ).toMatchObject({
      level: 'Júnior',
      experienceLevel: 'junior',
      identifiedConcepts: ['Laços'],
      source: 'llm',
    });
  });
});
