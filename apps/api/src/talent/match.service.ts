import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TalentProfileService, candidateIdFor, getInitials } from './talent-profile.service';

/**
 * Fase 4 premium (desenho §5.1) — match determinístico, sem ML, sem
 * serviço externo.
 *
 * score = (skills comprovadas ∩ skills da vaga) / skills da vaga,
 * ponderado pelo nível: aluno no nível da vaga ou acima = 1,0; um nível
 * abaixo = 0,8; dois ou mais abaixo = 0,5. O aluno vê o score EXPLICADO
 * (quais skills batem, quais faltam) — nunca um número opaco.
 * A empresa vê perfis anonimizados no padrão `cand_` já usado pelo
 * leaderboard de talentos, e nunca recebe e-mail ou nome completo.
 */

const TIER_RANK: Record<string, number> = {
  beginner: 0,
  junior: 1,
  mid: 2,
  senior: 3,
};

export interface MatchResult {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export function computeMatch(
  skillsProven: string[],
  jobSkills: string[],
  studentTier: string,
  jobLevel: string,
): MatchResult {
  const proven = new Set(skillsProven.map((s) => s.trim().toLowerCase()).filter(Boolean));
  const wanted = [...new Set(jobSkills.map((s) => s.trim().toLowerCase()).filter(Boolean))];
  const matchedSkills = wanted.filter((skill) => proven.has(skill));
  const missingSkills = wanted.filter((skill) => !proven.has(skill));
  const base = wanted.length === 0 ? 0 : matchedSkills.length / wanted.length;
  const diff = (TIER_RANK[studentTier] ?? 0) - (TIER_RANK[jobLevel] ?? 0);
  const weight = diff >= 0 ? 1 : diff === -1 ? 0.8 : 0.5;
  return {
    score: Math.round(base * weight * 100) / 100,
    matchedSkills,
    missingSkills,
  };
}

@Injectable()
export class MatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: TalentProfileService,
  ) {}

  /** Vagas compatíveis do aluno, com score explicado (score > 0). */
  async matchesForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { careerTier: true },
    });
    if (!user) return [];
    // Fase 4 fix D3 — derivar SEMPRE na leitura: o valor armazenado em
    // TalentProfile.skillsProven só é recalculado no refresh manual ou
    // na criação do perfil, então usá-lo aqui exibia matches defasados
    // após nova atividade aprovada. A derivação é a mesma query de
    // submissões `passed` que o fallback já fazia quando não havia
    // perfil — custo de leitura inalterado em ordem de grandeza, sem
    // semântica nova: /vagas (que consome este método) nunca é defasada.
    const skillsProven = await this.profiles.deriveProvenSkills(userId);
    const now = new Date();
    const jobs = await this.prisma.jobPosting.findMany({
      where: { expiresAt: { gt: now } },
      orderBy: { postedAt: 'desc' },
    });
    return jobs
      .map((job) => ({
        job: {
          id: job.id,
          title: job.title,
          skills: job.skills,
          level: job.level,
          source: job.source,
          externalUrl: job.externalUrl,
          postedAt: job.postedAt,
          expiresAt: job.expiresAt,
        },
        match: computeMatch(skillsProven, job.skills, user.careerTier, job.level),
      }))
      .filter((entry) => entry.match.score > 0)
      .sort((a, b) => b.match.score - a.match.score || b.job.postedAt.getTime() - a.job.postedAt.getTime());
  }

  /**
   * Candidatos para a empresa (token). Filtro duplo de consentimento:
   * `TalentProfile.visible` E `User.talentVisible`. `level` aqui é o
   * nível de carreira do aluno (beginner | junior | mid | senior).
   * Saída anonimizada — sem e-mail, sem nome completo, sem userId.
   */
  async candidatesForCompany(filters: { skill?: string; level?: string }) {
    const profiles = await this.prisma.talentProfile.findMany({
      where: {
        visible: true,
        user: { talentVisible: true },
      },
      include: {
        user: { select: { id: true, name: true, careerTier: true, xp: true, level: true } },
      },
      orderBy: [{ spotlight: 'desc' }, { userId: 'asc' }],
    });
    const skill = filters.skill?.trim().toLowerCase();
    const level = filters.level?.trim().toLowerCase();
    return profiles
      .filter((profile) => {
        if (level && profile.user.careerTier !== level) return false;
        if (skill && !profile.skillsProven.some((s) => s.toLowerCase() === skill)) return false;
        return true;
      })
      .map((profile) => ({
        candidateId: candidateIdFor(profile.user.id),
        initials: getInitials(profile.user.name),
        headline: profile.headline,
        skillsProven: profile.skillsProven,
        projectUrls: profile.projectUrls,
        spotlight: profile.spotlight,
        careerTier: profile.user.careerTier,
        xp: profile.user.xp,
        level: profile.user.level,
      }));
  }
}
