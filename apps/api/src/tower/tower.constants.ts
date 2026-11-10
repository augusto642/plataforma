/**
 * Constantes da Torre de Desafios (Fases 0–1).
 *
 * O limite diário é uma PROPOSTA (5 grátis / 10 assinante) e está aqui como
 * constante configurável — para trocar, altere TOWER_FREE_DAILY_MOVES /
 * TOWER_PRO_DAILY_MOVES neste arquivo. Nada mais no código usa o número 5/10
 * diretamente.
 */

export const TOWER_SQUARES_PER_FLOOR = 30;

/** Jogadas por dia no plano grátis (proposta — ver comentário acima). */
export const TOWER_FREE_DAILY_MOVES = 5;

/** Jogadas por dia para assinante (User.plan = 'pro'). */
export const TOWER_PRO_DAILY_MOVES = 10;

export type TowerPlan = 'free' | 'pro';

/** Último andar jogável por nível (careerTier). Iniciante 1–30, Júnior 31–65,
 *  Pleno 66–100 (o chefe do andar 30 é o fim do grátis; o do 100, o fim da torre). */
export const TOWER_MAX_FLOOR_BY_TIER: Record<string, number> = {
  beginner: 30,
  junior: 65,
  mid: 100,
  senior: 100,
};

export type TowerSquareType = 'code' | 'quiz' | 'minigame' | 'item' | 'final';

export type TowerDifficulty = 'easy' | 'medium' | 'hard' | 'guardian';

/** Tempo limite do desafio da casa, em segundos (proposta do conceito).
 *  O guardião (casa 30) tem 7 min; o chefe (a cada 10 andares, Fase 3) terá 10 min. */
export const TOWER_TIME_LIMIT_SECONDS_BY_DIFFICULTY: Record<TowerDifficulty, number> = {
  easy: 90,
  medium: 180,
  hard: 300,
  guardian: 420,
};

/** Slug do curso que guarda as atividades da torre (criado pelo seed). */
export const TOWER_COURSE_SLUG = 'torre-de-desafios';

/** XP da torre na Fase 1: reusa a regra do GamificationService
 *  (70 passou / 20 errou / +50 nota 100). A tabela por dificuldade
 *  (fácil 30 / médio 50 / difícil 80 / chefe 150) é proposta do conceito
 *  e fica para a Fase 3. */
export const TOWER_XP_NOTE =
  'Fase 1 reusa GamificationService.awardSubmissionXp (70/20/+50).';
