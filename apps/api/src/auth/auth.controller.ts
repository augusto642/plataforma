import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  SetMetadata,
  UnauthorizedException,
  UseFilters,
  UseGuards,
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
import { GitHubAuthGuard, GoogleAuthGuard } from './guards/oauth.guard';
import { OAuthCallbackExceptionFilter } from './oauth-callback.filter';
import { OAuthProfile, webAppBaseUrl } from './oauth.config';
import { ConfigService } from '@nestjs/config';
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
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  /**
   * OAuth 2.0 real (Google/GitHub) — Authorization Code Flow via Passport.
   *
   * - `GET /auth/google` e `GET /auth/github`: o guard redireciona o
   *   navegador ao provedor (sem OAuth configurado → 503 honesto, sem
   *   quebrar o login por senha). GET é seguro aqui: nada muda estado —
   *   o CSRF por Origin/Referer (M15) só vale para mutações.
   * - `GET /auth/<provider>/callback`: a strategy valida o perfil
   *   (e-mail verificado ou recusa) e o service emite OS MESMOS cookies
   *   do login por senha (access JWT + refresh com detecção de reuso A2).
   *   Sucesso → redirect 302 para o web app (`/dashboard`); falha →
   *   o `OAuthCallbackExceptionFilter` redireciona para
   *   `/login?oauth_error=<código>` com a mensagem em pt-BR na tela.
   * - Nenhum token aparece no corpo nem na URL: os cookies httpOnly são
   *   gravados na resposta do redirect (o navegador os guarda antes de
   *   seguir para o web app).
   */
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @UseFilters(OAuthCallbackExceptionFilter)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  googleLogin() {
    // O guard (Passport) redireciona ao Google; o handler nunca executa.
    return null;
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @UseFilters(OAuthCallbackExceptionFilter)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    return this.handleOAuthCallback(req, res);
  }

  @Get('github')
  @UseGuards(GitHubAuthGuard)
  @UseFilters(OAuthCallbackExceptionFilter)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  githubLogin() {
    // O guard (Passport) redireciona ao GitHub; o handler nunca executa.
    return null;
  }

  @Get('github/callback')
  @UseGuards(GitHubAuthGuard)
  @UseFilters(OAuthCallbackExceptionFilter)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    return this.handleOAuthCallback(req, res);
  }

  private async handleOAuthCallback(req: Request, res: Response) {
    const profile = (req as Request & { user?: OAuthProfile }).user;
    if (!profile) {
      // O guard deveria ter populado `req.user`; sem ele, não há login
      // para concluir — volta ao login com erro genérico, sem 500.
      return res.redirect(
        `${webAppBaseUrl(this.config)}/login?oauth_error=oauth_failed`,
      );
    }
    const tokens = await this.auth.loginWithOAuth(profile);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return res.redirect(`${webAppBaseUrl(this.config)}/dashboard`);
  }

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
