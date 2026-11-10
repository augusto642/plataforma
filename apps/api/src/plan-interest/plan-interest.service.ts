import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  INTEREST_PLANS,
  InterestBillingCycle,
  InterestPlan,
  RegisterPlanInterestDto,
} from './dto/register-plan-interest.dto';

export interface PlanInterestView {
  plan: InterestPlan;
  billingCycle: InterestBillingCycle | null;
  createdAt: Date;
}

export interface RegisterPlanInterestResult extends PlanInterestView {
  /** true quando já existia um registro para o usuário antes desta chamada. */
  alreadyRegistered: boolean;
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

  async register(
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

  /** Contagem pública por plano — todos os planos pagos, inclusive os de contagem zero. */
  async counts(): Promise<Record<InterestPlan, number>> {
    const grouped = await this.prisma.planInterest.groupBy({
      by: ['plan'],
      _count: { _all: true },
    });
    const byPlan = new Map<string, number>(
      grouped.map((row) => [row.plan, row._count._all]),
    );
    const result = {} as Record<InterestPlan, number>;
    for (const plan of INTEREST_PLANS) {
      result[plan] = byPlan.get(plan) ?? 0;
    }
    return result;
  }
}
