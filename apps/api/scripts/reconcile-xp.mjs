#!/usr/bin/env node
/**
 * C8 (Lote 1) — Atalho operacional para a reconciliação de XP.
 * Encaminha para o CLI compilado (rode `npm run build` antes):
 *   node scripts/reconcile-xp.mjs            # só lista divergências
 *   node scripts/reconcile-xp.mjs --fix      # lista E corrige xp+level
 * Equivalente a `npm run reconcile:xp [-- --fix]`.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(root, 'dist', 'reconcile-xp.cli.js');
if (!existsSync(cli)) {
  console.error(
    'dist/reconcile-xp.cli.js not found. Run `npm run build` in apps/api first.',
  );
  process.exit(2);
}
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});
process.exit(result.status ?? 1);
