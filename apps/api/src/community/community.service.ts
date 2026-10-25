import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Sinalização automática v1 (desenho §4.2): lista fechada de termos de
 * spam/abuso. Ela só SINALIZA para a fila admin — nunca bloqueia
 * conteúdo sozinha (a decisão de moderação é humana). Lista curta de
 * propósito: falso positivo aqui enterra discussão legítima.
 */
export const AUTO_FLAG_TERMS = [
  'ganhe dinheiro fácil',
  'dinheiro fácil',
  'compre agora',
  'clique aqui e ganhe',
  'renda extra garantida',
  'promoção imperdível',
];

export function autoFlagged(body: string): boolean {
  const normalized = body.toLowerCase();
  return AUTO_FLAG_TERMS.some((term) => normalized.includes(term));
}

/** Limiar de reputação: a partir daqui o revisor ganha o badge. */
export const PEER_REVIEWER_BADGE_THRESHOLD = 5;
export const PEER_REVIEWER_BADGE = 'peer_reviewer';

/**
 * Fase 3 premium (desenho §4.2) — comunidade pequena de propósito:
 * comentários + reputação sobre projetos existentes, não uma rede
 * social paralela.
 *
 * Gates (matriz §1.1): ler é livre para todo aluno autenticado;
 * postar, comentar e compartilhar exigem `community-post`
 * (Pro/Carreira; staff passa direto). Sinalizar é livre (qualquer
 * aluno pode pedir moderação de um post).
 *
 * Segurança da galeria (risco §4.3-d): só submissões APROVADAS entram,
 * só o `codeSnapshot` do autor é exibido — nunca `testCode` ou
 * `hiddenTests` da Activity, nunca o `referenceSolution`.
 */
