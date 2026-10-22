import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JoinWaitlistDto, WAITLIST_TRACKS, WaitlistTrack } from './dto/join-waitlist.dto';

export interface JoinWaitlistResult {
  track: WaitlistTrack;
  /** Contagem REAL da trilha depois da operação (linha da tabela). */
  count: number;
  /** true quando o e-mail já estava na lista desta trilha. */
  alreadyOnList: boolean;
}

// Sprint 16 (Ciclo 10/10 · P2/B49) — lista de espera por trilha.
// Entrar na lista é idempotente: o mesmo e-mail na mesma trilha não
// duplica (unique composto) nem erra — responde alreadyOnList com a
// contagem corrente. O contador público é a contagem da tabela, sem
// nenhum ajuste: zero é zero.
@Injectable()
export class WaitlistService {
  constructor(private readonly prisma: PrismaService) {}

  async join(dto: JoinWaitlistDto): Promise<JoinWaitlistResult> {
    const email = dto.email.trim().toLowerCase();
    const track = dto.track;

    const existing = await this.prisma.trackWaitlistEntry.findUnique({
      where: { email_track: { email, track } },
    });

    let alreadyOnList = existing !== null;
    if (!existing) {
      try {
        await this.prisma.trackWaitlistEntry.create({ data: { email, track } });
      } catch (err) {
        // Corrida entre a leitura e a escrita: outro request gravou o
        // mesmo par (email, track) primeiro — o resultado honesto é
        // "já estava na lista", não um 500.
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          alreadyOnList = true;
        } else {
          throw err;
        }
      }
    }

    const count = await this.prisma.trackWaitlistEntry.count({ where: { track } });
    return { track, count, alreadyOnList };
  }

  /** Contagem pública por trilha — todas as trilhas, inclusive as de contagem zero. */
  async counts(): Promise<Record<WaitlistTrack, number>> {
    const grouped = await this.prisma.trackWaitlistEntry.groupBy({
      by: ['track'],
      _count: { _all: true },
    });
    const byTrack = new Map<string, number>(
      grouped.map((row) => [row.track, row._count._all]),
    );
    const result = {} as Record<WaitlistTrack, number>;
    for (const track of WAITLIST_TRACKS) {
      result[track] = byTrack.get(track) ?? 0;
    }
    return result;
  }
}
