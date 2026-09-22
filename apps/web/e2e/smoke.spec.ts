import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('homepage loads nexus code landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=NEXUS CODE').first()).toBeVisible();
    await expect(page.locator('text=Entrar').first()).toBeVisible();
  });

  test('login page loads and authenticates to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'aluno@plataforma.local');
    await page.fill('input[type="password"]', 'aluno12345');
    await page.click('button:has-text("Entrar na Plataforma")');

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('authenticated student can view courses and open course modal', async ({ page }) => {
    await page.goto('/courses');
    const firstCourseBtn = page.locator('button:has-text("Ver Ementa")').first();
    await expect(firstCourseBtn).toBeVisible({ timeout: 10000 });
    await firstCourseBtn.click();

    await expect(page.locator('text=Ementa Completa').or(page.locator('text=Iniciar Trilha')).first()).toBeVisible();
  });

  test('web ide loads and allows authentication to open code editor', async ({ page }) => {
    await page.goto('/ide');
    await expect(page.locator('body')).toBeVisible();

    // Check if auth view is shown and use quick fill
    const demoBtn = page.locator('text=Preencher Demo Aluno');
    if (await demoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await demoBtn.click();
      await page.click('button:has-text("Entrar na Plataforma")');
    }

    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=NEXUS').or(page.locator('text=Executar')).or(page.locator('text=Instruções')).first()).toBeVisible({ timeout: 10000 });
  });
});
