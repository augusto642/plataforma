import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SocraticCatService } from './socratic-cat.service';
import { LlmClient } from './llm-client';

describe('SocraticCatService', () => {
  let service: SocraticCatService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue(''),
  };

  // API Key vazia para testar o motor heurístico
  const mockLlmClient = {
    hasApiKey: false,
    apiKey: '',
    complete: jest.fn(),
    stream: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocraticCatService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: LlmClient, useValue: mockLlmClient },
      ],
    }).compile();

    service = module.get<SocraticCatService>(SocraticCatService);
    mockLlmClient.hasApiKey = false;
    mockLlmClient.complete.mockReset();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('getSystemPrompt', () => {
    it('deve conter o axioma inegociável de nunca fornecer a linha de código corrigida', () => {
      const prompt = service.getSystemPrompt(1);
      expect(prompt).toContain('NUNCA, SOB NENHUMA CIRCUNSTÂNCIA, ENTREGUE A LINHA DE CÓDIGO CORRIGIDA');
      expect(prompt).toContain('Kuro');
      expect(prompt).toContain('Caixas de papelão etiquetadas 📦');
      expect(prompt).toContain('Xícaras de café ☕');
    });

    it('deve alternar as diretrizes de acordo com o Hint Level (Tiers 1, 2 e 3)', () => {
      const tier1 = service.getSystemPrompt(1);
      const tier2 = service.getSystemPrompt(2);
      const tier3 = service.getSystemPrompt(3);

      expect(tier1).toContain('TIER 1 (Pista Conceitual Sutil)');
      expect(tier2).toContain('TIER 2 (Localização do Raciocínio & Teste de Mesa)');
      expect(tier3).toContain('TIER 3 (Analogia Direta com Caixas/Xícaras)');
    });
  });

  describe('generateCatHint (Motor Heurístico)', () => {
    it('deve detectar perigo de Loop Infinito / Timeout e emitir alerta sonoro', async () => {
      const result = await service.generateCatHint({
        errorMessage: 'Time Limit Exceeded: Execution timed out after 3000ms',
        code: 'while n > 0: n += 1',
        hintLevel: 1,
        starterName: 'Pythox',
      });

      expect(result.catMood).toBe('alert');
      expect(result.soundEffect).toBe('alert_chirp');
      expect(result.socraticQuestion).toContain('linha de chegada');
      expect(result.visualMetaphor).toContain('Pista de Corrida');
    });

    it('deve orientar sobre dois-pontos e indentação em erros de Sintaxe (Hydra)', async () => {
      const result = await service.generateCatHint({
        errorMessage: 'SyntaxError: expected ":" at line 2',
        code: 'def atacar(base, nivel)\nbonus = 10',
        hintLevel: 2,
        starterName: 'Pythox',
      });

      expect(result.hintLevel).toBe(2);
      expect(result.catSpeech).toContain('dois pontos (:)');
      expect(result.socraticQuestion).toContain('dois-pontos');
    });

    it('deve reforçar a indexação em zero em erros de Índice (Off-by-One Goblin)', async () => {
      const result = await service.generateCatHint({
        errorMessage: 'IndexError: list index out of range',
        code: 'for i in range(1, len(itens) + 1): total += itens[i]',
        hintLevel: 1,
        starterName: 'Scripty',
      });

      expect(result.catMood).toBe('curious');
      expect(result.socraticQuestion).toContain('posição 0 ou na posição 1');
      expect(result.visualMetaphor).toContain('Gavetas Numeradas');
    });

    it('deve orientar sobre a palavra return quando a asserção vier vazia', async () => {
      const result = await service.generateCatHint({
        errorMessage: 'AssertionError: Esperado 40, mas recebeu undefined / None',
        code: 'def somar(a, b):\n    print(a + b)',
        hintLevel: 1,
      });

      expect(result.socraticQuestion).toContain('return');
      expect(result.visualMetaphor).toContain('Bandeira de Retorno');
    });
  });
});
