/**
 * InteractiveProp.ts
 * NEXUS CODE - Canvas 2D Game Engine Interactive Props & Entities
 * 
 * Entidades e objetos interativos espalhados pelo mapa:
 * - Terminais de lições didáticas da Trilha Iniciante (5 computadores)
 * - Desafios opcionais não-lineares (3 totens/consoles de desafio)
 * - Baús e nós de Easter Eggs (3 segredos e curiosidades hacker)
 * - Portas de acesso a construções e interiores (Laboratório e Biblioteca)
 * - Zona de colisão AABB física e raio de ativação de interação por proximidade
 * - Balão holográfico animado por função senoidal [E] Interagir
 */

import { Boundary, Rect, rectangularCollision } from './Boundary';
import { Position } from './Sprite';

export type PropCategory = 'lesson' | 'challenge' | 'easter_egg' | 'door' | 'boss' | 'chest';

export interface InteractivePropOptions {
  id: string;
  position: Position;
  width?: number;
  height?: number;
  category: PropCategory;
  title: string;
  subtitle?: string;
  interactionPrompt?: string;
  interactionKey?: string;
  activationRadius?: number;
  isSolid?: boolean;
  data?: Record<string, unknown>;
  onInteract?: (prop: InteractiveProp) => void;
}

export class InteractiveProp extends Boundary {
  public override id: string;
  public category: PropCategory;
  public title: string;
  public subtitle?: string;
  public interactionPrompt: string;
  public interactionKey: string;
  public activationRadius: number;
  public isSolid: boolean;
  public isPlayerNearby: boolean = false;
  public onInteract?: (prop: InteractiveProp) => void;

  private animationTimer: number = Math.random() * 10;

  constructor({
    id,
    position,
    width = 48,
    height = 48,
    category,
    title,
    subtitle,
    interactionPrompt = 'Interagir',
    interactionKey = 'E',
    activationRadius = 64,
    isSolid = true,
    data = {},
    onInteract,
  }: InteractivePropOptions) {
    super({
      id,
      position,
      width,
      height,
      type: isSolid ? 'solid' : 'trigger',
      data: { ...data, category, title },
    });

    this.id = id;
    this.category = category;
    this.title = title;
    this.subtitle = subtitle;
    this.interactionPrompt = interactionPrompt;
    this.interactionKey = interactionKey;
    this.activationRadius = activationRadius;
    this.isSolid = isSolid;
    this.onInteract = onInteract;
  }

  /**
   * Avalia a proximidade euclidiana entre a hitbox do jogador e o centro do prop
   */
  public updateProximity(playerHitbox: Rect): boolean {
    const propCenterX = this.position.x + this.width / 2;
    const propCenterY = this.position.y + this.height / 2;
    const playerCenterX = playerHitbox.x + playerHitbox.width / 2;
    const playerCenterY = playerHitbox.y + playerHitbox.height / 2;

    const dist = Math.hypot(propCenterX - playerCenterX, propCenterY - playerCenterY);
    this.isPlayerNearby = dist <= this.activationRadius;
    return this.isPlayerNearby;
  }

  /**
   * Ticks de animação interna do prop
   */
  public update(deltaFactor: number = 1): void {
    this.animationTimer += 0.05 * deltaFactor;
  }

  /**
   * Retorna a chave de ordenação de profundidade (Y-Sorting)
   */
  public getSortKey(): number {
    return this.position.y + this.height;
  }

  /**
   * Renderização visual procedural pixel-art do prop no mundo
   */
  public override draw(ctx: CanvasRenderingContext2D): void {
    const x = Math.round(this.position.x);
    const y = Math.round(this.position.y);
    const w = this.width;
    const h = this.height;

    ctx.save();

    // Sombra oval no chão para props sólidos
    if (this.isSolid) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h - 3, w * 0.42, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    switch (this.category) {
      case 'lesson':
        this.drawComputerTerminal(ctx, x, y, w, h);
        break;
      case 'challenge':
        this.drawChallengeTotem(ctx, x, y, w, h);
        break;
      case 'easter_egg':
        this.drawEasterEggNode(ctx, x, y, w, h);
        break;
      case 'door':
        this.drawBuildingDoor(ctx, x, y, w, h);
        break;
      case 'boss':
        this.drawBossPillar(ctx, x, y, w, h);
        break;
      default:
        this.drawGenericProp(ctx, x, y, w, h);
    }

    // Balão flutuante animado com senoide quando o jogador estiver próximo
    if (this.isPlayerNearby) {
      this.drawFloatingPrompt(ctx, x + w / 2, y);
    }

    ctx.restore();
  }

