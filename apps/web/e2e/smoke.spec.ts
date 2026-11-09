import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('homepage loads nexus code landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=NEXUS CODE').first()).toBeVisible();
    await expect(page.locator('text=Entrar').first()).toBeVisible();
  });

  // Lote 1 / C3: sem conta demo e sem sessão falsa — credenciais
  // inválidas (ou backend fora do ar) devem mostrar erro e NÃO
  // autenticar nem redirecionar ao dashboard.
  test('login page rejects invalid credentials without a fake session', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'inexistente@teste.local');
    await page.fill('input[type="password"]', 'senha-invalida-teste-123');
    await page.click('button:has-text("Entrar na Plataforma")');

    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('authenticated student can view courses and open course modal', async ({ page }) => {
    await page.goto('/courses');
    const firstCourseBtn = page.locator('button:has-text("Ver Ementa")').first();
    await expect(firstCourseBtn).toBeVisible({ timeout: 10000 });
    await firstCourseBtn.click();

    await expect(page.locator('text=Ementa Completa').or(page.locator('text=Iniciar Trilha')).first()).toBeVisible();
  });

  test('web ide loads', async ({ page }) => {
    await page.goto('/ide');
    await expect(page.locator('body')).toBeVisible();

    await expect(page.locator('text=NEXUS').or(page.locator('text=Executar')).or(page.locator('text=Instruções')).first()).toBeVisible({ timeout: 10000 });
  });
});
