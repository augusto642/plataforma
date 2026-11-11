import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JoinPlanInterestLeadDto } from './dto/join-plan-interest-lead.dto';
import { RegisterPlanInterestDto } from './dto/register-plan-interest.dto';
import { PlanInterestService } from './plan-interest.service';

// Sprint 17 (Ciclo 10/10 · Volta 2/B54) — endpoints da lista de
// interessados dos planos pagos. A escrita e a leitura do próprio
// registro exigem sessão (o guard global de JWT cobre as rotas sem
// @Public): a intenção só vira registro quando o usuário conclui o
// cadastro ou entra logado — exatamente o destino que a landing
// anuncia. A leitura pública é só a contagem agregada por plano;
// nenhum dado individual sai por ela.
@Controller('plan-interest')
export class PlanInterestController {
  constructor(private readonly planInterest: PlanInterestService) {}

  @Post()
  @HttpCode(201)
  register(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterPlanInterestDto,
  ) {
    return this.planInterest.register(userId, dto);
  }

  // Sprint 18 (Ciclo 10/10 · Volta 3/B71) — captura pública só-e-mail
  // da lista (espelho da waitlist): quem tem intenção de plano não
  // precisa concluir o cadastro para entrar na lista. Pública pelo
  // mesmo motivo da waitlist — quem escreve é um visitante; a
  // proteção é o DTO fechado e o throttler global. A resposta não
  // expõe e-mail nenhum: plano, contagem total e alreadyOnList.
  @Public()
  @Post('lead')
  @HttpCode(201)
  joinLead(@Body() dto: JoinPlanInterestLeadDto) {
    return this.planInterest.registerLead(dto);
  }

  @Get('me')
  mine(@CurrentUser('id') userId: string) {
    return this.planInterest.getMine(userId);
  }

  @Public()
  @Get('counts')
  counts() {
    return this.planInterest.counts();
  }
}
