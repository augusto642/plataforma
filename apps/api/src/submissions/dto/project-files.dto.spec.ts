import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MAX_SUBMISSION_CODE_LENGTH } from './create-submission.dto';
import { normalizeProjectFiles } from './project-files.dto';
import { ProjectRunDto } from './project-run.dto';

describe('multi-file project validation', () => {
  const valid = {
    language: 'python',
    files: [{ name: 'helpers.py', content: 'value = 1' }, { name: 'main.py', content: 'print(1)' }],
  };

  it('places the entry file first', async () => {
    const dto = plainToInstance(ProjectRunDto, valid);
    expect(await validate(dto)).toHaveLength(0);
    expect(normalizeProjectFiles(dto).map((file) => file.name)).toEqual(['main.py', 'helpers.py']);
  });

  it('rejects unsupported language, duplicate and unsafe filenames', async () => {
    const dto = plainToInstance(ProjectRunDto, {
      language: 'portugol',
      files: [{ name: '../main.py', content: '' }, { name: '../main.py', content: '' }],
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('requires an entry point, matching extensions and a bounded total size', () => {
    const missing = plainToInstance(ProjectRunDto, { language: 'python', files: [valid.files[0]] });
    expect(() => normalizeProjectFiles(missing)).toThrow(BadRequestException);
    const wrongExtension = plainToInstance(ProjectRunDto, {
      language: 'python', files: [...valid.files, { name: 'extra.js', content: '' }],
    });
    expect(() => normalizeProjectFiles(wrongExtension)).toThrow(BadRequestException);
    const tooLarge = plainToInstance(ProjectRunDto, {
      language: 'python',
      files: [{ name: 'main.py', content: 'x'.repeat(MAX_SUBMISSION_CODE_LENGTH) }, valid.files[0]],
    });
    expect(() => normalizeProjectFiles(tooLarge)).toThrow(BadRequestException);
  });
});
