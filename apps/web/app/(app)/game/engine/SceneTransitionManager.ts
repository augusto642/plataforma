/**
 * SceneTransitionManager.ts
 * NEXUS CODE - Canvas 2D Game Engine Interior Scene Transition & Fade FSM
 * 
 * Gerenciador de transições de cena suaves com fade-out/fade-in (250ms)
 * para entrada e saída de construções e interiores 2D (Laboratório, Biblioteca, etc.)
 */

import { Sprite, Position } from './Sprite';
import { Boundary } from './Boundary';
import { InteractiveProp } from './InteractiveProp';

export type SceneTransitionState = 'IDLE' | 'FADING_OUT' | 'SWAPPING_SCENE' | 'FADING_IN';

export interface SceneTransitionRequest {
  targetSceneId: string;
  spawnPosition: Position;
  durationMs?: number;
  data?: Record<string, unknown>;
}

export interface InteriorSceneData {
  id: string;
  name: string;
  widthTiles: number;
  heightTiles: number;
  tileSize: number;
  background: Sprite;
  foreground?: Sprite;
  boundaries: Boundary[];
  props: InteractiveProp[];
  exitDoor: Boundary;
  defaultSpawn: Position;
}

export class SceneTransitionManager {
  public state: SceneTransitionState = 'IDLE';
  public alpha: number = 0;
  private durationMs: number = 250;
  private currentRequest: SceneTransitionRequest | null = null;
  private onSwapCallback?: (request: SceneTransitionRequest) => void;
  private onCompleteCallback?: () => void;

  constructor(defaultDurationMs: number = 250) {
    this.durationMs = defaultDurationMs;
  }

  /**
   * Inicia a transição de cena com fade-out
   */
  public startTransition(
    request: SceneTransitionRequest,
    onSwap: (request: SceneTransitionRequest) => void,
    onComplete?: () => void
  ): void {
    if (this.state !== 'IDLE') return;

    this.currentRequest = request;
    this.onSwapCallback = onSwap;
    this.onCompleteCallback = onComplete;
    this.durationMs = request.durationMs || 250;
    this.alpha = 0;
    this.state = 'FADING_OUT';
  }

  /**
   * Atualiza os tempos da máquina de estados de transição
   */
  public update(deltaMs: number): void {
    if (this.state === 'IDLE') return;

    const step = deltaMs / this.durationMs;

    if (this.state === 'FADING_OUT') {
      this.alpha = Math.min(1.0, this.alpha + step);
      if (this.alpha >= 1.0) {
        this.alpha = 1.0;
        this.state = 'SWAPPING_SCENE';

        // Executa a troca de cena no momento exato do blackout
        if (this.currentRequest && this.onSwapCallback) {
          this.onSwapCallback(this.currentRequest);
        }

        this.state = 'FADING_IN';
      }
    } else if (this.state === 'FADING_IN') {
      this.alpha = Math.max(0.0, this.alpha - step);
      if (this.alpha <= 0.0) {
        this.alpha = 0;
        this.state = 'IDLE';
        this.currentRequest = null;
        if (this.onCompleteCallback) {
          this.onCompleteCallback();
          this.onCompleteCallback = undefined;
        }
      }
    }
  }

  /**
   * Desenha a cortina preta de blackout sobre a tela
   */
  public draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.alpha <= 0) return;

    ctx.save();
    ctx.fillStyle = `rgba(5, 8, 20, ${this.alpha})`;
    ctx.fillRect(0, 0, width, height);

    // Texto sutil da cena durante o fade
    if (this.currentRequest && this.alpha > 0.6) {
      const textAlpha = (this.alpha - 0.6) / 0.4;
      ctx.fillStyle = `rgba(0, 229, 255, ${textAlpha})`;
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      const sceneLabel =
        this.currentRequest.targetSceneId === 'interior_lab'
          ? 'ENTRANDO: LABORATÓRIO CENTRAL...'
          : this.currentRequest.targetSceneId === 'interior_library'
          ? 'ENTRANDO: BIBLIOTECA DE CÓDIGO...'
          : 'RETORNANDO AO OVERWORLD...';
      ctx.fillText(sceneLabel, width / 2, height / 2 + 10);
    }

    ctx.restore();
  }

  /**
   * Informa se os comandos de movimentação devem ser bloqueados
   */
  public isBlockingInput(): boolean {
    return this.state !== 'IDLE';
  }
}

/**
 * Cria a cena interna procedural do Laboratório Central de Algoritmos
 */
