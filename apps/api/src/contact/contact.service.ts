import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';

// Sprint 6 — persiste a mensagem do formulário /contato. A resposta é
// um recibo mínimo ({ received: true }): nenhum dado de quem escreveu
// (nome, e-mail, texto) volta pela API.
@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  async createMessage(dto: CreateContactDto): Promise<{ received: true }> {
    await this.prisma.contactMessage.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        message: dto.message.trim(),
      },
    });
    return { received: true };
  }
}
