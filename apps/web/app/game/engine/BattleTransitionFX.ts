/**
 * BattleTransitionFX.ts
 * NEXUS CODE - Canvas 2D Game Engine Classic Pokémon Battle Wipe & Flash FX
 * 
 * Efeito visual de entrada em batalha clássico Pokémon aperfeiçoado com estética Dark Obsidian:
 * 1. 0ms - 300ms: 3 Flashes estroboscópicos rápidos (branco e preto alternados).
 * 2. 300ms - 750ms: Shutter Bar Wipe com 10 barras pretas horizontais deslizando em sentidos
 *    opostos com feixe divisor neon ciano (#00E5FF).
 * 3. 750ms - 900ms: Impacto quântico com blackout total e disparo de callback de batalha.
 */

export class BattleTransitionFX {
  public isActive: boolean = false;
  public progress: number = 0; // 0.0 a 1.0
  public elapsedMs: number = 0;
  public readonly totalDurationMs: number = 900;

  private onCompleteCallback?: () => void;

  constructor(durationMs: number = 900) {
    this.totalDurationMs = durationMs;
  }

  /**
   * Inicia a sequência de animação de batalha
   */
  public start(onComplete?: () => void): void {
    this.isActive = true;
    this.elapsedMs = 0;
    this.progress = 0;
    this.onCompleteCallback = onComplete;
  }

  /**
   * Reinicia o efeito
   */
  public reset(): void {
    this.isActive = false;
    this.elapsedMs = 0;
    this.progress = 0;
    this.onCompleteCallback = undefined;
  }

  /**
   * Atualiza a linha do tempo do efeito
   */
  public update(deltaMs: number): void {
    if (!this.isActive) return;

    this.elapsedMs += deltaMs;
    this.progress = Math.min(1.0, this.elapsedMs / this.totalDurationMs);

    if (this.elapsedMs >= this.totalDurationMs) {
      this.isActive = false;
      if (this.onCompleteCallback) {
        const cb = this.onCompleteCallback;
        this.onCompleteCallback = undefined;
        cb();
      }
    }
  }

  /**
   * Renderiza os 3 estágios da transição de batalha sobre o Canvas 2D
   */
  public draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.isActive && this.progress < 1.0) return;

    ctx.save();

    // -------------------------------------------------------------
    // FASE 1: 0ms - 300ms -> TRIPLE SCREEN FLASH
    // -------------------------------------------------------------
    if (this.elapsedMs < 300) {
      const flashIndex = Math.floor(this.elapsedMs / 50); // 6 pulsos de 50ms (3 ciclos)
      const isWhite = flashIndex % 2 === 0;

      if (isWhite) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      } else {
        ctx.fillStyle = 'rgba(5, 8, 20, 0.95)';
      }
      ctx.fillRect(0, 0, width, height);

      // Linhas de scanline holográficas
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    }
    // -------------------------------------------------------------
    // FASE 2: 300ms - 750ms -> POKÉMON SHUTTER BAR WIPE
    // -------------------------------------------------------------
    else if (this.elapsedMs < 750) {
      const wipeTime = this.elapsedMs - 300;
      const wipeProgress = Math.min(1.0, wipeTime / 450); // 0 a 1

      const barCount = 10;
      const barHeight = height / barCount;

      ctx.fillStyle = '#050814';

      for (let i = 0; i < barCount; i++) {
        const y = i * barHeight;
        const isEven = i % 2 === 0;
        // Barras pares deslizam da esquerda -> direita; ímpares da direita -> esquerda
        const currentBarWidth = width * Math.min(1.0, wipeProgress * 1.35);

        if (isEven) {
          ctx.fillRect(0, y, currentBarWidth, barHeight + 1);
        } else {
          ctx.fillRect(width - currentBarWidth, y, currentBarWidth, barHeight + 1);
        }
      }

      // Feixe neon divisório central ciano (#00E5FF)
      if (wipeProgress > 0.25 && wipeProgress < 0.95) {
        ctx.strokeStyle = '#00E5FF';
        ctx.shadowColor = '#00E5FF';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
    // -------------------------------------------------------------
    // FASE 3: 750ms - 900ms -> BLACKOUT TOTAL & TRANSITION COMPLETE
    // -------------------------------------------------------------
    else {
      ctx.fillStyle = '#050814';
      ctx.fillRect(0, 0, width, height);

      // Pulso final no centro com o logotipo NEXUS
      const pulseAlpha = 1.0 - (this.elapsedMs - 750) / 150;
      ctx.fillStyle = `rgba(0, 229, 255, ${Math.max(0, pulseAlpha)})`;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NEXUS CODE // INICIANDO PROTOCOLO DE COMBATE', width / 2, height / 2);
    }

    ctx.restore();
  }
}
