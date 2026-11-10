import { BadRequestException, Injectable } from '@nestjs/common';
import {
  TOWER_COURSE_SLUG,
  TOWER_SQUARES_PER_FLOOR,
  TOWER_TIME_LIMIT_SECONDS_BY_DIFFICULTY,
  type TowerDifficulty,
  type TowerSquareType,
} from './tower.constants';
import type { TowerPrismaClient } from './tower-prisma.types';

export interface TowerSquareInfo {
  floor: number;
  square: number;
  type: TowerSquareType;
  difficulty: TowerDifficulty;
  timeLimitSeconds: number;
  /** Slug da Activity do desafio (só para casas de código e a final/guardião). */
  activitySlug: string | null;
}

export interface TowerFloorSeed {
  floor: number;
  title: string;
  theme: string;
}

/**
 * Tabuleiro da Torre de Desafios (Fase 0).
 *
 * O tabuleiro é DADO, não entidade de banco: cada andar tem 30 casas com a
 * distribuição decidida no conceito — 18 de código + 5 quiz + 3 mini-games
 * + 3 de item + 1 final (guardião). A dificuldade cresce ao longo do andar
 * (casas 1–10 fácil, 11–20 médio, 21–29 difícil, 30 guardião).
 *
 * Layout fixo das casas especiais (o resto é código):
 * - quiz:      3, 8, 13, 18, 23
 * - mini-game: 6, 15, 24
 * - item:      10, 20, 27
 * - final:     30 (guardião — desafio de código mais difícil)
 *
 * Na Fase 1, quiz/mini-game/item não têm desafio implementado: o jogador
 * apenas passa pela casa. O conteúdo de código vive em Activities do curso
 * `torre-de-desafios` (criadas pelo seed `scripts/seed-tower.mjs`).
 */
@Injectable()
export class TowerBoardService {
  static readonly SQUARES_PER_FLOOR = TOWER_SQUARES_PER_FLOOR;

  static readonly QUIZ_SQUARES = [3, 8, 13, 18, 23];
  static readonly MINIGAME_SQUARES = [6, 15, 24];
  static readonly ITEM_SQUARES = [10, 20, 27];
  static readonly FINAL_SQUARE = TOWER_SQUARES_PER_FLOOR;

  /** Andares de exemplo do seed (Fase 0). A escala para 100 andares é Fase 5. */
  static readonly FLOORS: TowerFloorSeed[] = [
    { floor: 1, title: 'Primeiros passos', theme: 'Lógica e variáveis' },
    { floor: 2, title: 'Repetição e coleções', theme: 'Arrays e laços' },
    { floor: 3, title: 'Palavras e objetos', theme: 'Strings e objetos' },
  ];

  getSquare(floor: number, square: number): TowerSquareInfo {
    if (!Number.isInteger(floor) || floor < 1) {
      throw new BadRequestException('Andar inválido.');
    }
    if (!Number.isInteger(square) || square < 1 || square > TOWER_SQUARES_PER_FLOOR) {
      throw new BadRequestException('Casa inválida.');
    }

    const type = this.squareType(square);
    const difficulty: TowerDifficulty =
      square === TOWER_SQUARES_PER_FLOOR
        ? 'guardian'
        : square <= 10
          ? 'easy'
          : square <= 20
            ? 'medium'
            : 'hard';

    return {
      floor,
      square,
      type,
      difficulty,
      timeLimitSeconds: TOWER_TIME_LIMIT_SECONDS_BY_DIFFICULTY[difficulty],
      activitySlug: this.activitySlug(floor, square, type),
    };
  }

  /** Todas as 30 casas de um andar, na ordem. */
  getFloorSquares(floor: number): TowerSquareInfo[] {
    return Array.from({ length: TOWER_SQUARES_PER_FLOOR }, (_, i) =>
      this.getSquare(floor, i + 1),
    );
  }

  /** Contagem por tipo de casa — usada pelos testes para travar a distribuição 18/5/3/3/1. */
  countByType(floor: number): Record<TowerSquareType, number> {
    const counts: Record<TowerSquareType, number> = {
      code: 0,
      quiz: 0,
      minigame: 0,
      item: 0,
      final: 0,
    };
    for (const square of this.getFloorSquares(floor)) counts[square.type] += 1;
    return counts;
  }

  private squareType(square: number): TowerSquareType {
    if (square === TowerBoardService.FINAL_SQUARE) return 'final';
    if (TowerBoardService.QUIZ_SQUARES.includes(square)) return 'quiz';
    if (TowerBoardService.MINIGAME_SQUARES.includes(square)) return 'minigame';
    if (TowerBoardService.ITEM_SQUARES.includes(square)) return 'item';
    return 'code';
  }

  /** Slug da Activity do desafio da casa (null quando a casa não tem desafio). */
  private activitySlug(floor: number, square: number, type: TowerSquareType): string | null {
    if (type === 'final') return `torre-f${floor}-guardiao`;
    if (type !== 'code') return null;
    // Índice da casa entre as de código do andar (1–18, na ordem).
    let codeIndex = 0;
    for (let s = 1; s <= square; s++) {
      if (this.squareType(s) === 'code') codeIndex += 1;
    }
    return `torre-f${floor}-c${codeIndex}`;
  }

  /**
   * Resolve o id da Activity do desafio de uma casa.
   * Retorna null quando o conteúdo ainda não foi semeado (o service trata
   * como erro 503 fail-closed, sem consumir a jogada).
   */
  async resolveActivityId(
    prisma: TowerPrismaClient,
    floor: number,
    square: number,
  ): Promise<string | null> {
    const info = this.getSquare(floor, square);
    if (!info.activitySlug) return null;
    const course = await prisma.course.findUnique({ where: { slug: TOWER_COURSE_SLUG } });
    if (!course) return null;
    const activity = await prisma.activity.findUnique({
      where: { courseId_slug: { courseId: course.id, slug: info.activitySlug } },
    });
    return activity?.id ?? null;
  }
}
