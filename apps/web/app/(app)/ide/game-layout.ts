/**
 * Central 219 lote 4 (D4) — lógica pura da tela de jogo (/ide) em 3
 * colunas do protótipo desafio-jogo.html. Só dados reais: a próxima
 * atividade é a seguinte na lista de atividades do curso, na ordem
 * que a API devolve — nunca uma fase inventada.
 */

/** Próxima atividade depois da atual, ou null (fim da lista). */
export function nextActivity<T extends { id: string }>(
  activities: T[],
  currentId: string | null | undefined,
): T | null {
  if (!currentId) return null;
  const idx = activities.findIndex((a) => a.id === currentId);
  if (idx === -1) return null;
  return activities[idx + 1] ?? null;
}

/** "passados/total" dos resultados reais da submissão, ou null. */
export function passedTestSummary(
  testResults: Array<{ passed: boolean }> | null | undefined,
): string | null {
  if (!testResults || testResults.length === 0) return null;
  const passed = testResults.filter((t) => t.passed).length;
  return `${passed}/${testResults.length} testes aprovados`;
}
