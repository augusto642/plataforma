/**
 * Boundary.ts
 * NEXUS CODE - Canvas 2D Game Engine
 * 
 * Sistema de colisão 2D AABB (Axis-Aligned Bounding Box) para o mapa.
 * Baseado na arquitetura clássica de colisão para RPGs em Canvas 2D.
 */

import { Position } from './Sprite';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type BoundaryType = 'solid' | 'battle' | 'trigger' | 'npc' | 'door';

export interface BoundaryOptions {
  position: Position;
  width?: number;
  height?: number;
  id?: string | number;
  type?: BoundaryType;
  data?: Record<string, unknown>;
}

export interface BoundaryDrawOptions {
  debug?: boolean;
  color?: string;
  fillColor?: string;
}

export class Boundary {
  public static readonly DEFAULT_SIZE = 48; // 16px tile com escala 3x
  public static readonly WIDTH = 48;
  public static readonly HEIGHT = 48;

  public position: Position;
  public width: number;
  public height: number;
  public id?: string | number;
  public type: BoundaryType;
  public data: Record<string, unknown>;

  constructor({
    position,
    width = Boundary.DEFAULT_SIZE,
    height = Boundary.DEFAULT_SIZE,
    id,
    type = 'solid',
    data = {},
  }: BoundaryOptions) {
    this.position = { x: position.x, y: position.y };
    this.width = width;
    this.height = height;
    this.id = id;
    this.type = type;
    this.data = data;
  }

  /**
   * Retorna os limites retangulares AABB da Boundary
   */
  public getRect(): Rect {
    return {
      x: this.position.x,
      y: this.position.y,
      width: this.width,
      height: this.height,
    };
  }

  /**
   * Desenha a Boundary no canvas (essencial para depuração de colisões)
   */
  public draw(
    ctx: CanvasRenderingContext2D,
    options: BoundaryDrawOptions = { debug: false }
  ): void {
    if (!options.debug) return;

    ctx.save();
    let defaultFill = 'rgba(255, 0, 0, 0.25)';
    let defaultStroke = 'rgba(255, 0, 0, 0.8)';

    if (this.type === 'battle') {
      defaultFill = 'rgba(0, 255, 128, 0.25)';
      defaultStroke = 'rgba(0, 255, 128, 0.8)';
    } else if (this.type === 'trigger') {
      defaultFill = 'rgba(0, 180, 255, 0.25)';
      defaultStroke = 'rgba(0, 180, 255, 0.8)';
    } else if (this.type === 'door') {
      defaultFill = 'rgba(255, 215, 0, 0.25)';
      defaultStroke = 'rgba(255, 215, 0, 0.8)';
    }

    ctx.fillStyle = options.fillColor || defaultFill;
    ctx.strokeStyle = options.color || defaultStroke;
    ctx.lineWidth = 1;

    ctx.fillRect(
      Math.round(this.position.x),
      Math.round(this.position.y),
      this.width,
      this.height
    );
    ctx.strokeRect(
      Math.round(this.position.x),
      Math.round(this.position.y),
      this.width,
      this.height
    );

    ctx.restore();
  }
}

/**
 * Detecção de Colisão AABB clássica (Axis-Aligned Bounding Box)
 * Implementação de colisão retangular AABB clássica com delta de segurança
 */
export function rectangularCollision({
  rectangle1,
  rectangle2,
}: {
  rectangle1: Rect;
  rectangle2: Rect;
}): boolean {
  return (
    rectangle1.x + rectangle1.width >= rectangle2.x &&
    rectangle1.x <= rectangle2.x + rectangle2.width &&
    rectangle1.y <= rectangle2.y + rectangle2.height &&
    rectangle1.y + rectangle1.height >= rectangle2.y
  );
}

/**
 * Calcula a área de sobreposição (overlap) entre dois retângulos AABB em pixels quadrados.
 * Muito útil para determinar se o jogador entrou significativamente em uma BattleZone
 * antes de disparar o cálculo de encontro selvagem.
 */
