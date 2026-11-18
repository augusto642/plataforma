import { BadRequestException } from '@nestjs/common';
import { CuratedReferencesController } from './curated-references.controller';

describe('curated reference search', () => {
  const findMany = jest.fn();
  const controller = new CuratedReferencesController({ knowledgeCurationCandidate: { findMany } } as never);

  beforeEach(() => jest.clearAllMocks());

  it('returns reviewed metadata ordered by matching concepts', async () => {
    findMany.mockResolvedValue([
      { id: 'a', topics: ['loops'], publishedAt: new Date(), reference: { title: 'A', url: 'https://example.org/a', license: 'CC BY' } },
      { id: 'b', topics: ['loops', 'funcoes'], publishedAt: new Date(), reference: { title: 'B', url: 'https://example.org/b', license: 'CC BY' } },
    ]);
    const result = await controller.search('loops,funcoes');
    expect(result.map((item) => item.id)).toEqual(['b', 'a']);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: 'published', topics: { hasSome: ['loops', 'funcoes'] },
        reference: expect.objectContaining({ status: 'approved', license: { not: null } }),
      }),
    }));
  });

  it('rejects invalid topics before querying', async () => {
    await expect(controller.search('loops,../bad')).rejects.toBeInstanceOf(BadRequestException);
    expect(findMany).not.toHaveBeenCalled();
  });
});
