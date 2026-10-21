import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';

// Sprint 6 — endpoint do formulário /contato, destino real do CTA
// "Falar com Engenharia" do plano Staff (antes ele caía no /register,
// um cadastro disfarçado de contato). Público porque quem escreve é um
// visitante; a proteção é o DTO fechado + o throttler global.
@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Public()
  @Post()
  @HttpCode(201)
  createMessage(@Body() dto: CreateContactDto) {
    return this.contact.createMessage(dto);
  }
}
