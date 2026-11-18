import { validate } from 'class-validator';
import { MAX_SUBMISSION_CODE_LENGTH } from './create-submission.dto';
import { PlaygroundRunDto } from './playground-run.dto';
import { PracticeRunDto } from './practice-run.dto';

describe('practice execution validation', () => {
  it('accepts a valid activity and rejects invalid or oversized input', async () => {
    const dto = Object.assign(new PracticeRunDto(), {
      activityId: '5a58b5df-634a-4b99-94b9-64b734c01b03',
      code: 'print(1)',
      stdin: '2',
    });
    expect(await validate(dto)).toHaveLength(0);
    dto.activityId = 'invalid';
    dto.code = 'x'.repeat(MAX_SUBMISSION_CODE_LENGTH + 1);
    dto.stdin = 'x'.repeat(10_001);
    expect((await validate(dto)).map((error) => error.property)).toEqual(
      expect.arrayContaining(['activityId', 'code', 'stdin']),
    );
  });

  it('rejects unsupported playground languages and empty code', async () => {
    const dto = Object.assign(new PlaygroundRunDto(), { language: 'java', code: '' });
    expect((await validate(dto)).map((error) => error.property)).toEqual(
      expect.arrayContaining(['language', 'code']),
    );
  });
});
