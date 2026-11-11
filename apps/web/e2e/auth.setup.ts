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
  await page.click('button:has-text("Entrar na Plataforma")');
  await expect(page).toHaveURL(/.*dashboard/);
  await page.context().storageState({ path: authFile });
});
