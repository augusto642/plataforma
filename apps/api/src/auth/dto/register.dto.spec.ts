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
});
