import { Body, Controller, Get, Param, Post, Headers } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { DiagnosticService } from './diagnostic.service';
import { SubmitDiagnosticDto } from './dto/submit-diagnostic.dto';

// Funil anônimo primeiro (B09/B10): os três endpoints são públicos.
// No submit, um JWT válido é aceito de forma OPCIONAL para vincular o
// resultado à conta — sem token, o resultado fica anônimo, identificado
// apenas pelo sessionToken devolvido.
@Controller('diagnostic')
export class DiagnosticController {
  constructor(private readonly diagnostic: DiagnosticService) {}

  @Public()
  @Get('quiz')
  getQuiz() {
    return this.diagnostic.getPublicQuiz();
  }

  @Public()
  @Post('submit')
  submit(
    @Body() dto: SubmitDiagnosticDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.diagnostic.submit(dto, authorization);
  }

  @Public()
  @Get('result/:sessionToken')
  getResult(@Param('sessionToken') sessionToken: string) {
    return this.diagnostic.getResult(sessionToken);
  }
}
