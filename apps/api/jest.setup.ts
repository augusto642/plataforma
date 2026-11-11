/**
 * Jest setup (setupFiles — roda antes de cada arquivo de teste).
 *
 * P6 — C1 (Lote 1 P0): `BILLING_WEBHOOK_SECRET` é obrigatório em QUALQUER
 * ambiente, inclusive NODE_ENV=test, e `validateRequiredSecrets` roda no
 * `ConfigModule.forRoot({ validate })` do AppModule. Sem este valor, todo
 * teste que sobe o módulo real (ex.: user-throttler.guard.spec) falha no
 * boot com "Missing required environment variable(s): BILLING_WEBHOOK_SECRET".
 *
 * Valor FIXO e FICTÍCIO, só para testes (>= 32 chars, sem placeholder):
 * nunca é um segredo real — o webhook simulado nunca é exercido com ele
 * fora dos testes de validação, que passam o env explicitamente e não
 * dependem de process.env.
 */
process.env.BILLING_WEBHOOK_SECRET =
  'test-only_0123456789abcdef0123456789abcdef0123456789abcdef';
