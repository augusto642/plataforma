import { Injectable } from '@nestjs/common';
import type { LlmUnavailableReason, TutorResponseSource } from './llm-client';
import { HIDDEN_TEST_FAILED_MESSAGE } from '../submissions/runner/runner.service';
import type { SocraticTier } from './socratic-tier.service';
import {
  AnalogousExample,
  ConceptReinforcement,
  buildConceptReinforcement,
  extractAuthoredAnalogousExample,
  findAnalogousExample,
} from './analogous-examples';

/**
 * B03 — Esgotamento do Tier 3: o Tier 3 começa com 3 submissões falhas
 * (ver SocraticTierService.tierFromSignals). Depois de MAIS 2 tentativas
 * falhas já em Tier 3 (5 no total), considera-se o estágio esgotado e o
 * tutor destrava o escape pós-Tier 3 (exemplo análogo resolvido ou reforço
 * conceitual) — sem nunca entregar a solução do exercício atual.
 */
export const TIER3_EXHAUSTION_FAILURES = 5;

/**
 * Saída destravada quando o aluno esgota o Tier 3. É mecanismo, não
 * conteúdo: o exemplo análogo pode vir do conteúdo autoral da atividade
 * (lessonPayload) ou do registro por conceito; sem nenhum dos dois, o
 * escape é o reforço conceitual. Ver analogous-examples.ts.
 */
export interface TutorEscape {
  unlocked: true;
  kind: 'analogous-example' | 'concept-reinforcement';
  concept: string;
  /** Mensagem ao aluno sinalizando o desbloqueio e como usar a saída. */
  note: string;
  analogousExample?: AnalogousExample;
  reinforcement?: ConceptReinforcement;
}

/** Padrões de erro que o fallback heurístico offline sabe reconhecer (B03). */
export type HeuristicErrorPattern =
  | 'syntax'
  | 'timeout'
  | 'index'
  | 'type'
  | 'return'
  | 'logic'
  | 'unknown';

export interface PedagogicalFeedback {
  summary: string;
  hints: string[];
  suggestedConcept: string;
  tier?: SocraticTier;
  /** Presente apenas quando o Tier 3 foi esgotado (escape pós-Tier 3). */
  escape?: TutorEscape;
  /**
   * Sprint 22 — proveniência da resposta (rótulo honesto): 'llm' quando
   * um provedor de verdade respondeu; 'heuristic' quando a resposta é
   * da engine heurística local, com o motivo em `fallbackReason`.
   * Ausente apenas no cache de feedbacks persistidos antes desta
   * sprint, cuja proveniência não é recuperável (sem migration).
   */
  source?: TutorResponseSource;
  /** Provedor/modelo que respondeu, quando source='llm'. */
  provider?: string;
  model?: string;
  /** Motivo do fallback, quando source='heuristic'. */
  fallbackReason?: LlmUnavailableReason;
}

/**
 * M12 — Engine heurística socrática offline (extraída do AiService god
 * service). Serviço puro (sem banco, sem LLM): classifica o padrão do
 * erro a partir dos testes visíveis falhos, gera as dicas por tier e
 * monta o escape pós-Tier 3. Regras de segurança preservadas do B01/B03:
 * o fallback NUNCA cita errorMessage de teste (nem visível — a mensagem
 * de asserção carrega valores esperados, que são meio gabarito) e nunca
 * entrega a solução do exercício atual.
 */
@Injectable()
export class HeuristicTutorService {
  /**
   * B03 — Monta o escape pós-Tier 3, ou null quando ele não deve disparar.
   * Dispara só em Tier 3 esgotado: failedCount >= TIER3_EXHAUSTION_FAILURES.
   * O exemplo análogo NUNCA é a solução do exercício atual: ele resolve um
   * problema diferente com a mesma técnica (conteúdo autoral da atividade
   * tem precedência sobre o registro por conceito). Sem exemplo disponível,
   * o escape é o reforço conceitual — também sem spoiler.
   */
  buildPostTier3Escape(
    activity: { title: string; conceptTags?: string[] | null; lessonPayload?: unknown },
    tier: SocraticTier,
    failedCount: number,
    suggestedConcept: string,
  ): TutorEscape | null {
    if (tier !== 3 || failedCount < TIER3_EXHAUSTION_FAILURES) return null;

    const concept = suggestedConcept || 'Lógica e Algoritmos';
    const authored = extractAuthoredAnalogousExample(activity.lessonPayload);
    // O registro casa SOMENTE pelas conceptTags da atividade (o sinal de
    // conceito autoral e confiável). O suggestedConcept do estágio NÃO entra
    // na busca: no fluxo heurístico ele é o rótulo genérico do tier (ex.:
    // "Complexidade Assintótica..."), que casaria com exemplos errados e
    // tornaria o reforço conceitual inalcançável.
    const registered = authored
      ? null
      : findAnalogousExample(activity.conceptTags || []);
    const example = authored || registered;

    if (example) {
      return {
        unlocked: true,
        kind: 'analogous-example',
        concept: example.concept,
        note:
          'Você esgotou os estágios de dicas deste exercício, então desbloqueei um EXEMPLO ANÁLOGO resolvido: ' +
          'é outro problema, com a mesma técnica, comentado passo a passo. Estude a técnica nele e transfira ' +
          'o raciocínio para o seu exercício — a solução do seu exercício continua sendo sua para descobrir.',
        analogousExample: example,
      };
    }

    return {
      unlocked: true,
      kind: 'concept-reinforcement',
      concept,
      note:
        'Você esgotou os estágios de dicas deste exercício, então desbloqueei um REFORÇO CONCEITUAL: ' +
        'uma explicação reforçada do conceito com perguntas guiadas para reconstruir a base antes da próxima tentativa.',
      reinforcement: buildConceptReinforcement(concept, activity.title),
    };
  }

