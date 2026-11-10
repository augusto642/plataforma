/**
 * ProceduralAssets.ts
 * NEXUS CODE - Canvas 2D Game Engine
 * 
 * Gerador de assets procedurais em pixel-art de alta fidelidade Dark Obsidian.
 * Produz cenário de laboratório cyberpunk, zonas de batalha de código corrompido,
 * barreiras de colisão AABB e spritesheets direcionais do jogador com 4 frames de passo.
 * 
 * Garante inicialização instantânea em 60 FPS com zero dependência de arquivos PNG externos.
 */

import { Sprite, Direction } from './Sprite';
import { Boundary } from './Boundary';
import { InteractiveProp, createDefaultInteractiveProps } from './InteractiveProp';
import type { BiomeType } from '../stores/useGameStore';
export type { BiomeType };

export interface GeneratedGameWorld {
  background: Sprite;
  foreground?: Sprite;
  boundaries: Boundary[];
  battleZones: Boundary[];
  portals: Boundary[];
  player: Sprite;
  biome: BiomeType;
  interactiveProps?: InteractiveProp[];
}

const TILE_SIZE = 48; // 48px tile (16px base x 3 scale)
const MAP_COLS = 40;  // 1920px
const MAP_ROWS = 24;  // 1152px
const MAP_WIDTH = MAP_COLS * TILE_SIZE;
const MAP_HEIGHT = MAP_ROWS * TILE_SIZE;

/**
 * Cria spritesheet animado do jogador com 4 frames de caminhada para uma dada direção
 */