  /**
   * Renderiza Terminal / Computador da Trilha de Lições
   */
  private drawComputerTerminal(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    // Gabinete tecnológico Dark Obsidian
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2;
    ctx.fillRect(x + 6, y + 8, w - 12, h - 12);
    ctx.strokeRect(x + 6, y + 8, w - 12, h - 12);

    // Tela CRT com brilho dourado (#FACC15 / #FFA116)
    const screenGlow = (Math.sin(this.animationTimer * 2) + 1) * 0.15 + 0.7;
    ctx.fillStyle = `rgba(250, 204, 21, ${screenGlow * 0.25})`;
    ctx.fillRect(x + 10, y + 12, w - 20, h - 26);
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 10, y + 12, w - 20, h - 26);

    // Linhas de código animadas na tela
    ctx.fillStyle = '#FACC15';
    const lines = 3;
    for (let i = 0; i < lines; i++) {
      const lineW = ((i + Math.floor(this.animationTimer)) % 3 + 2) * 4;
      ctx.fillRect(x + 13, y + 16 + i * 5, lineW, 2);
    }

    // Teclado na base
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(x + 12, y + h - 11, w - 24, 4);

    // Led frontal
    ctx.fillStyle = '#04D361';
    ctx.fillRect(x + w - 14, y + h - 10, 2, 2);
  }

  /**
   * Renderiza Totem de Desafio Opcional Não-Linear
   */
  private drawChallengeTotem(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    // Base metálica
    ctx.fillStyle = '#181124';
    ctx.strokeStyle = '#8257E5';
    ctx.lineWidth = 2;
    ctx.fillRect(x + 8, y + 10, w - 16, h - 12);
    ctx.strokeRect(x + 8, y + 10, w - 16, h - 12);

    // Núcleo holográfico pulsante violeta
    const pulse = (Math.sin(this.animationTimer * 3) + 1) / 2;
    ctx.fillStyle = '#C084FC';
    ctx.shadowColor = '#8257E5';
    ctx.shadowBlur = 8 + pulse * 6;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2 - 2, 7 + pulse * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Glifos ao redor
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('{?}', x + w / 2, y + h / 2 + 1);
  }

  /**
   * Renderiza Baú / Nó de Easter Egg (Rubber duck, VT100, etc.)
   */
  private drawEasterEggNode(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    if (this.id && String(this.id).includes('rubber_duck')) {
      // Pato de borracha holográfico dourado/amarelo
      ctx.fillStyle = '#FBBF24';
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 6;
      // Corpo do pato
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2 + 4, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Cabeça
      ctx.beginPath();
      ctx.arc(x + w / 2 + 5, y + h / 2 - 3, 6, 0, Math.PI * 2);
      ctx.fill();
      // Bico laranja
      ctx.fillStyle = '#F97316';
      ctx.fillRect(x + w / 2 + 10, y + h / 2 - 3, 4, 3);
      ctx.shadowBlur = 0;
    } else {
      // Baú cibernético verde esmeralda (#04D361)
      ctx.fillStyle = '#061D13';
      ctx.strokeStyle = '#04D361';
      ctx.lineWidth = 1.5;
      ctx.fillRect(x + 10, y + 14, w - 20, h - 18);
      ctx.strokeRect(x + 10, y + 14, w - 20, h - 18);

      // Faixa central com brilho
      ctx.fillStyle = '#04D361';
      ctx.fillRect(x + 10, y + 22, w - 20, 2);
      ctx.fillRect(x + w / 2 - 2, y + 20, 4, 6);
    }
  }

  /**
   * Renderiza Porta de Construção (Entrada de Laboratório ou Biblioteca)
   */
  private drawBuildingDoor(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    // Portal pneumático em arco tecnológico
    ctx.fillStyle = '#0B132B';
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 4, w - 8, h - 4, [8, 8, 0, 0]);
    ctx.fill();
    ctx.stroke();

    // Faixas luminosas direcionais para dentro da porta
    const flow = (this.animationTimer * 20) % 16;
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 12 + flow);
    ctx.lineTo(x + w / 2, y + 6 + flow);
    ctx.lineTo(x + w - 8, y + 12 + flow);
    ctx.stroke();

    // Símbolo da porta
    ctx.fillStyle = '#00E5FF';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ENTER', x + w / 2, y + h - 8);
  }

  /**
   * Renderiza Pilar do Boss Hexagonal
   */
  private drawBossPillar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    ctx.fillStyle = '#210813';
    ctx.strokeStyle = '#F43F5E';
    ctx.lineWidth = 2;
    ctx.fillRect(x + 8, y + 4, w - 16, h - 6);
    ctx.strokeRect(x + 8, y + 4, w - 16, h - 6);

    ctx.fillStyle = '#F43F5E';
    ctx.shadowColor = '#F43F5E';
    ctx.shadowBlur = 10;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BOSS', x + w / 2, y + h / 2 + 3);
    ctx.shadowBlur = 0;
  }

  private drawGenericProp(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
  }

  /**
   * Desenha balão holográfico animado com senoide [E] Interagir sobre o prop
   */
  private drawFloatingPrompt(ctx: CanvasRenderingContext2D, centerX: number, topY: number): void {
    // Oscilação vertical por onda senoidal (bobbing)
    const bob = Math.sin(this.animationTimer * 4) * 3;
    const promptY = topY - 14 + bob;

    const labelText = `[${this.interactionKey}] ${this.interactionPrompt}`;
    ctx.font = 'bold 9px monospace';
    const textMetrics = ctx.measureText(labelText);
    const boxW = Math.max(76, textMetrics.width + 16);
    const boxH = 18;

    ctx.save();
    // Fundo do balão com backdrop escuro e borda ciano/dourado
    const accentColor =
      this.category === 'lesson'
        ? '#FACC15'
        : this.category === 'challenge'
        ? '#C084FC'
        : this.category === 'easter_egg'
        ? '#04D361'
        : '#00E5FF';

    ctx.fillStyle = '#060D1FEE';
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 6;

    ctx.beginPath();
    ctx.roundRect(centerX - boxW / 2, promptY - boxH, boxW, boxH, 5);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Pequena seta apontando para baixo
    ctx.fillStyle = '#060D1FEE';
    ctx.beginPath();
    ctx.moveTo(centerX - 4, promptY);
    ctx.lineTo(centerX + 4, promptY);
    ctx.lineTo(centerX, promptY + 4);
    ctx.closePath();
    ctx.fill();

    // Texto do atalho
    ctx.fillStyle = accentColor;
    ctx.textAlign = 'center';
    ctx.fillText(labelText, centerX, promptY - 6);

    ctx.restore();
  }
}

