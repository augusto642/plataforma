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
});
