import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

// B08 (mínimo) — catálogo FECHADO de eventos do funil da landing.
// Espelhado no cliente web (apps/web/app/lib/analytics.ts): nomes fora
// desta lista são rejeitados na borda (ValidationPipe), para o funil não
// virar um balde de strings livres impossível de analisar.
export const FUNNEL_EVENTS = [
  'hero_cta',
  'quiz_cta',
  'pricing_cta',
  'trilha_cta',
  'sandbox_cta',
  'nav_cta',
  'final_cta',
  'signup_submit',
  'signup_success',
] as const;

export type FunnelEventName = (typeof FUNNEL_EVENTS)[number];

export class AnalyticsEventDto {
  @IsEnum(FUNNEL_EVENTS)
  event!: FunnelEventName;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ctaId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sessionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  path?: string;

  // Propriedades livres mas limitadas (plan, track, provider...) — valores
  // escalares apenas; o service descarta qualquer outra coisa.
  @IsOptional()
  @IsObject()
  props?: Record<string, string | number | boolean>;

  @IsOptional()
  @IsISO8601()
  ts?: string;
}

export class TrackEventsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AnalyticsEventDto)
  events!: AnalyticsEventDto[];
}
