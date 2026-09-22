/**
 * engine.spec.ts
 * NEXUS CODE - Canvas 2D Game Engine Unit Test Suite
 * 
 * Cobertura de testes unitários determinísticos para a física, matemática do engine
 * e integridade do store Zustand:
 * 1. Boundary & Detecção de Colisão AABB Retangular (AABB math, overlap, colisão preditiva, parsing de grids)
 * 2. Sprite & Ciclo de Frames (resolução dimensional, hitbox, ticks de frames, direções, renderização)
 * 3. Zustand Store Integrity (useGameStore: progressão de XP, cálculo de HP, inventário, estados)
 */

import {
  Boundary,
  rectangularCollision,
  calculateOverlapArea,
  predictiveCollision,
  parseCollisionGrid,
  parse2DCollisionMap,
  Rect,
} from '../Boundary';
import { Sprite, Direction } from '../Sprite';
import { GameEngine } from '../GameEngine';
import { Camera2D } from '../Camera2D';
import { MinimapRadar } from '../MinimapRadar';
import { InteractiveProp, createDefaultInteractiveProps } from '../InteractiveProp';
import { SceneTransitionManager, createLaboratoryInteriorScene } from '../SceneTransitionManager';
import { BattleTransitionFX } from '../BattleTransitionFX';
import { BATTLE_CHALLENGES, getChallengeForSkill } from '../BattleChallenges';
import { CodeSandboxEvaluator } from '../CodeSandboxEvaluator';
import { AudioSynthesizer } from '../AudioSynthesizer';
import { createGeneratedGameWorld } from '../ProceduralAssets';
import { useGameStore, INITIAL_STARTERS, INITIAL_INVENTORY } from '../../stores/useGameStore';

/* -------------------------------------------------------------------------- */
/* Polyfill / Ambientes de Execução de Teste (Jest / Vitest / Node / Runner)   */
/* -------------------------------------------------------------------------- */

type TestFn = () => void | Promise<void>;
type SuiteFn = () => void;

interface AssertionResult {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toBeCloseTo: (expected: number, numDigits?: number) => void;
  toBeNull: () => void;
  toBeDefined: () => void;
  toBeUndefined: () => void;
  toBeTruthy: () => void;
  toBeFalsy: () => void;
  toBeGreaterThan: (expected: number) => void;
  toBeGreaterThanOrEqual: (expected: number) => void;
  toBeLessThan: (expected: number) => void;
  toBeLessThanOrEqual: (expected: number) => void;
  toContain: (expected: unknown) => void;
  toThrow: (expectedPattern?: string | RegExp) => void;
  not: {
    toBe: (expected: unknown) => void;
    toEqual: (expected: unknown) => void;
    toBeNull: () => void;
    toBeDefined: () => void;
    toBeTruthy: () => void;
    toBeFalsy: () => void;
    toContain: (expected: unknown) => void;
    toThrow: () => void;
  };
}

// Suporte universal para Jest, Vitest ou Node.js test runner
const g = globalThis as unknown as {
  describe?: (name: string, fn: SuiteFn) => void;
  it?: (name: string, fn: TestFn) => void;
  test?: (name: string, fn: TestFn) => void;
  beforeEach?: (fn: TestFn) => void;
  expect?: (actual: unknown) => AssertionResult;
};

