import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { MailModule } from '../mail/mail.module';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GitHubStrategy } from './strategies/github.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import {
  OAuthProvider,
  assertOAuthEnvComplete,
  isOAuthConfigured,
} from './oauth.config';

/**
 * OAuth (Google/GitHub) — registro condicional das strategies.
 *
 * A factory instancia a strategy SÓ quando o provedor está configurado
 * (CLIENT_ID + CLIENT_SECRET); sem vars, o provider resolve `null` e a
 * strategy nunca é registrada no Passport — o guard responde 503 antes
 * de qualquer redirect, e o boot/login por senha seguem intactos.
 * Configuração PARCIAL (só uma das vars) derruba o boot via ConfigError
 * (`assertOAuthEnvComplete`) — fail-closed, igual aos segredos JWT (C5/A11).
 */
function oauthStrategyProvider(
  provider: OAuthProvider,
  StrategyClass: new (config: ConfigService) => unknown,
) {
  return {
    provide: StrategyClass,
    useFactory: (config: ConfigService) => {
      assertOAuthEnvComplete(provider, config);
      return isOAuthConfigured(provider, config)
        ? new StrategyClass(config)
        : null;
    },
    inject: [ConfigService],
  };
}

@Module({
  imports: [
    PassportModule,
    MailModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    oauthStrategyProvider('google', GoogleStrategy),
    oauthStrategyProvider('github', GitHubStrategy),
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}