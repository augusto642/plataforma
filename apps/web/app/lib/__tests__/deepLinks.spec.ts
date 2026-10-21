// Sprint 8 — os deep links do funil resolvem de forma determinística:
// card TCG → starter jogável da mesma linguagem; trilha da landing →
// especialização mais próxima do /register. Valor desconhecido NUNCA
// vira chute: resolve para null e a porta usa o seu padrão.
// (imports explícitos do vitest: o tsc do app não declara os globais
// de teste — os 46 erros pré-existentes são justamente os globais do
// spec da engine; este arquivo não entra nessa conta)
import { describe, expect, it } from 'vitest';
import {
  LANDING_TRACK_TO_REGISTER_TRACK,
  TCG_CARD_TO_STARTER_ID,
  resolveRegisterTrackParam,
  resolveStarterIdParam,
} from '../deepLinks';

describe('deepLinks — ?starter= dos cards TCG', () => {
  it('mapeia os 4 cards para os starters do catálogo, pela linguagem', () => {
    expect(resolveStarterIdParam('python-alchemist')).toBe('pythox');
    expect(resolveStarterIdParam('ts-sorcerer')).toBe('scripty');
    expect(resolveStarterIdParam('rust-paladin')).toBe('rustor');
    expect(resolveStarterIdParam('go-swarm')).toBe('gopherus');
    expect(Object.keys(TCG_CARD_TO_STARTER_ID)).toHaveLength(4);
  });

  it('rejeita card desconhecido ou ausente', () => {
    expect(resolveStarterIdParam('holo-desconhecido')).toBeNull();
    expect(resolveStarterIdParam(null)).toBeNull();
    expect(resolveStarterIdParam(undefined)).toBeNull();
    expect(resolveStarterIdParam('')).toBeNull();
  });
});

describe('deepLinks — ?track= das trilhas da landing', () => {
  it('mapeia as 4 trilhas para a especialização mais próxima do /register', () => {
    expect(resolveRegisterTrackParam('rust')).toBe('backend');
    expect(resolveRegisterTrackParam('go')).toBe('backend');
    expect(resolveRegisterTrackParam('web')).toBe('frontend');
    expect(resolveRegisterTrackParam('python')).toBe('ai');
    expect(Object.keys(LANDING_TRACK_TO_REGISTER_TRACK)).toHaveLength(4);
  });

  it('aceita um TrackId direto e rejeita o resto', () => {
    expect(resolveRegisterTrackParam('backend')).toBe('backend');
    expect(resolveRegisterTrackParam('web3')).toBe('web3');
    expect(resolveRegisterTrackParam('cobol')).toBeNull();
    expect(resolveRegisterTrackParam(null)).toBeNull();
  });
});
