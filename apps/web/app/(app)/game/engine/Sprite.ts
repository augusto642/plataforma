/**
 * Sprite.ts
 * NEXUS CODE - Canvas 2D Game Engine
 * 
 * Renderizador de Sprites em HTML5 Canvas 2D com suporte a spritesheets,
 * recorte de quadros para animação contínua e micro-animações de direção.
 */

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Position {
  x: number;
  y: number;
}

export interface SpriteFrames {
  max: number;
  val: number;
  elapsed: number;
  hold: number;
}

export interface SpriteHitboxOptions {
  widthRatio?: number;
  heightRatio?: number;
  offsetXRatio?: number;
  offsetYRatio?: number;
}

export interface SpriteOptions {
  position: Position;
  image?: HTMLImageElement | string;
  frames?: {
    max?: number;
    hold?: number;
  };
  sprites?: Partial<Record<Direction, HTMLImageElement | string>>;
  direction?: Direction;
  animate?: boolean;
  scale?: number;
  rotation?: number;
  opacity?: number;
  cropWidth?: number;
  cropHeight?: number;
  hitbox?: SpriteHitboxOptions;
  fallbackColor?: string;
  label?: string;
  fallbackRenderer?: (ctx: CanvasRenderingContext2D, sprite: Sprite) => void;
}

export class Sprite {
  public position: Position;
  public image: HTMLImageElement;
  public frames: SpriteFrames;
  public sprites: Partial<Record<Direction, HTMLImageElement>> = {};
  public direction: Direction;
  public moving: boolean;
  public rotation: number;
  public opacity: number;
  public scale: number;
  public isLoaded: boolean = false;
  public cropWidth?: number;
  public cropHeight?: number;
  public hitboxOptions: Required<SpriteHitboxOptions>;
  public fallbackColor?: string;
  public label?: string;
  public fallbackRenderer?: (ctx: CanvasRenderingContext2D, sprite: Sprite) => void;

  private _onLoadedCallbacks: Array<() => void> = [];

  constructor({
    position,
    image,
    frames = { max: 1, hold: 10 },
    sprites = {},
    direction = 'down',
    animate = false,
    scale = 1,
    rotation = 0,
    opacity = 1,
    cropWidth,
    cropHeight,
    hitbox = {},
    fallbackColor,
    label,
    fallbackRenderer,
  }: SpriteOptions) {
    this.position = { x: position.x, y: position.y };
    this.direction = direction;
    this.moving = animate;
    this.scale = scale;
    this.rotation = rotation;
    this.opacity = opacity;
    this.cropWidth = cropWidth;
    this.cropHeight = cropHeight;
    this.fallbackColor = fallbackColor;
    this.label = label;
    this.fallbackRenderer = fallbackRenderer;

    this.hitboxOptions = {
      widthRatio: hitbox.widthRatio ?? 0.8,
      heightRatio: hitbox.heightRatio ?? 0.4,
      offsetXRatio: hitbox.offsetXRatio ?? 0.1,
      offsetYRatio: hitbox.offsetYRatio ?? 0.6,
    };

    this.frames = {
      max: frames.max ?? 1,
      val: 0,
      elapsed: 0,
      hold: frames.hold ?? 10,
    };

    // Prepara imagem principal
    this.image = this._resolveImage(image);

    // Carrega mapas direcionais caso fornecidos
    for (const [dirKey, dirImg] of Object.entries(sprites)) {
      if (dirImg) {
        this.sprites[dirKey as Direction] = this._resolveImage(dirImg);
      }
    }

    if (this.sprites[this.direction]) {
      this.image = this.sprites[this.direction]!;
    }
  }

  /**
   * Converte string URL ou HTMLImageElement para HTMLImageElement com listener de load
   */
  private _resolveImage(srcOrImg?: HTMLImageElement | string): HTMLImageElement {
    if (!srcOrImg) {
      const blank = typeof Image !== 'undefined' ? new Image() : ({} as HTMLImageElement);
      this.isLoaded = false;
      return blank;
    }

    if (typeof srcOrImg === 'string') {
      const img = new Image();
      img.src = srcOrImg;
      img.onload = () => {
        this.isLoaded = true;
        this._notifyLoaded();
      };
      return img;
    }

    if (srcOrImg.complete && srcOrImg.naturalWidth > 0) {
      this.isLoaded = true;
    } else if (typeof srcOrImg.addEventListener === 'function') {
      srcOrImg.addEventListener('load', () => {
        this.isLoaded = true;
        this._notifyLoaded();
      });
    } else {
      this.isLoaded = true;
    }

    return srcOrImg;
  }

  private _notifyLoaded(): void {
    for (const cb of this._onLoadedCallbacks) {
      cb();
    }
    this._onLoadedCallbacks = [];
  }

  /**
   * Registra callback para quando a imagem terminar de carregar
   */
  public onLoaded(callback: () => void): void {
    if (this.isLoaded) {
      callback();
    } else {
      this._onLoadedCallbacks.push(callback);
    }
  }

