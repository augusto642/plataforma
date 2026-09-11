import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

const COOKIE_OPTIONS = (maxAgeMs: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: maxAgeMs,
  path: '/',
});

@Controller('auth')
@Public()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.register(dto);
    res.cookie('access_token', tokens.accessToken, COOKIE_OPTIONS(15 * 60 * 1000));
    res.cookie('refresh_token', tokens.refreshToken, COOKIE_OPTIONS(7 * 24 * 60 * 60 * 1000));
    return tokens;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.login(dto.email, dto.password);
    res.cookie('access_token', tokens.accessToken, COOKIE_OPTIONS(15 * 60 * 1000));
    res.cookie('refresh_token', tokens.refreshToken, COOKIE_OPTIONS(7 * 24 * 60 * 60 * 1000));
    return tokens;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async refresh(@Body() dto: RefreshTokenDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.refresh(dto.token);
    res.cookie('access_token', tokens.accessToken, COOKIE_OPTIONS(15 * 60 * 1000));
    res.cookie('refresh_token', tokens.refreshToken, COOKIE_OPTIONS(7 * 24 * 60 * 60 * 1000));
    return tokens;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenDto, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(dto.token);
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    return null;
  }
}