@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------ fórum

  /** Tópico do desafio da semana — nasce junto com o desafio (§4.2). */
  async createChallengeThread(
    adminId: string,
    challenge: { id: string; title: string; activityId: string; startsAt: Date; endsAt: Date },
  ) {
    return this.prisma.forumThread.create({
      data: {
        activityId: challenge.activityId,
        authorId: adminId,
        title: `Desafio da semana: ${challenge.title}`,
        body:
          `Discussão oficial do desafio "${challenge.title}". ` +
          `Vale de ${challenge.startsAt.toISOString()} até ${challenge.endsAt.toISOString()}. ` +
          `Participe pelo desafio da semana, compartilhe sua solução aprovada na galeria ` +
          `e peça revisão por pares — sem colar a solução pronta antes de tentar.`,
      },
    });
  }

  async listThreads(activityId?: string) {
    return this.prisma.forumThread.findMany({
      where: activityId ? { activityId } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, nickname: true } },
        _count: { select: { posts: true } },
      },
    });
  }

  async createThread(authorId: string, title: string, body: string, activityId?: string) {
    if (activityId) {
      const activity = await this.prisma.activity.findUnique({
        where: { id: activityId },
        select: { id: true },
      });
      if (!activity) throw new NotFoundException('Atividade não encontrada');
    }
    return this.prisma.forumThread.create({
      data: { authorId, title, body, activityId: activityId ?? null },
    });
  }

  async listPosts(threadId: string) {
    const thread = await this.prisma.forumThread.findUnique({
      where: { id: threadId },
      select: { id: true },
    });
    if (!thread) throw new NotFoundException('Tópico não encontrado');
    return this.prisma.forumPost.findMany({
      where: { threadId, hidden: false },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, name: true, nickname: true } } },
    });
  }

  async createPost(authorId: string, threadId: string, body: string) {
    const thread = await this.prisma.forumThread.findUnique({
      where: { id: threadId },
      select: { id: true },
    });
    if (!thread) throw new NotFoundException('Tópico não encontrado');
    const flagged = autoFlagged(body);
    return this.prisma.forumPost.create({
      data: {
        threadId,
        authorId,
        body,
        flagged,
        flaggedAt: flagged ? new Date() : null,
      },
    });
  }

  /** Qualquer aluno autenticado pode sinalizar um post para moderação. */
  async flagPost(postId: string) {
    const post = await this.prisma.forumPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Post não encontrado');
    return this.prisma.forumPost.update({
      where: { id: postId },
      data: { flagged: true, flaggedAt: new Date() },
    });
  }

  // ---------------------------------------------------------- moderação

  /** Fila admin: só posts sinalizados e ainda não ocultados. */
  async flaggedQueue() {
    return this.prisma.forumPost.findMany({
      where: { flagged: true, hidden: false },
      orderBy: { flaggedAt: 'asc' },
      include: {
        author: { select: { id: true, name: true, nickname: true } },
        thread: { select: { id: true, title: true } },
      },
    });
  }

  /** Decisão humana: ocultar (sem apagar — o registro fica auditável). */
  async hidePost(postId: string) {
    const post = await this.prisma.forumPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Post não encontrado');
    return this.prisma.forumPost.update({
      where: { id: postId },
      data: { hidden: true },
    });
  }

  /** Decisão humana: a sinalização não procede — limpa a flag. */
  async clearFlag(postId: string) {
    const post = await this.prisma.forumPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Post não encontrado');
    return this.prisma.forumPost.update({
      where: { id: postId },
      data: { flagged: false, flaggedAt: null },
    });
  }

  // ------------------------------------------------------------ galeria

  /**
   * Compartilha a solução (opt-in do autor). Só submissão APROVADA e
   * só do próprio autor — staff pode compartilhar em nome do aluno
   * apenas se for o autor? Não: staff também só compartilha o próprio
   * código; a regra é do autor, sem exceção.
   */
  async shareSolution(userId: string, submissionId: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      select: { id: true, userId: true, status: true },
    });
    if (!submission) throw new NotFoundException('Submissão não encontrada');
    if (submission.userId !== userId) {
      throw new ForbiddenException('Você só pode compartilhar as suas próprias soluções.');
    }
    if (submission.status !== 'passed') {
      throw new ForbiddenException(
        'Só soluções aprovadas entram na galeria — finalize o projeto primeiro.',
      );
    }
    return this.prisma.solutionShare.upsert({
      where: { submissionId },
      create: { submissionId, userId, visible: true },
      update: { visible: true },
    });
  }

  async unshareSolution(userId: string, submissionId: string) {
    const share = await this.prisma.solutionShare.findUnique({
      where: { submissionId },
      select: { userId: true },
    });
    if (!share) throw new NotFoundException('Compartilhamento não encontrado');
    if (share.userId !== userId) {
      throw new ForbiddenException('Você só pode remover os seus próprios compartilhamentos.');
    }
    return this.prisma.solutionShare.update({
      where: { submissionId },
      data: { visible: false },
    });
  }

  /**
   * Galeria por atividade: só compartilhamentos visíveis, de soluções
   * aprovadas. Devolve `codeSnapshot` do autor — NUNCA testCode,
   * hiddenTests ou referenceSolution da Activity.
   */
  async listSolutions(activityId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true },
    });
    if (!activity) throw new NotFoundException('Atividade não encontrada');
    const shares = await this.prisma.solutionShare.findMany({
      where: {
        visible: true,
        submission: { activityId, status: 'passed' },
      },
      include: {
        user: { select: { id: true, name: true, nickname: true } },
        submission: { select: { id: true, codeSnapshot: true, score: true, createdAt: true } },
      },
      orderBy: { submission: { createdAt: 'desc' } },
    });
    return shares.map((s) => ({
      shareId: s.id,
      author: s.user,
      codeSnapshot: s.submission.codeSnapshot,
      score: s.submission.score,
      submittedAt: s.submission.createdAt,
    }));
  }

  // --------------------------------------------------------- reputação

  /**
   * Reputação do revisor (desenho §4.2): campo DERIVADO — contagem de
   * revisões por pares concluídas. Sem tabela nova na v1; o badge
   * usa a UserBadge existente quando atinge o limiar.
   */
  async reviewerReputation(userId: string) {
    const completedPeerReviews = await this.prisma.codeReview.count({
      where: { reviewerId: userId, kind: 'peer', status: 'completed' },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return {
      userId,
      completedPeerReviews,
      badgeThreshold: PEER_REVIEWER_BADGE_THRESHOLD,
      hasReviewerBadge: completedPeerReviews >= PEER_REVIEWER_BADGE_THRESHOLD,
      isStaff: user.role !== Role.student,
    };
  }
}
