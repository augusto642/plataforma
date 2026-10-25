import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementsService } from '../plans/entitlements.service';
import { UpdateTalentProfileDto } from './dto/talent-phase4.dto';

/**
 * Fase 4 premium (desenho §5.1) — perfil do aluno no Talent Match.
 *
 * Privacidade (LGPD) e consentimento:
 * - `visible=false` por padrão; o perfil só aparece para empresas quando
 *   `TalentProfile.visible=true` E `User.talentVisible=true` — desligar
 *   qualquer um dos dois remove o perfil de TODAS as listagens na hora
 *   (filtro, não deleção em lote);
 * - `updateMe({ visible })` espelha o valor nos dois campos, para o
 *   toggle do perfil e o toggle de settings nunca divergirem;
 * - `skillsProven` é DERIVADO (conceptTags de atividades com submissão
 *   `passed` + títulos de certificados emitidos, quando mapeáveis para
 *   tags — na v1, só conceptTags, para não inventar skill a partir de
 *   título livre). O DTO de update nem aceita o campo: o que o aluno
 *   enviar é ignorado, não persistido.
 * - Nenhuma resposta deste serviço inclui e-mail.
 */

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return `${first}${last}`.toUpperCase();
}

export function candidateIdFor(userId: string): string {
  return `cand_${userId.slice(0, 8)}`;
}

@Injectable()
export class TalentProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  /** Skills comprovadas, derivadas — sem persistir, para o match usar. */
  async deriveProvenSkills(userId: string): Promise<string[]> {
    const passed = await this.prisma.submission.findMany({
      where: { userId, status: 'passed' },
      select: { activity: { select: { conceptTags: true } } },
    });
    const counts = new Map<string, number>();
    for (const submission of passed) {
      for (const tag of submission.activity?.conceptTags ?? []) {
        const normalized = tag.trim().toLowerCase();
        if (!normalized) continue;
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
      }
    }
    // Mais comprovada primeiro; empate em ordem alfabética (determinístico).
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        talentVisible: true,
        careerTier: true,
        xp: true,
        level: true,
        talentProfile: true,
        certificates: {
          where: { revokedAt: null },
          select: { kind: true, title: true, issuedAt: true, code: true },
          orderBy: { issuedAt: 'desc' },
        },
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    const { talentProfile, certificates, ...rest } = user;
    return {
      ...rest,
      // Visibilidade efetiva: os dois consentimentos precisam estar ligados.
      effectivelyVisible: Boolean(talentProfile?.visible && user.talentVisible),
      profile: talentProfile,
      certificates,
    };
  }

  async updateMe(userId: string, dto: UpdateTalentProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, talentVisible: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    // Destaque é Carreira (matriz §1.1). assertFeature libera staff
    // (não são clientes do plano) e bloqueia free/Pro estudantes.
    if (dto.spotlight === true) {
      await this.entitlements.assertFeature(userId, 'talent-spotlight');
    }

    const existing = await this.prisma.talentProfile.findUnique({ where: { userId } });
    const profileData: Record<string, unknown> = {};
    if (dto.headline !== undefined) profileData.headline = dto.headline.trim() || null;
    if (dto.projectUrls !== undefined) profileData.projectUrls = dto.projectUrls;
    if (dto.spotlight !== undefined) profileData.spotlight = dto.spotlight;
    if (dto.visible !== undefined) profileData.visible = dto.visible;

    const profile = existing
      ? await this.prisma.talentProfile.update({ where: { userId }, data: profileData })
      : await this.prisma.talentProfile.create({
          data: {
            userId,
            headline: (profileData.headline as string | null) ?? null,
            skillsProven: await this.deriveProvenSkills(userId),
            projectUrls: (profileData.projectUrls as string[]) ?? [],
            spotlight: (profileData.spotlight as boolean) ?? false,
            visible: (profileData.visible as boolean) ?? false,
          },
        });

    // Espelho do consentimento: o toggle do perfil e o de settings andam juntos.
    if (dto.visible !== undefined && dto.visible !== user.talentVisible) {
      await this.prisma.user.update({ where: { id: userId }, data: { talentVisible: dto.visible } });
    }
    return profile;
  }

  /** Recalcula `skillsProven` a partir das provas (submissões passed). */
  async refreshProvenSkills(userId: string) {
    const skillsProven = await this.deriveProvenSkills(userId);
    const profile = await this.prisma.talentProfile.upsert({
      where: { userId },
      create: { userId, skillsProven, projectUrls: [] },
      update: { skillsProven },
    });
    return profile;
  }
}
