import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompanyTokenGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const rawToken = (request.headers?.['x-company-token'] as string | undefined)?.trim();
    if (!rawToken) {
      throw new UnauthorizedException('Token de empresa inválido');
    }

    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const company = await this.prisma.company.findUnique({
      where: { tokenHash },
      select: { id: true, name: true },
    });
    if (!company) {
      throw new UnauthorizedException('Token de empresa inválido');
    }

    request.company = company;
    return true;
  }
}
