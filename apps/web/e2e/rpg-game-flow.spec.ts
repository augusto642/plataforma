import { test, expect } from '@playwright/test';

test.describe('NEXUS CODE - Pokémon RPG Platform E2E Flow', () => {
  test('Complete Onboarding Flow: Career Tier Lock, 3 Canonical Starters & 4-Tab Avatar Studio', async ({ page }) => {
    await page.goto('/onboarding');

    // 1. Fase 1: Retro CRT PC Mascot (Nexi)
    await expect(page.locator('text=NEXUS-8086 // BIOS REV 1.4')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=NEXI // AI GUIDE')).toBeVisible();

    // Navega para a etapa de seleção de carreira via indicador de passos no header
    const tierStepBtn = page.locator('button:has-text("NÍVEL DE CARREIRA")');
    await expect(tierStepBtn).toBeVisible();
    await tierStepBtn.click();

    // 2. Fase 2: Career Tier Selector (Apenas Iniciante liberado)
    await expect(page.locator('text=Iniciante // A Forja do Código')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Júnior // Engenharia Aplicada & APIs')).toBeVisible();
    
    // Verifica que Júnior tem indicação de bloqueio
    await expect(page.locator('text=BLOQUEADO • Requer Trilha Iniciante').first()).toBeVisible();

    // Clica no botão de selecionar Iniciante
    const selectBeginnerBtn = page.locator('button:has-text("Iniciar Como Iniciante & Adotar Pet")');
    await expect(selectBeginnerBtn).toBeVisible();
    await selectBeginnerBtn.click();

    // 3. Fase 3: Vitrine dos 3 Starters Canônicos (Pythox, Scripty, Javagon) com Evolução em 3 Estágios
    await expect(page.locator('text=Adote Seu Monstrinho Guardião')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Pythox').first()).toBeVisible();
    await expect(page.locator('text=Scripty').first()).toBeVisible();
    await expect(page.locator('text=Javagon').first()).toBeVisible();

    // Alterna estágios de evolução de Pythox
    const stage2Btn = page.locator('button:has-text("Estágio 2")');
    await stage2Btn.click();
    await expect(page.locator('text=Víbora Ágil')).toBeVisible();

    const stage3Btn = page.locator('button:has-text("Estágio 3")');
    await stage3Btn.click();
    await expect(page.locator('text=Serpente Titânica')).toBeVisible();

    // Volta ao Estágio 1 e Adota Pythox
    const stage1Btn = page.locator('button:has-text("Estágio 1")');
    await stage1Btn.click();

    const adoptBtn = page.locator('button:has-text("ADOTAR PYTHOX")');
    await expect(adoptBtn).toBeVisible();
    await adoptBtn.click();

    // 4. Fase 4: Estúdio de Avatar Pixel Art com 4ª Aba de Fundo e Validação de Nickname
    await expect(page.locator('text=CUSTOMIZADOR DE PERSONAGEM')).toBeVisible({ timeout: 10000 });
    
    // Testa a 4ª aba (Fundo)
    const backdropTab = page.locator('button:has-text("4. Fundo")');
    await expect(backdropTab).toBeVisible();
    await backdropTab.click();
    await expect(page.locator('text=SELECIONE O TOM RETRÔ DA MOLDURA HOLOGRÁFICA')).toBeVisible();

    // Altera nickname para um nome válido
    const codenameInput = page.locator('input[placeholder="Seu codename hacker..."]');
    await codenameInput.fill('AshKetchum');

    // Clica no botão de finalizar criação
    const finalizeBtn = page.locator('button:has-text("FINALIZAR & ENTRAR NO JOGO")');
    await expect(finalizeBtn).toBeVisible();
    await finalizeBtn.click();

    // Verifica transição para a rota /game
    await expect(page).toHaveURL(/.*game/, { timeout: 15000 });
  });

  test('Overworld Exploration, Minimap Radar & Black Cat HUD Companion', async ({ page }) => {
    await page.goto('/game');

    // 1. Canvas 2D renderizado
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // 2. HUD Superior Dark Obsidian
    await expect(page.locator('text=NEXUS CODE')).toBeVisible();
    await expect(page.locator('text=LVL').or(page.locator('text=NÍVEL'))).toBeVisible();
    await expect(page.locator('text=Steps')).toBeVisible();

    // 3. Mascote Gato Preto no HUD (BlackCatHudWidget)
    const catAdviceBtn = page.locator('button[title="Pedir conselho socrático ao Gato Preto"]');
    await expect(catAdviceBtn).toBeVisible({ timeout: 10000 });
    await catAdviceBtn.click();

    // 4. Toolbar de Ações e Inventário
    const bagBtn = page.locator('button[title="Abrir Inventário (I)"]');
    await expect(bagBtn).toBeVisible();
    await bagBtn.click();
    await expect(page.locator('text=Inventário de Desenvolvedor')).toBeVisible();
    await page.click('button:has-text("✕")');
  });

  test('Virtual D-Pad and Touch Controls', async ({ page }) => {
    await page.goto('/game');

    // Verifica presença dos botões direcionais acessíveis via aria-label
    const btnUp = page.locator('button[aria-label="Mover para Cima"]');
    const btnDown = page.locator('button[aria-label="Mover para Baixo"]');
    const btnLeft = page.locator('button[aria-label="Mover para Esquerda"]');
    const btnRight = page.locator('button[aria-label="Mover para Direita"]');

    await expect(btnUp).toBeVisible({ timeout: 10000 });
    await expect(btnDown).toBeVisible();
    await expect(btnLeft).toBeVisible();
    await expect(btnRight).toBeVisible();

    // Simula toques nos botões direcionais
    await btnDown.dispatchEvent('pointerdown');
    await page.waitForTimeout(100);
    await btnDown.dispatchEvent('pointerup');

    await btnRight.dispatchEvent('pointerdown');
    await page.waitForTimeout(100);
    await btnRight.dispatchEvent('pointerup');
  });
});
