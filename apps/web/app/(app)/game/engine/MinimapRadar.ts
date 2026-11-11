/**
 * MinimapRadar.ts
 * NEXUS CODE - Canvas 2D Game Engine Sonar Radar Minimap
 * 
 * Minimapa com radar circular estilizado Dark Obsidian no canto superior direito:
 * - Renderização em alta performance com cache estático de terreno via OffscreenCanvas (128x128)
 * - Feixe de varredura rotativo a 60 FPS (Sweep Beam) estilo sonar militar retrô
 * - Marcadores de entidades com paleta temática:
 *   * Player: Ponto ciano pulsante com facho direcional
 *   * Lições / Computadores: Dourado (#FACC15)
 *   * Desafios Opcionais: Violeta / Âmbar (#C084FC)
 *   * Easter Eggs: Verde Esmeralda (#04D361)
 *   * Boss / Zonas Corrompidas: Vermelho Alerta (#F43F5E)
 * - Edge Pinning: Quando a Próxima Lição / Boss estiver fora do raio visível do radar,
 *   uma seta direcional pulsante é fixada na borda da circunferência apontando para o alvo.
 */

import { Boundary } from './Boundary';
import { Direction } from './Sprite';

export type MinimapEntityType =
  | 'player'
  | 'lesson'
  | 'challenge'
  | 'easter_egg'
  | 'boss'
  | 'portal'
  | 'door'
  | 'chest';

export interface MinimapEntity {
  id: string;
  worldX: number;
  worldY: number;
  type: MinimapEntityType;
  label?: string;
  isPrimaryTarget?: boolean;
}

export interface MinimapRadarOptions {
  radius?: number;
  centerX?: number;
  centerY?: number;
  mapWidth: number;
  mapHeight: number;
  viewDistance?: number; // Raio em pixels de mundo que o radar abrange (ex: 800px)
}

export class MinimapRadar {
  public radius: number;
  public centerX: number;
  public centerY: number;
  public mapWidth: number;
  public mapHeight: number;
  public viewDistance: number;

  private sweepAngle: number = 0;
  private pulseTimer: number = 0;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private readonly CACHE_SIZE = 128;

  constructor({
    radius = 52,
    centerX = 940,
    centerY = 80,
    mapWidth,
    mapHeight,
    viewDistance = 650,
  }: MinimapRadarOptions) {
    this.radius = radius;
    this.centerX = centerX;
    this.centerY = centerY;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.viewDistance = viewDistance;

    this.initTerrainCache();
  }

  /**
   * Inicializa o canvas offscreen para cache estático da topografia do mapa
   */
  private initTerrainCache(): void {
    if (typeof document === 'undefined') return;

    try {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = this.CACHE_SIZE;
      this.offscreenCanvas.height = this.CACHE_SIZE;
      this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    } catch {
      this.offscreenCanvas = null;
      this.offscreenCtx = null;
    }
  }

  /**
   * Atualiza a silhueta estática de paredes e zonas no cache offscreen
   */
  public bakeTerrain(boundaries: Boundary[], battleZones: Boundary[] = []): void {
    if (!this.offscreenCtx || !this.offscreenCanvas) return;

    const ctx = this.offscreenCtx;
    ctx.clearRect(0, 0, this.CACHE_SIZE, this.CACHE_SIZE);

    // Fundo da miniatura
    ctx.fillStyle = '#070C1A';
    ctx.fillRect(0, 0, this.CACHE_SIZE, this.CACHE_SIZE);

    const scaleX = this.CACHE_SIZE / this.mapWidth;
    const scaleY = this.CACHE_SIZE / this.mapHeight;

    // Zonas de batalha em vermelho translúcido
    ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
    for (let i = 0; i < battleZones.length; i++) {
      const bz = battleZones[i];
      ctx.fillRect(
        Math.round(bz.position.x * scaleX),
        Math.round(bz.position.y * scaleY),
        Math.max(1, Math.round(bz.width * scaleX)),
        Math.max(1, Math.round(bz.height * scaleY))
      );
    }

    // Paredes sólidas em ciano escuro
    ctx.fillStyle = '#1E293B';
    for (let i = 0; i < boundaries.length; i++) {
      const b = boundaries[i];
      if (b.type === 'solid') {
        ctx.fillRect(
          Math.round(b.position.x * scaleX),
          Math.round(b.position.y * scaleY),
          Math.max(1, Math.round(b.width * scaleX)),
          Math.max(1, Math.round(b.height * scaleY))
        );
      }
    }
  }

