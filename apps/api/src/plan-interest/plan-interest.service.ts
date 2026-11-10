import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  INTEREST_PLANS,
  InterestBillingCycle,
  InterestPlan,
  RegisterPlanInterestDto,
} from './dto/register-plan-interest.dto';
import { JoinPlanInterestLeadDto } from './dto/join-plan-interest-lead.dto';

export interface PlanInterestView {
  plan: InterestPlan;
  billingCycle: InterestBillingCycle | null;
  createdAt: Date;
}

export interface RegisterPlanInterestResult extends PlanInterestView {
  /** true quando já existia um registro para o usuário antes desta chamada. */
  alreadyRegistered: boolean;
}

export interface JoinPlanInterestLeadResult {
  plan: InterestPlan;
  /** Contagem pública TOTAL do plano depois da operação (conta + e-mail). */
  count: number;
  /** true quando o e-mail já estava na lista de interessados. */
  alreadyOnList: boolean;
}

// Sprint 17 (Ciclo 10/10 · Volta 2/B54) — destino real da intenção de
// plano. A cobrança dos planos pagos ainda NÃO está ativa: registrar
// a intenção é entrar na LISTA DE INTERESSADOS do plano, com o único
// compromisso de avisar quando a cobrança abrir. Um registro por
// usuário (unique em user_id): repetir a mesma intenção é idempotente;
// uma intenção nova SUBSTITUI a anterior (o interesse corrente é o
// último plano escolhido). O contador público é a contagem real da
// tabela, sem nenhum ajuste: zero é zero.
@Injectable()
export class PlanInterestService {
  constructor(private readonly prisma: PrismaService) {}

  private async registerAccountInterest(
    userId: string,
    dto: RegisterPlanInterestDto,
  ): Promise<RegisterPlanInterestResult> {
    const plan = dto.plan;
    const billingCycle = dto.billingCycle ?? null;

    const existing = await this.prisma.planInterest.findUnique({
      where: { userId },
    });

    if (existing) {
      // Mesma intenção de novo: nada a escrever. Intenção diferente:
      // o interesse corrente passa a ser o último plano escolhido.
      if (existing.plan !== plan || existing.billingCycle !== billingCycle) {
        const updated = await this.prisma.planInterest.update({
          where: { userId },
          data: { plan, billingCycle },
        });
        return {
          plan: updated.plan as InterestPlan,
          billingCycle: updated.billingCycle as InterestBillingCycle | null,
          createdAt: updated.createdAt,
          alreadyRegistered: true,
        };
      }
      return {
        plan: existing.plan as InterestPlan,
        billingCycle: existing.billingCycle as InterestBillingCycle | null,
        createdAt: existing.createdAt,
        alreadyRegistered: true,
      };
    }

    try {
      const created = await this.prisma.planInterest.create({
        data: { userId, plan, billingCycle },
      });
      return {
        plan: created.plan as InterestPlan,
        billingCycle: created.billingCycle as InterestBillingCycle | null,
        createdAt: created.createdAt,
        alreadyRegistered: false,
      };
    } catch (err) {
      // Corrida entre a leitura e a escrita: outro request do mesmo
      // usuário registrou primeiro — o resultado honesto é "já
      // registrado" com o registro que venceu, não um 500.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const winner = await this.prisma.planInterest.findUnique({
          where: { userId },
        });
        if (winner) {
          return {
            plan: winner.plan as InterestPlan,
            billingCycle: winner.billingCycle as InterestBillingCycle | null,
            createdAt: winner.createdAt,
            alreadyRegistered: true,
          };
        }
      }
      throw err;
    }
  }

  /** Registro do próprio usuário — a confirmação persistente da lista. */
  async getMine(userId: string): Promise<PlanInterestView | null> {
    const found = await this.prisma.planInterest.findUnique({
      where: { userId },
    });
    if (!found) return null;
    return {
      plan: found.plan as InterestPlan,
      billingCycle: found.billingCycle as InterestBillingCycle | null,
      createdAt: found.createdAt,
    };
  }

  /**
   * Registro autenticado (intenção pós-cadastro/login). Além de gravar
   * o registro da conta, VINCULA a captura pública: se existia um lead
   * com o e-mail do usuário, ele é removido — o registro da conta
   * prevalece e a contagem pública não conta a pessoa duas vezes.
   */
  async register(
    userId: string,
    dto: RegisterPlanInterestDto,
  ): Promise<RegisterPlanInterestResult> {
    const result = await this.registerAccountInterest(userId, dto);
    await this.linkLeadToAccount(userId);
    return result;
  }

  private async linkLeadToAccount(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user?.email) return;
    await this.prisma.planInterestLead.deleteMany({
      where: { email: user.email.trim().toLowerCase() },
    });
  }

  /**
   * Captura pública só-e-mail (B71) — o espelho da waitlist para a
   * lista de interessados: um lead por e-mail (unique), idempotente
   * na repetição e substituído por uma intenção nova, exatamente como
   * o registro por conta. A contagem devolvida é a pública total do
   * plano (leads + registros de conta).
   */
  async registerLead(
    dto: JoinPlanInterestLeadDto,
  ): Promise<JoinPlanInterestLeadResult> {
    const email = dto.email.trim().toLowerCase();
    const plan = dto.plan;
    const billingCycle = dto.billingCycle ?? null;

    const existing = await this.prisma.planInterestLead.findUnique({
      where: { email },
    });

    let alreadyOnList = existing !== null;
    if (!existing) {
      try {
        await this.prisma.planInterestLead.create({
          data: { email, plan, billingCycle },
        });
      } catch (err) {
        // Corrida entre a leitura e a escrita: outro request gravou o
        // mesmo e-mail primeiro — o resultado honesto é "já estava na
        // lista", não um 500 (mesmo padrão da waitlist).
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          alreadyOnList = true;
        } else {
          throw err;
        }
      }
    } else if (existing.plan !== plan || existing.billingCycle !== billingCycle) {
      // Intenção nova do mesmo e-mail: o interesse corrente é o último
      // plano escolhido (a linha passa a valer pelo novo plano).
      await this.prisma.planInterestLead.update({
        where: { email },
        data: { plan, billingCycle },
      });
    }

    const count = await this.countForPlan(plan);
    return { plan, count, alreadyOnList };
  }

  /** Total público de interessados de um plano: leads + registros de conta. */
  private async countForPlan(plan: InterestPlan): Promise<number> {
    const [leads, accounts] = await Promise.all([
      this.prisma.planInterestLead.count({ where: { plan } }),
      this.prisma.planInterest.count({ where: { plan } }),
    ]);
    return leads + accounts;
  }

  /**
   * Contagem pública por plano — todos os planos pagos, inclusive os
   * de contagem zero. Soma as duas tabelas (captura por e-mail +
   * registro de conta); a vinculação no register() garante que quem
   * migrou de lead para conta não é contado duas vezes.
   */
  async counts(): Promise<Record<InterestPlan, number>> {
    const [accountGrouped, leadGrouped] = await Promise.all([
      this.prisma.planInterest.groupBy({
        by: ['plan'],
        _count: { _all: true },
      }),
      this.prisma.planInterestLead.groupBy({
        by: ['plan'],
        _count: { _all: true },
      }),
    ]);
    const totals = new Map<string, number>();
    for (const row of [...accountGrouped, ...leadGrouped]) {
      totals.set(row.plan, (totals.get(row.plan) ?? 0) + row._count._all);
    }
    const result = {} as Record<InterestPlan, number>;
    for (const plan of INTEREST_PLANS) {
      result[plan] = totals.get(plan) ?? 0;
    }
    return result;
  }
}
