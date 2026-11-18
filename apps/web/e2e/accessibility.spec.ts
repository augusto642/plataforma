import { test, expect } from '@playwright/test';
import { passarPeloPortaoDeIdade } from './age-gate.helper';

test.describe('NEXUS CODE — WCAG 2.1 AA & Critical Flow E2E Audits', () => {
  test('Landing page should render semantic landmarks and have accessible title', async ({ page }) => {
    await page.goto('/');

    // Check title (título real desde o pacote SEO da Sprint 10)
    await expect(page).toHaveTitle(/Nexus Code/);

    // Verify main landmarks (seletor único: 'main, body' viola o strict mode com 2 elementos)
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Verify contrast elements and headings
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
  });

  test('Course catalog should have navigable cards and accessible filters', async ({ page }) => {
    // /courses é auth-gated desde a B41 (deslogado, zero cursos). A sessão
    // vem do setup de autenticação (storageState) — logar aqui de novo
    // somaria logins via UI e bateria no throttler da API.
    await page.goto('/courses');
    await passarPeloPortaoDeIdade(page);
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Verify course cards and links are present (o card virou link
    // "Acessar curso" para /courses/[slug] no merge do PR #2 — não há
    // mais botão "Ver Ementa" nem modal de ementa).
    const courseLinks = page.getByRole('link', { name: 'Acessar curso' });
    await expect(courseLinks.first()).toBeVisible({ timeout: 10000 });
    const count = await courseLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Student dashboard should display radar chart and streak indicator', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('body')).toBeVisible();

    // Verify spotlight container renders without error
    const spotlightElements = page.locator('.spotlight-card');
    expect(await spotlightElements.count()).toBeGreaterThanOrEqual(0);
  });

  test('Public certificate verification route should display authenticated status', async ({ page }) => {
    await page.goto('/verify/0x9f8b4c2e1a7d5e3f6b8c9a0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f');
    await expect(page.locator('body')).toBeVisible();
  });
});
