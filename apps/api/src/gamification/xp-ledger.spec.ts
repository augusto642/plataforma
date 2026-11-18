import { recordXpLedgerEntry } from './xp-ledger';

describe('recordXpLedgerEntry', () => {
  const award = {
    userId: 'user-1',
    idempotencyKey: 'submission:sub-1',
    source: 'submission',
    amount: 70,
    description: 'Recompensa por desafio',
  };

  it('creates one ledger row and reports that the XP may be applied', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const tx = { xpLedgerEntry: { createMany } };

    await expect(recordXpLedgerEntry(tx as any, award)).resolves.toBe(true);
    expect(createMany).toHaveBeenCalledWith({
      data: [award],
      skipDuplicates: true,
    });
  });

  it('reports an existing idempotency key without asking the caller to apply XP again', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 0 });
    const tx = { xpLedgerEntry: { createMany } };

    await expect(recordXpLedgerEntry(tx as any, award)).resolves.toBe(false);
  });

  it('rejects non-positive or non-integer amounts and empty keys', async () => {
    const createMany = jest.fn();
    const tx = { xpLedgerEntry: { createMany } };

    await expect(recordXpLedgerEntry(tx as any, { ...award, amount: 0 })).rejects.toThrow(
      'positive safe integer',
    );
    await expect(
      recordXpLedgerEntry(tx as any, { ...award, amount: 1.5 }),
    ).rejects.toThrow('positive safe integer');
    await expect(
      recordXpLedgerEntry(tx as any, { ...award, idempotencyKey: ' ' }),
    ).rejects.toThrow('idempotency key is required');
    expect(createMany).not.toHaveBeenCalled();
  });
});
