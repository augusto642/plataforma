import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CareerTier, Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt, createHash, timingSafeEqual } from 'crypto';
import { ConfigError } from '../config/secrets.validation';
import { ErrorCodes, withErrorCode } from '../common/errors/error-codes';
import { MailerService } from '../mail/mailer.service';
import { PrismaService } from '../prisma/prisma.service';
import { DynamicTrackService } from '../dynamic-track/dynamic-track.service';
import { isCareerGoal, type CareerGoal } from '../dynamic-track/dynamic-track.rules';
import {
  RegistrationLevelService,
  type DetectedExperienceLevel,
} from '../ai/registration-level.service';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { OAuthProfile } from './oauth.config';
import { generateRefreshToken, hashToken } from './tokens.util';

const BCRYPT_ROUNDS = 12;

/**
 * C5 (Lote 1) — Verificação de e-mail por código de confirmação.
 * - Código de 6 dígitos, guardado SÓ como hash SHA-256 (nunca em claro).
 * - Expiração curta (15 min), no máximo 5 tentativas por código.
 * - Reenvio: cooldown de 60 s entre envios + no máximo 5 códigos/hora.
 * - Login bloqueado (403 honesto, pt-BR) até a verificação.
 * - O usuário nasce NÃO verificado (emailVerifiedAt NULL); contas criadas
 *   antes desta mudança foram backfilladas como verificadas na migration.
 */
export const EMAIL_CODE_TTL_MS = 15 * 60 * 1000;
export const EMAIL_CODE_MAX_ATTEMPTS = 5;
export const EMAIL_CODE_RESEND_COOLDOWN_MS = 60 * 1000;
export const EMAIL_CODE_MAX_RESENDS_PER_HOUR = 5;

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

export interface RegisterResult {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  /** Sempre true no momento: o cadastro exige verificação antes do login. */
  emailVerificationRequired: boolean;
}

function generateVerificationCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

function hashVerificationCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mailer: MailerService,
    // Trilha dinâmica v1 (Central 209): @Optional() para não quebrar
    // instanciações legadas em testes que constroem o serviço sem o
    // novo provider — sem ele, o cadastro segue sem investigação.
    @Optional() private readonly dynamicTrack?: DynamicTrackService,
    @Optional() private readonly registrationLevel?: RegistrationLevelService,
  ) {}

  async checkEmailAvailability(email: string): Promise<{ available: boolean }> {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    return { available: !existing };
  }

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const { resolvedLevel, assessmentSource } =
      await this.resolveRegistrationLevel(dto);
    try {
      const email = dto.email.toLowerCase().trim();
      const user = await this.prisma.user.create({
        data: {
          email,
          name: dto.name.trim(),
          passwordHash,
          role: Role.student,
          emailVerifiedAt: new Date(),
          utmSource: dto.utmSource?.trim() || null,
          utmMedium: dto.utmMedium?.trim() || null,
          utmCampaign: dto.utmCampaign?.trim() || null,
          // Sprint 8 + Diagnóstico aberto no cadastro: o nível avaliado no
          // servidor (ou declarado) vira o careerTier da conta; sem
          // sinalização, o default do modelo (beginner) se aplica.
          ...(resolvedLevel ? { careerTier: resolvedLevel as CareerTier } : {}),
        },
      });
      // Sprint 10 (B09) — vincula o resultado anônimo do quiz diagnóstico
      // à conta nova, se houver sessão de diagnóstico no cadastro.
      await this.linkDiagnosticResult(dto.diagnosticSessionToken, user.id);
      // Trilha dinâmica v1 (Central 209 — DESIGN D3): o cadastro cria a
      // investigação (investigating, SLA +48h) e enfileira 1 job
      // idempotente — sem bloquear a resposta. Falha aqui NÃO desfaz o
      // cadastro: createForUser loga e a linha fica investigating (o
      // endpoint admin de re-enfileiramento cobre o retry manual).
      // `preferredTrack` NÃO entra no snapshot: é campo depreciado,
      // ignorado para atribuição — o hint da landing viaja em
      // `sourceTrack` (ver RegisterDto).
      const validGoalsFromArray = Array.isArray(dto.careerGoals)
        ? dto.careerGoals.filter(isCareerGoal)
        : [];
      const singleGoal = isCareerGoal(dto.careerGoal) ? dto.careerGoal : null;
      const primaryGoal = singleGoal ?? validGoalsFromArray[0] ?? null;
      const careerGoals = Array.from(
        new Set<CareerGoal>([
          ...(primaryGoal ? [primaryGoal] : []),
          ...validGoalsFromArray,
        ]),
      );

      await this.dynamicTrack
        ?.createForUser(user.id, {
          expLevel: resolvedLevel,
          timeCommitment:
            dto.weeklyTimeCommitment === '5h' ||
            dto.weeklyTimeCommitment === '10h' ||
            dto.weeklyTimeCommitment === '20h'
              ? dto.weeklyTimeCommitment
              : null,
          careerGoal: primaryGoal,
          careerGoals,
          sourceTrack:
            dto.sourceTrack === 'web3' ||
            dto.sourceTrack === 'backend' ||
            dto.sourceTrack === 'frontend' ||
            dto.sourceTrack === 'ai'
              ? dto.sourceTrack
              : null,
          diagnosticTrackId: null,
          primaryTechnology: dto.primaryTechnology?.trim() || null,
          hasProgrammedBefore:
            typeof dto.hasProgrammedBefore === 'boolean'
              ? dto.hasProgrammedBefore
              : null,
          priorLanguage: dto.priorLanguage?.trim() || null,
          challengeId: dto.challengeId?.trim() || null,
          assessmentSource,
        })
        .catch((err: Error) => {
          this.logger.error(
            `Failed to create track investigation for ${user.email}: ${err.message}. The account is created; re-enqueue via /dynamic-track/admin.`,
          );
        });
      return this.issueTokensForUser(user);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        // Anti-enumeração de e-mail (finding BAIXA — AppSec): a resposta não
        // revela se o e-mail já existe. Mensagem genérica e mesmo status code
        // de outros erros de validação do fluxo de registro.
        throw new ConflictException(
          withErrorCode(
            'Não foi possível concluir o cadastro com os dados informados. Verifique os campos e tente novamente.',
            ErrorCodes.AUTH_REGISTRATION_FAILED,
          ),
        );
      }
      throw e;
    }
  }

  /**
   * Confirma o e-mail com o código de 6 dígitos e, em caso de sucesso, emite
   * os tokens (mesmo contrato do login).
   *
   * D1 (Lote 1): o código é exigido SEMPRE, inclusive para conta já
   * verificada. Não existe atalho idempotente que emita tokens sem checar o
   * código — esse atalho permitia sequestro de qualquer conta verificada
   * (basta saber o e-mail) num endpoint público. Conta já verificada com
   * código válido ainda não consumido continua sendo aceita (o código é
   * consumido normalmente); sem código válido, a chamada é rejeitada.
   */
  async verifyEmail(email: string, code: string): Promise<AuthTokens> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    // Anti-enumeração: e-mail desconhecido responde igual a código errado.
    if (!user) {
      throw new BadRequestException(
        withErrorCode(
          'Código inválido ou expirado. Verifique o código e tente novamente, ou solicite um novo código.',
          ErrorCodes.AUTH_INVALID_VERIFICATION_CODE,
        ),
      );
    }

    const record = await this.prisma.emailVerificationCode.findFirst({
      where: { userId: user.id, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) {
      throw new BadRequestException(
        withErrorCode(
          'Código inválido ou expirado. Verifique o código e tente novamente, ou solicite um novo código.',
          ErrorCodes.AUTH_INVALID_VERIFICATION_CODE,
        ),
      );
    }
    if (record.expiresAt <= new Date()) {
      throw new BadRequestException(
        withErrorCode(
          'O código expirou. Solicite um novo código de confirmação.',
          ErrorCodes.AUTH_VERIFICATION_CODE_EXPIRED,
        ),
      );
    }
    if (record.attempts >= EMAIL_CODE_MAX_ATTEMPTS) {
      throw new BadRequestException(
        withErrorCode(
          'Muitas tentativas com este código. Solicite um novo código de confirmação.',
          ErrorCodes.AUTH_VERIFICATION_CODE_ATTEMPTS_EXCEEDED,
        ),
      );
    }

    const expected = Buffer.from(record.codeHash, 'utf8');
    const provided = Buffer.from(hashVerificationCode(code), 'utf8');
    const matches =
      expected.length === provided.length && timingSafeEqual(expected, provided);
    if (!matches) {
      await this.prisma.emailVerificationCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException(
        withErrorCode(
          'Código inválido ou expirado. Verifique o código e tente novamente, ou solicite um novo código.',
          ErrorCodes.AUTH_INVALID_VERIFICATION_CODE,
        ),
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });
      await tx.emailVerificationCode.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
    });
    return this.issueTokensForUser(user);
  }

  /**
   * Reenvia o código de confirmação. Resposta genérica anti-enumeração para
   * e-mail desconhecido ou já verificado (não revela o estado do cadastro).
   * Cooldown de 60 s + teto de 5 envios/hora; códigos antigos são invalidados.
   */
  async resendCode(email: string): Promise<{ message: string }> {
    const genericMessage =
      'Se o e-mail estiver cadastrado e ainda não confirmado, um novo código foi enviado.';
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || user.emailVerifiedAt) {
      return { message: genericMessage };
    }

    const latest = await this.prisma.emailVerificationCode.findFirst({
      where: { userId: user.id, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (
      latest &&
      Date.now() - new Date(latest.createdAt).getTime() < EMAIL_CODE_RESEND_COOLDOWN_MS
    ) {
      throw new HttpException(
        withErrorCode(
          'Aguarde alguns segundos antes de solicitar outro código.',
          ErrorCodes.AUTH_VERIFICATION_CODE_RESEND_COOLDOWN,
        ),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const sentLastHour = await this.prisma.emailVerificationCode.count({
      where: { userId: user.id, createdAt: { gte: oneHourAgo } },
    });
    if (sentLastHour >= EMAIL_CODE_MAX_RESENDS_PER_HOUR) {
      throw new HttpException(
        withErrorCode(
          'Limite de reenvios atingido. Tente novamente em uma hora.',
          ErrorCodes.AUTH_VERIFICATION_CODE_RESEND_LIMIT,
        ),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = await this.issueVerificationCode(user.id);
    try {
      await this.mailer.sendVerificationCode(user.email, user.name, code);
    } catch (err: any) {
      // No reenvio o usuário pediu o código explicitamente: falha de envio é
      // erro honesto (503), não silêncio — sem e-mail não há como verificar.
      this.logger.error(`Failed to resend verification code to ${user.email}: ${err.message}`);
      throw new ServiceUnavailableException(
        withErrorCode(
          'Não foi possível enviar o código agora. Tente novamente em instantes.',
          ErrorCodes.AUTH_MAILER_UNAVAILABLE,
        ),
      );
    }
    return { message: genericMessage };
  }

  /** Cria um novo código (invalidando os anteriores) e devolve o valor em claro. */
  private async issueVerificationCode(userId: string): Promise<string> {
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MS);
    await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationCode.deleteMany({
        where: { userId, consumedAt: null },
      });
      await tx.emailVerificationCode.create({
        data: { userId, codeHash: hashVerificationCode(code), expiresAt },
      });
    });
    return code;
  }

  private parseLevel(value: unknown): DetectedExperienceLevel | null {
    if (
      value === 'beginner' ||
      value === 'junior' ||
      value === 'mid' ||
      value === 'senior'
    ) {
      return value;
    }
    return null;
  }

  private async resolveRegistrationLevel(dto: RegisterDto): Promise<{
    resolvedLevel: DetectedExperienceLevel | null;
    assessmentSource: string | null;
  }> {
    const explanation = dto.challengeExplanation?.trim();
    const hasExplanation = Boolean(explanation && explanation.length > 0);
    const hasProgrammedFlag = typeof dto.hasProgrammedBefore === 'boolean';
    const fallbackLevel =
      this.parseLevel(dto.detectedLevel) ?? this.parseLevel(dto.experienceLevel);

    if (hasExplanation || (hasProgrammedFlag && dto.hasProgrammedBefore === false)) {
      if (this.registrationLevel) {
        try {
          const evaluated = await this.registrationLevel.evaluateExplanation({
            hasProgrammedBefore: dto.hasProgrammedBefore ?? true,
            language: dto.priorLanguage,
            challengeId: dto.challengeId,
            explanation: dto.challengeExplanation ?? '',
          });
          return {
            resolvedLevel: evaluated.detectedLevel,
            assessmentSource: evaluated.source,
          };
        } catch (err) {
          this.logger.warn(
            `Failed to evaluate registration explanation on register: ${(err as Error).message}`,
          );
          return {
            resolvedLevel:
              fallbackLevel ?? (dto.hasProgrammedBefore === false ? 'beginner' : null),
            assessmentSource: 'fallback',
          };
        }
      }
      if (fallbackLevel) {
        return {
          resolvedLevel: fallbackLevel,
          assessmentSource: dto.detectedLevel ? 'client-detected' : 'self-declared',
        };
      }
      if (dto.hasProgrammedBefore === false) {
        return { resolvedLevel: 'beginner', assessmentSource: 'self-declared' };
      }
      return { resolvedLevel: null, assessmentSource: null };
    }

    if (fallbackLevel) {
      return {
        resolvedLevel: fallbackLevel,
        assessmentSource: dto.detectedLevel ? 'client-detected' : 'self-declared',
      };
    }

    if (hasProgrammedFlag && dto.hasProgrammedBefore === true) {
      return { resolvedLevel: null, assessmentSource: null };
    }

    return { resolvedLevel: null, assessmentSource: null };
  }

  /**
   * Vincula o resultado anônimo do quiz diagnóstico (B09) à conta nova.
   * É um vínculo de conveniência: se qualquer passo falhar (token
   * inexistente, resultado já vinculado a outra conta, erro de banco),
   * o cadastro NÃO pode quebrar por causa dele — por isso o try/catch.
   */
  private async linkDiagnosticResult(
    sessionToken: string | undefined,
    userId: string,
  ): Promise<void> {
    if (!sessionToken) return;
    try {
      const result = await this.prisma.diagnosticResult.findUnique({
        where: { sessionToken },
      });
      if (result && result.userId === null) {
        await this.prisma.diagnosticResult.update({
          where: { id: result.id },
          data: { userId },
        });
      }
    } catch {
      // Silencioso de propósito: ver o comentário do método.
    }
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      throw new UnauthorizedException(
        withErrorCode('Invalid credentials', ErrorCodes.AUTH_INVALID_CREDENTIALS),
      );
    }
    // Conta criada SÓ via OAuth nasce sem senha (passwordHash NULL): não há
    // senha para comparar — credencial inválida, sem vazar o motivo.
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        withErrorCode('Invalid credentials', ErrorCodes.AUTH_INVALID_CREDENTIALS),
      );
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException(
        withErrorCode('Invalid credentials', ErrorCodes.AUTH_INVALID_CREDENTIALS),
      );
    }
    return this.issueTokensForUser(user);
  }

  /**
   * OAuth 2.0 (Google/GitHub) — login / criação / vínculo de conta.
   *
   * O `profile` já chega validado pela strategy (e-mail presente E
   * verificado pelo provedor — sem e-mail verificado a strategy recusa
   * antes; aqui a checagem é a segunda camada, fail-closed).
   *
   * Resolução em UMA transação (sem corrida entre "existe?" e "cria?" no
   * caso comum). A corrida residual — dois callbacks simultâneos para um
   * usuário novo, ambos passando no `findUnique` e colidindo no `create`
   * (`P2002`) — é convertida abaixo em `ConflictException` com
   * `AUTH_OAUTH_ACCOUNT_CONFLICT` (D2, QA): nunca 500 cru.
   * 1. Já existe `OAuthAccount` (provider + providerId) → loga nela.
   * 2. Existe usuário com o mesmo e-mail (conta por senha) → VINCULA o
   *    provedor à conta existente (nunca cria duplicata) e marca o e-mail
   *    como verificado (o provedor acabou de afirmá-lo — C5 não é furado:
   *    a conta por senha continua exigindo o código de 6 dígitos).
   * 3. Ninguém com esse e-mail → cria a conta (sem senha — `passwordHash`
   *    NULL; o login por senha rejeita conta sem hash) já verificada, com
   *    a `OAuthAccount` vinculada.
   *
   * Os tokens emitidos são os MESMOS do login por senha
   * (`issueTokensForUser`: access JWT 15 min + refresh com detecção de
   * reuso A2) — o controller grava os mesmos cookies httpOnly.
   */
  async loginWithOAuth(profile: OAuthProfile): Promise<AuthTokens> {
    if (!profile.email) {
      throw new BadRequestException(
        withErrorCode(
          'O provedor não informou um e-mail para esta conta. Use uma conta com e-mail verificado ou entre com e-mail e senha.',
          ErrorCodes.AUTH_OAUTH_EMAIL_REQUIRED,
        ),
      );
    }
    if (!profile.emailVerified) {
      throw new BadRequestException(
        withErrorCode(
          'O e-mail desta conta ainda não foi verificado no provedor. Confirme o e-mail e tente novamente.',
          ErrorCodes.AUTH_OAUTH_EMAIL_UNVERIFIED,
        ),
      );
    }
    const email = profile.email.toLowerCase().trim();
    const name = profile.name?.trim() || email.split('@')[0];
    let user: {
      id: string;
      email: string;
      role: Role;
      name: string;
    };
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const linked = await tx.oAuthAccount.findUnique({
          where: {
            provider_providerId: {
              provider: profile.provider,
              providerId: profile.providerId,
            },
          },
          include: { user: true },
        });
        if (linked) return linked.user;

        const byEmail = await tx.user.findUnique({ where: { email } });
        if (byEmail) {
          await tx.oAuthAccount.create({
            data: {
              provider: profile.provider,
              providerId: profile.providerId,
              userId: byEmail.id,
            },
          });
          if (!byEmail.emailVerifiedAt) {
            await tx.user.update({
              where: { id: byEmail.id },
              data: { emailVerifiedAt: new Date() },
            });
          }
          return byEmail;
        }

        return tx.user.create({
          data: {
            email,
            name,
            passwordHash: null,
            role: Role.student,
            emailVerifiedAt: new Date(),
            oAuthAccounts: {
              create: {
                provider: profile.provider,
                providerId: profile.providerId,
              },
            },
          },
        });
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        // D2 (QA — BAIXO): corrida entre dois callbacks simultâneos para
        // um usuário OAuth novo (ou vínculo simultâneo à mesma conta por
        // senha) — a outra transação criou o registro primeiro e o
        // `create` desta estourou a unique. Não é 500: na segunda
        // tentativa o vínculo já existe e o login completa — o usuário
        // só precisa tentar entrar novamente (o filtro do callback vira
        // `/login?oauth_error=account_conflict`).
        throw new ConflictException(
          withErrorCode(
            'Essa conta acabou de ser vinculada durante o login. Tente entrar novamente.',
            ErrorCodes.AUTH_OAUTH_ACCOUNT_CONFLICT,
          ),
        );
      }
      throw e;
    }
    return this.issueTokensForUser(user);
  }

  /**
   * A2 (Lote 2) — rotação com detecção de reuso (refresh token reuse
   * detection, padrão OAuth 2.0 / RFC 6819 §4.2.2).
   *
   * - O token rotacionado NÃO é mais apagado: é marcado com `revokedAt`
   *   (o campo já existia no schema e nunca era usado). Apagar tornava o
   *   reuso indistinguível de um token desconhecido/forjado.
   * - Apresentar um token conhecido mas já revogado = possível roubo: TODOS
   *   os refresh tokens do usuário são revogados (família inteira) e o
   *   evento é logado como erro para alerta/monitoramento. A resposta
   *   continua sendo um 401 genérico (não revela ao atacante o que foi
   *   detectado).
   * - Token expirado (nunca revogado) ou desconhecido continua sendo só
   *   401, sem revogar a família: expiração é evento normal, não sinal de
   *   roubo, e token desconhecido não pode ser atribuído a um usuário.
   * - Tokens revogados são expurgados pelo housekeeping quando expiram
   *   (`housekeeping.service.ts` apaga refresh tokens com `expiresAt` no
   *   passado), então não há acúmulo permanente.
   * - D2 (follow-up Lote 2) — rotação ATÔMICA: o token antigo é reclamado
   *   com `updateMany` condicional (`revokedAt: null`) DENTRO da mesma
   *   transação que cria o refresh novo. Dois `refresh` concorrentes com o
   *   mesmo token: só o primeiro UPDATE casa (`count: 1`); o segundo vê
   *   `count: 0` e cai no caminho de reuso (família revogada + 401).
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = hashToken(refreshToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!record) {
      throw new UnauthorizedException(
        withErrorCode('Invalid refresh token', ErrorCodes.AUTH_INVALID_REFRESH_TOKEN),
      );
    }
    if (record.revokedAt) {
      // Reuso de token já rotacionado/revogado: possível roubo — revoga a
      // família inteira antes de responder.
      await this.revokeAllForUser(record.userId);
      this.logger.error(
        `Refresh token reuse detected for user ${record.userId}: token presented after rotation/revocation — all refresh tokens revoked (possible token theft).`,
      );
      throw new UnauthorizedException(
        withErrorCode('Invalid refresh token', ErrorCodes.AUTH_INVALID_REFRESH_TOKEN),
      );
    }
    if (record.expiresAt <= new Date()) {
      throw new UnauthorizedException(
        withErrorCode('Invalid refresh token', ErrorCodes.AUTH_INVALID_REFRESH_TOKEN),
      );
    }

    const user = record.user;
    // Reclamar o token antigo (CAS) + criar o novo NA MESMA transação: ou
    // os dois acontecem juntos, ou nenhum. Antes, `issueTokens` criava o
    // token novo ANTES de revogar o antigo, então dois `refresh`
    // concorrentes passavam ambos no cheque `revokedAt` e emitiam dois
    // pares válidos (janela estreita, pré-existente no HEAD).
    const rawRefresh = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.refreshToken.updateMany({
        where: { id: record.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (claimed.count === 0) {
        return null;
      }
      const raw = generateRefreshToken();
      const ttlMs = parseDurationToMs(
        this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      );
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(raw),
          expiresAt: new Date(Date.now() + ttlMs),
        },
      });
      return raw;
    });
    if (!rawRefresh) {
      // Perdeu a corrida: outro `refresh` já reclamou (revogou) este token
      // — mesmo tratamento de reuso: família inteira revogada + 401
      // genérico (não revela ao chamador o que foi detectado).
      await this.revokeAllForUser(record.userId);
      this.logger.error(
        `Refresh token reuse detected for user ${record.userId}: concurrent rotation lost the race — token already claimed by another refresh; all refresh tokens revoked (possible token theft).`,
      );
      throw new UnauthorizedException(
        withErrorCode('Invalid refresh token', ErrorCodes.AUTH_INVALID_REFRESH_TOKEN),
      );
    }

    const accessToken = await this.signAccessToken(
      user.id,
      user.email,
      user.role,
    );
    return {
      accessToken,
      refreshToken: rawRefresh,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  private async issueTokensForUser(user: {
    id: string;
    email: string;
    role: Role;
    name: string;
  }): Promise<AuthTokens> {
    const tokens = await this.issueTokens(user.id, user.email, user.role, user.name);
    return { ...tokens, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: Role,
    name: string,
  ): Promise<AuthTokens> {
    const accessToken = await this.signAccessToken(userId, email, role);

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

  /**
   * Assina o access JWT. Extraído de `issueTokens` para o `refresh()`
   * atômico (D2) reutilizar sem recriar o refresh token (que já é criado
   * dentro da transação de rotação).
   */
  private async signAccessToken(
    userId: string,
    email: string,
    role: Role,
  ): Promise<string> {
    const payload: JwtPayload = { sub: userId, email, role: role as string };

    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET');
    if (!accessSecret) {
      throw new ConfigError('JWT_ACCESS_SECRET is required');
    }
    return this.jwt.signAsync(payload, {
      secret: accessSecret,
      expiresIn: parseDurationToSeconds(
        this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      ),
    });
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