function createPlayerDirectionSprite(direction: Direction): HTMLImageElement {
  if (typeof document === 'undefined') {
    return {} as HTMLImageElement;
  }

  const frameWidth = 48;
  const frameHeight = 64;
  const totalFrames = 4;

  const canvas = document.createElement('canvas');
  canvas.width = frameWidth * totalFrames;
  canvas.height = frameHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return {} as HTMLImageElement;

  for (let frame = 0; frame < totalFrames; frame++) {
    const ox = frame * frameWidth;
    ctx.save();
    ctx.translate(ox, 0);

    // Passo de animação: 0 = idle, 1 = passo esquerdo, 2 = idle, 3 = passo direito
    const legOffset = frame === 1 ? -4 : frame === 3 ? 4 : 0;
    const bodyBob = frame === 1 || frame === 3 ? 1 : 0;

    // Sombra oval no chão
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(24, 60, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pernas / Tênis Cyberpunk
    ctx.fillStyle = '#0F172A';
    // Perna Esquerda
    ctx.fillRect(16, 44 - bodyBob, 6, 14 + (legOffset > 0 ? -legOffset : 0));
    // Perna Direita
    ctx.fillRect(26, 44 - bodyBob, 6, 14 + (legOffset < 0 ? legOffset : 0));

    // Detalhes luminosos dos tênis (#04D361 Neon Green)
    ctx.fillStyle = '#04D361';
    ctx.fillRect(15, 56 + (legOffset > 0 ? -legOffset : 0), 8, 4);
    ctx.fillRect(25, 56 + (legOffset < 0 ? legOffset : 0), 8, 4);

    // Tronco / Casaco Obsidian Cybernetic (#0B1021)
    ctx.fillStyle = '#0B1021';
    ctx.beginPath();
    ctx.roundRect(14, 24 + bodyBob, 20, 22, 4);
    ctx.fill();

    // Faixas neon no peito / braços (#00E5FF Cyan)
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (direction === 'down') {
      ctx.moveTo(18, 28 + bodyBob);
      ctx.lineTo(24, 38 + bodyBob);
      ctx.lineTo(30, 28 + bodyBob);
    } else if (direction === 'up') {
      // Logo NEXUS nas costas
      ctx.moveTo(24, 28 + bodyBob);
      ctx.lineTo(24, 40 + bodyBob);
    } else if (direction === 'left') {
      ctx.moveTo(20, 26 + bodyBob);
      ctx.lineTo(20, 42 + bodyBob);
    } else {
      ctx.moveTo(28, 26 + bodyBob);
      ctx.lineTo(28, 42 + bodyBob);
    }
    ctx.stroke();

    // Cabeça / Capuz
    ctx.fillStyle = '#181824';
    ctx.beginPath();
    ctx.roundRect(16, 10 + bodyBob, 16, 16, 5);
    ctx.fill();

    // Visor Holográfico
    if (direction === 'down') {
      ctx.fillStyle = '#00E5FF';
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.roundRect(18, 16 + bodyBob, 12, 5, 2);
      ctx.fill();
    } else if (direction === 'left') {
      ctx.fillStyle = '#00E5FF';
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.roundRect(16, 16 + bodyBob, 6, 5, 2);
      ctx.fill();
    } else if (direction === 'right') {
      ctx.fillStyle = '#00E5FF';
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.roundRect(26, 16 + bodyBob, 6, 5, 2);
      ctx.fill();
    } else {
      // Cabelo / Detalhe de trás do capuz com logo roxo
      ctx.fillStyle = '#8257E5';
      ctx.beginPath();
      ctx.arc(24, 18 + bodyBob, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  const img = new Image();
  img.src = canvas.toDataURL('image/png');
  return img;
}

/**
 * Renderiza o mapa procedural Dark Obsidian no canvas por bioma
 */
function createWorldMapCanvas(biome: BiomeType = 'circuit_valley'): HTMLCanvasElement {
  if (typeof document === 'undefined') {
    return {
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      toDataURL: () => '',
      getContext: () => null,
    } as unknown as HTMLCanvasElement;
  }

  const canvas = document.createElement('canvas');
  canvas.width = MAP_WIDTH;
  canvas.height = MAP_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // 1. Fundo baseado no Bioma
  const bgColors: Record<BiomeType, string> = {
    circuit_valley: '#050814',
    network_matrix: '#0A0803',
    algorithm_coliseum: '#0B0516',
  };
  ctx.fillStyle = bgColors[biome] || '#050814';
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  // 2. Piso de laboratório em grid tecnológico com variações de bioma
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      const x = c * TILE_SIZE;
      const y = r * TILE_SIZE;

      // Paredes perimetrais
      const isBorder =
        r === 0 || r === MAP_ROWS - 1 || c === 0 || c === MAP_COLS - 1;

      if (isBorder) {
        ctx.fillStyle =
          biome === 'network_matrix'
            ? '#1E1609'
            : biome === 'algorithm_coliseum'
            ? '#1F0F38'
            : '#0D111F';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle =
          biome === 'network_matrix'
            ? '#3B290E'
            : biome === 'algorithm_coliseum'
            ? '#3A1869'
            : '#1F293D';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);

        // Faixa de alta tensão / neon security no perímetro
        ctx.fillStyle =
          biome === 'network_matrix'
            ? '#FFA116'
            : biome === 'algorithm_coliseum'
            ? '#FF007A'
            : '#8257E5';
        ctx.fillRect(x + 4, y + TILE_SIZE - 4, TILE_SIZE - 8, 2);
      } else {
        // Tiles de piso com variação sutil
        const alt = (r + c) % 2 === 0;
        if (biome === 'network_matrix') {
          ctx.fillStyle = alt ? '#0C0904' : '#120D06';
          ctx.strokeStyle = '#22190B';
        } else if (biome === 'algorithm_coliseum') {
          ctx.fillStyle = alt ? '#0F071D' : '#140A26';
          ctx.strokeStyle = '#281447';
        } else {
          ctx.fillStyle = alt ? '#080C1A' : '#0B1022';
          ctx.strokeStyle = '#12182B';
        }
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // Grade sutil
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  // 3. Trilhas de Conexão Neon no Chão
  ctx.save();
  const trackColor =
    biome === 'network_matrix'
      ? 'rgba(255, 161, 22, 0.4)'
      : biome === 'algorithm_coliseum'
      ? 'rgba(130, 87, 229, 0.4)'
      : 'rgba(0, 229, 255, 0.4)';
  const glowColor =
    biome === 'network_matrix'
      ? '#FFA116'
      : biome === 'algorithm_coliseum'
      ? '#FF007A'
      : '#00E5FF';
  const chipColor =
    biome === 'network_matrix'
      ? '#FFD700'
      : biome === 'algorithm_coliseum'
      ? '#C084FC'
      : '#04D361';

  ctx.strokeStyle = trackColor;
  ctx.lineWidth = 2;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 4;

  // Trilha central principal
  ctx.beginPath();
  ctx.moveTo(TILE_SIZE * 3, TILE_SIZE * 12);
  ctx.lineTo(TILE_SIZE * 37, TILE_SIZE * 12);
  ctx.moveTo(TILE_SIZE * 20, TILE_SIZE * 3);
  ctx.lineTo(TILE_SIZE * 20, TILE_SIZE * 21);
  ctx.stroke();

  // Nós de conexão (chips de barramento)
  for (let i = 6; i < 36; i += 6) {
    ctx.fillStyle = chipColor;
    ctx.shadowColor = chipColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(i * TILE_SIZE, 12 * TILE_SIZE, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 4. Zonas de Código Corrompido / Battle Zones & Obstáculos por Bioma
  if (biome === 'circuit_valley') {
    drawCorruptedSector(ctx, 6, 4, 7, 6, 'SECTOR // STACK_OVERFLOW');
    drawCorruptedSector(ctx, 27, 14, 7, 6, 'SECTOR // NULL_PTR');
    drawServerRack(ctx, 14, 4, 3, 2, 'RACK_CORE_01');
    drawServerRack(ctx, 23, 4, 3, 2, 'RACK_CORE_02');
    drawServerRack(ctx, 14, 17, 3, 2, 'DATABASE_NODE');
    drawServerRack(ctx, 23, 17, 3, 2, 'FIREWALL_ARRAY');
    drawCentralPortal(ctx, 20, 12);
    // Portais Holográficos
    drawPortalHologram(ctx, 38, 12, '-> MATRIX', '#FFA116');
    drawPortalHologram(ctx, 20, 1, '-> COLISEUM', '#8257E5');
  } else if (biome === 'network_matrix') {
    drawCorruptedSector(ctx, 6, 4, 7, 6, 'SECTOR // PACKET_LOSS');
    drawCorruptedSector(ctx, 27, 14, 7, 6, 'SECTOR // DDOS_STORM');
    drawServerRack(ctx, 14, 4, 3, 2, 'GATEWAY_ROUTER');
    drawServerRack(ctx, 23, 4, 3, 2, 'LOAD_BALANCER');
    drawServerRack(ctx, 14, 17, 3, 2, 'DNS_NAMESERVER');
    drawServerRack(ctx, 23, 17, 3, 2, 'FIBER_BACKBONE');
    drawCentralPortal(ctx, 20, 12);
    // Portais Holográficos
    drawPortalHologram(ctx, 1, 12, '-> VALLEY', '#00E5FF');
    drawPortalHologram(ctx, 20, 1, '-> COLISEUM', '#8257E5');
  } else {
    drawCorruptedSector(ctx, 6, 4, 7, 5, 'SECTOR // MEMORY_LEAK');
    drawCorruptedSector(ctx, 14, 10, 12, 8, 'ARENA // BOSS_HEXAGON');
    drawServerRack(ctx, 8, 17, 3, 2, 'SHADOW_CACHE');
    drawServerRack(ctx, 29, 4, 3, 2, 'AST_ANALYZER');
    drawCentralPortal(ctx, 20, 14);
    // Portais Holográficos
    drawPortalHologram(ctx, 20, 22, '-> VALLEY', '#00E5FF');
    drawPortalHologram(ctx, 38, 12, '-> MATRIX', '#FFA116');
  }

  return canvas;
}

/**
 * Desenha setor corrompido com glitch visual, binários flutuantes e borda de alerta
 */
function drawCorruptedSector(
  ctx: CanvasRenderingContext2D,
  startCol: number,
  startRow: number,
  cols: number,
  rows: number,
  label: string
): void {
  const x = startCol * TILE_SIZE;
  const y = startRow * TILE_SIZE;
  const w = cols * TILE_SIZE;
  const h = rows * TILE_SIZE;

  // Fundo avermelhado / âmbar perigoso com scanlines
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, 'rgba(255, 60, 90, 0.15)');
  grad.addColorStop(1, 'rgba(130, 87, 229, 0.15)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Borda neon pontilhada de contenção
  ctx.strokeStyle = '#F43F5E';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);

  // Partículas / Glitch de matriz
  ctx.font = '10px monospace';
  ctx.fillStyle = 'rgba(244, 63, 94, 0.55)';
  const glyphs = ['01', '10', 'ERR', 'NaN', '0xFF', 'PTR', 'EOF', 'BUG'];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const gx = x + c * TILE_SIZE + 12;
      const gy = y + r * TILE_SIZE + 28;
      const glyph = glyphs[(r * 3 + c * 5) % glyphs.length];
      ctx.fillText(glyph, gx, gy);

      // Ícone de grama digital (pequeno circuito brilhante)
      ctx.fillStyle = '#FFA116';
      ctx.fillRect(x + c * TILE_SIZE + 6, y + r * TILE_SIZE + 36, 4, 8);
      ctx.fillRect(x + c * TILE_SIZE + 16, y + r * TILE_SIZE + 32, 4, 12);
      ctx.fillRect(x + c * TILE_SIZE + 26, y + r * TILE_SIZE + 34, 4, 10);
      ctx.fillStyle = 'rgba(244, 63, 94, 0.55)';
    }
  }

  // Label do setor
  ctx.fillStyle = '#FFA116';
  ctx.font = 'bold 9px monospace';
  ctx.fillText(label, x + 8, y + 16);
}

/**
 * Desenha rack de servidores tecnológico com luzes LED animadas
 */
function drawServerRack(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  cols: number,
  rows: number,
  tag: string
): void {
  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  const w = cols * TILE_SIZE;
  const h = rows * TILE_SIZE;

  // Caixa metálica
  ctx.fillStyle = '#10162A';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#253556';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  // Painéis de servidores
  for (let i = 0; i < cols; i++) {
    const rx = x + i * TILE_SIZE + 4;
    const rw = TILE_SIZE - 8;
    for (let j = 0; j < rows; j++) {
      const ry = y + j * TILE_SIZE + 4;
      const rh = TILE_SIZE - 8;

      ctx.fillStyle = '#090D1A';
      ctx.fillRect(rx, ry, rw, rh);

      // Fendas de ventilação
      ctx.fillStyle = '#19233C';
      for (let s = 6; s < rh - 10; s += 6) {
        ctx.fillRect(rx + 4, ry + s, rw - 8, 2);
      }

      // LEDs piscantes (verde, ciano, âmbar)
      ctx.fillStyle = (i + j) % 2 === 0 ? '#04D361' : '#00E5FF';
      ctx.fillRect(rx + rw - 10, ry + rh - 8, 4, 4);
    }
  }

  // Tag do servidor
  ctx.fillStyle = '#00E5FF';
  ctx.font = '8px monospace';
  ctx.fillText(tag, x + 6, y - 4);
}

/**
 * Desenha portal holográfico quântico com anel luminoso e pulso
 */
function drawPortalHologram(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  label: string,
  color: string = '#00E5FF',
): void {
  const cx = col * TILE_SIZE + TILE_SIZE / 2;
  const cy = row * TILE_SIZE + TILE_SIZE / 2;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, 24, 0, Math.PI * 2);
  ctx.stroke();

  const radGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 24);
  radGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
  radGrad.addColorStop(0.5, color);
  radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.shadowBlur = 4;
  ctx.fillText(label, cx, cy + 32);
  ctx.restore();
}

/**
 * Desenha o portal quântico holográfico central
 */
function drawCentralPortal(
  ctx: CanvasRenderingContext2D,
  centerCol: number,
  centerRow: number
): void {
  const cx = centerCol * TILE_SIZE;
  const cy = centerRow * TILE_SIZE;

  ctx.save();
  // Anel holográfico
  ctx.strokeStyle = '#8257E5';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#8257E5';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(cx, cy, 38, 0, Math.PI * 2);
  ctx.stroke();

  // Núcleo brilhante
  const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 38);
  radGrad.addColorStop(0, 'rgba(0, 229, 255, 0.45)');
  radGrad.addColorStop(0.7, 'rgba(130, 87, 229, 0.25)');
  radGrad.addColorStop(1, 'rgba(5, 8, 20, 0)');
  ctx.fillStyle = radGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 38, 0, Math.PI * 2);
  ctx.fill();

  // Símbolo NEXUS no centro
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NEXUS', cx, cy);
  ctx.restore();
}

