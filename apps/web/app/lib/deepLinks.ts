// Sprint 8 — deep links entre as superfícies do funil.
//
// Duas pontes que existiam pela metade: os cards TCG da landing já
// linkavam para /onboarding?starter=<card>, mas o onboarding ignorava
// o parâmetro; e os CTAs de trilha da landing levavam ao /register
// perdendo a trilha clicada. Aqui vivem os dois mapeamentos — puros e
// testáveis — usados na montagem de cada porta.

import type { TrackId } from '../register/components/StepTracks';

// Card TCG (landing) → starter do catálogo do jogo, pela LINGUAGEM da
// trilha: o card é a vitrine, o starter é a criatura jogável da mesma
// linguagem (companions da Sprint 7 compartilham a arte).
export const TCG_CARD_TO_STARTER_ID: Record<string, string> = {
  'python-alchemist': 'pythox',
  'ts-sorcerer': 'scripty',
  'rust-paladin': 'rustor',
  'go-swarm': 'gopherus',
};

export function resolveStarterIdParam(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return TCG_CARD_TO_STARTER_ID[raw] ?? null;
}

// Trilha da landing (rust/go/web/python — as 4 do currículo) →
// especialização da etapa 2 do /register mais próxima. O /register não
// tem trilhas por linguagem: Rust e Go caem em "Backend & Rust/Go",
// Web em "Frontend & React" e Python em "AI Agents & MLOps". A trilha
// ORIGINAL continua disponível nas props do funil (sourceTrack), então
// a leitura não perde a origem real pelo mapeamento.
export const LANDING_TRACK_TO_REGISTER_TRACK: Record<string, TrackId> = {
  rust: 'backend',
  go: 'backend',
  web: 'frontend',
  python: 'ai',
};

const REGISTER_TRACK_IDS: readonly string[] = ['web3', 'backend', 'frontend', 'ai'];

export function resolveRegisterTrackParam(raw: string | null | undefined): TrackId | null {
  if (!raw) return null;
  if (REGISTER_TRACK_IDS.includes(raw)) return raw as TrackId;
  return LANDING_TRACK_TO_REGISTER_TRACK[raw] ?? null;
}
