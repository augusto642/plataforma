import {
  CAREER_GOAL_TO_TRACK,
  DEFAULT_TRACK,
  MARKET_EVIDENCE_THRESHOLD,
  buildRationaleText,
  dedupeSignalsByUrl,
  isMarketEvidence,
  isSlaOverdue,
  scoreMarketSignal,
  slaDueAtFrom,
  suggestTrack,
  toMarketEvidence,
  type CareerGoal,
  type ExperienceLevel,
  type MarketEvidenceItem,
} from './dynamic-track.rules';

describe('suggestTrack — precedência (DESIGN D1)', () => {
  it('diagnóstico vence hint da landing e objetivo', () => {
    expect(
      suggestTrack({
        diagnosticTrackId: 'ai',
        sourceTrack: 'frontend',
        careerGoal: 'lead',
        expLevel: 'senior',
      }),
    ).toEqual({
      track: 'ai',
      trackName: 'Inteligência Artificial',
      reasons: ['diagnostic'],
    });
  });

  it('hint da landing vence objetivo', () => {
    const out = suggestTrack({
      sourceTrack: 'web3',
      careerGoal: 'lead',
    });
    expect(out.track).toBe('web3');
    expect(out.reasons).toEqual(['landing-hint']);
  });

  it('objetivo decide quando não há diagnóstico nem hint', () => {
    expect(suggestTrack({ careerGoal: 'lead' }).track).toBe('backend');
    expect(suggestTrack({ careerGoal: 'startup' }).track).toBe('web3');
    expect(suggestTrack({ careerGoal: 'global' }).track).toBe('frontend');
    expect(suggestTrack({ careerGoal: 'hackathons' }).track).toBe(
      'frontend',
    );
  });

  it('fallback é frontend com motivo default-entry', () => {
    expect(suggestTrack({})).toEqual({
      track: DEFAULT_TRACK,
      trackName: 'Desenvolvimento Front-end',
      reasons: ['default-entry'],
    });
    expect(suggestTrack({ expLevel: 'senior' }).track).toBe('frontend');
  });

  it('é determinística: mesma entrada, mesma saída', () => {
    const input = { careerGoal: 'lead' as CareerGoal, expLevel: 'mid' as ExperienceLevel };
    expect(suggestTrack(input)).toEqual(suggestTrack(input));
  });
});

describe('suggestTrack — todas as combinações objetivo × nível', () => {
  const goals: CareerGoal[] = ['global', 'lead', 'startup', 'hackathons'];
  const levels: Array<ExperienceLevel | null> = [
    'junior',
    'mid',
    'senior',
    null,
  ];
  it.each(
    goals.flatMap((goal) => levels.map((level) => ({ goal, level }))),
  )(
    'objetivo $goal × nível $level → trilha do objetivo',
    ({ goal, level }) => {
      const out = suggestTrack({ careerGoal: goal, expLevel: level });
      expect(out.track).toBe(CAREER_GOAL_TO_TRACK[goal]);
      expect(out.reasons).toEqual([`career-goal:${goal}`]);
    },
  );
});

describe('scoreMarketSignal — spec last30days §7', () => {
  const base = {
    isOfficialSource: false,
    confirmedBySecondSource: false,
    affectsGoal: false,
    affectsStableVersion: false,
    isBetaOrRumor: false,
  };

  it('oficial 50 + 2ª fonte 25 + objetivo 15 + estável 10 = 100', () => {
    expect(
      scoreMarketSignal({
        ...base,
        isOfficialSource: true,
        confirmedBySecondSource: true,
        affectsGoal: true,
        affectsStableVersion: true,
      }),
    ).toBe(100);
  });

  it('só fonte oficial = 50 (abaixo do limiar)', () => {
    expect(scoreMarketSignal({ ...base, isOfficialSource: true })).toBe(50);
  });

  it('oficial + 2ª fonte = 75 (vira evidência)', () => {
    expect(
      scoreMarketSignal({
        ...base,
        isOfficialSource: true,
        confirmedBySecondSource: true,
      }),
    ).toBe(75);
  });

  it('beta/RC/rumor = 0 mesmo com fonte oficial', () => {
    expect(
      scoreMarketSignal({
        ...base,
        isOfficialSource: true,
        confirmedBySecondSource: true,
        affectsGoal: true,
        affectsStableVersion: true,
        isBetaOrRumor: true,
      }),
    ).toBe(0);
  });

  it('limiar: 70 vira evidência, 69 não', () => {
    expect(isMarketEvidence(70)).toBe(true);
    expect(isMarketEvidence(69)).toBe(false);
    expect(MARKET_EVIDENCE_THRESHOLD).toBe(70);
  });
});

