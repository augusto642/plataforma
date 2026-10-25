import { Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CertificateService } from './certificate.service';

/**
 * Fase 1 premium (desenho §2.5) — rotas do certificado verificável.
 * A rota legada `GET /courses/certificates/verify/:code` continua
 * existindo (CoursesController); esta é a rota canônica nova.
 * Verificação pública sem JWT: código desconhecido ou revogado = 404,
 * sem vazar o motivo.
 */
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificates: CertificateService) {}

  @Public()
  @Get('verify/:code')
  verify(@Param('code') code: string) {
    return this.certificates.verifyByCode(code);
  }

  @Get('me')
  listMine(@CurrentUser() user: JwtPayload) {
    return this.certificates.listMine(user.sub);
  }

  @Post('courses/:courseId/issue')
  issueModule(
    @CurrentUser() user: JwtPayload,
    @Param('courseId') courseId: string,
  ) {
    return this.certificates.issueModuleCertificate(user.sub, courseId);
  }

  @Post('admin/:id/revoke')
  @Roles(Role.admin)
  revoke(@Param('id') id: string) {
    return this.certificates.revoke(id);
  }
}
