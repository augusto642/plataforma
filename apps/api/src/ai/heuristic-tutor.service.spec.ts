import { HeuristicTutorService, TIER3_EXHAUSTION_FAILURES } from './heuristic-tutor.service';

/**
 * M12 — specs do HeuristicTutorService (extraído do AiService).
 * A bateria completa por padrão de erro segue em ai.service.spec.ts
 * (describe B03); aqui ficam os contratos próprios do serviço: arquivo
 * em branco, escape pós-Tier 3 e a garantia de nunca vazar a solução.
 */
describe('HeuristicTutorService', () => {
  const service = new HeuristicTutorService();
  const REFERENCE_SOLUTION = 'function somar(a, b) {\n  return a + b;\n}';

  describe('generateHeuristicSocraticHints', () => {
    it('arquivo em branco: pede a declaração da função', () => {
      const out = service.generateHeuristicSocraticHints('', [], 'Soma', 1);
      expect(out.summary).toBe('Seu arquivo de resposta está em branco.');
      expect(out.suggestedConcept).toBe('Declaração de Funções');
      expect(out.tier).toBe(1);
    });

    it('padrão de sintaxe sem citar a mensagem do teste', () => {
      const out = service.generateHeuristicSocraticHints(
        'function somar(a, b { return a + b; }',
        [{ passed: false, name: 'caso base', errorMessage: 'SyntaxError: Unexpected token }' }],
        'Soma',
        1,
      );
      expect(JSON.stringify(out)).toContain('sintaxe');
      expect(JSON.stringify(out)).not.toContain('Unexpected token');
      expect(JSON.stringify(out)).not.toContain('```');
    });

    it('só teste oculto falho: mensagem genérica, sem stderr', () => {
      const out = service.generateHeuristicSocraticHints(
        'function somar(a, b) { return a + b; }',
        [{ passed: false, isHidden: true, name: 'oculto', errorMessage: 'AssertionError: expected 42 [marker]' }],
        'Soma',
        2,
      );
      const text = JSON.stringify(out);
      expect(text).toContain('Um teste oculto não passou');
      expect(text).not.toContain('marker');
      expect(text).not.toContain('expected 42');
    });

    it('retorno ausente: dica aponta que a função não entrega', () => {
      const out = service.generateHeuristicSocraticHints(
        'function somar(a, b) { const x = a + b; }',
        [{ passed: false, name: 'caso 1', errorMessage: 'expected 5 got undefined' }],
        'Soma',
        2,
      );
      expect(JSON.stringify(out)).toContain('não entrega');
      expect(JSON.stringify(out)).not.toContain('expected 5');
    });
  });

  describe('buildPostTier3Escape', () => {
    const activity = { title: 'Soma de Dois Números', conceptTags: ['loops'] };

    it('não dispara abaixo do esgotamento nem fora do Tier 3', () => {
      expect(service.buildPostTier3Escape(activity, 3, TIER3_EXHAUSTION_FAILURES - 1, 'x')).toBeNull();
      expect(service.buildPostTier3Escape(activity, 2, 9, 'x')).toBeNull();
    });

    it('esgotado com registro por conceito: exemplo análogo, nunca a solução', () => {
      const escape = service.buildPostTier3Escape(activity, 3, 5, 'Lógica e Algoritmos');
      expect(escape?.unlocked).toBe(true);
      expect(escape?.kind).toBe('analogous-example');
      expect(escape?.analogousExample?.title).toBe('Contar as vogais de uma palavra');
      expect(JSON.stringify(escape)).not.toContain(REFERENCE_SOLUTION);
      expect(escape?.analogousExample?.solution).not.toContain('somar');
    });

    it('exemplo autoral (lessonPayload) tem precedência sobre o registro', () => {
      const escape = service.buildPostTier3Escape(
        {
          title: 'Soma',
          conceptTags: ['loops'],
          lessonPayload: {
            analogousExample: {
              title: 'Somar os degraus de uma escada',
              statement: 'Some os degraus de 1 até n.',
              solution: 'function degraus(n) { let s = 0; for (let i = 1; i <= n; i++) { s += i; } return s; }',
              explanation: 'Mesmo esqueleto de acumulador.',
              concept: 'Acumulador em laço',
            },
          },
        },
        3,
        6,
        'Lógica e Algoritmos',
      );
      expect(escape?.analogousExample?.title).toBe('Somar os degraus de uma escada');
    });

    it('sem exemplo: reforço conceitual com perguntas guiadas, sem spoiler', () => {
      const escape = service.buildPostTier3Escape(
        { title: 'Soma', conceptTags: ['topico-sem-registro'] },
        3,
        5,
        'Lógica e Algoritmos',
      );
      expect(escape?.kind).toBe('concept-reinforcement');
      expect(escape?.reinforcement?.guidingQuestions.length).toBeGreaterThan(0);
      expect(JSON.stringify(escape)).not.toContain(REFERENCE_SOLUTION);
    });
  });
});