/**
 * Fábrica principal que constrói todo o ecossistema do mundo de jogo
 */
export function createGeneratedGameWorld(
  biome: BiomeType = 'circuit_valley'
): GeneratedGameWorld {
  const mapCanvas = createWorldMapCanvas(biome);
  const bgImg = typeof Image !== 'undefined' ? new Image() : ({} as HTMLImageElement);
  if (bgImg && mapCanvas && typeof mapCanvas.toDataURL === 'function') {
    try {
      bgImg.src = mapCanvas.toDataURL('image/png');
    } catch {
      // noop
    }
  }

  // Background Sprite posicionado com offset para colocar o jogador no centro do mapa
  const background = new Sprite({
    position: {
      x: -Math.round(MAP_WIDTH / 2 - 1024 / 2),
      y: -Math.round(MAP_HEIGHT / 2 - 576 / 2),
    },
    image: bgImg,
  });

  // 1. Boundaries de Perímetro (Paredes)
  const boundaries: Boundary[] = [];
  const baseOffset = { ...background.position };

  // Parede Superior e Inferior
  for (let c = 0; c < MAP_COLS; c++) {
    boundaries.push(
      new Boundary({
        position: { x: baseOffset.x + c * TILE_SIZE, y: baseOffset.y },
        type: 'solid',
        id: `wall_top_${c}`,
      })
    );
    boundaries.push(
      new Boundary({
        position: {
          x: baseOffset.x + c * TILE_SIZE,
          y: baseOffset.y + (MAP_ROWS - 1) * TILE_SIZE,
        },
        type: 'solid',
        id: `wall_bottom_${c}`,
      })
    );
  }

  // Parede Esquerda e Direita
  for (let r = 1; r < MAP_ROWS - 1; r++) {
    boundaries.push(
      new Boundary({
        position: { x: baseOffset.x, y: baseOffset.y + r * TILE_SIZE },
        type: 'solid',
        id: `wall_left_${r}`,
      })
    );
    boundaries.push(
      new Boundary({
        position: {
          x: baseOffset.x + (MAP_COLS - 1) * TILE_SIZE,
          y: baseOffset.y + r * TILE_SIZE,
        },
        type: 'solid',
        id: `wall_right_${r}`,
      })
    );
  }

  // Racks de Servidores por bioma
  const serverRacks =
    biome === 'algorithm_coliseum'
      ? [
          { col: 8, row: 17, cols: 3, rows: 2 },
          { col: 29, row: 4, cols: 3, rows: 2 },
        ]
      : [
          { col: 14, row: 4, cols: 3, rows: 2 },
          { col: 23, row: 4, cols: 3, rows: 2 },
          { col: 14, row: 17, cols: 3, rows: 2 },
          { col: 23, row: 17, cols: 3, rows: 2 },
        ];

  serverRacks.forEach((rack, rackIdx) => {
    for (let c = 0; c < rack.cols; c++) {
      for (let r = 0; r < rack.rows; r++) {
        boundaries.push(
          new Boundary({
            position: {
              x: baseOffset.x + (rack.col + c) * TILE_SIZE,
              y: baseOffset.y + (rack.row + r) * TILE_SIZE,
            },
            type: 'solid',
            id: `rack_${rackIdx}_${c}_${r}`,
          })
        );
      }
    }
  });

  // 2. Battle Zones por bioma
  const battleZones: Boundary[] = [];
  const sectors =
    biome === 'algorithm_coliseum'
      ? [
          { startCol: 6, startRow: 4, cols: 7, rows: 5, id: 'sector_memory_leak' },
          { startCol: 14, startRow: 10, cols: 12, rows: 8, id: 'sector_boss_coliseum' },
        ]
      : biome === 'network_matrix'
      ? [
          { startCol: 6, startRow: 4, cols: 7, rows: 6, id: 'sector_packet_loss' },
          { startCol: 27, startRow: 14, cols: 7, rows: 6, id: 'sector_ddos_storm' },
        ]
      : [
          { startCol: 6, startRow: 4, cols: 7, rows: 6, id: 'sector_alpha' },
          { startCol: 27, startRow: 14, cols: 7, rows: 6, id: 'sector_beta' },
        ];

  sectors.forEach((sec) => {
    for (let c = 0; c < sec.cols; c++) {
      for (let r = 0; r < sec.rows; r++) {
        battleZones.push(
          new Boundary({
            position: {
              x: baseOffset.x + (sec.startCol + c) * TILE_SIZE,
              y: baseOffset.y + (sec.startRow + r) * TILE_SIZE,
            },
            type: 'battle',
            id: `${sec.id}_${c}_${r}`,
            data: { sectorName: sec.id },
          })
        );
      }
    }
  });

  // 3. Portais Holográficos (teleporte quântico entre mundos)
  const portals: Boundary[] = [];
  const portalConfigs =
    biome === 'circuit_valley'
      ? [
          { col: 38, row: 12, targetBiome: 'network_matrix' as BiomeType, label: 'Network Matrix' },
          { col: 20, row: 1, targetBiome: 'algorithm_coliseum' as BiomeType, label: 'Algorithm Coliseum' },
        ]
      : biome === 'network_matrix'
      ? [
          { col: 1, row: 12, targetBiome: 'circuit_valley' as BiomeType, label: 'Circuit Valley' },
          { col: 20, row: 1, targetBiome: 'algorithm_coliseum' as BiomeType, label: 'Algorithm Coliseum' },
        ]
      : [
          { col: 20, row: 22, targetBiome: 'circuit_valley' as BiomeType, label: 'Circuit Valley' },
          { col: 38, row: 12, targetBiome: 'network_matrix' as BiomeType, label: 'Network Matrix' },
        ];

  portalConfigs.forEach((p, idx) => {
    portals.push(
      new Boundary({
        position: {
          x: baseOffset.x + p.col * TILE_SIZE,
          y: baseOffset.y + p.row * TILE_SIZE,
        },
        type: 'door',
        id: `portal_${biome}_to_${p.targetBiome}_${idx}`,
        data: { targetBiome: p.targetBiome, label: p.label },
      })
    );
  });

  // 4. Props Interativos (Terminais de Lições, Desafios Opcionais, Easter Eggs e Portas)
  const interactiveProps = createDefaultInteractiveProps(TILE_SIZE);
  interactiveProps.forEach((prop) => {
    prop.position.x += baseOffset.x;
    prop.position.y += baseOffset.y;
    if (prop.isSolid) {
      boundaries.push(prop);
    }
  });

  // 5. Player Sprite com animação de passos em 4 direções
  const downImg = createPlayerDirectionSprite('down');
  const upImg = createPlayerDirectionSprite('up');
  const leftImg = createPlayerDirectionSprite('left');
  const rightImg = createPlayerDirectionSprite('right');

  const player = new Sprite({
    position: {
      x: 1024 / 2 - 24,
      y: 576 / 2 - 32,
    },
    image: downImg,
    frames: { max: 4, hold: 10 },
    sprites: {
      down: downImg,
      up: upImg,
      left: leftImg,
      right: rightImg,
    },
    direction: 'down',
    hitbox: {
      widthRatio: 0.6,
      heightRatio: 0.35,
      offsetXRatio: 0.2,
      offsetYRatio: 0.65,
    },
  });

  return {
    background,
    boundaries,
    battleZones,
    portals,
    interactiveProps,
    player,
    biome,
  };
}
