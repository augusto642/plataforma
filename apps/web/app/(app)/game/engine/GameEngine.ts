/**
 * GameEngine.ts
 * NEXUS CODE - Canvas 2D Game Engine (Phase 2 - Pokémon / Chris Courses Architecture)
 * 
 * Game Loop de 60 FPS desacoplado com requestAnimationFrame e delta-timing:
 * 1. Camera2D: Câmera com interpolação suave (lerp 0.15) e clamping estrito contra bordas
 * 2. MinimapRadar: Radar sonar circular (128x128 offscreen cache, sweep beam 60 FPS e edge pinning)
 * 3. InteractiveProps: Props interativos (terminais de lições, totens, easter eggs e portas) com balão [E]
 * 4. SceneTransitionManager: FSM de transição de interiores com fade-out/fade-in (250ms)
 * 5. BattleTransitionFX: Transição clássica Pokémon (3 flashes + shutter wipe horizontal em 900ms)
 * 6. Y-Sorting: Ordenação de profundidade das entidades dinâmicas para oclusão realista
 */

import { Sprite, Direction, Position } from './Sprite';
import {
  Boundary,
  Rect,
  rectangularCollision,
  calculateOverlapArea,
} from './Boundary';
import { AudioSynthesizer } from './AudioSynthesizer';
import { Camera2D, CameraBounds } from './Camera2D';
import { MinimapRadar, MinimapEntity } from './MinimapRadar';
import { InteractiveProp } from './InteractiveProp';
import {
  SceneTransitionManager,
  InteriorSceneData,
  createLaboratoryInteriorScene,
} from './SceneTransitionManager';
import { BattleTransitionFX } from './BattleTransitionFX';
import type { GeneratedGameWorld } from './ProceduralAssets';

export interface MovableItem {
  position: Position;
}

export interface GameEngineOptions {
  canvas: HTMLCanvasElement;
  player: Sprite;
  background: Sprite;
  foreground?: Sprite;
  boundaries?: Boundary[];
  battleZones?: Boundary[];
  portals?: Boundary[];
  interactiveProps?: InteractiveProp[];
  speed?: number;
  encounterRate?: number;
  debug?: boolean;
  enableAudio?: boolean;
  showMinimap?: boolean;
  mapWidth?: number;
  mapHeight?: number;
  onBattleEncounter?: (zone: Boundary) => void;
  onPortalEnter?: (portal: Boundary, targetBiome: string) => void;
  onPlayerMove?: (direction: Direction, hitbox: Rect) => void;
  onStep?: (totalSteps: number) => void;
  onPropInteract?: (prop: InteractiveProp) => void;
  onSceneTransition?: (sceneId: string) => void;
}

export interface KeyState {
  pressed: boolean;
}

export class GameEngine {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;

  public player: Sprite;
  public background: Sprite;
  public foreground?: Sprite;
  public boundaries: Boundary[];
  public battleZones: Boundary[];
  public portals: Boundary[];
  public interactiveProps: InteractiveProp[];
  public movables: MovableItem[];

  public speed: number;
  public encounterRate: number;
  public debug: boolean;
  public showMinimap: boolean;

  public inBattle: boolean = false;
  public isRunning: boolean = false;
  public totalSteps: number = 0;

  // Dimensões do mapa
  public mapWidth: number;
  public mapHeight: number;

  // 1. Câmera 2D Viewport
  public camera: Camera2D;

  // 2. Minimapa com Radar Sonar
  public minimap: MinimapRadar;
  public activeQuestTarget: MinimapEntity | null = null;

  // 3. Gerenciador de Transições de Cenário / Interiores
  public sceneTransition: SceneTransitionManager;
  public activeSceneId: string = 'overworld';
  private savedOverworldWorld?: {
    background: Sprite;
    foreground?: Sprite;
    boundaries: Boundary[];
    battleZones: Boundary[];
    portals: Boundary[];
    interactiveProps: InteractiveProp[];
    playerScreenPos: Position;
    backgroundPos: Position;
  };

  // 4. Transição Clássica de Batalha Pokémon
  public battleTransitionFX: BattleTransitionFX;

  // Áudio
  public audio: AudioSynthesizer;
  public enableAudio: boolean;

  // Callbacks
  public onBattleEncounter?: (zone: Boundary) => void;
  public onPortalEnter?: (portal: Boundary, targetBiome: string) => void;
  public onPlayerMove?: (direction: Direction, hitbox: Rect) => void;
  public onStep?: (totalSteps: number) => void;
  public onPropInteract?: (prop: InteractiveProp) => void;
  public onSceneTransition?: (sceneId: string) => void;