  /**
   * Altera a direção atual do Sprite e troca o spritesheet correspondente
   */
  public setDirection(direction: Direction): void {
    this.direction = direction;
    const nextImg = this.sprites[direction];
    if (nextImg) {
      this.image = nextImg;
      if (nextImg.complete && nextImg.naturalWidth > 0) {
        this.isLoaded = true;
      }
    }
  }

  /**
   * Largura de um frame individual do spritesheet na imagem de origem
   */
  public get frameWidth(): number {
    if (this.cropWidth) return this.cropWidth;
    if (this.image && (this.image.naturalWidth || this.image.width)) {
      return (this.image.naturalWidth || this.image.width) / this.frames.max;
    }
    return 48;
  }

  /**
   * Altura de um frame individual na imagem de origem
   */
  public get frameHeight(): number {
    if (this.cropHeight) return this.cropHeight;
    if (this.image && (this.image.naturalHeight || this.image.height)) {
      return this.image.naturalHeight || this.image.height;
    }
    return 48;
  }

  /**
   * Largura final renderizada no canvas
   */
  public get width(): number {
    return this.frameWidth * this.scale;
  }

  /**
   * Altura final renderizada no canvas
   */
  public get height(): number {
    return this.frameHeight * this.scale;
  }

  /**
   * Retorna a caixa de colisão (hitbox AABB) do sprite, normalmente focada nos pés
   */
  public getHitbox(): { x: number; y: number; width: number; height: number } {
    const w = this.width * this.hitboxOptions.widthRatio;
    const h = this.height * this.hitboxOptions.heightRatio;
    const x = this.position.x + this.width * this.hitboxOptions.offsetXRatio;
    const y = this.position.y + this.height * this.hitboxOptions.offsetYRatio;
    return { x, y, width: w, height: h };
  }

  /**
   * Atualiza a animação de passos por ticks de frame
   */
  public updateAnimation(): void {
    if (!this.moving) {
      this.frames.val = 0;
      this.frames.elapsed = 0;
      return;
    }

    if (this.frames.max > 1) {
      this.frames.elapsed++;
      if (this.frames.elapsed % this.frames.hold === 0) {
        this.frames.val = (this.frames.val + 1) % this.frames.max;
      }
    }
  }

  /**
   * Desenha o sprite no Canvas 2D context
   */
  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    if (this.opacity !== 1) {
      ctx.globalAlpha = Math.max(0, Math.min(1, this.opacity));
    }

    const renderWidth = this.width;
    const renderHeight = this.height;

    // Se houver rotação
    if (this.rotation !== 0) {
      ctx.translate(
        this.position.x + renderWidth / 2,
        this.position.y + renderHeight / 2
      );
      ctx.rotate(this.rotation);
      ctx.translate(
        -(this.position.x + renderWidth / 2),
        -(this.position.y + renderHeight / 2)
      );
    }

    // Se a imagem estiver carregada, desenha o frame recortado
    if (this.image && this.image.src && this.isLoaded) {
      const srcX = this.frames.val * this.frameWidth;
      const srcY = 0;
      try {
        ctx.drawImage(
          this.image,
          srcX,
          srcY,
          this.frameWidth,
          this.frameHeight,
          Math.round(this.position.x),
          Math.round(this.position.y),
          renderWidth,
          renderHeight
        );
      } catch {
        this._drawProceduralFallback(ctx, renderWidth, renderHeight);
      }
    } else if (this.fallbackRenderer) {
      this.fallbackRenderer(ctx, this);
    } else {
      this._drawProceduralFallback(ctx, renderWidth, renderHeight);
    }

    ctx.restore();
  }

  /**
   * Renderizador procedural estilizado Dark Obsidian para quando imagens ainda não carregaram
   */
  private _drawProceduralFallback(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ): void {
    const x = Math.round(this.position.x);
    const y = Math.round(this.position.y);
    const color = this.fallbackColor || '#00E5FF';

    // Corpo / Sombra
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h - 4, w * 0.4, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Box Cyberpunk
    ctx.fillStyle = '#0B1021';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);

    // Indicador direcional de visor / olho
    ctx.fillStyle = color;
    const eyeSize = 6;
    if (this.direction === 'down') {
      ctx.fillRect(x + w / 2 - 8, y + h / 2 - 4, eyeSize, eyeSize);
      ctx.fillRect(x + w / 2 + 2, y + h / 2 - 4, eyeSize, eyeSize);
    } else if (this.direction === 'up') {
      ctx.fillRect(x + w / 2 - 6, y + h / 3, 12, 3);
    } else if (this.direction === 'left') {
      ctx.fillRect(x + 8, y + h / 2 - 4, eyeSize, eyeSize);
    } else if (this.direction === 'right') {
      ctx.fillRect(x + w - 14, y + h / 2 - 4, eyeSize, eyeSize);
    }

    if (this.label) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.label, x + w / 2, y - 4);
    }
  }

  /**
   * Helper estático para instanciar Sprites de forma limpa
   */
  public static create(options: SpriteOptions): Sprite {
    return new Sprite(options);
  }
}