  /**
   * Atualiza o ângulo do feixe de varredura e pulso
   */
  public update(deltaFactor: number = 1): void {
    this.sweepAngle = (this.sweepAngle + 0.045 * deltaFactor) % (Math.PI * 2);
    this.pulseTimer = (this.pulseTimer + 0.05 * deltaFactor) % (Math.PI * 2);
  }

  /**
   * Renderiza o radar minimapa no Canvas 2D
   */
  public draw(
    ctx: CanvasRenderingContext2D,
    playerWorldPos: { x: number; y: number },
    playerDirection: Direction = 'down',
    entities: MinimapEntity[] = [],
    primaryTarget?: MinimapEntity | null
  ): void {
    ctx.save();

    const cx = this.centerX;
    const cy = this.centerY;
    const r = this.radius;

    // 1. Recorte circular com sombra e borda sci-fi
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);

    // Fundo escuro com gradiente radial
    const bgGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
    bgGrad.addColorStop(0, '#0A1226');
    bgGrad.addColorStop(1, '#050814');
    ctx.fillStyle = bgGrad;
    ctx.fill();

    ctx.save();
    ctx.clip();

    // 2. Renderiza mapa estático do terreno com translação relativa ao jogador
    if (this.offscreenCanvas) {
      const scaleX = this.CACHE_SIZE / this.mapWidth;
      const scaleY = this.CACHE_SIZE / this.mapHeight;
      const worldScale = r / this.viewDistance;

      const mapScreenW = this.mapWidth * worldScale;
      const mapScreenH = this.mapHeight * worldScale;
      const mapScreenX = cx - playerWorldPos.x * worldScale;
      const mapScreenY = cy - playerWorldPos.y * worldScale;

      ctx.globalAlpha = 0.55;
      ctx.drawImage(this.offscreenCanvas, mapScreenX, mapScreenY, mapScreenW, mapScreenH);
      ctx.globalAlpha = 1.0;
    }

    // 3. Retícula e anéis holográficos concêntricos
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
    ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // Mira cruzada sutil
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();