/**
 * Fábrica padronizada de props distribuídos no mapa inicial (Circuit Valley)
 */
export function createDefaultInteractiveProps(tileSize: number = 48): InteractiveProp[] {
  return [
    // -------------------------------------------------------------
    // 1. 5 COMPUTADORES / TERMINAIS DA TRILHA INICIANTE
    // -------------------------------------------------------------
    new InteractiveProp({
      id: 'term_lesson_01',
      position: { x: 10 * tileSize, y: 8 * tileSize },
      category: 'lesson',
      title: 'Terminal 01: Variáveis & Tipos',
      subtitle: 'Trilha Iniciante - Aula 1',
      interactionPrompt: 'Acessar Lição 1',
      data: { lessonId: 'lesson-vars-and-types', trackOrder: 1 },
    }),
    new InteractiveProp({
      id: 'term_lesson_02',
      position: { x: 18 * tileSize, y: 6 * tileSize },
      category: 'lesson',
      title: 'Terminal 02: Condicionais & Fluxo',
      subtitle: 'Trilha Iniciante - Aula 2',
      interactionPrompt: 'Acessar Lição 2',
      data: { lessonId: 'lesson-conditionals', trackOrder: 2 },
    }),
    new InteractiveProp({
      id: 'term_lesson_03',
      position: { x: 26 * tileSize, y: 8 * tileSize },
      category: 'lesson',
      title: 'Terminal 03: Loops & Iteradores',
      subtitle: 'Trilha Iniciante - Aula 3',
      interactionPrompt: 'Acessar Lição 3',
      data: { lessonId: 'lesson-loops', trackOrder: 3 },
    }),
    new InteractiveProp({
      id: 'term_lesson_04',
      position: { x: 12 * tileSize, y: 15 * tileSize },
      category: 'lesson',
      title: 'Terminal 04: Funções & Escopo',
      subtitle: 'Trilha Iniciante - Aula 4',
      interactionPrompt: 'Acessar Lição 4',
      data: { lessonId: 'lesson-functions', trackOrder: 4 },
    }),
    new InteractiveProp({
      id: 'term_lesson_05',
      position: { x: 24 * tileSize, y: 15 * tileSize },
      category: 'lesson',
      title: 'Terminal 05: Arrays & Coleções',
      subtitle: 'Trilha Iniciante - Aula 5',
      interactionPrompt: 'Acessar Lição 5',
      data: { lessonId: 'lesson-arrays', trackOrder: 5 },
    }),

    // -------------------------------------------------------------
    // 2. 3 DESAFIOS NÃO-LINEARES OPCIONAIS
    // -------------------------------------------------------------
    new InteractiveProp({
      id: 'opt_challenge_regex',
      position: { x: 6 * tileSize, y: 18 * tileSize },
      category: 'challenge',
      title: 'Totem: Decodificador Regex',
      subtitle: 'Desafio Opcional // Recompensa: +80 Bits & Aura Neon',
      interactionPrompt: 'Desafio Regex',
      data: { challengeId: 'challenge_regex_matrix', bitsReward: 80 },
    }),
    new InteractiveProp({
      id: 'opt_challenge_deadlock',
      position: { x: 32 * tileSize, y: 6 * tileSize },
      category: 'challenge',
      title: 'Terminal: Deadlock Disentangler',
      subtitle: 'Desafio Opcional // Recompensa: Badge Thread Safe & +120 Bits',
      interactionPrompt: 'Desafio Concorrência',
      data: { challengeId: 'challenge_deadlock_solver', bitsReward: 120 },
    }),
    new InteractiveProp({
      id: 'opt_challenge_dijkstra',
      position: { x: 34 * tileSize, y: 18 * tileSize },
      category: 'challenge',
      title: 'Nó Quântico: Dijkstra Pathfinder',
      subtitle: 'Desafio Opcional // Recompensa: Skill A* Pathfinder Strike',
      interactionPrompt: 'Desafio Algoritmo',
      data: { challengeId: 'challenge_dijkstra_node', skillUnlock: 'skill_pathfinder' },
    }),

    // -------------------------------------------------------------
    // 3. 3 EASTER EGGS COM SEGREDOS E CURIOSIDADES
    // -------------------------------------------------------------
    new InteractiveProp({
      id: 'egg_rubber_duck',
      position: { x: 4 * tileSize, y: 20 * tileSize },
      category: 'easter_egg',
      title: 'Rubber Duck Sagrado // Mentor Socrático',
      subtitle: 'Easter Egg: Técnica milenar de debugging',
      interactionPrompt: 'Quack!',
      data: {
        eggType: 'rubber_duck',
        dialogue: 'Quack! Antes de culpar o compilador, explique seu algoritmo em voz alta para mim linha a linha!',
      },
    }),
    new InteractiveProp({
      id: 'egg_unix_1970',
      position: { x: 36 * tileSize, y: 4 * tileSize },
      category: 'easter_egg',
      title: 'Terminal UNIX 1970 // Epoch Genesis',
      subtitle: 'Easter Egg: 00:00:00 UTC, 1 de Janeiro de 1970',
      interactionPrompt: 'Ler Terminal',
      data: {
        eggType: 'unix_epoch',
        dialogue: 'Você descobriu o marco zero do tempo nos computadores. +50 Bits de arqueologia de software!',
        bitsReward: 50,
      },
    }),
    new InteractiveProp({
      id: 'egg_linus_kernel',
      position: { x: 20 * tileSize, y: 20 * tileSize },
      category: 'easter_egg',
      title: 'Monólito Git // Commit Zero',
      subtitle: 'Easter Egg: "Initial commit of Linux 0.01"',
      interactionPrompt: 'Inspecionar',
      data: {
        eggType: 'git_commit_zero',
        dialogue: 'git log --oneline: "Just a hobby, won\'t be big and professional like gnu". O resto é história!',
      },
    }),

    // -------------------------------------------------------------
    // 4. PORTAS DE ENTRADA PARA LABORATÓRIO E BIBLIOTECA
    // -------------------------------------------------------------
    new InteractiveProp({
      id: 'door_lab_central',
      position: { x: 20 * tileSize, y: 3 * tileSize },
      category: 'door',
      title: 'Laboratório Central de Algoritmos',
      subtitle: 'Construção Indoor // Mentoria e Banco de Testes',
      interactionPrompt: 'Entrar no Lab',
      data: { targetScene: 'interior_lab', spawnCol: 10, spawnRow: 11 },
    }),
    new InteractiveProp({
      id: 'door_library_docs',
      position: { x: 20 * tileSize, y: 21 * tileSize },
      category: 'door',
      title: 'Biblioteca de Documentação',
      subtitle: 'Construção Indoor // Acervo de RFCs e Design Patterns',
      interactionPrompt: 'Entrar na Biblioteca',
      data: { targetScene: 'interior_library', spawnCol: 8, spawnRow: 9 },
    }),
  ];
}
