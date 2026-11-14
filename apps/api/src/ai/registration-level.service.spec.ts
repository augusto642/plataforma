import 'reflect-metadata';
import { validate } from 'class-validator';
import {
  RegistrationLevelService,
  type RegistrationChallengeLanguage,
} from './registration-level.service';
import { EvaluateRegistrationLevelDto } from './dto/evaluate-registration-level.dto';

describe('RegistrationLevelService', () => {
  const languages: RegistrationChallengeLanguage[] = [
    'python',
    'javascript',
    'typescript',
    'java',
    'csharp',
    'go',
    'php',
    'sql',
    'rust',
    'logic',
  ];

  describe('getChallenge', () => {
    const service = new RegistrationLevelService();

    it.each(languages)(
      'retorna desafio público para %s sem vazar gabarito interno',
      (lang) => {
        const challenge = service.getChallenge({
          programmed: lang !== 'logic',
          language: lang,
        });

        expect(challenge.language).toBe(lang);
        expect(challenge.id).toBeTruthy();
        expect(challenge.languageLabel).toBeTruthy();
        expect(challenge.title).toBeTruthy();
        expect(challenge.prompt).toBeTruthy();
        expect(challenge.codeSnippet).toBeTruthy();
        expect(challenge.hint).toBeTruthy();
        expect((challenge as any).expectedConcepts).toBeUndefined();
        expect((challenge as any).intermediateSignals).toBeUndefined();
        expect((challenge as any).advancedSignals).toBeUndefined();
      },
    );

    it('retorna desafio de lógica quando programmed=false mesmo com language informada', () => {
      const challenge = service.getChallenge({
        programmed: false,
        language: 'python',
      });
      expect(challenge.language).toBe('logic');
    });

    it('normaliza aliases (c#, golang, js, ts) e faz fallback para logic em outra linguagem', () => {
      expect(
        service.getChallenge({ programmed: true, language: 'C#' }).language,
      ).toBe('csharp');
      expect(
        service.getChallenge({ programmed: true, language: 'golang' }).language,
      ).toBe('go');
      expect(
        service.getChallenge({ programmed: true, language: 'JS' }).language,
      ).toBe('javascript');
      expect(
        service.getChallenge({ programmed: true, language: 'ts' }).language,
      ).toBe('typescript');
      expect(
        service.getChallenge({ programmed: true, language: 'elixir' }).language,
      ).toBe('logic');
    });
  });

  describe('evaluateExplanation — heurística e anti-humilhação', () => {
    const service = new RegistrationLevelService();

    it('retorna beginner com feedback encorajador se !hasProgrammedBefore e resposta < 15 chars', async () => {
      const res = await service.evaluateExplanation({
        hasProgrammedBefore: false,
        explanation: 'não sei',
      });

      expect(res.detectedLevel).toBe('beginner');
      expect(res.levelLabel).toBe('Iniciante');
      expect(res.source).toBe('heuristic');
      expect(res.feedback).toMatch(/começar|zero|fundamentos/i);
      expect(res.feedback.toLowerCase()).not.toMatch(
        /fracasso|insuficiente|reprovado|errado|ruim/,
      );
    });

    it('calibra resposta simples/sincera sem humilhar como beginner', async () => {
      const res = await service.evaluateExplanation({
        hasProgrammedBefore: false,
        language: 'logic',
        explanation: 'Acho que ela junta uns números no final, mas nunca estudei código.',
      });

      expect(res.detectedLevel).toBe('beginner');
      expect(res.source).toBe('heuristic');
      expect(res.feedback).toMatch(/ponto de partida|iniciante/i);
      expect(res.feedback.toLowerCase()).not.toMatch(
        /fracasso|insuficiente|reprovado|burro|incapaz/,
      );
    });

    it('calibra explicação de fluxo principal em Python como junior', async () => {
      const res = await service.evaluateExplanation({
        hasProgrammedBefore: true,
        language: 'python',
        explanation:
          'A função percorre a lista de pedidos com um loop for, verifica com if se o pedido foi pago, soma o valor por categoria em um dicionário e retorna esse total.',
      });

      expect(res.detectedLevel).toBe('junior');
      expect(res.levelLabel).toBe('Júnior');
      expect(res.source).toBe('heuristic');
      expect(res.detectedConcepts.length).toBeGreaterThanOrEqual(2);
    });

    it('calibra explicação com casos de borda e complexidade como mid', async () => {
      const res = await service.evaluateExplanation({
        hasProgrammedBefore: true,
        language: 'python',
        explanation:
          'Ela itera a lista de pedidos pagos em O(n), usa .get com valor padrão para evitar KeyError e agrupa a soma no dicionário, mas deveria validar valores None ou negativos.',
      });

      expect(res.detectedLevel).toBe('mid');
      expect(res.levelLabel).toBe('Pleno');
      expect(res.source).toBe('heuristic');
    });

    it('calibra análise profunda de trade-offs/precisão/memória como senior', async () => {
      const res = await service.evaluateExplanation({
        hasProgrammedBefore: true,
        language: 'python',
        explanation:
          'A função percorre os pedidos em O(n) usando .get com default para evitar KeyError e soma no dicionário. Como melhoria, valores monetários não devem usar float por erro de ponto flutuante (melhor Decimal ou centavos inteiros), e vale definir um contrato tipado com TypedDict ou defaultdict.',
      });

      expect(res.detectedLevel).toBe('senior');
      expect(res.levelLabel).toBe('Sênior');
      expect(res.source).toBe('heuristic');
    });
  });

  describe('evaluateExplanation — integração com LlmClient mockado', () => {
    it('usa LlmClient quando disponível e devolve source=llm', async () => {
      const llm = {
        isAvailable: true,
        complete: jest.fn().mockResolvedValue(
          JSON.stringify({
            detectedLevel: 'mid',
            confidence: 'high',
            feedback:
              'Você observou muito bem a prevenção de SQL Injection com prepared statements! Seu ponto de partida recomendado é o nível Pleno.',
            detectedConcepts: ['Prepared statements', 'Normalização de e-mail'],
          }),
        ),
      };
      const service = new RegistrationLevelService(llm as any);

      const res = await service.evaluateExplanation({
        hasProgrammedBefore: true,
        language: 'php',
        explanation:
          'Normaliza o email com trim e lowercase e usa prepare/execute no PDO para evitar SQL injection.',
      });

      expect(llm.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          jsonMode: true,
          timeoutMs: 12000,
          purpose: 'registration-level-eval',
        }),
      );
      expect(res).toEqual({
        detectedLevel: 'mid',
        levelLabel: 'Pleno',
        confidence: 'high',
        feedback:
          'Você observou muito bem a prevenção de SQL Injection com prepared statements! Seu ponto de partida recomendado é o nível Pleno.',
        detectedConcepts: ['Prepared statements', 'Normalização de e-mail'],
        source: 'llm',
      });
    });

    it('não chama LLM quando !hasProgrammedBefore e resposta < 15 chars', async () => {
      const llm = {
        isAvailable: true,
        complete: jest.fn(),
      };
      const service = new RegistrationLevelService(llm as any);

      const res = await service.evaluateExplanation({
        hasProgrammedBefore: false,
        explanation: 'oi',
      });

      expect(llm.complete).not.toHaveBeenCalled();
      expect(res.detectedLevel).toBe('beginner');
      expect(res.source).toBe('heuristic');
    });

    it('cai graciosamente para heurística quando LLM falha ou retorna JSON inválido', async () => {
      const llmFailing = {
        isAvailable: true,
        complete: jest.fn().mockRejectedValue(new Error('timeout')),
      };
      const service1 = new RegistrationLevelService(llmFailing as any);
      const res1 = await service1.evaluateExplanation({
        hasProgrammedBefore: true,
        language: 'javascript',
        explanation:
          'A função usa filter para percorrer os usuários ativos e um Set para remover emails duplicados.',
      });
      expect(res1.source).toBe('heuristic');
      expect(res1.detectedLevel).toBe('junior');

      const llmBadJson = {
        isAvailable: true,
        complete: jest.fn().mockResolvedValue('{"detectedLevel": "master"}'),
      };
      const service2 = new RegistrationLevelService(llmBadJson as any);
      const res2 = await service2.evaluateExplanation({
        hasProgrammedBefore: true,
        language: 'javascript',
        explanation:
          'Usa filter para checar usuário ativo e Set para deduplicar email normalizado com trim e lowercase.',
      });
      expect(res2.source).toBe('heuristic');
      expect(res2.detectedLevel).toBe('mid');
    });
  });

  describe('EvaluateRegistrationLevelDto', () => {
    it('aceita payload válido e rejeita campos acima de MaxLength', async () => {
      const valid = Object.assign(new EvaluateRegistrationLevelDto(), {
        hasProgrammedBefore: true,
        language: 'python',
        challengeId: 'reg-python-v1',
        explanation: 'Percorre a lista e soma os valores.',
      });
      expect(await validate(valid)).toHaveLength(0);

      const overExplanation = Object.assign(new EvaluateRegistrationLevelDto(), {
        hasProgrammedBefore: true,
        explanation: 'x'.repeat(2001),
      });
      const err1 = await validate(overExplanation);
      expect(err1.some((e) => e.property === 'explanation')).toBe(true);

      const overLanguage = Object.assign(new EvaluateRegistrationLevelDto(), {
        hasProgrammedBefore: true,
        language: 'x'.repeat(51),
        explanation: 'ok',
      });
      const err2 = await validate(overLanguage);
      expect(err2.some((e) => e.property === 'language')).toBe(true);
    });

    it('aceita campos do Pacote 1 (tabSwitchCount, followUpQuestion, followUpAnswer)', async () => {
      const dto = Object.assign(new EvaluateRegistrationLevelDto(), {
        hasProgrammedBefore: true,
        language: 'javascript',
        explanation: 'Filtra os elementos pares do array.',
        tabSwitchCount: 2,
        followUpQuestion: 'O que acontece com array vazio?',
        followUpAnswer: 'Retorna array vazio []',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Pacote 1.1 — Follow-up Relâmpago e Anti-Cheat', () => {
    const service = new RegistrationLevelService();

    it('gera pergunta relâmpago de 60s com fallback inteligente', async () => {
      const followUp = await service.generateFollowUpQuestion({
        language: 'python',
        explanation: 'Itera sobre o dicionário.',
      });
      expect(followUp.timeLimitSeconds).toBe(60);
      expect(typeof followUp.question).toBe('string');
      expect(followUp.question.length).toBeGreaterThan(10);
    });

    it('aplica escrutínio anti-cheat quando ocorrem muitas trocas de aba sem resposta no follow-up', async () => {
      const res = await service.evaluateExplanation({
        hasProgrammedBefore: true,
        language: 'python',
        explanation:
          'Ela itera a lista de pedidos pagos em O(n), usa .get com valor padrão para evitar KeyError e agrupa a soma no dicionário, mas deveria validar valores None ou negativos.',
        tabSwitchCount: 4,
        followUpAnswer: '',
      });
      expect(res.confidence).toBe('low');
      expect(res.detectedLevel).toBe('junior');
    });
  });
});
