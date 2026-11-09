/**
 * M5 (Lote 4) — ORDEM CANÔNICA DE AQUISIÇÃO DE LOCKS nas transações que
 * tocam `submissions`, `test_case_results`, `users`, `user_companions` e
 * `user_badges`.
 *
 * Ordem (sempre nesta sequência dentro de uma transação):
 *
 *   submissions → test_case_results → users → user_companions → user_badges
 *
 * Por que `submissions` primeiro (e não `users`, como seria o intuitivo)?
 * O claim de XP do evaluator é um CAS na linha da submissão
 * (`updateMany({ xpAwarded: false })`) e PRECISA preceder o prêmio (C8,
 * Lote 1: claim + prêmio na mesma transação, senão o XP se perde ou é
 * pago em dobro). Travar o usuário antes do claim quebraria essa
 * invariante — ou pagaria XP por uma submissão que outro worker já
 * reclamou, ou exigiria um lock sem escrita na linha do usuário. Por
 * isso o caminho divergente foi ajustado para o evaluator, não o
 * contrário: o `battleRun` passou a travar a submissão antes do usuário.
 *
 * Achado que motivou a unificação (Tech Lead): o evaluator travava
 * `submission` → `users`, enquanto o `battleRun` travava
 * `users` → `companions` → `submissions`. Um ciclo de deadlock exige a
 * MESMA linha de submissão nas duas transações em ordem inversa — e o
 * roteamento atual impede isso (o processor separa os jobs por tipo e o
 * housekeeping NUNCA re-enfileira uma battle travada como `evaluate`,
 * justamente para não premiar XP em dobro). O risco, portanto, é LATENTE,
 * não observado: qualquer caminho futuro que toque a mesma submissão +
 * usuário na ordem inversa travaria em ciclo. Com a ordem única, duas
 * transações que precisam das mesmas linhas sempre esperam na mesma
 * sequência — o Postgres serializa em vez de travar em ciclo.
 *
 * Caminhos cobertos (verificados no spec `tx-lock-order.spec.ts`):
 * - `EvaluatorService.processSubmission` — submissions → testCaseResults
 *   → users (+ userBadges, via `GamificationService.awardSubmissionXp`).
 * - `SubmissionsService.executeBattleRunInner` — submissions →
 *   testCaseResults → users → userCompanions.
 *
 * Fora do escopo da ordem (não tocam submission/companion e não formam
 * ciclo com os caminhos acima): `AuthService` (user → emailVerificationCode
 * / refreshToken → refreshToken) e `reconcileXp` (só users, leitura de
 * submissions sem lock).
 */
export const TX_LOCK_ORDER = [
  'submissions',
  'test_case_results',
  'users',
  'user_companions',
  'user_badges',
] as const;

export type TxLockedTable = (typeof TX_LOCK_ORDER)[number];
