/**
 * Camera2D.ts
 * NEXUS CODE - Canvas 2D Game Engine Viewport Camera
 * 
 * Gerenciador de câmera 2D centrada no jogador com:
 * - Interpolação suave (lerp 0.15) para amortecimento de movimento
 * - Clamping estrito nos limites da ilha/mapa (zero exibição de bordas pretas ou void)
 * - Métodos de conversão bidirecionais (WorldToScreen, ScreenToWorld)
 * - Teste de visibilidade rápida (Frustum Culling) para omitir draw calls fora da tela
 * - Aplicação e restauração de matriz de transformação no contexto 2D do Canvas
 */

export interface CameraBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface CameraOptions {
  width: number;
  height: number;
  bounds?: CameraBounds;
  lerpSpeed?: number;
  initialX?: number;
  initialY?: number;
}

export class Camera2D {
  public x: number = 0;
  public y: number = 0;
  public width: number;
  public height: number;
  public bounds: CameraBounds;
  public lerpSpeed: number;

  constructor({
    width,
    height,
    bounds = { minX: 0, minY: 0, maxX: width, maxY: height },
    lerpSpeed = 0.15,
    initialX = 0,
    initialY = 0,
  }: CameraOptions) {
    this.width = width;
    this.height = height;
    this.bounds = bounds;
    this.lerpSpeed = lerpSpeed;
    this.x = initialX;
    this.y = initialY;
    this.clamp();
  }

  /**
   * Atualiza a posição da câmera com base no alvo de mundo com interpolação lerp
   */
  public update(targetWorldX: number, targetWorldY: number, deltaFactor: number = 1): void {
    // A posição ideal da câmera é o centro do alvo menos metade das dimensões da tela
    const idealX = targetWorldX - this.width / 2;
    const idealY = targetWorldY - this.height / 2;

    // Fator de suavização ponderado pelo delta
    const factor = Math.min(1, Math.max(0.01, this.lerpSpeed * deltaFactor));
    this.x += (idealX - this.x) * factor;
    this.y += (idealY - this.y) * factor;

    this.clamp();
  }

  /**
   * Centraliza instantaneamente a câmera no ponto de mundo desejado (sem lerp)
   */
  public centerOn(worldX: number, worldY: number): void {
    this.x = worldX - this.width / 2;
    this.y = worldY - this.height / 2;
    this.clamp();
  }

  /**
   * Força a câmera a se manter dentro dos limites do mapa
   */
  public clamp(): void {
    const maxAllowedX = Math.max(this.bounds.minX, this.bounds.maxX - this.width);
    const maxAllowedY = Math.max(this.bounds.minY, this.bounds.maxY - this.height);

    this.x = Math.max(this.bounds.minX, Math.min(this.x, maxAllowedX));
    this.y = Math.max(this.bounds.minY, Math.min(this.y, maxAllowedY));
  }

  /**
   * Atualiza os limites físicos da câmera
   */
  public setBounds(bounds: CameraBounds): void {
    this.bounds = bounds;
    this.clamp();
  }

  /**
   * Converte coordenadas absolutas de mundo para coordenadas de tela do canvas
   */
  public toScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: Math.round(worldX - this.x),
      y: Math.round(worldY - this.y),
    };
  }

  /**
   * Converte coordenadas de tela do canvas para coordenadas absolutas de mundo
   */
  public toWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: Math.round(screenX + this.x),
      y: Math.round(screenY + this.y),
    };
  }

  /**
   * Avalia se um bounding box no espaço de mundo está visível na viewport (Frustum Culling)
   */
  public isVisible(worldX: number, worldY: number, width: number, height: number): boolean {
    return (
      worldX + width >= this.x &&
      worldX <= this.x + this.width &&
      worldY + height >= this.y &&
      worldY <= this.y + this.height
    );
  }

  /**
   * Aplica a translação da câmera ao contexto Canvas 2D
   */
  public applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(-Math.round(this.x), -Math.round(this.y));
  }

  /**
   * Restaura o contexto Canvas 2D ao estado anterior à câmera (para desenhar HUD fixa)
   */
  public restoreTransform(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }
}
