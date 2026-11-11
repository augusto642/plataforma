import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FAQ_ITEMS } from '../faq-data';

// B60 (Sprint 17 · Volta 2) — FAQ de fonte única: a FaqSection
// renderiza de faq-data.ts (a mesma fonte do JSON-LD). Estes testes
// travam o contrato: 8 itens, toda ênfase é substring exata da
// resposta (a renderização por destaque nunca altera o conteúdo) e
// nenhuma pergunta volta hardcoded para o JSX da seção.
describe('faq-data — fonte única do FAQ', () => {
  it('tem os 8 itens exibidos na página', () => {
    expect(FAQ_ITEMS).toHaveLength(8);
    for (const item of FAQ_ITEMS) {
      expect(item.question.length).toBeGreaterThan(10);
      expect(item.answer.length).toBeGreaterThan(40);
    }
  });

  it('toda ênfase declarada é substring exata da resposta', () => {
    for (const item of FAQ_ITEMS) {
      for (const phrase of item.emphasis ?? []) {
        expect(item.answer).toContain(phrase);
      }
    }
  });

  it('perguntas são únicas (chave de renderização e de JSON-LD)', () => {
    const questions = FAQ_ITEMS.map((item) => item.question);
    expect(new Set(questions).size).toBe(questions.length);
  });

  it('a FaqSection importa a fonte única e não duplica perguntas em JSX', () => {
    const source = readFileSync(join(__dirname, '..', 'FaqSection.tsx'), 'utf8');
    expect(source).toContain("from './faq-data'");
    expect(source).toContain('FAQ_ITEMS.map');
    for (const item of FAQ_ITEMS) {
      expect(source).not.toContain(item.question);
    }
  });
});
