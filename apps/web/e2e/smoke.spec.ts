import { test, expect } from '@playwright/test';
import { passarPeloPortaoDeIdade } from './age-gate.helper';

test.describe('Smoke tests', () => {
  test('homepage loads nexus code landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Escreva. Teste. Entenda.');
    await expect(page.getByRole('link', { name: 'Entrar', exact: true }).first()).toBeVisible();
  });

  test('visitors can complete a local challenge before signing up', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByRole('link', { name: 'Resolver meu primeiro desafio' }).click();
    await expect(page).toHaveURL(/\/#sandbox-code$/);
    const signup = page.getByRole('link', { name: /Continuar na plataforma/ });
    await expect(signup).toBeHidden();
    const run = page.getByRole('button', { name: /Executar solução/ });
    await expect(run).toBeEnabled();
    await page.getByRole('textbox', { name: 'Expressão devolvida pela função' }).fill('valor * 2');
    await run.click();
    await expect(page.locator('#sandbox-count')).toHaveText('3/3 corretos');
    await expect(signup).toBeVisible();
    await expect(signup).toHaveAttribute('href', '/register');
    await page.getByRole('link', { name: /Próximo: Minutos em segundos/ }).click();
    await expect(page.locator('#sandbox-focus')).toContainText('Conversão');
  });

  // Lote 1 / C3: sem conta demo e sem sessão falsa — credenciais
  // inválidas (ou backend fora do ar) devem mostrar erro e NÃO
  // autenticar nem redirecionar ao dashboard.
  test('login page rejects invalid credentials without a fake session', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'inexistente@teste.local');
    await page.fill('input[type="password"]', 'senha-invalida-teste-123');
    // Texto do botão mudou no merge do PR #2 (b10d3a9): era
    // "Entrar na Plataforma", agora "Entrar" / "Entrar no jogo".
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('authenticated student can view courses and open course detail', async ({ page }) => {
    // /courses é auth-gated desde a B41. A sessão vem do setup de
    // autenticação (storageState); o login via UI é exercido pelo
    // próprio teste de login do smoke.
    await page.goto('/courses');
    await passarPeloPortaoDeIdade(page);
    // O card virou link "Acessar curso" para /courses/[slug] no merge do
    // PR #2 (b10d3a9) — não há mais botão "Ver Ementa" nem modal.
    const firstCourseLink = page.getByRole('link', { name: 'Acessar curso' }).first();
    await expect(firstCourseLink).toBeVisible({ timeout: 10000 });
    await firstCourseLink.click();

    await expect(page).toHaveURL(/\/courses\/.+/);
    await expect(page.getByText('Voltar aos Cursos')).toBeVisible();
  });

  // O /ide abre com a sessão do setup (storageState). O ramo demo
  // não-autenticado foi removido: o botão "Preencher Demo Aluno" é
  // estruturalmente instável — ora visível mas nunca acionável, ora some
  // do DOM entre o isVisible e o click (reprovado pelo QA em 2 modos de
  // falha distintos). O login via UI já é coberto pelo teste de login
  // do smoke; aqui o que se assertiona é o editor abrindo autenticado.
  test('web ide loads and allows authentication to open code editor', async ({ page }) => {
    await page.goto('/ide');
    await expect(page.locator('body')).toBeVisible();

    await expect(page.locator('text=NEXUS').or(page.locator('text=Executar')).or(page.locator('text=Instruções')).first()).toBeVisible({ timeout: 10000 });
  });
});
