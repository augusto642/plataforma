import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { ErrorCodes, withErrorCode } from '../common/errors/error-codes';
import { CurrentUser } from './decorators/current-user.decorator';
import { IS_PUBLIC_KEY, Public } from './decorators/public.decorator';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendCodeDto } from './dto/resend-code.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_TTL_MS,
  cookieOptions,
  parseCookies,
} from './cookies.util';

/**
 * Fluxo de autenticação 100% via cookies httpOnly (finding ALTA — AppSec):
 * accessToken/refreshToken NUNCA aparecem no corpo das respostas. O corpo
 * retorna apenas o perfil público do usuário (`user`), suficiente para o
 * front hidratar a sessão; a detecção de sessão usa o cookie + /users/me.
 */
@Controller('auth')
@Public()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * C5: o cadastro NÃO cria sessão. A resposta é { user,
   * emailVerificationRequired: true } e nenhum cookie é emitido — o login só
   * passa após POST /auth/verify-email. O front exibe o passo de digitação
   * do código em seguida.
   */
  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async verifyEmail(@Body() dto: VerifyEmailDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.verifyEmail(dto.email, dto.code);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { user: tokens.user };
  }

  @Post('resend-code')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async resendCode(@Body() dto: ResendCodeDto) {
    return this.auth.resendCode(dto.email);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.login(dto.email, dto.password);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { user: tokens.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = parseCookies(req.headers.cookie)[REFRESH_TOKEN_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedException(
        withErrorCode(
          'Missing refresh token cookie',
          ErrorCodes.AUTH_MISSING_REFRESH_TOKEN,
        ),
      );
    }
    const tokens = await this.auth.refresh(refreshToken);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { user: tokens.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = parseCookies(req.headers.cookie)[REFRESH_TOKEN_COOKIE];
    if (refreshToken) {
      await this.auth.logout(refreshToken);
    }
    res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
    return null;
  }

  /**
   * A2 (Lote 2) — revoga TODOS os refresh tokens do usuário (todas as
   * sessões/dispositivos). Uso: "sair de todos os dispositivos" e resposta
   * a suspeita de roubo de token.
   *
   * Autenticação: o controller é @Public() no nível da classe, então o
   * JwtAuthGuard global pularia este método — o @SetMetadata abaixo
   * desliga o público SÓ neste handler (`getAllAndOverride` lê o handler
   * antes da classe). Sem JWT válido no cookie a chamada é 401.
   * O RolesGuard global não barra (não há @Roles aqui — qualquer papel
   * autenticado pode revogar a própria família).
   */
  @Post('logout-all')
  @SetMetadata(IS_PUBLIC_KEY, false)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async logoutAll(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.revokeAllForUser(user.sub);
    res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
    return null;
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, cookieOptions(ACCESS_TOKEN_TTL_MS));
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions(REFRESH_TOKEN_TTL_MS));
  }
}