  /**
   * B03 — Classifica o PADRAO do erro a partir dos testes VISÍVEIS falhos
   * (nome + mensagem) e de sinais do próprio código do aluno. A classificação
   * usa a mensagem apenas como sinal interno: ela nunca é citada na dica
   * (mensagens de asserção carregam os valores esperados = gabarito parcial).
   * Testes ocultos chegam aqui com a mensagem já mascarada (PedagogicalHintService)
   * e não alimentam nenhuma classificação específica.
   */
  private classifyErrorPattern(
    code: string,
    visibleFailedTests: any[],
  ): HeuristicErrorPattern {
    const haystack = visibleFailedTests
      .map((t) => `${t?.name || ''} ${t?.errorMessage || ''}`)
      .join(' ')
      .toLowerCase();

    if (visibleFailedTests.length === 0) {
      // Sem teste visível falho: o único sinal restante é o próprio código.
      if (code && !/\breturn\b/.test(code)) return 'return';
      return 'unknown';
    }
    if (/time limit|timeout|tempo limite|excedeu o tempo/.test(haystack)) return 'timeout';
    if (/index|out of range|out of bounds|of undefined|cannot read propert|fora do (indice|limite)/.test(haystack)) return 'index';
    if (/syntax|unexpected token|unexpected identifier|indent|parse error|invalid syntax|sintaxe/.test(haystack)) return 'syntax';
    if (/typeerror|type error|is not a function|not callable|nan\b|erro de tipo/.test(haystack)) return 'type';
    if (/undefined|is not defined|none\b|retornou vazio|sem retorno/.test(haystack) && !/\breturn\b/.test(code)) return 'return';
    if (/expected|assert|esperado|asser/.test(haystack)) return 'logic';
    return 'unknown';
  }

