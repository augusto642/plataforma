import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ConfigError } from '../config/secrets.validation';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { generateRefreshToken, hashToken } from './tokens.util';

const BCRYPT_ROUNDS = 12;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    try {
      const email = dto.email.toLowerCase().trim();
      const user = await this.prisma.user.create({
        data: {
          email,
          name: dto.name.trim(),
          passwordHash,
          role: Role.student,
        },
      });
      const tokens = await this.issueTokens(user.id, user.email, user.role, user.name);
      return { ...tokens, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        // Anti-enumeração de e-mail (finding BAIXA — AppSec): a resposta não
        // revela se o e-mail já existe. Mensagem genérica e mesmo status code
        // de outros erros de validação do fluxo de registro.
        // TODO(security): implementar verificação por e-mail (código de
        // confirmação) para notificar o dono do endereço sem expor o cadastro.
        throw new ConflictException(
          'Não foi possível concluir o cadastro com os dados informados. Verifique os campos e tente novamente.',
        );
      }
      throw e;
    }
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const tokens = await this.issueTokens(user.id, user.email, user.role, user.name);
    return { ...tokens, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = hashToken(refreshToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!record || record.revokedAt || record.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = record.user;
    const tokens = await this.issueTokens(user.id, user.email, user.role, user.name);
    await this.prisma.refreshToken.delete({ where: { id: record.id } });
    return { ...tokens, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: Role,
    name: string,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email, role: role as string };

    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET');
    if (!accessSecret) {
      throw new ConfigError('JWT_ACCESS_SECRET is required');
    }
    const accessToken = await this.jwt.signAsync(payload, {
      secret: accessSecret,
      expiresIn: parseDurationToSeconds(
        this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      ),
    });

    const rawRefresh = generateRefreshToken();
    const refreshExpiresIn = this.config.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );
    const ttlMs = parseDurationToMs(refreshExpiresIn);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(rawRefresh),
        expiresAt: new Date(Date.now() + ttlMs),
      },
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      user: { id: userId, email, name, role: role as string },
    };
  }
}

function parseDurationToSeconds(duration: string): number {
  return Math.ceil(parseDurationToMs(duration) / 1000);
}

function parseDurationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  const value = parseInt(match[1], 10);
  switch (match[2]) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}