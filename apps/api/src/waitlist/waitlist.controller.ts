import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';
import { WaitlistService } from './waitlist.service';

// Sprint 16 (Ciclo 10/10 · P2/B49) — endpoints da lista de espera das
// trilhas do roadmap, consumidos pela landing pública. Públicos
// porque quem entra na lista é um visitante; a proteção é o DTO
// fechado (e-mail válido + trilha do catálogo) e o throttler global.
// Nenhuma resposta expõe e-mails: a escrita devolve só trilha,
// contagem e se o e-mail já estava; a leitura é a contagem agregada.
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlist: WaitlistService) {}

  @Public()
  @Post()
  @HttpCode(201)
  join(@Body() dto: JoinWaitlistDto) {
    return this.waitlist.join(dto);
  }

  @Public()
  @Get('counts')
  counts() {
    return this.waitlist.counts();
  }
}
