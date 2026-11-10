import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';

/**
 * Dado da Torre de Desafios (Fase 0).
 *
 * O RNG é injetável por design: em produção usa `crypto.randomInt` (1–6);
 * em testes, `setFixedRolls` fixa a sequência de resultados para tornar o
 * loop determinístico (acerto, erro, timeout, guardião, limite esgotado).
 * O dado fixo NUNCA é usado em produção — a fila só existe quando um teste
 * a preenche.
 */
@Injectable()
export class DiceService {
  private fixedRolls: number[] = [];

  /** Fixa os próximos resultados (só para testes). */
  setFixedRolls(rolls: number[]): void {
    this.fixedRolls = [...rolls];
  }

  /** Rola um dado de 6 lados (1–6). */
  roll(): number {
    const fixed = this.fixedRolls.shift();
    if (fixed !== undefined) return fixed;
    return randomInt(1, 7);
  }
}
