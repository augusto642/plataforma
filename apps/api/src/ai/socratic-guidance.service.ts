import { Injectable, Optional } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { SocraticGuidanceDto } from './dto/socratic-guidance.dto';
import type { SocraticTier } from './socratic-tier.service';
import { SocraticTierService } from './socratic-tier.service';

export interface SocraticGuidanceResult {
  hint: string;
  socraticQuestion: string;
  tier: SocraticTier;
  timestamp: string;
  cached: boolean;
}

/**
 * M12 — Orientação socrática por palavra-chave (extraída do AiService god
 * service): dica + pergunta socrática por tema da pergunta do aluno, com
 * cache de 1h por (challengeId, pergunta) quando há CacheService. Sem
 * cache, calcula sempre (fail-open). Não chama LLM.
 */
@Injectable()
export class SocraticGuidanceService {
  constructor(
    private readonly tier: SocraticTierService,
    @Optional() private readonly cache?: CacheService,
  ) {}

  async generateSocraticGuidance(
    dto: SocraticGuidanceDto,
    userId?: string,
  ): Promise<SocraticGuidanceResult> {
    const cacheKey = `ai:socratic:${dto.challengeId || 'general'}:${dto.question.trim().toLowerCase()}`;
    if (this.cache) {
      try {
        const cached = await this.cache.get<SocraticGuidanceResult>(cacheKey);
        if (cached) {
          return { ...cached, cached: true };
        }
      } catch {
        // Cache miss or Redis connection not established; proceed with computation
      }
    }

    let tier: SocraticTier = 1;
    if (userId && dto.challengeId) {
      tier = await this.tier.calculateTier(userId, dto.challengeId);
    }

    const questionLower = (dto.question || '').toLowerCase();
    const starter = dto.starterName || 'Companion';

    let hint = '';
    let socraticQuestion = '';

    if (questionLower.includes('erro') || questionLower.includes('bug') || questionLower.includes('falha')) {
      hint = `Bugs e falhas de runtime revelam divergências entre a assunção lógica e a execução real do interpretador.`;
      socraticQuestion = `Se você inspecionar o valor retornado antes de finalizar a execução, qual a diferença entre o tipo esperado e o tipo que você calculou?`;
    } else if (questionLower.includes('loop') || questionLower.includes('for') || questionLower.includes('while') || questionLower.includes('infinito')) {
      hint = `Loops dependem de uma condição de terminação estrita e de avanço do ponteiro ou índice.`;
      socraticQuestion = `Qual variável garante que a condição de parada será atingida em um número finito de iterações?`;
    } else if (questionLower.includes('complexidade') || questionLower.includes('tempo') || questionLower.includes('memoria') || questionLower.includes('heap')) {
      hint = `O consumo de tempo e memória reflete as iterações e alocações dinâmicas acumuladas.`;
      socraticQuestion = `Se a entrada dobrar de tamanho, o número de instruções executadas dobra O(N) ou quadruplica O(N²)?`;
    } else if (questionLower.includes('imposto') || questionLower.includes('tax') || questionLower.includes('preco')) {
      hint = `Lembre-se da precedência de operadores: somar o valor base com a taxa aplicada gera o valor total final.`;
      socraticQuestion = `O resultado da formatação matemática gerou um número ou uma string? Você precisa reconverter o tipo?`;
    } else {
      hint = `Junto ao seu ${starter}, analise as entradas e saídas exigidas pela especificação do desafio.`;
      socraticQuestion = `Qual é o caso base da sua função quando a entrada for vazia ou nula? O que cada linha deve garantir?`;
    }

    const result: SocraticGuidanceResult = {
      hint,
      socraticQuestion,
      tier,
      timestamp: new Date().toISOString(),
      cached: false,
    };

    if (this.cache) {
      try {
        await this.cache.set(cacheKey, result, 3600);
      } catch {
        // Ignora erro de gravação no cache
      }
    }

    return result;
  }
}
