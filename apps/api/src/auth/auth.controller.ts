import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Headers,
  Optional,
  Post,
  Query,
  Req,
  Res,
  SetMetadata,
  ServiceUnavailableException,
  UnauthorizedException,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegistrationLevelService } from '../ai/registration-level.service';
import {
  EvaluateRegistrationLevelDto,
  GenerateRegistrationFollowUpDto,
} from '../ai/dto/evaluate-registration-level.dto';
import { ErrorCodes, withErrorCode } from '../common/errors/error-codes';
import { CurrentUser } from './decorators/current-user.decorator';
import { IS_PUBLIC_KEY, Public } from './decorators/public.decorator';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto, ResetPasswordDto } from './dto/password-reset.dto';
import { GuestAgeEligibilityDto } from './dto/guest-age-eligibility.dto';
import { CheckEmailDto } from './dto/check-email.dto';
import { RegisterDto } from './dto/register.dto';
import { LegalConsentDto } from './dto/legal-consent.dto';
import { ResendCodeDto } from './dto/resend-code.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { GitHubAuthGuard, GoogleAuthGuard } from './guards/oauth.guard';
import { OAuthCallbackExceptionFilter } from './oauth-callback.filter';
import { OAuthProfile, webAppBaseUrl } from './oauth.config';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from '../metrics/metrics.service';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL_MS,
  OAUTH_LEGAL_CONSENT_COOKIE,
  OAUTH_LEGAL_CONSENT_TTL_MS,
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
  private fallbackRegistrationLevel?: RegistrationLevelService;
  private readonly followUpTokenTtlMs = 15 * 60 * 1000;

  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    @Optional() private readonly registrationLevel?: RegistrationLevelService,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  private getRegistrationLevelService(): RegistrationLevelService {
    return (
      this.registrationLevel ??
      (this.fallbackRegistrationLevel ??= new RegistrationLevelService())
    );
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async forgotPassword(@Body() dto: RequestPasswordResetDto) {
    await this.auth.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.password);
  }

  @Get('registration-challenge')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async getRegistrationChallenge(
    @Headers('x-age-eligibility-token') eligibilityToken?: string,
    @Query('programmed') programmed?: string,
    @Query('language') language?: string,
  ) {
    await this.assertGuestAgeEligibility(eligibilityToken);
    const hasProgrammed =
      programmed === 'true' || programmed === '1'
        ? true
        : programmed === 'false' || programmed === '0'
          ? false
          : undefined;
    return this.getRegistrationLevelService().getChallenge({
      programmed: hasProgrammed,
      language,
    });
  }

  @Post('guest-age-eligibility')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async createGuestAgeEligibility(@Body() dto: GuestAgeEligibilityDto) {
    return {
      token: await this.auth.createGuestAgeEligibilityToken(dto.adultConfirmed),
    };
  }

  @Post('evaluate-level')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async evaluateLevel(
    @Body() dto: EvaluateRegistrationLevelDto,
    @Headers('x-age-eligibility-token') eligibilityToken?: string,
  ) {
    await this.assertGuestAgeEligibility(eligibilityToken);
    const followUpQuestion = dto.followUpToken
      ? this.verifyRegistrationFollowUpToken(dto.followUpToken, dto.challengeId)
      : undefined;
    if (dto.followUpAnswer?.trim() && !followUpQuestion) {
      throw new BadRequestException('Resposta de follow-up sem token válido.');
    }
    const result = await this.getRegistrationLevelService().evaluateExplanation({
      hasProgrammedBefore: dto.hasProgrammedBefore,
      language: dto.language,
      challengeId: dto.challengeId,
      explanation: dto.explanation,
      followUpQuestion,
      followUpAnswer: dto.followUpAnswer,
    });
    this.metrics?.recordRegistrationEvaluation(
      result.source,
      result.confidence,
      Boolean(followUpQuestion),
    );
    return result;
  }

  @Post('registration-follow-up')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async generateRegistrationFollowUp(
    @Body() dto: GenerateRegistrationFollowUpDto,
    @Headers('x-age-eligibility-token') eligibilityToken?: string,
  ) {
    await this.assertGuestAgeEligibility(eligibilityToken);
    const followUp = await this.getRegistrationLevelService().generateFollowUpQuestion(dto);
    const response = {
      ...followUp,
      followUpToken: this.createRegistrationFollowUpToken(followUp.question, dto.challengeId),
    };
    this.metrics?.recordRegistrationFollowUpGenerated();
    return response;
  }

  private createRegistrationFollowUpToken(question: string, challengeId?: string): string {
    const secret = this.config.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      throw new ServiceUnavailableException('A avaliação está indisponível.');
    }

    const payload = Buffer.from(
      JSON.stringify({
        question,
        challengeId: challengeId ?? null,
        expiresAt: Date.now() + this.followUpTokenTtlMs,
      }),
    ).toString('base64url');
    const signature = createHmac('sha256', secret).update(payload).digest('base64url');
    return `${payload}.${signature}`;
  }

  private async assertGuestAgeEligibility(token?: string): Promise<void> {
    if (await this.auth.verifyGuestAgeEligibilityToken(token)) return;
    throw new UnauthorizedException(
      withErrorCode(
        'Confirme que você tem 18 anos ou mais para acessar esta etapa.',
        ErrorCodes.AUTH_ADULT_ELIGIBILITY_REQUIRED,
      ),
    );
  }

  private verifyRegistrationFollowUpToken(token: string, challengeId?: string): string {
    const secret = this.config.get<string>('JWT_ACCESS_SECRET');
    const [payload, signature, extra] = token.split('.');
    if (!secret || !payload || !signature || extra !== undefined) {
      throw new BadRequestException('Token de follow-up inválido.');
    }

    const expected = createHmac('sha256', secret).update(payload).digest();
    let received: Buffer;
    try {
      received = Buffer.from(signature, 'base64url');
    } catch {
      throw new BadRequestException('Token de follow-up inválido.');
    }
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      throw new BadRequestException('Token de follow-up inválido.');
    }

    let claims: unknown;
    try {
      claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException('Token de follow-up inválido.');
    }
    if (
      !claims ||
      typeof claims !== 'object' ||
      !('question' in claims) ||
      typeof claims.question !== 'string' ||
      !('expiresAt' in claims) ||
      typeof claims.expiresAt !== 'number' ||
      claims.expiresAt <= Date.now() ||
      !('challengeId' in claims) ||
      claims.challengeId !== (challengeId ?? null)
    ) {
      throw new BadRequestException('Token de follow-up expirado ou incompatível.');
    }
    return claims.question;
  }

  /**
   * OAuth 2.0 real (Google/GitHub) — Authorization Code Flow via Passport.
   *
   * - `GET /auth/google` e `GET /auth/github`: o guard redireciona o
   *   navegador ao provedor (sem OAuth configurado → 503 honesto, sem
   *   quebrar o login por senha). GET é seguro aqui: nada muda estado —
   *   o CSRF por Origin/Referer (M15) só vale para mutações. O guard
   *   grava um cookie `oauth_state` (D1, anti-CSRF do login) e o inclui
   *   na URL de autorização; o callback só prossegue se o `state` da
   *   volta casar com o cookie (uso único).
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
    const legalConsentToken =
      parseCookies(req.headers.cookie)[OAUTH_LEGAL_CONSENT_COOKIE];
    try {
      const tokens = await this.auth.loginWithOAuth(profile, legalConsentToken);
      this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
      return res.redirect(`${webAppBaseUrl(this.config)}/dashboard`);
    } finally {
      res.clearCookie(OAUTH_LEGAL_CONSENT_COOKIE, { path: '/' });
    }
  }

  @Post('oauth-legal-consent')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async setOAuthLegalConsent(
    @Body() dto: LegalConsentDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = await this.auth.createOAuthLegalConsentToken(
      dto.termsAccepted === true,
      dto.privacyAcknowledged === true,
      dto.adultConfirmed === true,
    );
    res.cookie(
      OAUTH_LEGAL_CONSENT_COOKIE,
      token,
      cookieOptions(OAUTH_LEGAL_CONSENT_TTL_MS),
    );
  }

  @Post('check-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async checkEmail(@Body() dto: CheckEmailDto) {
    return this.auth.checkEmailAvailability(dto.email);
  }

  /**
   * Cadastro com sessão imediata: cria o usuário já ativo (sem código por
   * e-mail), emite access/refresh tokens nos cookies httpOnly e retorna
   * apenas { user }.
   */
  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.register(dto);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { user: tokens.user };
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
    const tokens = await this.auth.login(
      dto.email,
      dto.password,
      dto.adultConfirmed,
    );
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
