// Valida o seed da torre SEM banco: cada solução de referência precisa
// passar no próprio testCode (o mesmo script que o Piston vai rodar).
//   node scripts/validate-seed-tower.mjs
import vm from 'node:vm';
import { FLOORS } from './seed-tower.mjs';

let passed = 0;
const failures = [];

for (const floor of FLOORS) {
  const all = [
    ...floor.challenges.map((c, i) => ({ ...c, slug: `torre-f${floor.floor}-c${i + 1}` })),
    { ...floor.guardian, slug: `torre-f${floor.floor}-guardiao` },
  ];
  for (const c of all) {
    try {
      vm.runInNewContext(`${c.solution}\n${c.testCode}`, {}, { timeout: 2000 });
      passed += 1;
    } catch (e) {
      failures.push(`${c.slug}: ${e.message}`);
    }
  }
}

console.log(
  `[validate-seed-tower] ${passed} passaram, ${failures.length} falharam (total ${passed + failures.length}).`,
);
if (failures.length > 0) {
  for (const f of failures) console.log(`  FALHOU: ${f}`);
  process.exit(1);
}
