import type { Prisma } from '@prisma/client';

export interface XpLedgerAward {
  userId: string;
  idempotencyKey: string;
  source: string;
  amount: number;
  description: string;
}

export async function recordXpLedgerEntry(
  tx: Prisma.TransactionClient,
  award: XpLedgerAward,
): Promise<boolean> {
  if (!Number.isSafeInteger(award.amount) || award.amount <= 0) {
    throw new RangeError('XP ledger amount must be a positive safe integer');
  }
  if (!award.idempotencyKey.trim()) {
    throw new Error('XP ledger idempotency key is required');
  }

  const result = await tx.xpLedgerEntry.createMany({
    data: [award],
    skipDuplicates: true,
  });
  return result.count === 1;
}
