import { validate } from 'class-validator';
import {
  CreateSubmissionDto,
  MAX_COMMIT_SHA_LENGTH,
  MAX_SUBMISSION_CODE_LENGTH,
} from './create-submission.dto';

describe('CreateSubmissionDto (B02 input limits)', () => {
  const ACTIVITY_ID = '123e4567-e89b-12d3-a456-426614174000';

  function dto(partial: Partial<CreateSubmissionDto>) {
    return Object.assign(new CreateSubmissionDto(), {
      activityId: ACTIVITY_ID,
      ...partial,
    });
  }

  it('accepts a regular submission (code only or commitSha only)', async () => {
    expect(await validate(dto({ code: 'console.log(1)' }))).toHaveLength(0);
    expect(await validate(dto({ commitSha: 'a'.repeat(40) }))).toHaveLength(0);
  });

  it('accepts code exactly at the limit and rejects above it', async () => {
    const atLimit = await validate(
      dto({ code: 'x'.repeat(MAX_SUBMISSION_CODE_LENGTH) }),
    );
    expect(atLimit).toHaveLength(0);

    const above = await validate(
      dto({ code: 'x'.repeat(MAX_SUBMISSION_CODE_LENGTH + 1) }),
    );
    expect(above.some((e) => e.property === 'code')).toBe(true);
    expect(
      above.find((e) => e.property === 'code')?.constraints,
    ).toHaveProperty('maxLength');
  });

  it('accepts SHA-1 (40) and SHA-256 (64) commit SHAs and rejects longer garbage', async () => {
    expect(await validate(dto({ commitSha: 'a'.repeat(40) }))).toHaveLength(0);
    expect(
      await validate(dto({ commitSha: 'a'.repeat(MAX_COMMIT_SHA_LENGTH) })),
    ).toHaveLength(0);

    const above = await validate(
      dto({ commitSha: 'a'.repeat(MAX_COMMIT_SHA_LENGTH + 1) }),
    );
    expect(above.some((e) => e.property === 'commitSha')).toBe(true);
  });
});
