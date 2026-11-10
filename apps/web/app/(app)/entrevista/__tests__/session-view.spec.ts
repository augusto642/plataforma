import { describe, expect, it } from 'vitest';
import {
  INTERVIEW_TURN_CAP,
  currentQuestionLabel,
  latestFeedbackText,
  userInitials,
} from '../session-view';

// Central 219 lote 3 (D3) — os textos do topo/scorecard da sessão vêm
// só de dados reais (nome, contador de turnos, evidência da avaliação).
describe('userInitials', () => {
  it('usa as iniciais do nome (2 primeiras palavras)', () => {
    expect(userInitials('Vitória Costa', 'vitoria@x.com')).toBe('VC');
    expect(userInitials('Augusto', 'a@x.com')).toBe('A');
    expect(userInitials('  maria   da silva  ', 'm@x.com')).toBe('MD');
  });

  it('sem nome, usa o início do e-mail', () => {
    expect(userInitials(null, 'qa-pro@nexus.local')).toBe('QA');
    expect(userInitials('', 'a@x.com')).toBe('A');
  });
});

describe('currentQuestionLabel', () => {
  it('pergunta atual = respostas dadas + 1', () => {
    expect(currentQuestionLabel(0)).toBe('Pergunta 1 de 20');
    expect(currentQuestionLabel(3)).toBe('Pergunta 4 de 20');
  });

  it('trava no cap de 20 turnos', () => {
    expect(currentQuestionLabel(19)).toBe('Pergunta 20 de 20');
    expect(currentQuestionLabel(20)).toBe('Pergunta 20 de 20');
    expect(INTERVIEW_TURN_CAP).toBe(20);
  });
});

describe('latestFeedbackText', () => {
  it('devolve a evidência da primeira entrada da avaliação', () => {
    expect(
      latestFeedbackText({
        Comunicação: { score: 4, evidence: 'Resposta clara e direta.' },
        Lógica: { score: 3, evidence: 'Faltou tratar o caso vazio.' },
      }),
    ).toBe('Resposta clara e direta.');
  });

  it('null sem avaliação ou sem evidência', () => {
    expect(latestFeedbackText(null)).toBeNull();
    expect(latestFeedbackText(undefined)).toBeNull();
    expect(latestFeedbackText({})).toBeNull();
    expect(latestFeedbackText({ X: { score: 1, evidence: '   ' } })).toBeNull();
  });
});
