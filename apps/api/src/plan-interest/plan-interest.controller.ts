import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
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