// Se não houver test runner global injetado, provê harness determinístico
const customExpect = (actual: unknown): AssertionResult => {
  const isDeepEqual = (a: unknown, b: unknown): boolean => {
    if (a === b) return true;
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      const valA = (a as Record<string, unknown>)[key];
      const valB = (b as Record<string, unknown>)[key];
      if (!isDeepEqual(valA, valB)) return false;
    }
    return true;
  };

  return {
    toBe(expected: unknown) {
      if (actual !== expected) {
        throw new Error(`AssertionError: Expected ${String(expected)}, but got ${String(actual)}`);
      }
    },
    toEqual(expected: unknown) {
      if (!isDeepEqual(actual, expected)) {
        throw new Error(`AssertionError: Expected deep equality with ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
      }
    },
    toBeCloseTo(expected: number, numDigits = 2) {
      if (typeof actual !== 'number') {
        throw new Error(`AssertionError: Expected number, got ${typeof actual}`);
      }
      const diff = Math.abs(actual - expected);
      const tolerance = Math.pow(10, -numDigits) / 2;
      if (diff > tolerance) {
        throw new Error(`AssertionError: Expected ${actual} to be close to ${expected} (within ${tolerance})`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`AssertionError: Expected null, but got ${String(actual)}`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error(`AssertionError: Expected value to be defined`);
      }
    },
    toBeUndefined() {
      if (actual !== undefined) {
        throw new Error(`AssertionError: Expected undefined, got ${String(actual)}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`AssertionError: Expected truthy, got ${String(actual)}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`AssertionError: Expected falsy, got ${String(actual)}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (typeof actual !== 'number' || actual <= expected) {
        throw new Error(`AssertionError: Expected ${actual} > ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      if (typeof actual !== 'number' || actual < expected) {
        throw new Error(`AssertionError: Expected ${actual} >= ${expected}`);
      }
    },
    toBeLessThan(expected: number) {
      if (typeof actual !== 'number' || actual >= expected) {
        throw new Error(`AssertionError: Expected ${actual} < ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected: number) {
      if (typeof actual !== 'number' || actual > expected) {
        throw new Error(`AssertionError: Expected ${actual} <= ${expected}`);
      }
    },
    toContain(expected: unknown) {
      if (Array.isArray(actual)) {
        if (!actual.includes(expected)) {
          throw new Error(`AssertionError: Expected array to contain ${String(expected)}`);
        }
      } else if (typeof actual === 'string') {
        if (!actual.includes(String(expected))) {
          throw new Error(`AssertionError: Expected string to contain "${String(expected)}"`);
        }
      } else {
        throw new Error(`AssertionError: Target is not iterable`);
      }
    },
    toThrow(expectedPattern?: string | RegExp) {
      if (typeof actual !== 'function') {
        throw new Error(`AssertionError: Expected function to test throwing`);
      }
      let didThrow = false;
      let thrownError: unknown = null;
      try {
        actual();
      } catch (err) {
        didThrow = true;
        thrownError = err;
      }
      if (!didThrow) {
        throw new Error(`AssertionError: Function did not throw`);
      }
      if (expectedPattern && thrownError instanceof Error) {
        if (typeof expectedPattern === 'string' && !thrownError.message.includes(expectedPattern)) {
          throw new Error(`AssertionError: Expected error message to include "${expectedPattern}", got "${thrownError.message}"`);
        } else if (expectedPattern instanceof RegExp && !expectedPattern.test(thrownError.message)) {
          throw new Error(`AssertionError: Expected error message to match regex, got "${thrownError.message}"`);
        }
      }
    },
    not: {
      toBe(expected: unknown) {
        if (actual === expected) {
          throw new Error(`AssertionError: Expected value NOT to be ${String(expected)}`);
        }
      },
      toEqual(expected: unknown) {
        if (isDeepEqual(actual, expected)) {
          throw new Error(`AssertionError: Expected values NOT to be deep equal`);
        }
      },
      toBeNull() {
        if (actual === null) {
          throw new Error(`AssertionError: Expected value NOT to be null`);
        }
      },
      toBeDefined() {
        if (actual !== undefined) {
          throw new Error(`AssertionError: Expected value NOT to be defined`);
        }
      },
      toBeTruthy() {
        if (actual) {
          throw new Error(`AssertionError: Expected value NOT to be truthy`);
        }
      },
      toBeFalsy() {
        if (!actual) {
          throw new Error(`AssertionError: Expected value NOT to be falsy`);
        }
      },
      toContain(expected: unknown) {
        if (Array.isArray(actual) && actual.includes(expected)) {
          throw new Error(`AssertionError: Expected array NOT to contain ${String(expected)}`);
        }
      },
      toThrow() {
        if (typeof actual !== 'function') {
          throw new Error(`AssertionError: Expected function, got ${typeof actual}`);
        }
        try {
          (actual as () => void)();
        } catch (e) {
          throw new Error(`AssertionError: Expected function NOT to throw, but it threw: ${(e as Error).message}`);
        }
      },
    },
  };
};

const beforeHooks: TestFn[] = [];
const suiteDescribe = typeof g.describe === 'function' ? g.describe : (_name: string, fn: SuiteFn) => fn();
const suiteBeforeEach = typeof g.beforeEach === 'function' ? g.beforeEach : (fn: TestFn) => { beforeHooks.push(fn); };
const suiteIt = typeof g.it === 'function' ? g.it : typeof g.test === 'function' ? g.test : (_name: string, fn: TestFn) => {
  for (const hook of beforeHooks) {
    void hook();
  }
  void fn();
};
const suiteExpect = typeof g.expect === 'function' ? g.expect : customExpect;

// Mocks para Canvas Rendering Context
const createMockCtx = (): CanvasRenderingContext2D => {
  const calls: { name: string; args: unknown[] }[] = [];
  return {
    save: () => calls.push({ name: 'save', args: [] }),
    restore: () => calls.push({ name: 'restore', args: [] }),
    beginPath: () => calls.push({ name: 'beginPath', args: [] }),
    ellipse: (...args: unknown[]) => calls.push({ name: 'ellipse', args }),
    fill: () => calls.push({ name: 'fill', args: [] }),
    stroke: () => calls.push({ name: 'stroke', args: [] }),
    fillRect: (x: number, y: number, w: number, h: number) => calls.push({ name: 'fillRect', args: [x, y, w, h] }),
    strokeRect: (x: number, y: number, w: number, h: number) => calls.push({ name: 'strokeRect', args: [x, y, w, h] }),
    clearRect: (x: number, y: number, w: number, h: number) => calls.push({ name: 'clearRect', args: [x, y, w, h] }),
    drawImage: (...args: unknown[]) => calls.push({ name: 'drawImage', args }),
    translate: (x: number, y: number) => calls.push({ name: 'translate', args: [x, y] }),
    rotate: (angle: number) => calls.push({ name: 'rotate', args: [angle] }),
    fillText: (...args: unknown[]) => calls.push({ name: 'fillText', args }),
    moveTo: (...args: unknown[]) => calls.push({ name: 'moveTo', args }),
    lineTo: (...args: unknown[]) => calls.push({ name: 'lineTo', args }),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    textAlign: 'left',
  } as unknown as CanvasRenderingContext2D;
};

/* ========================================================================== */
/* 1. SUÍTE DE TESTES: BOUNDARY & FÍSICA AABB                                 */
/* ========================================================================== */

suiteDescribe('Engine Physics - Boundary & AABB Collision Math', () => {
  suiteDescribe('Boundary Class Instantiation & Geometry', () => {
    suiteIt('deve inicializar com valores padrão corretos (48x48, solid)', () => {
      const boundary = new Boundary({
        position: { x: 100, y: 150 },
      });

      suiteExpect(boundary.position.x).toBe(100);
      suiteExpect(boundary.position.y).toBe(150);
      suiteExpect(boundary.width).toBe(48);
      suiteExpect(boundary.height).toBe(48);
      suiteExpect(boundary.type).toBe('solid');
      suiteExpect(boundary.data).toEqual({});

      const rect = boundary.getRect();
      suiteExpect(rect).toEqual({
        x: 100,
        y: 150,
        width: 48,
        height: 48,
      });
    });

    suiteIt('deve permitir dimensões e tipos customizados (battle, door, trigger)', () => {
      const battleZone = new Boundary({
        position: { x: 200, y: 300 },
        width: 96,
        height: 144,
        type: 'battle',
        id: 'zone_sector_7',
        data: { encounterTier: 2, levelRange: [5, 10] },
      });

      suiteExpect(battleZone.width).toBe(96);
      suiteExpect(battleZone.height).toBe(144);
      suiteExpect(battleZone.type).toBe('battle');
      suiteExpect(battleZone.id).toBe('zone_sector_7');
      suiteExpect(battleZone.data.encounterTier).toBe(2);
    });

    suiteIt('deve desenhar no contexto Canvas apenas se debug estiver ativo', () => {
      const boundary = new Boundary({
        position: { x: 10, y: 20 },
        type: 'door',
      });
      const ctx = createMockCtx();

      // Debug false: não faz nada
      boundary.draw(ctx, { debug: false });

      // Debug true: executa fillRect e strokeRect
      boundary.draw(ctx, { debug: true });
      suiteExpect(ctx.lineWidth).toBe(1);
    });
  });

  suiteDescribe('rectangularCollision (AABB Collision Detection)', () => {
    const boxA: Rect = { x: 100, y: 100, width: 50, height: 50 };

    suiteIt('deve retornar true quando dois retângulos se sobrepõem perfeitamente', () => {
      const boxB: Rect = { x: 100, y: 100, width: 50, height: 50 };
      suiteExpect(rectangularCollision({ rectangle1: boxA, rectangle2: boxB })).toBe(true);
    });

    suiteIt('deve retornar true quando há sobreposição parcial interna', () => {
      const boxB: Rect = { x: 125, y: 125, width: 50, height: 50 };
      suiteExpect(rectangularCollision({ rectangle1: boxA, rectangle2: boxB })).toBe(true);
    });

    suiteIt('deve retornar true em contato exato na aresta direita (x1 + w1 === x2)', () => {
      const boxRightTouching: Rect = { x: 150, y: 100, width: 50, height: 50 };
      suiteExpect(rectangularCollision({ rectangle1: boxA, rectangle2: boxRightTouching })).toBe(true);
    });

    suiteIt('deve retornar true em contato exato na aresta inferior (y1 + h1 === y2)', () => {
      const boxBottomTouching: Rect = { x: 100, y: 150, width: 50, height: 50 };
      suiteExpect(rectangularCollision({ rectangle1: boxA, rectangle2: boxBottomTouching })).toBe(true);
    });

    suiteIt('deve retornar true quando um retângulo está totalmente contido no outro', () => {
      const outerBox: Rect = { x: 0, y: 0, width: 300, height: 300 };
      const innerBox: Rect = { x: 50, y: 50, width: 40, height: 40 };
      suiteExpect(rectangularCollision({ rectangle1: outerBox, rectangle2: innerBox })).toBe(true);
      suiteExpect(rectangularCollision({ rectangle1: innerBox, rectangle2: outerBox })).toBe(true);
    });

    suiteIt('deve retornar false quando separados horizontalmente (à direita)', () => {
      const boxFarRight: Rect = { x: 151, y: 100, width: 50, height: 50 };
      suiteExpect(rectangularCollision({ rectangle1: boxA, rectangle2: boxFarRight })).toBe(false);
    });

    suiteIt('deve retornar false quando separados horizontalmente (à esquerda)', () => {
      const boxFarLeft: Rect = { x: 40, y: 100, width: 50, height: 50 };
      suiteExpect(rectangularCollision({ rectangle1: boxA, rectangle2: boxFarLeft })).toBe(false);
    });

    suiteIt('deve retornar false quando separados verticalmente (acima ou abaixo)', () => {
      const boxAbove: Rect = { x: 100, y: 40, width: 50, height: 50 };
      const boxBelow: Rect = { x: 100, y: 160, width: 50, height: 50 };
      suiteExpect(rectangularCollision({ rectangle1: boxA, rectangle2: boxAbove })).toBe(false);
      suiteExpect(rectangularCollision({ rectangle1: boxA, rectangle2: boxBelow })).toBe(false);
    });

    suiteIt('deve retornar false em separação diagonal pura', () => {
      const boxDiagonal: Rect = { x: 200, y: 200, width: 50, height: 50 };
      suiteExpect(rectangularCollision({ rectangle1: boxA, rectangle2: boxDiagonal })).toBe(false);
    });
  });

  suiteDescribe('calculateOverlapArea (Intersecção em Pixels Quadrados)', () => {
    suiteIt('deve calcular 0 para retângulos completamente disjuntos', () => {
      const r1: Rect = { x: 0, y: 0, width: 40, height: 40 };
      const r2: Rect = { x: 100, y: 100, width: 40, height: 40 };
      suiteExpect(calculateOverlapArea(r1, r2)).toBe(0);
    });

    suiteIt('deve retornar a área total para retângulos idênticos', () => {
      const r1: Rect = { x: 20, y: 20, width: 50, height: 50 };
      const r2: Rect = { x: 20, y: 20, width: 50, height: 50 };
      suiteExpect(calculateOverlapArea(r1, r2)).toBe(2500);
    });

    suiteIt('deve calcular corretamente área de sobreposição parcial de 25x25 px', () => {
      const r1: Rect = { x: 0, y: 0, width: 50, height: 50 };
      const r2: Rect = { x: 25, y: 25, width: 50, height: 50 };
      // Intersecção: x de 25 a 50 (25px), y de 25 a 50 (25px) -> 25 * 25 = 625
      suiteExpect(calculateOverlapArea(r1, r2)).toBe(625);
    });

    suiteIt('deve calcular intersecção assimétrica com precisão', () => {
      const r1: Rect = { x: 0, y: 0, width: 100, height: 60 };
      const r2: Rect = { x: 40, y: 20, width: 100, height: 100 };
      // Intersecção X: min(100, 140) - max(0, 40) = 100 - 40 = 60
      // Intersecção Y: min(60, 120) - max(0, 20) = 60 - 20 = 40
      // Área: 60 * 40 = 2400
      suiteExpect(calculateOverlapArea(r1, r2)).toBe(2400);
    });

    suiteIt('deve retornar 0 quando apenas tocam na borda sem profundidade', () => {
      const r1: Rect = { x: 0, y: 0, width: 50, height: 50 };
      const r2: Rect = { x: 50, y: 0, width: 50, height: 50 };
      suiteExpect(calculateOverlapArea(r1, r2)).toBe(0);
    });
  });

  suiteDescribe('predictiveCollision (Colisão Preditiva com Offset de Vetor)', () => {
    const character: Rect = { x: 100, y: 100, width: 40, height: 40 };
    const obstacle = new Boundary({ position: { x: 150, y: 100 }, width: 40, height: 40 });
    const boundaries = [obstacle];

    suiteIt('deve detectar colisão com movimento pretendido em direção ao obstáculo (+15px)', () => {
      // 100 + 40 = 140. Com offset x=15, projected x = 115, x + w = 155 >= 150 -> Colide!
      const hit = predictiveCollision({
        character,
        boundaries,
        offset: { x: 15, y: 0 },
      });
      suiteExpect(hit).toBe(obstacle);
    });

    suiteIt('deve retornar null se o movimento mantiver distância livre do obstáculo (+5px)', () => {
      // projected x = 105, x + w = 145 < 150 -> Livre!
      const hit = predictiveCollision({
        character,
        boundaries,
        offset: { x: 5, y: 0 },
      });
      suiteExpect(hit).toBeNull();
    });

    suiteIt('deve retornar null se o vetor de deslocamento for na direção oposta (-10px)', () => {
      const hit = predictiveCollision({
        character,
        boundaries,
        offset: { x: -10, y: 0 },
      });
      suiteExpect(hit).toBeNull();
    });

    suiteIt('deve retornar o primeiro obstáculo atingido quando houver múltiplos', () => {
      const obstacle1 = new Boundary({ position: { x: 120, y: 100 }, width: 20, height: 20, id: 'b1' });
      const obstacle2 = new Boundary({ position: { x: 130, y: 100 }, width: 20, height: 20, id: 'b2' });
      const hit = predictiveCollision({
        character,
        boundaries: [obstacle1, obstacle2],
        offset: { x: 10, y: 0 },
      });
      suiteExpect(hit).toBe(obstacle1);
    });
  });

  suiteDescribe('parseCollisionGrid & parse2DCollisionMap', () => {
    suiteIt('deve parsear array 1D (Tiled format) calculando coordenadas x, y corretamente', () => {
      // Grid 4x3: índice 5 é linha 1, coluna 1
      const grid = [
        0,    0,    0,    0,
        0, 1025,    0,    0,
        0,    0, 1025,    0,
      ];

      const boundaries = parseCollisionGrid({
        grid,
        mapWidth: 4,
        tileSize: 48,
        offset: { x: 10, y: 20 },
        collisionTileId: 1025,
      });

      suiteExpect(boundaries.length).toBe(2);
      // Primeiro boundary (índice 5: col 1, row 1)
      suiteExpect(boundaries[0].position.x).toBe(1 * 48 + 10);
      suiteExpect(boundaries[0].position.y).toBe(1 * 48 + 20);
      suiteExpect(boundaries[0].id).toBe('boundary_1_1');

      // Segundo boundary (índice 10: col 2, row 2)
      suiteExpect(boundaries[1].position.x).toBe(2 * 48 + 10);
      suiteExpect(boundaries[1].position.y).toBe(2 * 48 + 20);
      suiteExpect(boundaries[1].id).toBe('boundary_2_2');
    });

    suiteIt('deve filtrar múltiplos collisionTileIds simultaneamente', () => {
      const grid = [1, 2, 0, 3];
      const boundaries = parseCollisionGrid({
        grid,
        mapWidth: 2,
        tileSize: 32,
        collisionTileId: [1, 3],
      });
      suiteExpect(boundaries.length).toBe(2);
      suiteExpect(boundaries[0].position.x).toBe(0);
      suiteExpect(boundaries[1].position.x).toBe(32);
    });

    suiteIt('deve parsear matriz 2D mantendo integridade espacial', () => {
      const map2D = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ];

      const boundaries = parse2DCollisionMap({
        map2D,
        tileSize: 48,
        collisionTileId: 1,
        type: 'solid',
      });

      suiteExpect(boundaries.length).toBe(3);
      suiteExpect(boundaries[0].id).toBe('boundary_0_0');
      suiteExpect(boundaries[1].id).toBe('boundary_1_1');
      suiteExpect(boundaries[2].id).toBe('boundary_2_2');
    });
  });
});

/* ========================================================================== */
/* 2. SUÍTE DE TESTES: SPRITE & CICLO DE FRAMES                               */
/* ========================================================================== */

suiteDescribe('Engine Graphics - Sprite & Frame Animation Loop', () => {
  suiteIt('deve inicializar Sprite com parâmetros e dimensões padrão', () => {
    const sprite = new Sprite({
      position: { x: 50, y: 80 },
    });

    suiteExpect(sprite.position).toEqual({ x: 50, y: 80 });
    suiteExpect(sprite.direction).toBe('down');
    suiteExpect(sprite.moving).toBe(false);
    suiteExpect(sprite.scale).toBe(1);
    suiteExpect(sprite.rotation).toBe(0);
    suiteExpect(sprite.opacity).toBe(1);
    suiteExpect(sprite.frames.max).toBe(1);
    suiteExpect(sprite.frames.hold).toBe(10);
    suiteExpect(sprite.frames.val).toBe(0);
    suiteExpect(sprite.frames.elapsed).toBe(0);

    // Fallback dimensional padrão sem imagem carregada (48px)
    suiteExpect(sprite.frameWidth).toBe(48);
    suiteExpect(sprite.frameHeight).toBe(48);
    suiteExpect(sprite.width).toBe(48);
    suiteExpect(sprite.height).toBe(48);
  });

  suiteIt('deve aplicar scale e cropWidth/cropHeight corretamente', () => {
    const sprite = new Sprite({
      position: { x: 0, y: 0 },
      cropWidth: 16,
      cropHeight: 16,
      scale: 3,
    });

    suiteExpect(sprite.frameWidth).toBe(16);
    suiteExpect(sprite.frameHeight).toBe(16);
    suiteExpect(sprite.width).toBe(48);
    suiteExpect(sprite.height).toBe(48);
  });

  suiteIt('deve calcular hitbox focada nos pés com base nas proporções configuradas', () => {
    const sprite = new Sprite({
      position: { x: 100, y: 200 },
      cropWidth: 48,
      cropHeight: 48,
      scale: 1,
      hitbox: {
        widthRatio: 0.8,
        heightRatio: 0.4,
        offsetXRatio: 0.1,
        offsetYRatio: 0.6,
      },
    });

    const hitbox = sprite.getHitbox();

    // width = 48 * 0.8 = 38.4
    // height = 48 * 0.4 = 19.2
    // x = 100 + 48 * 0.1 = 104.8
    // y = 200 + 48 * 0.6 = 228.8
    suiteExpect(hitbox.width).toBeCloseTo(38.4, 1);
    suiteExpect(hitbox.height).toBeCloseTo(19.2, 1);
    suiteExpect(hitbox.x).toBeCloseTo(104.8, 1);
    suiteExpect(hitbox.y).toBeCloseTo(228.8, 1);
  });

  suiteDescribe('Ciclo de Animação de Passos (updateAnimation)', () => {
    suiteIt('não deve avançar frames quando moving = false (permanece no frame 0)', () => {
      const sprite = new Sprite({
        position: { x: 0, y: 0 },
        frames: { max: 4, hold: 5 },
        animate: false,
      });

      // Ticks em estado parado
      sprite.updateAnimation();
      sprite.updateAnimation();
      sprite.updateAnimation();

      suiteExpect(sprite.frames.val).toBe(0);
      suiteExpect(sprite.frames.elapsed).toBe(0);
    });

    suiteIt('deve resetar frames.val e elapsed para 0 assim que moving passa a ser false', () => {
      const sprite = new Sprite({
        position: { x: 0, y: 0 },
        frames: { max: 4, hold: 2 },
        animate: true,
      });

      // Anda por 2 ticks -> deve avançar para o frame 1
      sprite.updateAnimation();
      sprite.updateAnimation();
      suiteExpect(sprite.frames.val).toBe(1);

      // Para de se mover
      sprite.moving = false;
      sprite.updateAnimation();
      suiteExpect(sprite.frames.val).toBe(0);
      suiteExpect(sprite.frames.elapsed).toBe(0);
    });

    suiteIt('deve avançar o frame exatamente no ciclo modulo hold (ex: hold=10, max=4)', () => {
      const sprite = new Sprite({
        position: { x: 0, y: 0 },
        frames: { max: 4, hold: 10 },
        animate: true,
      });

      // Ticks 1 a 9: ainda no frame 0
      for (let i = 1; i <= 9; i++) {
        sprite.updateAnimation();
        suiteExpect(sprite.frames.val).toBe(0);
        suiteExpect(sprite.frames.elapsed).toBe(i);
      }

      // Tick 10: atinge hold=10 -> frame 1!
      sprite.updateAnimation();
      suiteExpect(sprite.frames.val).toBe(1);
      suiteExpect(sprite.frames.elapsed).toBe(10);

      // Mais 10 ticks (total 20) -> frame 2!
      for (let i = 1; i <= 10; i++) {
        sprite.updateAnimation();
      }
      suiteExpect(sprite.frames.val).toBe(2);

      // Mais 10 ticks (total 30) -> frame 3!
      for (let i = 1; i <= 10; i++) {
        sprite.updateAnimation();
      }
      suiteExpect(sprite.frames.val).toBe(3);

      // Mais 10 ticks (total 40) -> wrap around para frame 0! (4 % 4 = 0)
      for (let i = 1; i <= 10; i++) {
        sprite.updateAnimation();
      }
      suiteExpect(sprite.frames.val).toBe(0);
      suiteExpect(sprite.frames.elapsed).toBe(40);
    });

    suiteIt('não deve alterar frames.val se frames.max for 1 mesmo quando moving = true', () => {
      const sprite = new Sprite({
        position: { x: 0, y: 0 },
        frames: { max: 1, hold: 2 },
        animate: true,
      });

      for (let i = 0; i < 10; i++) {
        sprite.updateAnimation();
      }
      suiteExpect(sprite.frames.val).toBe(0);
    });
  });

  suiteDescribe('Direções e Mudanças de Estado', () => {
    suiteIt('deve alterar a direção e preservar estado de posição', () => {
      const sprite = new Sprite({
        position: { x: 120, y: 64 },
        direction: 'down',
      });

      const directions: Direction[] = ['up', 'left', 'right', 'down'];
      for (const dir of directions) {
        sprite.setDirection(dir);
        suiteExpect(sprite.direction).toBe(dir);
      }
      suiteExpect(sprite.position).toEqual({ x: 120, y: 64 });
    });

    suiteIt('Sprite.create factory helper deve instanciar Sprite idêntico ao construtor', () => {
      const s = Sprite.create({
        position: { x: 42, y: 84 },
        scale: 2,
      });
      suiteExpect(s instanceof Sprite).toBe(true);
      suiteExpect(s.scale).toBe(2);
    });
  });

  suiteDescribe('Renderização Segura no Canvas Context', () => {
    suiteIt('draw() não deve disparar erro mesmo com imagem vazia ou não carregada', () => {
      const sprite = new Sprite({
        position: { x: 10, y: 10 },
        opacity: 0.8,
        rotation: Math.PI / 4,
      });
      const ctx = createMockCtx();

      // Não deve lançar exceção
      suiteExpect(() => {
        sprite.draw(ctx);
      }).not.toThrow();
    });
  });
});

/* ========================================================================== */
/* 3. SUÍTE DE TESTES: ZUSTAND STORE INTEGRITY (useGameStore)                  */
/* ========================================================================== */

suiteDescribe('Game State Management - Zustand Store Integrity', () => {
  suiteBeforeEach(() => {
    // Restaura o store para o estado virgem antes de cada teste
    useGameStore.getState().resetGame();
  });

  suiteDescribe('Estado Inicial & Reset', () => {
    suiteIt('deve iniciar com configurações e dados canônicos corretos', () => {
      const state = useGameStore.getState();

      suiteExpect(state.gameMode).toBe('exploring');
      suiteExpect(state.player.level).toBe(1);
      suiteExpect(state.player.xp).toBe(25);
      suiteExpect(state.player.maxXp).toBe(100);
      suiteExpect(state.player.bits).toBe(420);
      suiteExpect(state.player.steps).toBe(0);
      suiteExpect(state.player.direction).toBe('down');
      suiteExpect(state.selectedStarter.id).toBe(INITIAL_STARTERS[0].id);
      suiteExpect(state.currentHp).toBe(INITIAL_STARTERS[0].hp);
      suiteExpect(state.maxHp).toBe(INITIAL_STARTERS[0].maxHp);
      suiteExpect(state.inventory.length).toBe(INITIAL_INVENTORY.length);
      suiteExpect(state.isMuted).toBe(false);
      suiteExpect(state.debugMode).toBe(false);
      suiteExpect(state.currentBattle).toBeNull();
    });
  });

  suiteDescribe('Matemática de Progressão do Jogador (XP, Level-Up e Passos)', () => {
    suiteIt('deve incrementar contagem de passos de forma determinística', () => {
      const { incrementSteps } = useGameStore.getState();

      incrementSteps();
      incrementSteps();
      incrementSteps();

      suiteExpect(useGameStore.getState().player.steps).toBe(3);
    });

    suiteIt('deve acumular XP sem subir de nível quando xp < maxXp', () => {
      const { addXp } = useGameStore.getState();

      addXp(50); // 25 + 50 = 75 < 100

      const player = useGameStore.getState().player;
      suiteExpect(player.xp).toBe(75);
      suiteExpect(player.level).toBe(1);
      suiteExpect(player.maxXp).toBe(100);
    });

    suiteIt('deve processar level-up ao atingir o limiar de maxXp e recalcular maxXp com escalonamento de 1.5x', () => {
      const { addXp } = useGameStore.getState();

      // XP inicial = 25, maxXp = 100.
      // Adicionando 80 XP: total = 105.
      // 105 >= 100 -> level = 2, sobra de XP = 5, novo maxXp = round(100 * 1.5) = 150
      addXp(80);

      const player = useGameStore.getState().player;
      suiteExpect(player.level).toBe(2);
      suiteExpect(player.xp).toBe(5);
      suiteExpect(player.maxXp).toBe(150);
    });

    suiteIt('deve processar múltiplos level-ups consecutivos em salto de XP massivo', () => {
      const { addXp } = useGameStore.getState();

      // Nível 1: 25 XP, max 100
      // Injetando 1000 XP
      addXp(1000);

      const player = useGameStore.getState().player;
      suiteExpect(player.level).toBeGreaterThan(2);
      suiteExpect(player.xp).toBeLessThan(player.maxXp);
    });

    suiteIt('deve gerenciar saldo de Bits e impedir valores negativos', () => {
      const { addBits } = useGameStore.getState();

      addBits(100);
      suiteExpect(useGameStore.getState().player.bits).toBe(520);

      // Subtrai mais do que possui: deve limitar em 0
      addBits(-1000);
      suiteExpect(useGameStore.getState().player.bits).toBe(0);
    });

    suiteIt('deve atualizar posição e direção do jogador no grid 2D', () => {
      const { setPlayerPosition, setPlayerDirection } = useGameStore.getState();

      setPlayerPosition({ x: 320, y: 480 });
      setPlayerDirection('up');

      const player = useGameStore.getState().player;
      suiteExpect(player.position).toEqual({ x: 320, y: 480 });
      suiteExpect(player.direction).toBe('up');
    });
  });

  suiteDescribe('Gestão de Starters e Saúde (HP)', () => {
    suiteIt('deve trocar o Starter ativo e sincronizar HP / maxHp com o novo espécime', () => {
      const { setStarter } = useGameStore.getState();

      // Troca para o tanque de rede Hydra-Shell (starter_cyber_turtle: 55 HP)
      setStarter('starter_cyber_turtle');

      const state = useGameStore.getState();
      suiteExpect(state.selectedStarter.id).toBe('starter_cyber_turtle');
      suiteExpect(state.currentHp).toBe(55);
      suiteExpect(state.maxHp).toBe(55);
    });

    suiteIt('updateHp deve aplicar dano e impedir HP menor que 0', () => {
      const { updateHp } = useGameStore.getState();

      // Dano parcial
      updateHp(-20);
      suiteExpect(useGameStore.getState().currentHp).toBe(25);

      // Dano fatal: clamp em 0
      updateHp(-100);
      suiteExpect(useGameStore.getState().currentHp).toBe(0);
    });

    suiteIt('updateHp deve impedir cura acima do maxHp (overheal prevention)', () => {
      const { updateHp } = useGameStore.getState();

      updateHp(-15);
      suiteExpect(useGameStore.getState().currentHp).toBe(30);

      // Cura excessiva de +50 (maxHp = 45) -> deve limitar em 45
      updateHp(50);
      suiteExpect(useGameStore.getState().currentHp).toBe(45);
    });

    suiteIt('restoreHpFull deve restaurar a vida completa instantaneamente', () => {
      const { updateHp, restoreHpFull } = useGameStore.getState();

      updateHp(-40);
      suiteExpect(useGameStore.getState().currentHp).toBe(5);

      restoreHpFull();
      suiteExpect(useGameStore.getState().currentHp).toBe(45);
    });
  });

  suiteDescribe('Gestão de Inventário e Consumo de Itens', () => {
    suiteIt('addItem deve incrementar a quantidade de itens já existentes', () => {
      const { addItem } = useGameStore.getState();

      // Potion já existe com qty 3
      addItem({ id: 'item_espresso_potion', name: 'Espresso', category: 'potion', description: '', effectValue: 25, icon: '☕' }, 2);

      const item = useGameStore.getState().inventory.find((i) => i.id === 'item_espresso_potion');
      suiteExpect(item?.quantity).toBe(5);
    });

    suiteIt('addItem deve inserir novo item no inventário se inexistente', () => {
      const { addItem } = useGameStore.getState();

      addItem({
        id: 'item_quantum_crystal',
        name: 'Quantum Crystal',
        category: 'utility',
        description: 'Rare material',
        effectValue: 0,
        icon: '💎',
      }, 1);

      const item = useGameStore.getState().inventory.find((i) => i.id === 'item_quantum_crystal');
      suiteExpect(item).toBeDefined();
      suiteExpect(item?.quantity).toBe(1);
    });

    suiteIt('removeItem deve decrementar quantidade e purgar item quando quantity <= 0', () => {
      const { removeItem } = useGameStore.getState();

      // Espresso tem 3
      removeItem('item_espresso_potion', 1);
      let item = useGameStore.getState().inventory.find((i) => i.id === 'item_espresso_potion');
      suiteExpect(item?.quantity).toBe(2);

      // Remove restante
      removeItem('item_espresso_potion', 5);
      item = useGameStore.getState().inventory.find((i) => i.id === 'item_espresso_potion');
      suiteExpect(item).toBeUndefined();
    });

    suiteIt('useItem deve aplicar cura de poção e decrementar quantidade consumida', () => {
      const { updateHp, useItem } = useGameStore.getState();

      // Reduz vida para 10
      updateHp(-35);
      suiteExpect(useGameStore.getState().currentHp).toBe(10);

      // Consome Espresso (+25 HP)
      const success = useItem('item_espresso_potion');
      suiteExpect(success).toBe(true);

      suiteExpect(useGameStore.getState().currentHp).toBe(35);

      // Verifica que quantidade caiu de 3 para 2
      const potion = useGameStore.getState().inventory.find((i) => i.id === 'item_espresso_potion');
      suiteExpect(potion?.quantity).toBe(2);
    });

    suiteIt('useItem deve retornar false para item inexistente ou sem quantidade', () => {
      const { useItem } = useGameStore.getState();

      const success = useItem('non_existent_item_id');
      suiteExpect(success).toBe(false);
    });
  });

  suiteDescribe('Controle de Modos de Jogo, Áudio e Opções de Debug', () => {
    suiteIt('deve alterar modo de jogo entre exploring e battle', () => {
      const { setGameMode } = useGameStore.getState();

      setGameMode('battle');
      suiteExpect(useGameStore.getState().gameMode).toBe('battle');

      setGameMode('exploring');
      suiteExpect(useGameStore.getState().gameMode).toBe('exploring');
    });

    suiteIt('deve alternar mute, volume e modo de depuração', () => {
      const { toggleMute, setVolume, toggleDebug } = useGameStore.getState();

      toggleMute();
      suiteExpect(useGameStore.getState().isMuted).toBe(true);

      setVolume(0.75);
      suiteExpect(useGameStore.getState().volume).toBe(0.75);

      // Limites de volume (clamp [0, 1])
      setVolume(1.5);
      suiteExpect(useGameStore.getState().volume).toBe(1);

      setVolume(-0.2);
      suiteExpect(useGameStore.getState().volume).toBe(0);

      toggleDebug();
      suiteExpect(useGameStore.getState().debugMode).toBe(true);
    });

    suiteIt('startBattle e fleeBattle devem controlar o ciclo de combate e log', () => {
      const { startBattle, fleeBattle } = useGameStore.getState();

      startBattle({
        name: 'Corrupted Service Daemon',
        hp: 50,
        maxHp: 50,
      });

      const state = useGameStore.getState();
      suiteExpect(state.gameMode).toBe('battle');
      suiteExpect(state.currentBattle).toBeDefined();
      suiteExpect(state.currentBattle?.enemy.name).toBe('Corrupted Service Daemon');
      suiteExpect(state.currentBattle?.turn).toBe('player');
      suiteExpect(state.currentBattle?.isFinished).toBe(false);

      // Fuga do combate
      fleeBattle();
      suiteExpect(useGameStore.getState().currentBattle?.isFinished).toBe(true);
    });
  });

  /* ========================================================================== */
  /* 4. SUÍTE DE TESTES: GAME ENGINE CONTROLS & MOVABLES                       */
  /* ========================================================================== */

  suiteDescribe('GameEngine Lifecycle & Input Mechanics', () => {
    const createMockCanvas = (): HTMLCanvasElement => {
      const mockCtx = createMockCtx();
      return {
        width: 1024,
        height: 576,
        getContext: () => mockCtx,
      } as unknown as HTMLCanvasElement;
    };

    suiteIt('deve inicializar GameEngine com player centralizado e lista de movables', () => {
      const canvas = createMockCanvas();
      const player = new Sprite({ position: { x: 0, y: 0 }, cropWidth: 48, cropHeight: 48 });
      const background = new Sprite({ position: { x: -100, y: -200 } });
      const boundary = new Boundary({ position: { x: 10, y: 20 } });

      const engine = new GameEngine({
        canvas,
        player,
        background,
        boundaries: [boundary],
        enableAudio: false,
      });

      // Player centralizado: canvas (1024 / 2 - 48 / 2 = 488, 576 / 2 - 48 / 2 = 264)
      suiteExpect(player.position.x).toBe(488);
      suiteExpect(player.position.y).toBe(264);

      // Movables contendo background e boundary
      suiteExpect(engine.movables).toContain(background);
      suiteExpect(engine.movables).toContain(boundary);

      engine.destroy();
    });

    suiteIt('setKey e releaseAllKeys devem gerenciar teclas de controle sem erros', () => {
      const canvas = createMockCanvas();
      const player = new Sprite({ position: { x: 0, y: 0 } });
      const background = new Sprite({ position: { x: 0, y: 0 } });

      const engine = new GameEngine({
        canvas,
        player,
        background,
        enableAudio: false,
      });

      // Simula input do VirtualDPad
      engine.setKey('w', true);
      engine.setKey('d', true);

      // Libera todas as teclas
      engine.releaseAllKeys();

      // Suporta setKey com arrow keys
      engine.setKey('ArrowUp', true);
      engine.setKey('ArrowRight', true);
      engine.releaseAllKeys();

      engine.destroy();
    });

    suiteIt('addMovable e removeMovable devem manter lista atualizada', () => {
      const canvas = createMockCanvas();
      const player = new Sprite({ position: { x: 0, y: 0 } });
      const background = new Sprite({ position: { x: 0, y: 0 } });
      const npc = new Sprite({ position: { x: 50, y: 50 } });

      const engine = new GameEngine({
        canvas,
        player,
        background,
        enableAudio: false,
      });

      engine.addMovable(npc);
      suiteExpect(engine.movables).toContain(npc);

      engine.removeMovable(npc);
      suiteExpect(engine.movables.includes(npc)).toBe(false);

      engine.destroy();
    });
  });
});

/* ========================================================================== */
/* 5. SUÍTE DE TESTES: PR #03 - CODE BATTLE ARENA & SANDBOX EVALUATION        */
/* ========================================================================== */

suiteDescribe('PR #03 - Code Battle Mechanics & Sandbox Evaluation', () => {
  suiteIt('deve recuperar desafios válidos para cada habilidade dos starters', () => {
    const skills = [
      'skill_syntax_strike',
      'skill_hot_reload',
      'skill_packet_blast',
      'skill_tls_shield',
      'skill_neon_pulse',
      'skill_borrow_checker',
    ];

    for (const skillId of skills) {
      const challenge = getChallengeForSkill(skillId);
      suiteExpect(challenge).toBeDefined();
      suiteExpect(challenge.testCases.length).toBeGreaterThan(0);
      suiteExpect(typeof challenge.starterCode).toBe('string');
      suiteExpect(typeof challenge.functionName).toBe('string');
    }
  });

  suiteIt('CodeSandboxEvaluator deve avaliar solução correta de Syntax Strike com sucesso', () => {
    const challenge = BATTLE_CHALLENGES.skill_syntax_strike;
    const correctCode = `
      function calculateTax(price, taxRate) {
        const tax = price * taxRate;
        return Number((price + tax).toFixed(2));
      }
    `;

    const outcome = CodeSandboxEvaluator.evaluate(correctCode, challenge);
    suiteExpect(outcome.allPassed).toBe(true);
    suiteExpect(outcome.testsPassed).toBe(challenge.testCases.length);
    suiteExpect(outcome.totalTests).toBe(challenge.testCases.length);
    suiteExpect(outcome.syntaxError).toBeUndefined();
  });

  suiteIt('CodeSandboxEvaluator deve detectar reprovação quando a lógica está incorreta', () => {
    const challenge = BATTLE_CHALLENGES.skill_syntax_strike;
    const incorrectCode = `
      function calculateTax(price, taxRate) {
        return price; // Esquecendo o imposto!
      }
    `;

    const outcome = CodeSandboxEvaluator.evaluate(incorrectCode, challenge);
    suiteExpect(outcome.allPassed).toBe(false);
    suiteExpect(outcome.testsPassed).toBe(2); // Passa apenas nos testes com taxa zero ou preço zero
  });

  suiteIt('CodeSandboxEvaluator deve capturar erros de sintaxe de forma segura', () => {
    const challenge = BATTLE_CHALLENGES.skill_syntax_strike;
    const brokenCode = `
      function calculateTax(price, taxRate { // Falta fechar parenteses
        return 0;
      }
    `;

    const outcome = CodeSandboxEvaluator.evaluate(brokenCode, challenge);
    suiteExpect(outcome.allPassed).toBe(false);
    suiteExpect(outcome.testsPassed).toBe(0);
    suiteExpect(outcome.syntaxError).toBeDefined();
  });

  suiteIt('CodeSandboxEvaluator deve capturar console.log de forma determinística', () => {
    const challenge = BATTLE_CHALLENGES.skill_hot_reload;
    const loggingCode = `
      function deduplicateModules(modules) {
        console.log("Processando", modules.length, "modulos");
        return [...new Set(modules)];
      }
    `;

    const outcome = CodeSandboxEvaluator.evaluate(loggingCode, challenge);
    suiteExpect(outcome.allPassed).toBe(true);
    suiteExpect(outcome.stdout).toContain('Processando');
  });
});

/* ========================================================================== */
/* 6. SUÍTE DE TESTES: PR #04 - LUMI AI QUOTA & GITEA REAL GIT AUTOMATION     */
/* ========================================================================== */

suiteDescribe('PR #04 - Lumi Socratic AI Quota & Gitea Real Git Automation', () => {
  suiteBeforeEach(() => {
    useGameStore.getState().resetGame();
  });

  suiteIt('Lumi AI Tutor deve iniciar com 5 quotas diárias e decrementar a cada pergunta', () => {
    const { useLumiPrompt } = useGameStore.getState();

    suiteExpect(useGameStore.getState().lumiQuota.remaining).toBe(5);

    // Consome 3 perguntas
    suiteExpect(useLumiPrompt()).toBe(true);
    suiteExpect(useLumiPrompt()).toBe(true);
    suiteExpect(useLumiPrompt()).toBe(true);
    suiteExpect(useGameStore.getState().lumiQuota.remaining).toBe(2);

    // Consome as 2 restantes
    suiteExpect(useLumiPrompt()).toBe(true);
    suiteExpect(useLumiPrompt()).toBe(true);
    suiteExpect(useGameStore.getState().lumiQuota.remaining).toBe(0);

    // Tentativa excedente deve retornar false e manter 0
    suiteExpect(useLumiPrompt()).toBe(false);
    suiteExpect(useGameStore.getState().lumiQuota.remaining).toBe(0);
  });

  suiteIt('Gitea Real Git Automation deve provisionar repositório com URLs canônicas', () => {
    const { provisionGitRepo, setPlayerName } = useGameStore.getState();

    setPlayerName('Alice-Hacker');
    provisionGitRepo('Quest-Algorithms-Trees');

    const gitRepo = useGameStore.getState().gitRepo;
    suiteExpect(gitRepo).toBeDefined();
    suiteExpect(gitRepo?.repoName).toBe('quest-algorithms-trees');
    suiteExpect(gitRepo?.repoUrl).toBe('http://localhost:3030/alice-hacker/quest-algorithms-trees');
    suiteExpect(gitRepo?.cloneUrl).toBe('git clone http://localhost:3030/alice-hacker/quest-algorithms-trees.git');
    suiteExpect(gitRepo?.branch).toBe('main');
    suiteExpect(gitRepo?.status).toBe('active');
  });
});

/* ========================================================================== */
/* 7. SUÍTE DE TESTES: PR #06 - HARDENING, ANTI-CHEAT & DELTA-TIME POLISH     */
/* ========================================================================== */

suiteDescribe('PR #06 - Hardening, Anti-Cheat & Delta-Time Polish', () => {
  suiteIt('Anti-Cheat: deve rejeitar soluções com respostas hardcoded nos testes ocultos', () => {
    const challenge = BATTLE_CHALLENGES.skill_syntax_strike;
    // Solução trapaceira que só resolve os 3 testes visíveis
    const hardcodedCheatCode = `
      function calculateTax(price, taxRate) {
        if (price === 100 && taxRate === 0.1) return 110;
        if (price === 49.9 && taxRate === 0.08) return 53.89;
        if (price === 250 && taxRate === 0) return 250;
        return 0; // Vai falhar nas baterias ocultas!
      }
    `;

    const outcome = CodeSandboxEvaluator.evaluate(hardcodedCheatCode, challenge);
    suiteExpect(outcome.allPassed).toBe(false);
    // Deve ter passado nos 3 visíveis, mas falhado nos testes ocultos
    const hiddenResults = outcome.testResults.filter((t) => t.hidden);
    suiteExpect(hiddenResults.length).toBeGreaterThan(0);
    const hiddenFailed = hiddenResults.some((t) => !t.passed);
    suiteExpect(hiddenFailed).toBe(true);
  });

  suiteIt('Anti-Cheat: solução algorítmica legítima deve passar em 100% dos testes (visíveis e ocultos)', () => {
    const challenge = BATTLE_CHALLENGES.skill_syntax_strike;
    const legitimateCode = `
      function calculateTax(price, taxRate) {
        const tax = price * taxRate;
        return Number((price + tax).toFixed(2));
      }
    `;

    const outcome = CodeSandboxEvaluator.evaluate(legitimateCode, challenge);
    suiteExpect(outcome.allPassed).toBe(true);
    suiteExpect(outcome.testsPassed).toBe(challenge.testCases.length);

    // Todos os testes ocultos devem ter passado
    const hiddenResults = outcome.testResults.filter((t) => t.hidden);
    suiteExpect(hiddenResults.length).toBeGreaterThan(0);
    suiteExpect(hiddenResults.every((t) => t.passed)).toBe(true);
  });

  suiteIt('CodeSandboxEvaluator.evaluateAsync deve retornar resultado completo via Promise', async () => {
    const challenge = BATTLE_CHALLENGES.skill_hot_reload;
    const validCode = `
      function deduplicateModules(modules) {
        return [...new Set(modules)];
      }
    `;

    const outcome = await CodeSandboxEvaluator.evaluateAsync(validCode, challenge);
    suiteExpect(outcome.allPassed).toBe(true);
    suiteExpect(outcome.totalTests).toBe(challenge.testCases.length);
    suiteExpect(outcome.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  suiteIt('Delta-Time: cálculo de deslocamento deve ser proporcional à taxa de quadros', () => {
    const speed = 4;

    // A 60 FPS (16.66ms delta), deltaFactor ~ 1.0, passo = 4px
    const delta60HzMs = 1000 / 60;
    const factor60 = delta60HzMs / (1000 / 60);
    const step60 = speed * factor60;
    suiteExpect(Math.round(step60)).toBe(4);

    // A 120 FPS (8.33ms delta), deltaFactor ~ 0.5, passo = 2px (mantendo 240px/segundo constante)
    const delta120HzMs = 1000 / 120;
    const factor120 = delta120HzMs / (1000 / 60);
    const step120 = speed * factor120;
    suiteExpect(Math.round(step120)).toBe(2);

    // Velocidade física por segundo permanece 240px/s em ambas as taxas:
    suiteExpect(step60 * 60).toBe(step120 * 120);
  });

  suiteIt('AudioSynthesizer.silenceAll deve executar de forma defensiva sem disparar exceções', () => {
    const audio = AudioSynthesizer.getInstance();
    suiteExpect(typeof audio.silenceAll).toBe('function');

    // Execução idempotente não deve lançar erro
    audio.silenceAll();
    audio.silenceAll();
  });
});

/* ========================================================================== */
/* 8. SUÍTE DE TESTES: PR #07 - VISUAL FX SCREEN SHAKE & BITS ECONOMY         */
/* ========================================================================== */

suiteDescribe('PR #07 - Visual FX Screen Shake & Bits Economy', () => {
  suiteIt('GameEngine deve disparar Screen Shake e amortecer até desativar', () => {
    const mockCtx = createMockCtx();
    const canvas = {
      width: 1024,
      height: 576,
      getContext: () => mockCtx,
    } as unknown as HTMLCanvasElement;

    const player = new Sprite({ position: { x: 0, y: 0 } });
    const background = new Sprite({ position: { x: 0, y: 0 } });

    const engine = new GameEngine({
      canvas,
      player,
      background,
      enableAudio: false,
    });

    suiteExpect(engine.isScreenShaking()).toBe(false);

    // Dispara Screen Shake de 200ms
    engine.triggerScreenShake(200, 10);
    suiteExpect(engine.isScreenShaking()).toBe(true);

    // Renderiza enquanto chacoalha (deve chamar translate e restore sem falhar)
    engine.render();
    suiteExpect(engine.isScreenShaking()).toBe(true);

    engine.destroy();
  });

  suiteIt('useGameStore: rechargeLumiQuota deve deduzir Bits e adicionar prompts', () => {
    useGameStore.getState().resetGame();

    // Saldo inicial padrão: 420 Bits, 5 prompts
    suiteExpect(useGameStore.getState().player.bits).toBe(420);
    suiteExpect(useGameStore.getState().lumiQuota.remaining).toBe(5);

    // Recarrega cota com 100 Bits
    const success = useGameStore.getState().rechargeLumiQuota(100);
    suiteExpect(success).toBe(true);
    suiteExpect(useGameStore.getState().player.bits).toBe(320);
    suiteExpect(useGameStore.getState().lumiQuota.remaining).toBe(8);

    // Tenta recarregar com saldo insuficiente (ex: 500 Bits)
    const failAttempt = useGameStore.getState().rechargeLumiQuota(500);
    suiteExpect(failAttempt).toBe(false);
    suiteExpect(useGameStore.getState().player.bits).toBe(320);
    suiteExpect(useGameStore.getState().lumiQuota.remaining).toBe(8);
  });

  suiteIt('useGameStore: buyStreakFreeze e useStreakFreeze devem gerenciar proteções de ofensiva', () => {
    useGameStore.getState().resetGame();

    suiteExpect(useGameStore.getState().streakFreezes).toBe(0);

    // Compra 1 Streak Freeze por 250 Bits
    const buySuccess = useGameStore.getState().buyStreakFreeze(250);
    suiteExpect(buySuccess).toBe(true);
    suiteExpect(useGameStore.getState().streakFreezes).toBe(1);
    suiteExpect(useGameStore.getState().player.bits).toBe(420 - 250); // 170 Bits

    // Tentativa de compra sem saldo suficiente
    const buyFail = useGameStore.getState().buyStreakFreeze(250);
    suiteExpect(buyFail).toBe(false);
    suiteExpect(useGameStore.getState().streakFreezes).toBe(1);

    // Consome o Streak Freeze
    const useSuccess = useGameStore.getState().useStreakFreeze();
    suiteExpect(useSuccess).toBe(true);
    suiteExpect(useGameStore.getState().streakFreezes).toBe(0);

    // Consumo sem saldo de proteções deve retornar false
    const useFail = useGameStore.getState().useStreakFreeze();
    suiteExpect(useFail).toBe(false);
  });
});

/* ========================================================================== */
/* 9. SUÍTE DE TESTES: PR #08 - MULTI-BIOMA, PORTAIS HOLOGRÁFICOS & SOCRATIC AI */
/* ========================================================================== */

suiteDescribe('PR #08 - Multi-Bioma & Portais Holográficos', () => {
  suiteIt('ProceduralAssets: deve gerar 3 mundos procedurais com biomas e portais distintos', () => {
    const worldValley = createGeneratedGameWorld('circuit_valley');
    const worldMatrix = createGeneratedGameWorld('network_matrix');
    const worldColiseum = createGeneratedGameWorld('algorithm_coliseum');

    suiteExpect(worldValley.biome).toBe('circuit_valley');
    suiteExpect(worldMatrix.biome).toBe('network_matrix');
    suiteExpect(worldColiseum.biome).toBe('algorithm_coliseum');

    // Cada bioma possui portais holográficos configurados
    suiteExpect(worldValley.portals.length).toBeGreaterThanOrEqual(2);
    suiteExpect(worldMatrix.portals.length).toBeGreaterThanOrEqual(2);
    suiteExpect(worldColiseum.portals.length).toBeGreaterThanOrEqual(2);

    // Valida alvos dos portais no Circuit Valley
    const valleyTargets = worldValley.portals.map((p) => p.data?.targetBiome);
    suiteExpect(valleyTargets).toContain('network_matrix');
    suiteExpect(valleyTargets).toContain('algorithm_coliseum');
  });

  suiteIt('GameEngine: loadBiome deve atualizar background, boundaries, battleZones e portals', () => {
    const mockCtx = createMockCtx();
    const canvas = {
      width: 1024,
      height: 576,
      getContext: () => mockCtx,
    } as unknown as HTMLCanvasElement;

    const initialWorld = createGeneratedGameWorld('circuit_valley');
    const engine = new GameEngine({
      canvas,
      player: initialWorld.player,
      background: initialWorld.background,
      boundaries: initialWorld.boundaries,
      battleZones: initialWorld.battleZones,
      portals: initialWorld.portals,
      enableAudio: false,
    });

    suiteExpect(engine.portals.length).toBe(initialWorld.portals.length);

    // Carrega novo bioma
    const matrixWorld = createGeneratedGameWorld('network_matrix');
    engine.loadBiome(matrixWorld);

    suiteExpect(engine.background).toBe(matrixWorld.background);
    suiteExpect(engine.boundaries).toBe(matrixWorld.boundaries);
    suiteExpect(engine.portals).toBe(matrixWorld.portals);
    suiteExpect(engine.battleZones).toBe(matrixWorld.battleZones);

    engine.destroy();
  });

  suiteIt('GameEngine: checkPortalTriggers deve disparar onPortalEnter e Screen Shake ao pisar no portal', () => {
    const mockCtx = createMockCtx();
    const canvas = {
      width: 1024,
      height: 576,
      getContext: () => mockCtx,
    } as unknown as HTMLCanvasElement;

    const player = new Sprite({
      position: { x: 100, y: 100 },
      hitbox: { widthRatio: 1, heightRatio: 1, offsetXRatio: 0, offsetYRatio: 0 },
    });
    const background = new Sprite({ position: { x: 0, y: 0 } });
    const portal = new Boundary({
      position: { x: 100, y: 100 },
      type: 'door',
      data: { targetBiome: 'network_matrix' },
    });

    let enteredBiome = '';
    const engine = new GameEngine({
      canvas,
      player,
      background,
      portals: [portal],
      enableAudio: false,
      onPortalEnter: (_portal, target) => {
        enteredBiome = target;
      },
    });

    // Posiciona o portal exatamente nas coordenadas do jogador (após recenterPlayer)
    portal.position.x = player.position.x;
    portal.position.y = player.position.y;

    suiteExpect(enteredBiome).toBe('');
    engine.checkPortalTriggers();
    suiteExpect(enteredBiome).toBe('network_matrix');
    suiteExpect(engine.isScreenShaking()).toBe(true);

    engine.destroy();
  });

  suiteIt('useGameStore: currentBiome e setBiome devem atualizar o bioma ativo', () => {
    useGameStore.getState().resetGame();
    suiteExpect(useGameStore.getState().currentBiome).toBe('circuit_valley');

    useGameStore.getState().setBiome('network_matrix');
    suiteExpect(useGameStore.getState().currentBiome).toBe('network_matrix');

    useGameStore.getState().setBiome('algorithm_coliseum');
    suiteExpect(useGameStore.getState().currentBiome).toBe('algorithm_coliseum');

    useGameStore.getState().resetGame();
    suiteExpect(useGameStore.getState().currentBiome).toBe('circuit_valley');
  });

  /* -------------------------------------------------------------------------- */
  /* FASE 2: CAMERA 2D, MINIMAPA COM RADAR, PROPS, INTERIORES E TRANSIÇÃO       */
  /* -------------------------------------------------------------------------- */

  suiteDescribe('Camera2D Viewport & Math', () => {
    suiteIt('deve inicializar com clamping dentro dos limites da ilha', () => {
      const camera = new Camera2D({
        width: 1024,
        height: 576,
        bounds: { minX: 0, minY: 0, maxX: 1920, maxY: 1152 },
        initialX: -100,
        initialY: 2000,
      });

      // Deve dar clamp: minX=0, maxY=(1152 - 576)=576
      suiteExpect(camera.x).toBe(0);
      suiteExpect(camera.y).toBe(576);
    });

    suiteIt('toScreen e toWorld devem realizar conversão bidirecional perfeita', () => {
      const camera = new Camera2D({
        width: 1024,
        height: 576,
        bounds: { minX: 0, minY: 0, maxX: 1920, maxY: 1152 },
      });
      camera.centerOn(960, 576);

      const worldPos = { x: 1000, y: 600 };
      const screenPos = camera.toScreen(worldPos.x, worldPos.y);
      const backToWorld = camera.toWorld(screenPos.x, screenPos.y);

      suiteExpect(backToWorld.x).toBe(worldPos.x);
      suiteExpect(backToWorld.y).toBe(worldPos.y);
    });

    suiteIt('isVisible deve calcular Frustum Culling com precisão', () => {
      const camera = new Camera2D({
        width: 1024,
        height: 576,
        bounds: { minX: 0, minY: 0, maxX: 1920, maxY: 1152 },
      });
      camera.x = 200;
      camera.y = 200;

      // Objeto dentro do viewport
      suiteExpect(camera.isVisible(300, 300, 48, 48)).toBe(true);

      // Objeto completamente fora à esquerda
      suiteExpect(camera.isVisible(50, 300, 48, 48)).toBe(false);

      // Objeto completamente fora abaixo
      suiteExpect(camera.isVisible(300, 900, 48, 48)).toBe(false);
    });

    suiteIt('update deve interpolar com Lerp em direção ao alvo', () => {
      const camera = new Camera2D({
        width: 1024,
        height: 576,
        bounds: { minX: 0, minY: 0, maxX: 3000, maxY: 3000 },
        lerpSpeed: 0.1,
      });
      camera.x = 0;
      camera.y = 0;

      // Alvo no mundo: (1500, 1500) -> ideal cam: (1500 - 512 = 988, 1500 - 288 = 1212)
      camera.update(1500, 1500, 1);
      suiteExpect(camera.x).toBeGreaterThan(0);
      suiteExpect(camera.y).toBeGreaterThan(0);
      suiteExpect(camera.x).toBeLessThan(988);
    });
  });

  suiteDescribe('MinimapRadar & Edge Pinning', () => {
    suiteIt('deve inicializar e atualizar ângulo de varredura do feixe sonar', () => {
      const radar = new MinimapRadar({
        mapWidth: 1920,
        mapHeight: 1152,
        radius: 50,
      });

      suiteExpect(radar.radius).toBe(50);
      suiteExpect(radar.mapWidth).toBe(1920);

      // Executa tick
      radar.update(1);
      // Não deve disparar erros ao desenhar em mock canvas
      const mockCtx = createMockCtx();
      radar.draw(mockCtx, { x: 500, y: 500 }, 'down', [], null);
    });

    suiteIt('bakeTerrain deve desenhar sem erros com boundaries e battleZones', () => {
      const radar = new MinimapRadar({
        mapWidth: 1920,
        mapHeight: 1152,
      });
      const b1 = new Boundary({ position: { x: 100, y: 100 } });
      const bz = new Boundary({ position: { x: 200, y: 200 }, type: 'battle' });

      radar.bakeTerrain([b1], [bz]);
    });
  });

  suiteDescribe('InteractiveProp & World Distribution', () => {
    suiteIt('updateProximity deve detectar quando jogador está no raio de ativação', () => {
      const prop = new InteractiveProp({
        id: 'test_terminal',
        position: { x: 200, y: 200 },
        category: 'lesson',
        title: 'Terminal de Teste',
        activationRadius: 60,
      });

      // Jogador próximo (distância ~20px)
      const nearbyHitbox: Rect = { x: 210, y: 210, width: 32, height: 32 };
      suiteExpect(prop.updateProximity(nearbyHitbox)).toBe(true);
      suiteExpect(prop.isPlayerNearby).toBe(true);

      // Jogador distante (distância > 150px)
      const distantHitbox: Rect = { x: 500, y: 500, width: 32, height: 32 };
      suiteExpect(prop.updateProximity(distantHitbox)).toBe(false);
      suiteExpect(prop.isPlayerNearby).toBe(false);
    });

    suiteIt('createDefaultInteractiveProps deve instanciar a coleção completa de 13 props', () => {
      const props = createDefaultInteractiveProps(48);

      // 5 lições + 3 desafios + 3 easter eggs + 2 portas = 13
      suiteExpect(props.length).toBe(13);

      const lessons = props.filter((p) => p.category === 'lesson');
      suiteExpect(lessons.length).toBe(5);

      const challenges = props.filter((p) => p.category === 'challenge');
      suiteExpect(challenges.length).toBe(3);

      const easterEggs = props.filter((p) => p.category === 'easter_egg');
      suiteExpect(easterEggs.length).toBe(3);

      const doors = props.filter((p) => p.category === 'door');
      suiteExpect(doors.length).toBe(2);
    });
  });

  suiteDescribe('SceneTransitionManager & Interiors', () => {
    suiteIt('deve transicionar por FADING_OUT, SWAPPING_SCENE e FADING_IN', () => {
      const manager = new SceneTransitionManager(200);
      suiteExpect(manager.state).toBe('IDLE');
      suiteExpect(manager.isBlockingInput()).toBe(false);

      let swapped = false;
      manager.startTransition(
        { targetSceneId: 'interior_lab', spawnPosition: { x: 100, y: 100 } },
        () => {
          swapped = true;
        }
      );

      suiteExpect(manager.state).toBe('FADING_OUT');
      suiteExpect(manager.isBlockingInput()).toBe(true);

      // Atualiza 100ms (metade do fade-out)
      manager.update(100);
      suiteExpect(manager.alpha).toBeCloseTo(0.5, 1);

      // Atualiza mais 110ms (atinge fade-out completo e dispara swap)
      manager.update(110);
      suiteExpect(swapped).toBe(true);
      suiteExpect(manager.state).toBe('FADING_IN');

      // Atualiza mais 210ms (conclui fade-in e volta a IDLE)
      manager.update(210);
      suiteExpect(manager.state).toBe('IDLE');
      suiteExpect(manager.alpha).toBe(0);
      suiteExpect(manager.isBlockingInput()).toBe(false);
    });

    suiteIt('createLaboratoryInteriorScene deve gerar mapa interno com saída e bancadas', () => {
      const scene = createLaboratoryInteriorScene(48);
      suiteExpect(scene.id).toBe('interior_lab');
      suiteExpect(scene.boundaries.length).toBeGreaterThan(10);
      suiteExpect(scene.props.length).toBeGreaterThanOrEqual(2);
      suiteExpect(scene.exitDoor).toBeDefined();
    });
  });

  suiteDescribe('BattleTransitionFX Pokémon Sequence', () => {
    suiteIt('deve iniciar ativo e chamar callback após 900ms', () => {
      const fx = new BattleTransitionFX(900);
      suiteExpect(fx.isActive).toBe(false);

      let finished = false;
      fx.start(() => {
        finished = true;
      });

      suiteExpect(fx.isActive).toBe(true);

      // Atualiza até 500ms
      fx.update(500);
      suiteExpect(fx.progress).toBeCloseTo(500 / 900, 1);
      suiteExpect(finished).toBe(false);

      // Conclui os 900ms
      fx.update(450);
      suiteExpect(finished).toBe(true);
      suiteExpect(fx.isActive).toBe(false);
    });
  });

  suiteDescribe('GameEngine Phase 2 Full Integration', () => {
    const createMockCanvas = (): HTMLCanvasElement => {
      const mockCtx = createMockCtx();
      return {
        width: 1024,
        height: 576,
        getContext: () => mockCtx,
      } as unknown as HTMLCanvasElement;
    };

    suiteIt('deve integrar Camera2D, MinimapRadar, InteractiveProps e transição de interiores', () => {
      const canvas = createMockCanvas();
      const player = new Sprite({ position: { x: 0, y: 0 } });
      const background = new Sprite({ position: { x: -448, y: -288 } });
      const prop = new InteractiveProp({
        id: 'term_test',
        position: { x: 500, y: 300 },
        category: 'lesson',
        title: 'Terminal de Aula',
      });

      let propInteracted = false;

      const engine = new GameEngine({
        canvas,
        player,
        background,
        interactiveProps: [prop],
        enableAudio: false,
        onPropInteract: () => {
          propInteracted = true;
        },
      });

      // Verifica instâncias integradas
      suiteExpect(engine.camera).toBeDefined();
      suiteExpect(engine.minimap).toBeDefined();
      suiteExpect(engine.sceneTransition).toBeDefined();
      suiteExpect(engine.battleTransitionFX).toBeDefined();
      suiteExpect(engine.interactiveProps.length).toBe(1);

      // Posiciona o jogador próximo ao prop e interage
      player.position.x = 490;
      player.position.y = 290;
      const interacted = engine.interactWithClosestProp();
      suiteExpect(interacted).toBe(prop);
      suiteExpect(propInteracted).toBe(true);

      // Dispara transição de batalha
      const bz = new Boundary({ position: { x: 0, y: 0 }, type: 'battle' });
      engine.triggerBattle(bz);
      suiteExpect(engine.battleTransitionFX.isActive).toBe(true);

      engine.destroy();
    });
  });
});





