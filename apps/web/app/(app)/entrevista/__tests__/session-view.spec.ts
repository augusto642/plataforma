import { describe, expect, it } from 'vitest';
import {
  INTERVIEW_CRITERION_LABELS,
  INTERVIEW_TURN_CAP,
  criterionKeysForMode,
  criterionLabel,
  currentQuestionLabel,
  latestFeedbackText,
  orderedEvaluationEntries,
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

  // Central 219 lote 4 (D13) — o Postgres ordena as chaves do jsonb
  // (por tamanho, depois alfabeto): na ordem do jsonb, `clareza` vem
  // antes de `correcao`. A nota usa o PRIMEIRO critério da rubrica
  // técnica (`correcao`), não o primeiro que o jsonb ordena.
  it('D13: usa o primeiro critério da rubrica, não o primeiro do jsonb', () => {
    const jsonbOrder = {
      clareza: { score: 4, evidence: 'Explicação organizada em duas frases.' },
      correcao: { score: 5, evidence: 'Solução correta com o algoritmo certo.' },
      casosDeBorda: { score: 3, evidence: 'Não tratou o array vazio.' },
      complexidade: { score: 4, evidence: 'Citou o custo linear.' },
    };
    expect(latestFeedbackText(jsonbOrder, 'technical')).toBe(
      'Solução correta com o algoritmo certo.',
    );
    expect(latestFeedbackText(jsonbOrder)).toBe(
      'Solução correta com o algoritmo certo.',
    );
  });

  it('D13: modo comportamental usa o primeiro critério da rubrica dele', () => {
    expect(
      latestFeedbackText(
        {
          concisao: { score: 4, evidence: 'Resposta direta.' },
          estruturaStar: { score: 5, evidence: 'STAR completo e encadeado.' },
          especificidade: { score: 3, evidence: 'Exemplo genérico.' },
        },
        'behavioral',
      ),
    ).toBe('STAR completo e encadeado.');
  });
});

// Central 219 lote 4 (D12) — scorecard, diálogo e relatório exibem
// os rótulos da rubrica, nunca as chaves cruas do jsonb.
describe('criterionLabel', () => {
  it('mapeia todas as chaves das duas rubricas', () => {
    expect(criterionLabel('correcao')).toBe('Correção');
    expect(criterionLabel('complexidade')).toBe('Complexidade');
    expect(criterionLabel('casosDeBorda')).toBe('Casos de borda');
    expect(criterionLabel('clareza')).toBe('Clareza');
    expect(criterionLabel('estruturaStar')).toBe('Estrutura STAR');
    expect(criterionLabel('especificidade')).toBe('Especificidade');
    expect(criterionLabel('concisao')).toBe('Concisão');
  });

  it('chave desconhecida passa como está (nunca quebra a tela)', () => {
    expect(criterionLabel('criterioNovo')).toBe('criterioNovo');
  });

  it('o mapa cobre exatamente as chaves das duas rubricas', () => {
    const keys = [...criterionKeysForMode('technical'), ...criterionKeysForMode('behavioral')];
    expect(Object.keys(INTERVIEW_CRITERION_LABELS).sort()).toEqual([...keys].sort());
  });
});

describe('orderedEvaluationEntries', () => {
  it('ordena pela rubrica, ignorando a ordem do jsonb', () => {
    const entries = orderedEvaluationEntries(
      {
        clareza: { score: 4, evidence: 'c' },
        correcao: { score: 5, evidence: 'a' },
        casosDeBorda: { score: 3, evidence: 'b' },
        complexidade: { score: 4, evidence: 'd' },
      },
      'technical',
    ).map(([key]) => key);
    expect(entries).toEqual(['correcao', 'complexidade', 'casosDeBorda', 'clareza']);
  });

  it('chave fora da rubrica vai para o fim, na ordem recebida', () => {
    const entries = orderedEvaluationEntries(
      {
        legado: { score: 1, evidence: 'x' },
        clareza: { score: 4, evidence: 'c' },
        outro: { score: 2, evidence: 'y' },
      },
      'technical',
    ).map(([key]) => key);
    expect(entries).toEqual(['clareza', 'legado', 'outro']);
  });

  it('null/undefined devolve lista vazia', () => {
    expect(orderedEvaluationEntries(null)).toEqual([]);
    expect(orderedEvaluationEntries(undefined)).toEqual([]);
  });
});