    // 4. Feixe de Varredura Sonar (Sweep Beam)
    ctx.save();
    const sweepGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
    sweepGrad.addColorStop(0, 'rgba(0, 229, 255, 0.35)');
    sweepGrad.addColorStop(0.8, 'rgba(0, 229, 255, 0.08)');
    sweepGrad.addColorStop(1, 'rgba(0, 229, 255, 0.0)');
    ctx.fillStyle = sweepGrad;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, this.sweepAngle, this.sweepAngle + 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 5. Entidades e POIs secundários dentro do alcance do radar
    const worldScale = r / this.viewDistance;
    for (let i = 0; i < entities.length; i++) {
      const ent = entities[i];
      if (ent.type === 'player') continue;

      const dx = ent.worldX - playerWorldPos.x;
      const dy = ent.worldY - playerWorldPos.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= this.viewDistance) {
        const entX = cx + dx * worldScale;
        const entY = cy + dy * worldScale;

        ctx.fillStyle = this.getEntityColor(ent.type);
        ctx.beginPath();
        const dotRadius = ent.type === 'boss' ? 4 : 2.5;
        ctx.arc(entX, entY, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 6. Jogador Central no Radar com Cone Direcional
    ctx.fillStyle = '#00E5FF';
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Cone indicador da direção do jogador
    ctx.fillStyle = 'rgba(0, 229, 255, 0.6)';
    ctx.beginPath();
    const dirAngle =
      playerDirection === 'up'
        ? -Math.PI / 2
        : playerDirection === 'down'
        ? Math.PI / 2
        : playerDirection === 'left'
        ? Math.PI
        : 0;
    ctx.arc(cx, cy, 8, dirAngle - 0.4, dirAngle + 0.4);
    ctx.lineTo(cx, cy);
    ctx.fill();

    ctx.restore(); // Fecha o clip circular

    // 7. Borda Externa Retro-Futurista e Detalhes Metálicos
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Detalhes nos pontos cardeais
    ctx.fillStyle = '#00E5FF';
    ctx.fillRect(cx - 2, cy - r - 2, 4, 3); // Norte
    ctx.fillRect(cx - 2, cy + r - 1, 4, 3); // Sul
    ctx.fillRect(cx - r - 2, cy - 2, 3, 4); // Oeste
    ctx.fillRect(cx + r - 1, cy - 2, 3, 4); // Leste

    // 8. Edge Pinning: Alvo Principal da Missão / Próxima Aula / Boss
    if (primaryTarget) {
      this.drawTargetMarker(ctx, cx, cy, r, playerWorldPos, primaryTarget, worldScale);
    }

    // 9. Rótulo inferior da HUD do radar
    ctx.fillStyle = '#00E5FF';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('RADAR // TÁTICO', cx, cy + r + 13);

    ctx.restore();
  }

  /**
   * Renderiza o marcador do alvo com suporte a Edge Pinning
   */
  private drawTargetMarker(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    playerWorldPos: { x: number; y: number },
    target: MinimapEntity,
    worldScale: number
  ): void {
    const dx = target.worldX - playerWorldPos.x;
    const dy = target.worldY - playerWorldPos.y;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    const isInsideRadar = dist <= this.viewDistance;
    const pulse = (Math.sin(this.pulseTimer * 2) + 1) / 2; // 0 a 1

    if (isInsideRadar) {
      // Alvo visível dentro do radar: desenha ponto com anéis expansivos
      const targetX = cx + dx * worldScale;
      const targetY = cy + dy * worldScale;

      ctx.save();
      // Anel expansivo pulsante
      ctx.strokeStyle = '#FFA116';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(targetX, targetY, 4 + pulse * 6, 0, Math.PI * 2);
      ctx.stroke();

      // Ponto dourado central
      ctx.fillStyle = '#FFA116';
      ctx.shadowColor = '#FFA116';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(targetX, targetY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // Alvo fora do alcance visível: EDGE PINNING com seta direcional ancorada na borda
      const pinRadius = r - 5;
      const pinX = cx + Math.cos(angle) * pinRadius;
      const pinY = cy + Math.sin(angle) * pinRadius;

      ctx.save();
      ctx.translate(pinX, pinY);
      ctx.rotate(angle);

      // Seta direcional triangular dourada/âmbar pulsante
      const arrowSize = 6 + pulse * 2;
      ctx.fillStyle = '#FFA116';
      ctx.shadowColor = '#FFA116';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(arrowSize, 0);
      ctx.lineTo(-arrowSize * 0.7, -arrowSize * 0.6);
      ctx.lineTo(-arrowSize * 0.3, 0);
      ctx.lineTo(-arrowSize * 0.7, arrowSize * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Indicador de distância em metros/passos logo abaixo
      ctx.save();
      ctx.fillStyle = '#FFA116';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      const approxTiles = Math.round(dist / 48);
      ctx.fillText(`${approxTiles}m`, cx, cy + r - 6);
      ctx.restore();
    }
  }

  /**
   * Determina a cor temática do blip de acordo com o tipo de entidade
   */
  private getEntityColor(type: MinimapEntityType): string {
    switch (type) {
      case 'lesson':
        return '#FACC15'; // Ouro / Amarelo
      case 'challenge':
        return '#C084FC'; // Violeta
      case 'easter_egg':
      case 'chest':
        return '#04D361'; // Verde Esmeralda
      case 'boss':
        return '#F43F5E'; // Vermelho Neon
      case 'portal':
      case 'door':
        return '#00E5FF'; // Ciano Holográfico
      default:
        return '#94A3B8';
    }
  }
}
