import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ComplexityAnalysisResult {
  timeComplexity: string;
  spaceComplexity: string;
  summary: string;
  bottlenecks: string[];
  recommendations: string[];
  score: number;
}

/**
 * M12 — Análise estática de complexidade (extraída do AiService god
 * service). Heurística local por regex (laços aninhados, recursão,
 * alocações): não chama LLM e só lê a atividade para o título do resumo.
 */
@Injectable()
export class ComplexityAnalysisService {
  constructor(private readonly prisma: PrismaService) {}

  async analyzeComplexity(code: string, activityId: string): Promise<ComplexityAnalysisResult> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });

    const trimmed = code.trim();
    if (!trimmed) {
      return {
        timeComplexity: 'O(1)',
        spaceComplexity: 'O(1)',
        summary: 'Arquivo sem código para análise.',
        bottlenecks: ['Nenhuma instrução implementada.'],
        recommendations: ['Escreva a implementação inicial para calcular a complexidade assintótica.'],
        score: 0,
      };
    }

    // Static Heuristic Complexity Analysis
    let timeComplexity = 'O(1)';
    let spaceComplexity = 'O(1)';
    const bottlenecks: string[] = [];
    const recommendations: string[] = [];
    let score = 95;

    // Detect nested loops
    const forCount = (code.match(/\bfor\s*\(/g) || []).length;
    const whileCount = (code.match(/\bwhile\s*\(/g) || []).length;
    const totalLoops = forCount + whileCount;

    // Check for nested loops regex
    const hasNestedLoops = /for\s*\([^)]*\)\s*\{[^}]*for\s*\([^)]*\)/s.test(code) ||
                          /while\s*\([^)]*\)\s*\{[^}]*while\s*\([^)]*\)/s.test(code);

    // Check for recursion
    const hasRecursion = /\bfunction\s+([a-zA-Z0-9_$]+)[\s\S]*?\1\s*\(/s.test(code);

    // Check for array allocations
    const hasArrayAlloc = /new\s+Array|\[\]|\.map\(|\.filter\(|\.reduce\(|\.split\(/i.test(code);

    if (hasNestedLoops) {
      timeComplexity = 'O(N²)';
      score = 65;
      bottlenecks.push('Detectado laço aninhado (loop duplo) gerando complexidade quadrática no pior caso.');
      recommendations.push('Considere usar uma Hash Map ou Set para buscas O(1) e reduzir a complexidade para linear O(N).');
    } else if (totalLoops > 0) {
      timeComplexity = 'O(N)';
      score = 88;
      bottlenecks.push('Iteração linear percorrendo a estrutura de dados de entrada.');
      recommendations.push('A complexidade linear O(N) é excelente para a maioria dos cenários práticos.');
    } else if (hasRecursion) {
      timeComplexity = 'O(2^N) ou O(N)';
      score = 70;
      bottlenecks.push('Chamadas recursivas detectadas na pilha de execução (Call Stack).');
      recommendations.push('Verifique a profundidade de recursão para evitar estouro de pilha (Stack Overflow) ou aplique memoization.');
    }

    if (hasArrayAlloc) {
      spaceComplexity = 'O(N)';
      bottlenecks.push('Alocação dinâmica de novos arrays/buffers na memória Heap.');
      recommendations.push('Se a memória for crítica, tente realizar operações in-place para atingir O(1) de espaço auxiliar.');
    }

    return {
      timeComplexity,
      spaceComplexity,
      summary: `Análise assintótica concluída para "${activity?.title || 'Atividade'}": Tempo estimado em ${timeComplexity} e Espaço auxiliar em ${spaceComplexity}.`,
      bottlenecks: bottlenecks.length > 0 ? bottlenecks : ['Nenhum gargalo crítico detectado.'],
      recommendations: recommendations.length > 0 ? recommendations : ['Código com excelente eficiência assintótica.'],
      score,
    };
  }
}