export function createLaboratoryInteriorScene(tileSize: number = 48): InteriorSceneData {
  const cols = 20; // 960px
  const rows = 14; // 672px
  const width = cols * tileSize;
  const height = rows * tileSize;

  // Renderiza piso quadriculado de laboratório tecnológico em canvas estático
  let bgImg: HTMLImageElement = {} as HTMLImageElement;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Fundo azul escuro metálico
      ctx.fillStyle = '#060B1A';
      ctx.fillRect(0, 0, width, height);

      // Piso quadriculado de alta tecnologia
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const isBorder = r === 0 || r === rows - 1 || c === 0 || c === cols - 1;
          const px = c * tileSize;
          const py = r * tileSize;

          if (isBorder) {
            ctx.fillStyle = '#101A33';
            ctx.fillRect(px, py, tileSize, tileSize);
            ctx.strokeStyle = '#1E293B';
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, tileSize, tileSize);
            // Faixa neon perimetral
            ctx.fillStyle = '#00E5FF';
            ctx.fillRect(px + 4, py + tileSize - 3, tileSize - 8, 2);
          } else {
            const alt = (r + c) % 2 === 0;
            ctx.fillStyle = alt ? '#091024' : '#0B142B';
            ctx.fillRect(px, py, tileSize, tileSize);
            ctx.strokeStyle = '#152038';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(px, py, tileSize, tileSize);
          }
        }
      }

      // Tapete central de recepção ciano
      ctx.fillStyle = 'rgba(0, 229, 255, 0.08)';
      ctx.fillRect(8 * tileSize, 3 * tileSize, 4 * tileSize, 8 * tileSize);
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(8 * tileSize, 3 * tileSize, 4 * tileSize, 8 * tileSize);

      // Mat de saída na porta inferior
      ctx.fillStyle = '#04D361';
      ctx.fillRect(9 * tileSize + 8, (rows - 1) * tileSize - 4, 2 * tileSize - 16, 4);

      bgImg = new Image();
      bgImg.src = canvas.toDataURL('image/png');
    }
  }

  const background = new Sprite({
    position: { x: 0, y: 0 },
    image: bgImg,
  });

  // Boundaries de perímetro do laboratório
  const boundaries: Boundary[] = [];
  for (let c = 0; c < cols; c++) {
    // Teto
    boundaries.push(
      new Boundary({
        position: { x: c * tileSize, y: 0 },
        type: 'solid',
        id: `lab_wall_t_${c}`,
      })
    );
    // Chão (exceto vão da porta na coluna 9 e 10)
    if (c !== 9 && c !== 10) {
      boundaries.push(
        new Boundary({
          position: { x: c * tileSize, y: (rows - 1) * tileSize },
          type: 'solid',
          id: `lab_wall_b_${c}`,
        })
      );
    }
  }
  for (let r = 1; r < rows - 1; r++) {
    boundaries.push(
      new Boundary({
        position: { x: 0, y: r * tileSize },
        type: 'solid',
        id: `lab_wall_l_${r}`,
      })
    );
    boundaries.push(
      new Boundary({
        position: { x: (cols - 1) * tileSize, y: r * tileSize },
        type: 'solid',
        id: `lab_wall_r_${r}`,
      })
    );
  }

  // Bancadas centrais do laboratório
  const benches = [
    { col: 4, row: 4, cols: 3, rows: 2 },
    { col: 13, row: 4, cols: 3, rows: 2 },
    { col: 4, row: 8, cols: 3, rows: 2 },
    { col: 13, row: 8, cols: 3, rows: 2 },
  ];
  benches.forEach((bench, bIdx) => {
    for (let c = 0; c < bench.cols; c++) {
      for (let r = 0; r < bench.rows; r++) {
        boundaries.push(
          new Boundary({
            position: {
              x: (bench.col + c) * tileSize,
              y: (bench.row + r) * tileSize,
            },
            type: 'solid',
            id: `lab_bench_${bIdx}_${c}_${r}`,
          })
        );
      }
    }
  });

  // Props dentro do laboratório: Supercomputador Principal e Estações de Trabalho
  const props: InteractiveProp[] = [
    new InteractiveProp({
      id: 'lab_supercomputer_core',
      position: { x: 9 * tileSize + 12, y: 2 * tileSize },
      category: 'lesson',
      title: 'Supercomputador Quântico // Professor Turing',
      subtitle: 'Terminal Central do Laboratório',
      interactionPrompt: 'Consultar IA',
      data: { isLabCore: true },
    }),
    new InteractiveProp({
      id: 'lab_easter_egg_whiteboard',
      position: { x: 2 * tileSize, y: 2 * tileSize },
      category: 'easter_egg',
      title: 'Quadro Branco de Algoritmos',
      subtitle: 'P vs NP e anotações secretas',
      interactionPrompt: 'Ler Anotações',
      data: {
        dialogue: 'No quadro está escrito: "Se P = NP, você não precisa otimizar nada. Mas como não é, volte a refatorar!"',
      },
    }),
  ];

  // Porta de saída para o Overworld
  const exitDoor = new Boundary({
    position: { x: 9.5 * tileSize, y: (rows - 1) * tileSize - 8 },
    width: tileSize,
    height: tileSize,
    type: 'door',
    id: 'lab_exit_door',
    data: { targetScene: 'overworld' },
  });

  return {
    id: 'interior_lab',
    name: 'Laboratório Central de Algoritmos',
    widthTiles: cols,
    heightTiles: rows,
    tileSize,
    background,
    boundaries,
    props,
    exitDoor,
    defaultSpawn: { x: 9.5 * tileSize, y: (rows - 2) * tileSize },
  };
}
