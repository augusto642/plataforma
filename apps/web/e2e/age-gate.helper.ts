import type { Page } from '@playwright/test';

/**
 * Portão de elegibilidade do alfa (AdultEligibilityGate, b10d3a9):
 * /courses, /courses/[slug], /game, /onboarding e /diagnostico só
 * mostram o conteúdo depois de confirmar maioridade. O estado vive em
 * sessionStorage — o storageState do Playwright NÃO o persiste, então
 * cada contexto de teste começa com o portão visível. Sem passar por
 * ele, os testes enxergam só o portão e falham com "element(s) not found".
 *
 * O fluxo é o do usuário real: marcar o checkbox e clicar "Continuar".
 * Em /courses o portão ainda pede um token ao servidor
 * (POST /auth/guest-age-eligibility, público), o que a espera pelo
 * sumiço do título já cobre.
 */
export async function passarPeloPortaoDeIdade(page: Page): Promise<void> {
  const titulo = page.getByText(/Elegibilidade do alfa/i);
  try {
    await titulo.waitFor({ state: 'visible', timeout: 5000 });
  } catch {
    return; // Sem portão: conteúdo já liberado.
  }
  await page.getByLabel(/Confirmo que tenho 18 anos/).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await titulo.waitFor({ state: 'hidden', timeout: 10000 });
}
