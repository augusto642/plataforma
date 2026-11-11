/**
 * C8 (Lote 1) — CLI de reconciliação de XP.
 *
 * Uso (a partir de apps/api, após `npm run build`):
 *   DATABASE_URL=postgres://... npm run reconcile:xp            # só lista divergências
 *   DATABASE_URL=postgres://... npm run reconcile:xp -- --fix   # lista E corrige xp+level
 *
 * Requer DATABASE_URL apontando para o banco da API. Sem banco ao vivo o
 * comando falha na conexão — nunca inventa dados. Ver
 * src/gamification/xp-reconciliation.ts para a regra e a cadência (1×/semana).
 */
import 'dotenv/config';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { GamificationService } from './gamification/gamification.service';
import { GamificationModule } from './gamification/gamification.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, GamificationModule],
})
class ReconcileXpCliModule {}

async function main(): Promise<void> {
  const fix = process.argv.includes('--fix');
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required to run the XP reconciliation.');
    process.exit(2);
  }
  const app = await NestFactory.createApplicationContext(ReconcileXpCliModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const gamification = app.get(GamificationService);
    const report = await gamification.reconcileXp({ fix });
    console.log(
      `Checked ${report.checkedUsers} users, ${report.checkedSubmissions} awarded submissions.`,
    );
    if (report.divergences.length === 0) {
      console.log('No XP divergences found.');
    } else {
      for (const d of report.divergences) {
        console.log(
          `- ${d.email} (${d.userId}): actual=${d.actualXp} expected=${d.expectedXp} delta=${d.delta}`,
        );
      }
      if (fix) {
        console.log(`Fixed ${report.fixed} user(s).`);
      } else {
        console.log('Read-only mode: nothing was changed. Re-run with --fix to correct.');
      }
    }
    process.exit(report.divergences.length > 0 && !fix ? 1 : 0);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(`XP reconciliation failed: ${err.message}`);
  process.exit(1);
});