function evidenceItem(overrides: Partial<MarketEvidenceItem>): MarketEvidenceItem {
  return {
    titulo: 'Python 3.14 estável',
    tecnologia: 'Python',
    tipo: 'versão estável',
    publishedAt: '2026-10-07T00:00:00.000Z',
    retrievedAt: '2026-11-10T00:00:00.000Z',
    sourceName: 'Python Docs',
    sourceUrl: 'https://docs.python.org/3/whatsnew/3.14.html',
    evidencia: 'Release notes da versão estável.',
    objetivoAfetado: 'global',
    passoAfetado: null,
    score: 75,
    ...overrides,
  };
}

describe('toMarketEvidence — só >= 70 com fonte+URL+data', () => {
  it('mantém sinal >= 70 com fonte, URL e data', () => {
    expect(toMarketEvidence([evidenceItem({})])).toHaveLength(1);
  });

  it('descarta score < 70, beta/rumor e sinal sem fonte/URL/data', () => {
    const out = toMarketEvidence([
      evidenceItem({ score: 50, sourceUrl: 'https://a.example/1' }),
      evidenceItem({
        score: 90,
        isBetaOrRumor: true,
        sourceUrl: 'https://a.example/2',
      }),
      evidenceItem({ score: 90, sourceUrl: '' }),
      evidenceItem({ score: 90, publishedAt: '' }),
      evidenceItem({ score: 90, sourceName: '' }),
    ]);
    expect(out).toHaveLength(0);
  });

  it('dedupe por URL: mesma URL fica com o maior score', () => {
    const out = toMarketEvidence([
      evidenceItem({ score: 75 }),
      evidenceItem({ score: 90, titulo: 'Python 3.14 estável (confirmação)' }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].score).toBe(90);
  });
});

describe('dedupeSignalsByUrl', () => {
  it('mesma URL = confirmação, não sinal novo', () => {
    const { unique, duplicates } = dedupeSignalsByUrl([
      { sourceUrl: 'https://a.example/1' },
      { sourceUrl: 'https://a.example/2' },
      { sourceUrl: 'https://a.example/1' },
    ]);
    expect(unique).toHaveLength(2);
    expect(duplicates).toHaveLength(1);
  });
});

describe('SLA (DESIGN D3)', () => {
  it('slaDueAt é createdAt + 48h', () => {
    const created = new Date('2026-11-10T10:00:00.000Z');
    expect(slaDueAtFrom(created).toISOString()).toBe(
      '2026-11-12T10:00:00.000Z',
    );
  });

  it('overdue só depois do prazo', () => {
    const due = new Date('2026-11-12T10:00:00.000Z');
    expect(isSlaOverdue(new Date('2026-11-12T09:59:59.000Z'), due)).toBe(
      false,
    );
    expect(isSlaOverdue(new Date('2026-11-12T10:00:01.000Z'), due)).toBe(
      true,
    );
  });
});

describe('buildRationaleText', () => {
  it('monta texto por template e marca basis profile-only', () => {
    const text = buildRationaleText(['diagnostic'], 'profile-only');
    expect(text).toContain('quiz diagnóstico');
    expect(text).toContain('só o seu perfil');
  });

  it('basis profile+market cita os sinais verificados', () => {
    const text = buildRationaleText(['career-goal:lead'], 'profile+market');
    expect(text).toContain('liderança técnica');
    expect(text).toContain('sinais de mercado verificados');
  });
});
