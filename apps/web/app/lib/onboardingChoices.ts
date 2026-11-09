// Sprint 6 — persistência das escolhas do prólogo /onboarding (D3 da
// Sprint 5): até aqui starter/nível/codename viviam só na sessão do
// useGameStore (Zustand em memória) — fechar a aba no meio do prólogo
// perdia tudo. Agora as escolhas sobrevivem no localStorage e são
// lidas na montagem do onboarding; quando o cadastro conclui, são
// limpas (a conta vira a fonte da verdade).
//
// Sprint 7 — a ETAPA atual do prólogo também persiste: quem volta
// continua da etapa salva, não do mascote (retomada do corredor curto).
//
// Escopo deliberado: só as ESCOLHAS do prólogo (codename, starter,
// nível de carreira e o resultado da Missão 1) + a etapa atual. Estado
// de batalha, posição no overworld e inventário continuam efêmeros.

import type { CareerTier, FirstMissionResult } from '../game/stores/useGameStore';

const STORAGE_KEY = 'nexus_onboarding_choices';

// Etapas retomáveis do prólogo ('complete' é terminal e nunca persiste)
export type OnboardingStepName =
  | 'mascot'
  | 'mission'
  | 'tier'
  | 'starter'
  | 'avatar'
  | 'account';

export interface OnboardingChoices {
  codename?: string;
  starterId?: string;
  careerTier?: CareerTier;
  firstMission?: FirstMissionResult | null;
  step?: OnboardingStepName;
}

export function saveOnboardingChoices(choices: OnboardingChoices): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(choices));
  } catch {
    // storage indisponível (modo privado etc.): o prólogo segue em memória
  }
}

export function readOnboardingChoices(): OnboardingChoices | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnboardingChoices;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearOnboardingChoices(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // idempotente: limpar de novo não é erro
  }
}
