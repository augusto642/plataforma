import { IsEmail, IsEnum, MaxLength } from 'class-validator';

// Sprint 16 (Ciclo 10/10 · P2/B49) — trilhas do roadmap que aceitam
// lista de espera na landing. Catálogo FECHADO, espelhado no cliente
// web (TracksSection): são as trilhas da ementa que ainda NÃO são
// cursos no catálogo — os 2 cursos reais (JavaScript e Python
// introdutório) têm entrada direta para /courses e não entram aqui.
export const WAITLIST_TRACKS = ['rust', 'go', 'web', 'python-ia'] as const;

export type WaitlistTrack = (typeof WAITLIST_TRACKS)[number];

export class JoinWaitlistDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsEnum(WAITLIST_TRACKS)
  track!: WaitlistTrack;
}
