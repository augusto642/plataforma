/**
 * SocraticCatPrompts.ts
 * NEXUS CODE - Frontend Socratic Cat Prompts & Realtime Heuristics
 * 
 * Fornece:
 * 1. Persona oficial do Gato Preto Socrático (Kuro)
 * 2. Níveis de dica (Hint 1: Conceitual, Hint 2: Raciocínio, Hint 3: Analogia)
 * 3. Gerador heurístico socrático instantâneo no cliente para resposta com zero latência
 * 4. Frequências e parâmetros sonoros para sintetizar miados 8-bit no AudioSynthesizer
 */

export interface CatDialogueCue {
  mood: 'curious' | 'purr' | 'alert' | 'playful';
  speech: string;
  question: string;
  metaphor: string;
  soundCue: {
    frequency: number;
    pitchBendTo: number;
    duration: number;
    type: OscillatorType;
  };
}

export const CAT_SOUND_CUES = {
  meow: {
    frequency: 620,
    pitchBendTo: 880,
    duration: 0.18,
    type: 'square' as OscillatorType,
  },
  purr: {
    frequency: 180,
    pitchBendTo: 220,
    duration: 0.35,
    type: 'triangle' as OscillatorType,
  },
  alert_chirp: {
    frequency: 850,
    pitchBendTo: 1200,
    duration: 0.12,
    type: 'sine' as OscillatorType,
  },
};

/**
 * Gera intervenção socrática imediata no frontend (Zero Latency HUD)
 */
export function getClientSocraticHint(
  errorMessage: string = '',
  code: string = '',
  hintLevel: 1 | 2 | 3 = 1,
  starterName: string = 'Pythox',
): CatDialogueCue {
  const err = errorMessage.toLowerCase();

  // 1. Loop Infinito / Timeout
  if (err.includes('timeout') || err.includes('time limit') || err.includes('loop')) {
    if (hintLevel === 1) {
      return {
        mood: 'alert',
        speech: '*Miau de alerta! Orelhas abaixadas!* O processador congelou no tempo! O laço de repetição está correndo sem encontrar a bandeira de chegada!',
        question: 'A cada volta, a variável de controle está se aproximando ou se afastando do ponto de parada?',
        metaphor: 'Pista de Corrida Infinita 🏃',
        soundCue: CAT_SOUND_CUES.alert_chirp,
      };
    }
    if (hintLevel === 2) {
      return {
        mood: 'alert',
        speech: '*Balança a cauda rapidamente* Se você somar no contador em vez de subtrair, a condição de término nunca será atingida!',
        question: 'Qual operação matemática faz o valor se aproximar do zero a cada volta?',
        metaphor: 'O Novelo de Lã Desenfreado 🧶',
        soundCue: CAT_SOUND_CUES.alert_chirp,
      };
    }
    return {
      mood: 'curious',
      speech: '*Dá uma patadinha no teclado* Lembre-se da ampulheta: para o tempo acabar, a areia precisa descer (diminuir)! Adicione n -= 1 ou n-- dentro do laço.',
      question: 'Se a variável diminuir a cada volta, o laço para no momento certo?',
      metaphor: 'Ampulheta do Tempo ⏳',
      soundCue: CAT_SOUND_CUES.meow,
    };
  }

  // 2. Erro de Sintaxe / Pontuação / Indentação
  if (err.includes('syntax') || err.includes('indent') || err.includes('colon') || err.includes('token')) {
    if (hintLevel === 1) {
      return {
        mood: 'curious',
        speech: '*Olha torto para o código* Miau! O interpretador encontrou uma pedra na gramática antes mesmo de executar!',
        question: 'Todas as suas linhas de condição e função estão seladas com a pontuação certa no final?',
        metaphor: 'As Chaves do Castelo 🗝️',
        soundCue: CAT_SOUND_CUES.meow,
      };
    }
    if (hintLevel === 2) {
      return {
        mood: 'alert',
        speech: '*Aponta a patinha para o final da linha* Em Python, "def" e "if" exigem dois-pontos (:). Em JS e Java, toda chave { precisa de seu par }!',
        question: 'Você colocou dois-pontos (:) ou fechou todas as chaves e parênteses?',
        metaphor: 'A Régua de Indentação 📏',
        soundCue: CAT_SOUND_CUES.alert_chirp,
      };
    }
    return {
      mood: 'purr',
      speech: '*Ronrona suavemente* Alinhe o código com 4 espaços certinhos debaixo da condição e adicione a pontuação de fechamento.',
      question: 'O compilador agora consegue ler o bloco de instruções sem tropeçar?',
      metaphor: 'Quebra-Cabeça Encaixado 🧩',
      soundCue: CAT_SOUND_CUES.purr,
    };
  }

  // 3. Erro de Limite / Índice Fora do Tamanho
  if (err.includes('index') || err.includes('bounds') || err.includes('undefined') || err.includes('nan')) {
    if (hintLevel === 1) {
      return {
        mood: 'curious',
        speech: '*Patinha levantada* Miau! Em computação, tudo começa no ZERO! O primeiro item mora no índice 0.',
        question: 'Seu laço começou a contar no 0 ou no 1?',
        metaphor: 'Gavetas Numeradas no Zero 🗄️',
        soundCue: CAT_SOUND_CUES.meow,
      };
    }
    if (hintLevel === 2) {
      return {
        mood: 'alert',
        speech: '*Arrepia a cauda* Se uma lista tem 3 itens, eles moram em 0, 1 e 2. Se você tentar acessar lista[3], a memória estará vazia!',
        question: 'Você usou "< tamanho" ou "<= tamanho"? Lembre-se que o último índice é tamanho - 1!',
        metaphor: 'A Borda do Tabuleiro 🎲',
        soundCue: CAT_SOUND_CUES.alert_chirp,
      };
    }
    return {
      mood: 'purr',
      speech: '*Lamber de patas* Comece em i = 0 e pare estritamente antes do tamanho final com i < lista.length.',
      question: 'Agora todos os itens foram lidos do primeiro ao último com segurança?',
      metaphor: 'Caixa de Ovos Indexada 🥚',
      soundCue: CAT_SOUND_CUES.purr,
    };
  }

  // 4. Caso Padrão / Dúvida Geral
  return {
    mood: 'curious',
    speech: `*Ronronado suave ao lado de ${starterName}* Miau! Estou aqui te acompanhando no Modo Zen. Vamos pensar na entrada e na saída esperada.`,
    question: 'Qual valor você espera que a caixa do resultado guarde após a execução?',
    metaphor: 'Caixa de Memória 📦',
    soundCue: CAT_SOUND_CUES.meow,
  };
}
