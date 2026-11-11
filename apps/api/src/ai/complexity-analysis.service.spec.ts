import { ComplexityAnalysisService } from './complexity-analysis.service';

/** M12 — specs do ComplexityAnalysisService (extraído do AiService). */
describe('ComplexityAnalysisService', () => {
  const prismaMock = {
    activity: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'act-1',
        title: 'Soma de Dois Números',
      }),
    },
  };
  const service = new ComplexityAnalysisService(prismaMock as any);

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.activity.findUnique.mockResolvedValue({ id: 'act-1', title: 'Soma de Dois Números' });
  });

  it('arquivo vazio: O(1), score 0', async () => {
    const out = await service.analyzeComplexity('   ', 'act-1');
    expect(out.timeComplexity).toBe('O(1)');
    expect(out.score).toBe(0);
    expect(out.summary).toContain('sem código');
  });

  it('laço aninhado: O(N²), score 65, com recomendação de Map/Set', async () => {
    const out = await service.analyzeComplexity(
      'function f(a, b) { for (let i = 0; i < a.length; i++) { for (let j = 0; j < b.length; j++) {} } return 0; }',
      'act-1',
    );
    expect(out.timeComplexity).toBe('O(N²)');
    expect(out.score).toBe(65);
    expect(out.recommendations.join(' ')).toContain('Hash Map');
    expect(out.summary).toContain('Soma de Dois Números');
  });

  it('laço simples: O(N), score 88', async () => {
    const out = await service.analyzeComplexity(
      'function f(a) { let s = 0; for (let i = 0; i < a.length; i++) { s += a[i]; } return s; }',
      'act-1',
    );
    expect(out.timeComplexity).toBe('O(N)');
    expect(out.score).toBe(88);
  });

  it('recursão: O(2^N) ou O(N), score 70', async () => {
    const out = await service.analyzeComplexity(
      'function fib(n) { if (n < 2) return n; return fib(n - 1) + fib(n - 2); }',
      'act-1',
    );
    expect(out.timeComplexity).toBe('O(2^N) ou O(N)');
    expect(out.score).toBe(70);
    expect(out.recommendations.join(' ')).toContain('memoization');
  });

  it('alocação de array: espaço O(N)', async () => {
    const out = await service.analyzeComplexity(
      'function f(a) { return a.map((x) => x * 2); }',
      'act-1',
    );
    expect(out.spaceComplexity).toBe('O(N)');
    expect(out.bottlenecks.join(' ')).toContain('Alocação dinâmica');
  });

  it('código sem laço nem alocação: O(1) com "excelente eficiência"', async () => {
    const out = await service.analyzeComplexity('function somar(a, b) { return a + b; }', 'act-1');
    expect(out.timeComplexity).toBe('O(1)');
    expect(out.spaceComplexity).toBe('O(1)');
    expect(out.score).toBe(95);
    expect(out.recommendations).toEqual(['Código com excelente eficiência assintótica.']);
  });

  it('atividade inexistente: título genérico no resumo', async () => {
    prismaMock.activity.findUnique.mockResolvedValue(null);
    const out = await service.analyzeComplexity('function f() { return 1; }', 'act-x');
    expect(out.summary).toContain('"Atividade"');
  });
});