  generateHeuristicSocraticHints(
    code: string,
    failedTests: any[],
    title: string,
    tier: SocraticTier = 1,
  ): PedagogicalFeedback {
    const hints: string[] = [];

    if (!code || code.trim().length === 0) {
      hints.push('Comece declarando a função solicitada no enunciado.');
      hints.push('Certifique-se de que o nome da função e a quantidade de parâmetros correspondem exatamente ao solicitado.');
      return {
        summary: 'Seu arquivo de resposta está em branco.',
        hints,
        suggestedConcept: 'Declaração de Funções',
        tier,
      };
    }

    // B03: o fallback offline NÃO cita errorMessage de teste — nem de oculto
    // (já mascarado em PedagogicalHintService) nem de visível: a mensagem de
    // asserção traz os VALORES ESPERADOS, que são meio gabarito. O que a dica
    // pode usar dos testes visíveis é o NOME (identifica o caso, sem revelar
    // entrada nem esperado) e o PADRÃO do erro classificado a partir deles.
    const visibleFailed = failedTests.filter((t) => !t.isHidden);
    const hasHiddenFailure = failedTests.some((t) => t.isHidden);
    const pattern = this.classifyErrorPattern(code, visibleFailed);
    const firstVisibleName = visibleFailed[0]?.name as string | undefined;

    const tierConcepts: Record<SocraticTier, string> = {
      1: 'Modelo Mental e Invariantes',
      2: 'Casos de Borda e Simulação Passo a Passo',
      3: 'Complexidade Assintótica e Estruturas de Dados',
    };
    const tierSummaries: Record<SocraticTier, string> = {
      1: `Tier 1 (Modelo Mental) — Exercício: "${title}". Antes de mexer na sintaxe, vamos entender o que está acontecendo.`,
      2: `Tier 2 (Casos de Borda & Teste de Mesa) — Exercício: "${title}". Identificando o padrão do erro.`,
      3: `Tier 3 (Complexidade Big-O & Eficiência) — Exercício: "${title}". Corrigindo o padrão do erro e olhando o custo da solução.`,
    };

    // 1) Dicas do PADRÃO de erro (o coração do fallback socrático offline)
    switch (pattern) {
      case 'syntax':
        hints.push('O padrão é de sintaxe: o código nem chegou a executar, porque a gramática dele não fechou. Percorra a estrutura procurando pares que abrem e fecham (parênteses, chaves, colchetes) e a pontuação que encerra cada bloco.');
        hints.push('A linha apontada pelo erro costuma ser onde a leitura quebrou — mas a causa geralmente está nela ou na linha imediatamente anterior. O que essa linha deveria fechar ou separar?');
        break;
      case 'timeout':
        hints.push('O padrão é de tempo: o programa não terminou dentro do limite. Algum laço pode estar girando sem uma condição de parada alcançável — ou repetindo trabalho que poderia ser feito uma vez só.');
        hints.push('Siga a variável que controla o laço principal: a cada volta, ela se aproxima ou se afasta da condição de saída?');
        break;
      case 'index':
        hints.push('O padrão é de índice: algum acesso tentou uma posição que não existe na estrutura. Lembre que as posições começam em 0 — a última posição válida é sempre o tamanho menos um.');
        hints.push(firstVisibleName
          ? `No teste "${firstVisibleName}", qual era o tamanho da estrutura e qual posição o seu código tentou acessar logo antes da falha?`
          : 'Qual é a maior posição que o seu laço pode tentar acessar, e ela existe para o menor tamanho possível da estrutura?');
        break;
      case 'type':
        hints.push('O padrão é de tipo: alguma operação recebeu um valor de um tipo inesperado — texto onde se esperava número, ou um valor ausente que virou NaN ao entrar numa conta.');
        hints.push('De onde vem cada valor que entra na operação que falhou? Faça o teste de mesa anotando o TIPO de cada valor, não só o valor.');
        break;
      case 'return':
        hints.push('O padrão sugere que a função calcula, mas não entrega: quem a chamou recebeu um valor vazio. Calcular e devolver são passos diferentes.');
        hints.push('Siga o valor que você calcula até a última linha da função: ele é devolvido explicitamente a quem chamou, ou fica preso numa variável local?');
        break;
      case 'logic':
        hints.push('O padrão é de lógica: o programa executa e devolve um valor, mas o valor diverge do que o enunciado promete. O defeito está na regra de transformação, não na forma do código.');
        hints.push(firstVisibleName
          ? `Pegue o teste visível "${firstVisibleName}" e faça o teste de mesa com a entrada dele: em que linha o seu valor se afasta do caminho que o enunciado descreve?`
          : 'Escolha um caso do enunciado e faça o teste de mesa: em que linha o seu valor se afasta do caminho que o enunciado descreve?');
        break;
      default:
        // Padrão não reconhecido: pergunta socrática genérica do estágio.
        if (tier === 1) {
          hints.push('Em suas próprias palavras: qual transformação o algoritmo deve produzir entre os parâmetros recebidos e a saída esperada?');
        } else if (tier === 2) {
          hints.push('Realize um teste de mesa: anote em um papel o valor das variáveis linha a linha simulando a entrada de um caso do enunciado.');
        } else {
          hints.push('Avalie os limites de tempo e memória: a sua solução atual escala bem se o volume de dados aumentar significativamente?');
        }
        break;
    }

    // 2) Falha oculta sem detalhe visível: sinaliza com a mensagem genérica
    // (B01/B01b) e orienta a caça a casos de borda não exemplificados.
    if (hasHiddenFailure && visibleFailed.length === 0) {
      hints.push(`${HIDDEN_TEST_FAILED_MESSAGE} Quando os testes visíveis não explicam a falha, a causa costuma ser um caso de borda não exemplificado: vazio, zero, um único elemento, negativos ou o limite exato do enunciado.`);
    }

    // 3) Pergunta socrática de fechamento, por estágio (tier)
    if (tier === 1) {
      hints.push('Quais condições precisam ser verdadeiras no resultado para ele ser considerado correto, independentemente do caminho até ele?');
    } else if (tier === 2) {
      hints.push('Você considerou valores extremos como zero, negativos, listas vazias ou limites de tamanho?');
    } else {
      hints.push('Depois de corrigir o padrão: quantas vezes o seu algoritmo percorre os dados no pior caso? Se houver laços aninhados sobre os mesmos dados, existe uma estrutura (Map/Set) que transforme buscas repetidas em consultas diretas?');
    }

    return {
      summary: tierSummaries[tier],
      hints,
      suggestedConcept: tierConcepts[tier],
      tier,
    };
  }
}
