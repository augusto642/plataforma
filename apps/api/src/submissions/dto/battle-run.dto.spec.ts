import { validate } from 'class-validator';
import { Language } from '@prisma/client';
import { BattleRunDto } from './battle-run.dto';
import { MAX_SUBMISSION_CODE_LENGTH } from './create-submission.dto';

describe('BattleRunDto (B02 input limits)', () => {
  const UUID = '123e4567-e89b-12d3-a456-426614174000';

  function dto(code: string) {
    return Object.assign(new BattleRunDto(), {
      activityId: UUID,
      companionId: UUID,
      code,
      language: Language.javascript,
    });
  }

  it('accepts code up to the shared submission limit', async () => {
    expect(await validate(dto('function solve() {}'))).toHaveLength(0);
    expect(
      await validate(dto('x'.repeat(MAX_SUBMISSION_CODE_LENGTH))),
    ).toHaveLength(0);
  });

  it('rejects code above the shared submission limit', async () => {
    const errors = await validate(
      dto('x'.repeat(MAX_SUBMISSION_CODE_LENGTH + 1)),
    );
    expect(errors.some((e) => e.property === 'code')).toBe(true);
  });
});
