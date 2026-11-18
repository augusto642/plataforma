import { test as setup, expect } from '@playwright/test';

// Setup de autenticação (padrão Playwright): loga UMA vez por rodada e
// salva o estado autenticado em playwright/.auth/user.json. Motivo: a API
// limita /auth/login a 5 req/min por IP — os 4 logins via UI que a suíte
// fazia por rodada batiam no throttler (ThrottlerException no login) e
// tornavam a suíte flaky. Os testes autenticados usam este estado em vez
// de logar de novo; o teste de login do smoke continua exercendo a UI
// de login por conta própria.
const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'aluno@plataforma.local');
  await page.fill('input[type="password"]', 'aluno12345');
  // O botão de submit mudou de texto no merge do PR #2 (b10d3a9):
  // "Entrar na Plataforma" virou "Entrar" (branded) / "Entrar no jogo".
  // Seletor pelo type é robusto às duas variantes (há 1 submit no form).
  await page.click('button[type="submit"]');
  // Alfa externo (b10d3a9): /login (branded) só revela o checkbox de
  // maioridade DEPOIS que a tentativa falha com
  // AUTH_ADULT_ELIGIBILITY_REQUIRED — o fluxo real é enviar, marcar,
  // enviar de novo. Mas o servidor PERSISTE a confirmação
  // (users.adult_eligibility_accepted_at): numa base já usada, o
  // primeiro envio já autentica e redireciona, sem checkbox. Os dois
  // estados são válidos — o que vale é chegar ao dashboard.
  const ageBox = page.getByLabel(/Confirmo que tenho 18 anos/);
  try {
    await ageBox.waitFor({ state: 'visible', timeout: 5000 });
    await ageBox.check();
    await page.click('button[type="submit"]');
  } catch {
    // Sem checkbox: a conta já tinha confirmado maioridade antes.
  }
  await expect(page).toHaveURL(/.*dashboard/);
  await page.context().storageState({ path: authFile });
});
