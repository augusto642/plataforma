/**
 * M18 (Lote 4) — `parseError` único compartilhado pelos clients da API
 * em `app/lib` (challenges, community, interview, reviews, talent).
 *
 * Antes, cada um dos 5 arquivos definia a sua própria cópia, byte a
 * byte idêntica em comportamento (só a formatação variava). Qualquer
 * mudança no mapeamento de erro precisava ser repetida 5 vezes.
 *
 * Comportamento preservado exatamente:
 * - lê `body.message` (string ou string[]; array vira join com espaço);
 * - sem `message`, usa 'Não foi possível completar a operação.';
 * - corpo que não é JSON vira `{}` (não lança na leitura).
 */
export async function parseError(res: Response): Promise<Error> {
  const body = await res.json().catch(() => ({}));
  const message =
    (body as { message?: string | string[] }).message ?? 'Não foi possível completar a operação.';
  return new Error(Array.isArray(message) ? message.join(' ') : message);
}