export function calculateOverlapArea(rect1: Rect, rect2: Rect): number {
  const overlapX = Math.max(
    0,
    Math.min(rect1.x + rect1.width, rect2.x + rect2.width) -
      Math.max(rect1.x, rect2.x)
  );
  const overlapY = Math.max(
    0,
    Math.min(rect1.y + rect1.height, rect2.y + rect2.height) -
      Math.max(rect1.y, rect2.y)
  );
  return overlapX * overlapY;
}

/**
 * Detecção preditiva de colisão.
 * Avalia se o movimento pretendido por (offset.x, offset.y) colidirá com alguma boundary sólida.
 * Retorna a primeira Boundary em que colidiu, ou null se o caminho estiver livre.
 */
export function predictiveCollision({
  character,
  boundaries,
  offset = { x: 0, y: 0 },
}: {
  character: Rect;
  boundaries: Boundary[];
  offset?: Position;
}): Boundary | null {
  const projectedBox: Rect = {
    x: character.x + offset.x,
    y: character.y + offset.y,
    width: character.width,
    height: character.height,
  };

  for (let i = 0; i < boundaries.length; i++) {
    const boundary = boundaries[i];
    if (
      rectangularCollision({
        rectangle1: projectedBox,
        rectangle2: boundary.getRect(),
      })
    ) {
      return boundary;
    }
  }

  return null;
}

/**
 * Helper para converter um array unidimensional (ex: exportação de Tiled Map Editor)
 * em uma lista de objetos Boundary posicionados na matriz.
 */
export function parseCollisionGrid({
  grid,
  mapWidth,
  tileSize = Boundary.DEFAULT_SIZE,
  offset = { x: 0, y: 0 },
  collisionTileId = 1025, // ID padrão frequentemente usado no Tiled
  type = 'solid',
}: {
  grid: number[];
  mapWidth: number;
  tileSize?: number;
  offset?: Position;
  collisionTileId?: number | number[];
  type?: BoundaryType;
}): Boundary[] {
  const boundaries: Boundary[] = [];
  const validIds = Array.isArray(collisionTileId)
    ? collisionTileId
    : [collisionTileId];

  for (let i = 0; i < grid.length; i++) {
    const tileVal = grid[i];
    if (validIds.includes(tileVal)) {
      const col = i % mapWidth;
      const row = Math.floor(i / mapWidth);

      boundaries.push(
        new Boundary({
          position: {
            x: col * tileSize + offset.x,
            y: row * tileSize + offset.y,
          },
          width: tileSize,
          height: tileSize,
          type,
          id: `boundary_${col}_${row}`,
        })
      );
    }
  }

  return boundaries;
}

/**
 * Converte matriz 2D (linhas e colunas) em objetos Boundary
 */
export function parse2DCollisionMap({
  map2D,
  tileSize = Boundary.DEFAULT_SIZE,
  offset = { x: 0, y: 0 },
  collisionTileId = 1,
  type = 'solid',
}: {
  map2D: number[][];
  tileSize?: number;
  offset?: Position;
  collisionTileId?: number | number[];
  type?: BoundaryType;
}): Boundary[] {
  const boundaries: Boundary[] = [];
  const validIds = Array.isArray(collisionTileId)
    ? collisionTileId
    : [collisionTileId];

  for (let row = 0; row < map2D.length; row++) {
    for (let col = 0; col < map2D[row].length; col++) {
      const tileVal = map2D[row][col];
      if (validIds.includes(tileVal)) {
        boundaries.push(
          new Boundary({
            position: {
              x: col * tileSize + offset.x,
              y: row * tileSize + offset.y,
            },
            width: tileSize,
            height: tileSize,
            type,
            id: `boundary_${col}_${row}`,
          })
        );
      }
    }
  }

  return boundaries;
}