  // Input
  private keys: Record<string, KeyState> = {
    w: { pressed: false },
    a: { pressed: false },
    s: { pressed: false },
    d: { pressed: false },
    e: { pressed: false },
  };
  private lastKey: string = '';

  // Loop & timing
  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private fps: number = 0;
  private frameCounter: number = 0;
  private fpsTimer: number = 0;

  // Passo sonoro (intervalo de passos)
  private stepDistanceAccumulator: number = 0;
  private readonly STEP_DISTANCE_THRESHOLD: number = 24;

  // Screen Shake FX
  private shakeTimer: number = 0;
  private shakeDuration: number = 0;
  private shakeIntensity: number = 0;

  // Cooldown de encontro após sair de batalha ou transição (evita re-trigger imediato)
  private battleCooldownTimer: number = 0;

  // Listeners bound handlers
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundResize: () => void;

  constructor({
    canvas,
    player,
    background,
    foreground,
    boundaries = [],
    battleZones = [],
    portals = [],
    interactiveProps = [],
    speed = 4,
    encounterRate = 0.018,
    debug = false,
    enableAudio = true,
    showMinimap = true,
    mapWidth = 1920,
    mapHeight = 1152,
    onBattleEncounter,
    onPortalEnter,
    onPlayerMove,
    onStep,
    onPropInteract,
    onSceneTransition,
  }: GameEngineOptions) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Não foi possível obter o contexto 2D do Canvas.');
    }
    this.ctx = context;

    this.player = player;
    this.background = background;
    this.foreground = foreground;
    this.boundaries = boundaries;
    this.battleZones = battleZones;
    this.portals = portals;
    this.interactiveProps = interactiveProps;
    this.speed = speed;
    this.encounterRate = encounterRate;
    this.debug = debug;
    this.enableAudio = enableAudio;
    this.showMinimap = showMinimap;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;

    this.onBattleEncounter = onBattleEncounter;
    this.onPortalEnter = onPortalEnter;
    this.onPlayerMove = onPlayerMove;
    this.onStep = onStep;
    this.onPropInteract = onPropInteract;
    this.onSceneTransition = onSceneTransition;

    this.audio = AudioSynthesizer.getInstance();

    // Centraliza o jogador na tela
    this.recenterPlayer();

    // 1. Inicializa Câmera 2D
    const cameraBounds: CameraBounds = {
      minX: 0,
      minY: 0,
      maxX: this.mapWidth,
      maxY: this.mapHeight,
    };
    this.camera = new Camera2D({
      width: this.canvas.width,
      height: this.canvas.height,
      bounds: cameraBounds,
      lerpSpeed: 0.15,
    });

    // 2. Inicializa Minimapa com Radar Sonar
    this.minimap = new MinimapRadar({
      radius: 50,
      centerX: this.canvas.width - 70,
      centerY: 72,
      mapWidth: this.mapWidth,
      mapHeight: this.mapHeight,
      viewDistance: 650,
    });
    this.minimap.bakeTerrain(this.boundaries, this.battleZones);

    // 3. Inicializa Transições de Interiores e Batalha
    this.sceneTransition = new SceneTransitionManager(250);
    this.battleTransitionFX = new BattleTransitionFX(900);

    // 4. Monta lista de elementos móveis (retro-compatibilidade com testes e Chris Courses)
    this.movables = [
      this.background,
      ...this.boundaries,
      ...this.battleZones,
      ...this.portals,
      ...this.interactiveProps,
    ];
    if (this.foreground) {
      this.movables.push(this.foreground);
    }

    // Configura listeners
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundResize = this.handleResize.bind(this);

    this.setupEventListeners();
  }

  /**
   * Posiciona o jogador fixo no centro do canvas
   */
  public recenterPlayer(): void {
    this.player.position.x = Math.round(
      this.canvas.width / 2 - this.player.width / 2
    );
    this.player.position.y = Math.round(
      this.canvas.height / 2 - this.player.height / 2
    );
  }

  /**
   * Retorna a coordenada de mundo calculada do jogador
   */
  public getPlayerWorldPosition(): Position {
    return {
      x: this.player.position.x - this.background.position.x,
      y: this.player.position.y - this.background.position.y,
    };
  }

  /**
   * Adiciona um item móvel à lista de movables da câmera
   */
  public addMovable(item: MovableItem): void {
    if (!this.movables.includes(item)) {
      this.movables.push(item);
    }
  }

  /**
   * Remove item móvel da lista
   */
  public removeMovable(item: MovableItem): void {
    const idx = this.movables.indexOf(item);
    if (idx !== -1) {
      this.movables.splice(idx, 1);
    }
  }

  /**
   * Adiciona um prop interativo ao mapa
   */
  public addInteractiveProp(prop: InteractiveProp): void {
    if (!this.interactiveProps.includes(prop)) {
      this.interactiveProps.push(prop);
      this.addMovable(prop);
      if (prop.isSolid && !this.boundaries.includes(prop)) {
        this.boundaries.push(prop);
      }
    }
  }

  /**
   * Remove prop interativo
   */
  public removeInteractiveProp(prop: InteractiveProp): void {
    const idx = this.interactiveProps.indexOf(prop);
    if (idx !== -1) {
      this.interactiveProps.splice(idx, 1);
      this.removeMovable(prop);
      const bIdx = this.boundaries.indexOf(prop);
      if (bIdx !== -1) {
        this.boundaries.splice(bIdx, 1);
      }
    }
  }

  /**
   * Define o alvo da missão / aula no minimapa para exibição e Edge Pinning
   */
  public setActiveQuestTarget(target: MinimapEntity | null): void {
    this.activeQuestTarget = target;
  }

  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('resize', this.boundResize);
  }

  private removeEventListeners(): void {
    if (typeof window === 'undefined') return;

    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('resize', this.boundResize);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (
      this.inBattle ||
      this.battleTransitionFX.isActive ||
      this.sceneTransition.isBlockingInput()
    ) {
      return;
    }

    // Desbloqueia Web Audio no primeiro comando do usuário
    if (this.enableAudio) {
      void this.audio.resume();
    }

    const key = e.key.toLowerCase();

    if (key === 'w' || key === 'arrowup') {
      this.keys.w.pressed = true;
      this.lastKey = 'w';
    } else if (key === 'a' || key === 'arrowleft') {
      this.keys.a.pressed = true;
      this.lastKey = 'a';
    } else if (key === 's' || key === 'arrowdown') {
      this.keys.s.pressed = true;
      this.lastKey = 's';
    } else if (key === 'd' || key === 'arrowright') {
      this.keys.d.pressed = true;
      this.lastKey = 'd';
    } else if (key === 'e' || key === 'enter') {
      this.interactWithClosestProp();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();

    if (key === 'w' || key === 'arrowup') {
      this.keys.w.pressed = false;
    } else if (key === 'a' || key === 'arrowleft') {
      this.keys.a.pressed = false;
    } else if (key === 's' || key === 'arrowdown') {
      this.keys.s.pressed = false;
    } else if (key === 'd' || key === 'arrowright') {
      this.keys.d.pressed = false;
    }
  }

  private handleResize(): void {
    this.recenterPlayer();
    if (this.minimap) {
      this.minimap.centerX = this.canvas.width - 70;
      this.minimap.centerY = 72;
    }
  }

  /**
   * Define o estado de uma tecla programaticamente (usado pelo VirtualDPad e botões touch)
   */
  public setKey(key: string, pressed: boolean): void {
    const k = key.toLowerCase();
    const mapped =
      k === 'arrowup' ? 'w' :
      k === 'arrowleft' ? 'a' :
      k === 'arrowdown' ? 's' :
      k === 'arrowright' ? 'd' : k;

    if (mapped === 'e' && pressed) {
      this.interactWithClosestProp();
      return;
    }

    if (this.keys[mapped] !== undefined) {
      this.keys[mapped].pressed = pressed;
      if (pressed) {
        this.lastKey = mapped;
        if (this.enableAudio) {
          void this.audio.resume();
        }
      }
    }
  }

  /**
   * Libera todas as teclas ativas
   */
  public releaseAllKeys(): void {
    for (const k of Object.keys(this.keys)) {
      this.keys[k].pressed = false;
    }
    this.lastKey = '';
    if (this.player) {
      this.player.moving = false;
    }
  }

  /**
   * Dispara interação com o prop mais próximo ao jogador (tecla E ou botão Action)
   */
  public interactWithClosestProp(): InteractiveProp | null {
    if (
      this.inBattle ||
      this.battleTransitionFX.isActive ||
      this.sceneTransition.isBlockingInput()
    ) {
      return null;
    }

    const playerBox = this.player.getHitbox();
    let closestProp: InteractiveProp | null = null;
    let minDistance = Infinity;

    for (let i = 0; i < this.interactiveProps.length; i++) {
      const prop = this.interactiveProps[i];
      if (prop.updateProximity(playerBox)) {
        const propCenterX = prop.position.x + prop.width / 2;
        const propCenterY = prop.position.y + prop.height / 2;
        const playerCenterX = playerBox.x + playerBox.width / 2;
        const playerCenterY = playerBox.y + playerBox.height / 2;
        const dist = Math.hypot(propCenterX - playerCenterX, propCenterY - playerCenterY);

        if (dist < minDistance) {
          minDistance = dist;
          closestProp = prop;
        }
      }
    }

    if (closestProp) {
      if (this.enableAudio) {
        this.audio.playTone({
          frequency: 520,
          duration: 0.08,
          type: 'square',
          volume: 0.35,
        });
      }

      // Trata portas para transição de cenário automática
      if (closestProp.category === 'door') {
        const targetScene = closestProp.data?.targetScene as string;
        if (targetScene === 'interior_lab') {
          this.loadInteriorScene(createLaboratoryInteriorScene());
        } else if (targetScene === 'overworld') {
          this.returnToOverworld();
        }
      }

      if (closestProp.onInteract) {
        closestProp.onInteract(closestProp);
      }

      if (this.onPropInteract) {
        this.onPropInteract(closestProp);
      }
    }

    return closestProp;
  }

  /**
   * Inicia o loop de animação do jogo
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.fpsTimer = performance.now();
    this.frameCounter = 0;
    this.tick(this.lastTimestamp);
  }

  /**
   * Pausa o loop de animação
   */
  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Altera estado de batalha
   */
  public setBattleMode(active: boolean): void {
    this.inBattle = active;
    if (!active) {
      this.battleTransitionFX.reset();
      this.battleCooldownTimer = 2000; // 2s de invulnerabilidade
    }
  }

  /**
   * Dispara efeito de Screen Shake no Canvas
   */
  public triggerScreenShake(durationMs: number = 250, intensity: number = 8): void {
    this.shakeDuration = durationMs;
    this.shakeTimer = durationMs;
    this.shakeIntensity = intensity;
  }

  /**
   * Verifica se o tremor de tela está em andamento
   */
  public isScreenShaking(): boolean {
    return this.shakeTimer > 0;
  }

  /**
   * Destrói a instância do motor e libera listeners e áudio
   */
  public destroy(): void {
    this.stop();
    this.removeEventListeners();
    this.releaseAllKeys();
  }

  /**
   * Transiciona o engine para uma cena interna (Laboratório, etc.) com fade-out/fade-in
   */
  public loadInteriorScene(sceneData: InteriorSceneData): void {
    if (this.sceneTransition.isBlockingInput()) return;

    if (this.enableAudio) {
      this.audio.playTone({
        frequency: 240,
        pitchBendTo: 160,
        duration: 0.15,
        type: 'sine',
        volume: 0.3,
      });
    }

    // Salva o mundo exterior para retorno
    if (this.activeSceneId === 'overworld') {
      this.savedOverworldWorld = {
        background: this.background,
        foreground: this.foreground,
        boundaries: [...this.boundaries],
        battleZones: [...this.battleZones],
        portals: [...this.portals],
        interactiveProps: [...this.interactiveProps],
        playerScreenPos: { ...this.player.position },
        backgroundPos: { ...this.background.position },
      };
    }

    this.sceneTransition.startTransition(
      {
        targetSceneId: sceneData.id,
        spawnPosition: sceneData.defaultSpawn,
      },
      () => {
        // Callback executado no exato blackout total
        this.activeSceneId = sceneData.id;
        this.background = sceneData.background;
        this.foreground = sceneData.foreground;
        this.boundaries = [...sceneData.boundaries, sceneData.exitDoor];
        this.battleZones = [];
        this.portals = [];
        this.interactiveProps = [...sceneData.props];

        // Centraliza background e jogador
        this.background.position = {
          x: -Math.round(sceneData.widthTiles * sceneData.tileSize / 2 - this.canvas.width / 2),
          y: -Math.round(sceneData.heightTiles * sceneData.tileSize / 2 - this.canvas.height / 2),
        };
        this.recenterPlayer();

        this.movables = [
          this.background,
          ...this.boundaries,
          ...this.interactiveProps,
        ];
        if (this.foreground) {
          this.movables.push(this.foreground);
        }

        // Atualiza dimensões e minimapa da cena interna
        this.mapWidth = sceneData.widthTiles * sceneData.tileSize;
        this.mapHeight = sceneData.heightTiles * sceneData.tileSize;
        this.camera.setBounds({
          minX: 0,
          minY: 0,
          maxX: this.mapWidth,
          maxY: this.mapHeight,
        });
        this.minimap.mapWidth = this.mapWidth;
        this.minimap.mapHeight = this.mapHeight;
        this.minimap.bakeTerrain(this.boundaries, []);

        if (this.onSceneTransition) {
          this.onSceneTransition(sceneData.id);
        }
      }
    );
  }

  /**
   * Retorna do interior para o mapa Overworld com fade suave
   */
  public returnToOverworld(): void {
    if (!this.savedOverworldWorld || this.sceneTransition.isBlockingInput()) return;

    if (this.enableAudio) {
      this.audio.playTone({
        frequency: 180,
        pitchBendTo: 260,
        duration: 0.15,
        type: 'sine',
        volume: 0.3,
      });
    }

    this.sceneTransition.startTransition(
      {
        targetSceneId: 'overworld',
        spawnPosition: { x: 0, y: 0 },
      },
      () => {
        const saved = this.savedOverworldWorld!;
        this.activeSceneId = 'overworld';
        this.background = saved.background;
        this.foreground = saved.foreground;
        this.boundaries = saved.boundaries;
        this.battleZones = saved.battleZones;
        this.portals = saved.portals;
        this.interactiveProps = saved.interactiveProps;

        this.background.position = { ...saved.backgroundPos };
        this.player.position = { ...saved.playerScreenPos };

        this.movables = [
          this.background,
          ...this.boundaries,
          ...this.battleZones,
          ...this.portals,
          ...this.interactiveProps,
        ];
        if (this.foreground) {
          this.movables.push(this.foreground);
        }

        this.mapWidth = 1920;
        this.mapHeight = 1152;
        this.camera.setBounds({ minX: 0, minY: 0, maxX: 1920, maxY: 1152 });
        this.minimap.mapWidth = 1920;
        this.minimap.mapHeight = 1152;
        this.minimap.bakeTerrain(this.boundaries, this.battleZones);

        if (this.onSceneTransition) {
          this.onSceneTransition('overworld');
        }
      }
    );
  }

  /**
   * Loop principal do motor (60 FPS requestAnimationFrame com Delta-Time)
   */
  private tick = (timestamp: number): void => {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.tick);

    if (this.lastTimestamp === 0) {
      this.lastTimestamp = timestamp;
    }
    const deltaMs = Math.min(Math.max(timestamp - this.lastTimestamp, 0), 100);
    this.lastTimestamp = timestamp;
    const deltaFactor = deltaMs > 0 ? deltaMs / (1000 / 60) : 1;

    this.frameCounter++;
    if (timestamp - this.fpsTimer >= 1000) {
      this.fps = this.frameCounter;
      this.frameCounter = 0;
      this.fpsTimer = timestamp;
    }

    this.update(deltaFactor, deltaMs);
    this.render();
  };

  /**
   * Atualização da lógica de física, movimentação, proximidade e efeitos
   */
  private update(deltaFactor: number = 1, deltaMs: number = 16.66): void {
    // 1. Atualiza Screen Shake
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - deltaMs);
    }

    // 2. Atualiza Cooldown de batalha
    if (this.battleCooldownTimer > 0) {
      this.battleCooldownTimer = Math.max(0, this.battleCooldownTimer - deltaMs);
    }

    // 3. Atualiza FSM de Transições
    this.sceneTransition.update(deltaMs);
    this.battleTransitionFX.update(deltaMs);

    // 4. Animação de caminhada do jogador
    this.player.updateAnimation();

    // 5. Atualiza animações e proximidade dos props interativos
    const playerHitbox = this.player.getHitbox();
    for (let i = 0; i < this.interactiveProps.length; i++) {
      const prop = this.interactiveProps[i];
      prop.update(deltaFactor);
      prop.updateProximity(playerHitbox);
    }

    // 6. Atualiza feixe de varredura do radar minimapa
    if (this.showMinimap) {
      this.minimap.update(deltaFactor);
    }

    // 7. Se em batalha, transição ativa ou travamento de cena, interrompe física
    if (
      this.inBattle ||
      this.battleTransitionFX.isActive ||
      this.sceneTransition.isBlockingInput()
    ) {
      this.player.moving = false;
      return;
    }

    let moving = true;
    this.player.moving = false;

    const step = this.speed * deltaFactor;

    // -------------------------------------------------------------
    // CONTROLES DIRECIONAIS WASD / SETAS COM DETECÇÃO AABB PREDITIVA
    // -------------------------------------------------------------

    // 1. Movimento para Cima (W / ArrowUp)
    if (this.keys.w.pressed && this.lastKey === 'w') {
      this.player.moving = true;
      this.player.setDirection('up');

      for (let i = 0; i < this.boundaries.length; i++) {
        const boundary = this.boundaries[i];
        if (
          rectangularCollision({
            rectangle1: playerHitbox,
            rectangle2: {
              ...boundary.getRect(),
              y: boundary.position.y + step,
            },
          })
        ) {
          moving = false;
          break;
        }
      }

      if (moving) {
        this.checkBattleZoneEncounter();
        this.checkPortalTriggers();
        this.movables.forEach((movable) => {
          movable.position.y += step;
        });
        this.handleMovementStep('up', step);
      } else if (this.enableAudio) {
        this.audio.playCollision();
      }
    }
    // 2. Movimento para Esquerda (A / ArrowLeft)
    else if (this.keys.a.pressed && this.lastKey === 'a') {
      this.player.moving = true;
      this.player.setDirection('left');

      for (let i = 0; i < this.boundaries.length; i++) {
        const boundary = this.boundaries[i];
        if (
          rectangularCollision({
            rectangle1: playerHitbox,
            rectangle2: {
              ...boundary.getRect(),
              x: boundary.position.x + step,
            },
          })
        ) {
          moving = false;
          break;
        }
      }

      if (moving) {
        this.checkBattleZoneEncounter();
        this.checkPortalTriggers();
        this.movables.forEach((movable) => {
          movable.position.x += step;
        });
        this.handleMovementStep('left', step);
      } else if (this.enableAudio) {
        this.audio.playCollision();
      }
    }
    // 3. Movimento para Baixo (S / ArrowDown)
    else if (this.keys.s.pressed && this.lastKey === 's') {
      this.player.moving = true;
      this.player.setDirection('down');

      for (let i = 0; i < this.boundaries.length; i++) {
        const boundary = this.boundaries[i];
        if (
          rectangularCollision({
            rectangle1: playerHitbox,
            rectangle2: {
              ...boundary.getRect(),
              y: boundary.position.y - step,
            },
          })
        ) {
          moving = false;
          break;
        }
      }

      if (moving) {
        this.checkBattleZoneEncounter();
        this.checkPortalTriggers();
        this.movables.forEach((movable) => {
          movable.position.y -= step;
        });
        this.handleMovementStep('down', step);
      } else if (this.enableAudio) {
        this.audio.playCollision();
      }
    }
    // 4. Movimento para Direita (D / ArrowRight)
    else if (this.keys.d.pressed && this.lastKey === 'd') {
      this.player.moving = true;
      this.player.setDirection('right');

      for (let i = 0; i < this.boundaries.length; i++) {
        const boundary = this.boundaries[i];
        if (
          rectangularCollision({
            rectangle1: playerHitbox,
            rectangle2: {
              ...boundary.getRect(),
              x: boundary.position.x - step,
            },
          })
        ) {
          moving = false;
          break;
        }
      }

      if (moving) {
        this.checkBattleZoneEncounter();
        this.checkPortalTriggers();
        this.movables.forEach((movable) => {
          movable.position.x -= step;
        });
        this.handleMovementStep('right', step);
      } else if (this.enableAudio) {
        this.audio.playCollision();
      }
    }

    // 8. Atualiza Câmera com interpolação Lerp
    const playerWorld = this.getPlayerWorldPosition();
    this.camera.update(playerWorld.x, playerWorld.y, deltaFactor);
  }

  /**
   * Acumula passos para tocar som de footstep e disparar callbacks
   */
  private handleMovementStep(dir: Direction, step: number = this.speed): void {
    this.stepDistanceAccumulator += step;
    if (this.stepDistanceAccumulator >= this.STEP_DISTANCE_THRESHOLD) {
      this.stepDistanceAccumulator = 0;
      this.totalSteps++;

      if (this.enableAudio) {
        this.audio.playFootstep();
      }

      if (this.onStep) {
        this.onStep(this.totalSteps);
      }
    }

    if (this.onPlayerMove) {
      this.onPlayerMove(dir, this.player.getHitbox());
    }
  }

  /**
   * Avalia sobreposição com Zonas de Batalha (tall grass, corrupted sectors)
   */
  private checkBattleZoneEncounter(): void {
    if (
      this.inBattle ||
      this.battleTransitionFX.isActive ||
      this.battleCooldownTimer > 0 ||
      this.sceneTransition.isBlockingInput()
    ) {
      return;
    }

    const playerBox = this.player.getHitbox();
    const playerArea = playerBox.width * playerBox.height;

    for (let i = 0; i < this.battleZones.length; i++) {
      const battleZone = this.battleZones[i];
      const overlap = calculateOverlapArea(playerBox, battleZone.getRect());

      if (
        rectangularCollision({
          rectangle1: playerBox,
          rectangle2: battleZone.getRect(),
        }) &&
        overlap / playerArea > 0.35
      ) {
        if (Math.random() < this.encounterRate) {
          this.triggerBattle(battleZone);
          break;
        }
      }
    }
  }

  /**
   * Avalia sobreposição com Portais Holográficos e dispara teleporte entre biomas
   */
  public checkPortalTriggers(): void {
    if (
      this.inBattle ||
      this.battleTransitionFX.isActive ||
      this.sceneTransition.isBlockingInput() ||
      !this.portals ||
      this.portals.length === 0
    ) {
      return;
    }

    const playerBox = this.player.getHitbox();
    for (let i = 0; i < this.portals.length; i++) {
      const portal = this.portals[i];
      if (
        rectangularCollision({
          rectangle1: playerBox,
          rectangle2: portal.getRect(),
        })
      ) {
        const targetBiome = (portal.data?.targetBiome as string) || '';
        if (targetBiome && this.onPortalEnter) {
          if (this.enableAudio) {
            void this.audio.playLevelUp();
          }
          this.triggerScreenShake(300, 5);
          this.onPortalEnter(portal, targetBiome);
          break;
        }
      }
    }
  }

  /**
   * Transiciona o engine para um novo bioma/mundo procedural
   */
  public loadBiome(world: GeneratedGameWorld): void {
    this.background = world.background;
    this.foreground = world.foreground;
    this.boundaries = world.boundaries;
    this.battleZones = world.battleZones;
    this.portals = world.portals || [];
    this.interactiveProps = world.interactiveProps || [];

    this.movables = [
      this.background,
      ...this.boundaries,
      ...this.battleZones,
      ...this.portals,
      ...this.interactiveProps,
    ];
    if (this.foreground) {
      this.movables.push(this.foreground);
    }
    this.recenterPlayer();

    // Atualiza radar com a nova topografia
    this.minimap.bakeTerrain(this.boundaries, this.battleZones);
  }

  /**
   * Inicia o gatilho de batalha clássico Pokémon (3 flashes + shutter wipe em 900ms)
   */
  public triggerBattle(zone: Boundary): void {
    if (this.inBattle || this.battleTransitionFX.isActive) return;

    this.player.moving = false;

    if (this.enableAudio) {
      this.audio.playBattleAlert();
    }

    // Dispara a transição com wipe clássico
    this.battleTransitionFX.start(() => {
      this.inBattle = true;
      if (this.onBattleEncounter) {
        this.onBattleEncounter(zone);
      }
    });

    // Tremor de tela dramático nos últimos 200ms
    setTimeout(() => {
      this.triggerScreenShake(200, 7);
    }, 700);
  }

  /**
   * Renderização de todos os elementos na tela no Canvas 2D com Y-Sorting
   */
  public render(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Efeito Screen Shake com amortecimento
    const isShaking = this.shakeTimer > 0 && this.shakeDuration > 0;
    if (isShaking) {
      this.ctx.save();
      const progress = this.shakeTimer / this.shakeDuration;
      const currentIntensity = this.shakeIntensity * progress;
      const offsetX = (Math.random() - 0.5) * 2 * currentIntensity;
      const offsetY = (Math.random() - 0.5) * 2 * currentIntensity;
      this.ctx.translate(offsetX, offsetY);
    }

    // 1. Renderiza Cenário de Fundo (Background)
    this.background.draw(this.ctx);

    // 2. Renderiza Boundaries e Zonas (modo debug)
    if (this.debug) {
      for (const boundary of this.boundaries) {
        boundary.draw(this.ctx, { debug: true });
      }
      for (const zone of this.battleZones) {
        zone.draw(this.ctx, { debug: true });
      }
      for (const portal of this.portals) {
        portal.draw(this.ctx, {
          debug: true,
          color: '#00E5FF',
          fillColor: 'rgba(0, 229, 255, 0.3)',
        });
      }
    }

    // 3. Y-SORTING DE PROFUNDIDADE: Ordena Jogador e Props Interativos por (y + height)
    interface DepthRenderable {
      draw: (ctx: CanvasRenderingContext2D) => void;
      getSortKey: () => number;
    }

    const depthQueue: DepthRenderable[] = [
      {
        draw: (ctx) => this.player.draw(ctx),
        getSortKey: () => this.player.position.y + this.player.height,
      },
      ...this.interactiveProps.map((prop) => ({
        draw: (ctx: CanvasRenderingContext2D) => prop.draw(ctx),
        getSortKey: () => prop.getSortKey(),
      })),
    ];

    depthQueue.sort((a, b) => a.getSortKey() - b.getSortKey());
    for (let i = 0; i < depthQueue.length; i++) {
      depthQueue[i].draw(this.ctx);
    }

    // 4. Renderiza Foreground (sobreposição de telhados, copas de árvores)
    if (this.foreground) {
      this.foreground.draw(this.ctx);
    }

    // Restaura o contexto antes das HUDs e overlays de tela fixa
    if (isShaking) {
      this.ctx.restore();
    }

    // 5. Minimapa com Radar Sonar (HUD Fixa no Canvas)
    if (this.showMinimap) {
      const playerWorld = this.getPlayerWorldPosition();
      const minimapEntities: MinimapEntity[] = this.interactiveProps.map((prop) => ({
        id: prop.id ? String(prop.id) : `prop_${prop.position.x}_${prop.position.y}`,
        worldX: prop.position.x - this.background.position.x,
        worldY: prop.position.y - this.background.position.y,
        type: prop.category,
        label: prop.title,
      }));

      // Adiciona portais ao minimapa
      this.portals.forEach((portal) => {
        minimapEntities.push({
          id: portal.id ? String(portal.id) : 'portal',
          worldX: portal.position.x - this.background.position.x,
          worldY: portal.position.y - this.background.position.y,
          type: 'portal',
          label: (portal.data?.label as string) || 'Portal',
        });
      });

      this.minimap.draw(
        this.ctx,
        playerWorld,
        this.player.direction,
        minimapEntities,
        this.activeQuestTarget
      );
    }

    // 6. Transições de Cena (Fade-Out / Fade-In de Interiores)
    this.sceneTransition.draw(this.ctx, this.canvas.width, this.canvas.height);

    // 7. Transição Clássica de Batalha Pokémon (Triple Flash + Shutter Wipe)
    this.battleTransitionFX.draw(this.ctx, this.canvas.width, this.canvas.height);

    // 8. Debug info overlay
    if (this.debug) {
      this.renderDebugOverlay();
    }
  }

  /**
   * Renderiza estatísticas de debug (FPS, coordenadas de mundo, câmera e props)
   */
  private renderDebugOverlay(): void {
    const hitbox = this.player.getHitbox();
    const playerWorld = this.getPlayerWorldPosition();

    this.ctx.save();
    this.ctx.strokeStyle = '#00ffcc';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);

    // Painel de debug Dark Obsidian
    this.ctx.fillStyle = 'rgba(5, 8, 20, 0.85)';
    this.ctx.strokeStyle = '#1E293B';
    this.ctx.lineWidth = 1;
    this.ctx.fillRect(10, 10, 240, 135);
    this.ctx.strokeRect(10, 10, 240, 135);

    this.ctx.fillStyle = '#00ffcc';
    this.ctx.font = 'bold 11px monospace';
    this.ctx.fillText(`NEXUS CODE 2D ENGINE // POKÉMON GBA`, 18, 26);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '10px monospace';
    this.ctx.fillText(`FPS: ${this.fps} (Delta normalizado)`, 18, 44);
    this.ctx.fillText(
      `World Pos: X: ${Math.round(playerWorld.x)} Y: ${Math.round(playerWorld.y)}`,
      18,
      60
    );
    this.ctx.fillText(
      `Camera Cam: X: ${Math.round(this.camera.x)} Y: ${Math.round(this.camera.y)}`,
      18,
      76
    );
    this.ctx.fillText(`Scene: ${this.activeSceneId.toUpperCase()}`, 18, 92);
    this.ctx.fillText(
      `Props Próximos: ${this.interactiveProps.filter((p) => p.isPlayerNearby).length}`,
      18,
      108
    );
    this.ctx.fillText(
      `State: ${this.inBattle ? 'BATALHA' : this.player.moving ? 'ANDANDO' : 'IDLE'}`,
      18,
      124
    );
    this.ctx.restore();
  }
}
