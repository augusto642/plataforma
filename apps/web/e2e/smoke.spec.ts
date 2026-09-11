import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('homepage loads with login form', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Plataforma LMS')).toBeVisible();
    await expect(page.locator('text=Entrar')).toBeVisible();
  });

  test('login redirects to courses list', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'aluno@plataforma.local');
    await page.fill('input[type="password"]', 'aluno12345');
    await page.click('button:has-text("Entrar na Plataforma")');

    await expect(page.locator('text=Cursos Disponíveis')).toBeVisible();
  });
});
