import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

describe('RegisterDto (self-service roles — B1 regression)', () => {
  const base = { email: 'a@b.com', name: 'Aluno Teste', password: '12345678' };

  function dto(role?: string) {
    return Object.assign(new RegisterDto(), role ? { ...base, role } : base);
  }

  it('accepts student and default role', async () => {
    expect(await validate(dto('student'))).toHaveLength(0);
    expect(await validate(dto())).toHaveLength(0);
  });

  it('rejects instructor role on self-service registration to prevent privilege escalation', async () => {
    const errors = await validate(dto('instructor'));
    expect(errors.some((e) => e.property === 'role')).toBe(true);
  });

  it('rejects admin — no public privilege escalation', async () => {
    const errors = await validate(dto('admin'));
    expect(errors.some((e) => e.property === 'role')).toBe(true);
  });

  it('rejects arbitrary strings as role', async () => {
    const errors = await validate(dto('superadmin'));
    expect(errors.some((e) => e.property === 'role')).toBe(true);
  });

  describe('UTM fields (B07)', () => {
    function dtoComUtm(utm: Record<string, unknown>) {
      return Object.assign(new RegisterDto(), { ...base, ...utm });
    }

    it('accepts a registration without any UTM field', async () => {
      expect(await validate(dtoComUtm({}))).toHaveLength(0);
    });

    it('accepts the three UTM fields as optional strings', async () => {
      const errors = await validate(
        dtoComUtm({ utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'lancamento' }),
      );
      expect(errors).toHaveLength(0);
    });

    it('rejects non-string UTM values', async () => {
      const errors = await validate(dtoComUtm({ utmSource: 123 }));
      expect(errors.some((e) => e.property === 'utmSource')).toBe(true);
    });

    it('rejects UTM values longer than 255 chars', async () => {
      const errors = await validate(dtoComUtm({ utmCampaign: 'x'.repeat(256) }));
      expect(errors.some((e) => e.property === 'utmCampaign')).toBe(true);
    });
  });

  describe('diagnosticSessionToken (B09)', () => {
    function dtoComToken(extra: Record<string, unknown>) {
      return Object.assign(new RegisterDto(), { ...base, ...extra });
    }

    it('accepts registration without the token and with a valid token', async () => {
      expect(await validate(dtoComToken({}))).toHaveLength(0);
      expect(
        await validate(dtoComToken({ diagnosticSessionToken: 'abc-123' })),
      ).toHaveLength(0);
    });

    it('rejects a non-string token and one longer than 64 chars', async () => {
      const notString = await validate(dtoComToken({ diagnosticSessionToken: 42 }));
      expect(
        notString.some((e) => e.property === 'diagnosticSessionToken'),
      ).toBe(true);
      const tooLong = await validate(
        dtoComToken({ diagnosticSessionToken: 'x'.repeat(65) }),
      );
      expect(tooLong.some((e) => e.property === 'diagnosticSessionToken')).toBe(
        true,
      );
    });
  });

  describe('novos campos de diagnóstico aberto, objetivo e tecnologia', () => {
    function dtoExtra(extra: Record<string, unknown>) {
      return Object.assign(new RegisterDto(), { ...base, ...extra });
    }

    it('aceita todos os novos campos opcionais dentro dos limites', async () => {
      const errors = await validate(
        dtoExtra({
          hasProgrammedBefore: true,
          priorLanguage: 'typescript',
          challengeId: 'reg-typescript-v1',
          challengeExplanation: 'Usa discriminated union com campo ok.',
          detectedLevel: 'mid',
          experienceLevel: 'beginner',
          primaryTechnology: 'Next.js',
          careerGoal: 'fullstack',
        }),
      );
      expect(errors).toHaveLength(0);
    });

    it('aceita todos os objetivos ampliados em careerGoal e careerGoals', async () => {
      const goals = [
        'frontend',
        'backend',
        'ai',
        'fullstack',
        'architect',
        'devops',
        'data_science',
        'data_engineering',
        'design',
        'freelancer',
        'mobile',
        'security',
        'qa',
        'global',
        'lead',
        'startup',
        'hackathons',
        'mlops',
        'platform_engineering',
        'cloud_architect',
        'gamedev',
        'blockchain',
        'embedded_iot',
        'automation_rpa',
        'product_manager',
      ];
      for (const careerGoal of goals) {
        expect(await validate(dtoExtra({ careerGoal }))).toHaveLength(0);
      }
      expect(
        await validate(
          dtoExtra({ careerGoals: ['mlops', 'cloud_architect', 'gamedev'] }),
        ),
      ).toHaveLength(0);
      expect(await validate(dtoExtra({ careerGoals: goals }))).toHaveLength(0);

      const invalid = await validate(dtoExtra({ careerGoal: 'invalido' }));
      expect(invalid.some((e) => e.property === 'careerGoal')).toBe(true);

      const emptyGoals = await validate(dtoExtra({ careerGoals: [] }));
      expect(emptyGoals.some((e) => e.property === 'careerGoals')).toBe(true);

      const overMaxGoals = await validate(
        dtoExtra({ careerGoals: [...goals, 'frontend'] }),
      );
      expect(overMaxGoals.some((e) => e.property === 'careerGoals')).toBe(true);

      const invalidItem = await validate(
        dtoExtra({ careerGoals: ['mlops', 'invalido'] }),
      );
      expect(invalidItem.some((e) => e.property === 'careerGoals')).toBe(true);

      const notArray = await validate(dtoExtra({ careerGoals: 'mlops' }));
      expect(notArray.some((e) => e.property === 'careerGoals')).toBe(true);
    });

    it('rejeita strings acima do MaxLength nos novos campos', async () => {
      expect(
        (await validate(dtoExtra({ priorLanguage: 'x'.repeat(51) }))).some(
          (e) => e.property === 'priorLanguage',
        ),
      ).toBe(true);
      expect(
        (await validate(dtoExtra({ challengeId: 'x'.repeat(65) }))).some(
          (e) => e.property === 'challengeId',
        ),
      ).toBe(true);
      expect(
        (
          await validate(dtoExtra({ challengeExplanation: 'x'.repeat(2001) }))
        ).some((e) => e.property === 'challengeExplanation'),
      ).toBe(true);
      expect(
        (await validate(dtoExtra({ primaryTechnology: 'x'.repeat(65) }))).some(
          (e) => e.property === 'primaryTechnology',
        ),
      ).toBe(true);
      expect(
        (await validate(dtoExtra({ detectedLevel: 'master' }))).some(
          (e) => e.property === 'detectedLevel',
        ),
      ).toBe(true);
    });
  });
});
