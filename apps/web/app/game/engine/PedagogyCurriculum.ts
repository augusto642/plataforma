/**
 * PedagogyCurriculum.ts
 * NEXUS CODE - Matriz Curricular & Lições Didáticas Visuais (Modo Zen)
 * 
 * Estrutura pedagógica gradual em 5 Atos para os 3 Starters Iniciantes:
 * - 🐍 Pythox (Python)
 * - ⚡ Scripty (JavaScript)
 * - ☕ Javagon (Java)
 * 
 * Metodologia:
 * - Carga Cognitiva Reduzida (Sweller): Textos concisos e didáticos.
 * - Modelos Mentais Concretos: Caixas Etiquetadas 📦 e Xícaras de Café ☕.
 * - Modo Zen: Zero contadores regressivos, ritmo próprio do aluno.
 * - Reflexão Socrática do Mascote Gato Preto para fixação cognitiva.
 */

export type StarterTrack = 'python' | 'javascript' | 'java';

export interface MemoryDiagram {
  ascii: string;
  explanation: string;
  badgeLabel: string;
}

export interface CodeStepExplanation {
  line: number;
  text: string;
}

export interface CodeSnippetStep {
  language: string;
  code: string;
  linesExplanation: CodeStepExplanation[];
}

export interface SocraticCatPrompt {
  catMood: 'curious' | 'purr' | 'alert' | 'playful';
  soundEffect: 'meow' | 'purr' | 'alert_chirp';
  question: string;
  reflectionHint: string;
}

export interface LessonModular {
  id: string;
  track: StarterTrack;
  starterMonster: 'pythox' | 'scripty' | 'javagon';
  stage: number;
  slug: string;
  title: string;
  subtitle: string;
  zenMode: {
    enabled: boolean;
    description: string;
    targetReadingTimeMinutes: number;
  };
  visualMetaphor: {
    type: 'box' | 'cup' | 'bifurcation' | 'race_track' | 'coffee_machine';
    icon: string;
    title: string;
    description: string;
  };
  memoryDiagram: MemoryDiagram;
  stepByStepCode: CodeSnippetStep;
  socraticReflection: SocraticCatPrompt;
  practicalTakeaway: string;
}

// ============================================================================
// 🐍 TRILHA 1: PYTHOX (PYTHON) — A Cobra Boladona da Sintaxe Limpa
// ============================================================================

export const PYTHON_LESSONS: LessonModular[] = [
  {
    id: 'py-lesson-1',
    track: 'python',
    starterMonster: 'pythox',
    stage: 1,
    slug: 'variaveis-caixas-etiquetadas',
    title: '1. Variáveis como Caixas Etiquetadas 📦',
    subtitle: 'Guardando seu primeiro dado na memória do computador',
    zenMode: {
      enabled: true,
      description: 'Modo Zen Ativo: Sem tempo limite. Respire fundo e visualize a memória.',
      targetReadingTimeMinutes: 2,
    },
    visualMetaphor: {
      type: 'box',
      icon: '📦',
      title: 'A Caixa de Papelão Mágica',
      description: 'Uma variável em Python é uma caixa de papelão etiquetada. O sinal "=" significa colocar algo dentro dela. Se você colocar outro valor depois, o antigo sai e o novo entra!',
    },
    memoryDiagram: {
      ascii: `
  +---------------------------------------+
  |           MEMÓRIA DO PYTHON           |
  |                                       |
  |      nome_heroi          nivel_xp     |
  |    ┌────────────┐     ┌────────────┐  |
  |    │  "Pythox"  │     │     10     │  |
  |    └────────────┘     └────────────┘  |
  |      (Texto/str)       (Número/int)   |
  +---------------------------------------+
`,
      explanation: 'Cada variável reserva um endereço e guarda seu conteúdo etiquetado com o nome que você escolheu.',
      badgeLabel: 'Heap / Stack Visualization',
    },
    stepByStepCode: {
      language: 'python',
      code: `# 1. Pegamos uma caixa e colamos a etiqueta 'nome'
nome = "Pythox"

# 2. Pegamos outra caixa e guardamos um número
nivel = 1

# 3. Revelamos o que tem na caixa usando print()
print(nome)
print(nivel)`,
      linesExplanation: [
        { line: 2, text: 'Cria a variável "nome" e coloca o texto "Pythox" dentro dela.' },
        { line: 5, text: 'Cria a variável "nivel" com o valor inteiro 1.' },
        { line: 8, text: 'Exibe no terminal o conteúdo atual guardado na caixa "nome".' },
      ],
    },
    socraticReflection: {
      catMood: 'curious',
      soundEffect: 'meow',
      question: 'Miau! Se você fizer: poder = 5 e na linha seguinte fizer poder = 20, o que sobrou do número 5 dentro da caixa?',
      reflectionHint: 'Pense na substituição física: a caixa só tem espaço para um valor por vez!',
    },
    practicalTakeaway: 'Variáveis guardam dados. O "=" não é igualdade matemática, é atribuição (depósito na caixa)!',
  },

  {
    id: 'py-lesson-2',
    track: 'python',
    starterMonster: 'pythox',
    stage: 2,
    slug: 'tipos-gavetas-memoria',
    title: '2. Tipos de Dados e Gavetas na Memória 🗄️',
    subtitle: 'Descobrindo Números, Textos e Decisões Booleanas',
    zenMode: {
      enabled: true,
      description: 'Modo Zen Ativo: Aprenda a distinguir números inteiros, números decimais e palavras.',
      targetReadingTimeMinutes: 2,
    },
    visualMetaphor: {
      type: 'box',
      icon: '🗄️',
      title: 'As 4 Gavetas Especiais',
      description: 'Nem toda informação é igual! Python organiza seus dados em gavetas: Números Inteiros (int), Números com Ponto (float), Textos entre aspas (str) e Interruptores de Verdadeiro/Falso (bool).',
    },
    memoryDiagram: {
      ascii: `
  +-------------------------------------------------------------+
  |              AS 4 FORMAS DE DADOS NA MEMÓRIA                |
  |                                                             |
  |  [ int ]      [ float ]       [ str ]          [ bool ]     |
  |   Pontos      Velocidade      Nome Golpe        Vivo?       |
  |    ┌──┐         ┌─────┐      ┌──────────┐       ┌────┐      |
  |    │10│         │ 4.5 │      │ "Presa"  │       │True│      |
  |    └──┘         └─────┘      └──────────┘       └────┘      |
  +-------------------------------------------------------------+
`,
      explanation: 'O Python descobre o tipo automaticamente quando você digita o valor (tipagem dinâmica e forte).',
      badgeLabel: 'Primitivos Fundamentais',
    },
    stepByStepCode: {
      language: 'python',
      code: `hp_maximo = 100       # int (número inteiro)
defesa = 12.5         # float (número com casas decimais)
elemento = "Veneno"   # str (texto sempre entre aspas)
esta_ativo = True     # bool (True ou False, com inicial maiúscula)`,
      linesExplanation: [
        { line: 1, text: 'Números sem vírgula/ponto são inteiros (int).' },
        { line: 2, text: 'Números com ponto decimal são reais (float).' },
        { line: 3, text: 'Sempre coloque textos entre aspas duplas ou simples para ser string (str).' },
        { line: 4, text: 'Valores booleanos são interruptores: True (ligado) ou False (desligado).' },
      ],
    },
    socraticReflection: {
      catMood: 'purr',
      soundEffect: 'purr',
      question: '*Ronrona* Se escrevermos x = 10 e y = "10", as duas caixas têm coisas iguais ou coisas diferentes?',
      reflectionHint: 'Tente somar x + 2 e depois y + 2 no seu pensamento. O que as aspas mudam?',
    },
    practicalTakeaway: 'Sempre cuide das aspas! "10" é uma palavra; 10 é uma quantidade com a qual se faz conta.',
  },

  {
    id: 'py-lesson-3',
    track: 'python',
    starterMonster: 'pythox',
    stage: 3,
    slug: 'condicionais-bifurcacao-caminho',
    title: '3. Condicionais: A Bifurcação do Caminho 🔀',
    subtitle: 'Ensinando seu monstrinho a tomar decisões com if e else',
    zenMode: {
      enabled: true,
      description: 'Modo Zen Ativo: Compreenda a bifurcação lógica sem pressa.',
      targetReadingTimeMinutes: 3,
    },
    visualMetaphor: {
      type: 'bifurcation',
      icon: '🔀',
      title: 'A Encruzilhada na Floresta',
      description: 'Um programa não segue apenas em linha reta. O comando "if" (se) avalia uma condição: se for verdadeira, ele segue a trilha da esquerda; senão ("else"), segue a da direita!',
    },
    memoryDiagram: {
      ascii: `
                    [ vida > 0 ? ]
                       /      \\
               SIM    /        \\    NÃO
                     v          v
              ┌───────────┐  ┌───────────┐
              │ Atacar! ⚔️ │  │ Desmaiar 💤│
              └───────────┘  └───────────┘
`,
      explanation: 'O fluxo de controle do interpretador desvia para o bloco indentado (4 espaços) apenas quando a condição é atendida.',
      badgeLabel: 'Controle de Fluxo',
    },
    stepByStepCode: {
      language: 'python',
      code: `vida = 35

if vida > 50:
    print("Pythox está com energia máxima! ⚡")
elif vida > 0:
    print("Pythox ainda luta com determinação! 🐍")
else:
    print("Pythox precisa de uma poção de descanso! 🧪")`,
      linesExplanation: [
        { line: 3, text: 'Testa se a vida é maior que 50. Como 35 não é > 50, ele pula esse bloco.' },
        { line: 5, text: '"elif" (senão-se) testa se 35 > 0. É verdadeiro! Este bloco será executado.' },
        { line: 7, text: '"else" é o porto-seguro caso nenhuma das condições acima seja verdadeira.' },
      ],
    },
    socraticReflection: {
      catMood: 'curious',
      soundEffect: 'meow',
      question: 'Miau! O que aconteceria se você esquecesse o recuo (os 4 espaços) nas linhas debaixo do if?',
      reflectionHint: 'Python usa o alinhamento visual dos blocos para saber o que pertence ao if!',
    },
    practicalTakeaway: 'O if precisa de uma pergunta sim/não (booleana) e indentação precisa com 4 espaços.',
  },

  {
    id: 'py-lesson-4',
    track: 'python',
    starterMonster: 'pythox',
    stage: 4,
    slug: 'lacos-pista-corrida',
    title: '4. Laços de Repetição: A Pista de Corrida 🏃',
    subtitle: 'Automatizando voltas sem cansar com for e while',
    zenMode: {
      enabled: true,
      description: 'Modo Zen Ativo: Veja o ponteiro girar no laço com segurança.',
      targetReadingTimeMinutes: 3,
    },
    visualMetaphor: {
      type: 'race_track',
      icon: '🏃',
      title: 'A Pista Circular com Bandeira de Chegada',
      description: 'Computadores amam repetição. Um laço "for" dá um número exato de voltas na pista. Já o "while" continua correndo enquanto uma condição for verdadeira. Mas cuidado: se nunca levantar a bandeira vermelha, você fica preso no circuito para sempre!',
    },
    memoryDiagram: {
      ascii: `
          ┌──> [ Volta 1: i = 0 ] ──┐
          │                         │
          │    [ Volta 2: i = 1 ]   v
    [ Início ]                 [ Teste: i < 3? ]
          ▲    [ Volta 3: i = 2 ]   │
          │                         │
          └─── FIM (quando i == 3) <┘
`,
      explanation: 'A cada volta, a variável contadora avança e o computador verifica se já atingiu o limite.',
      badgeLabel: 'Iteração e Invariantes',
    },
    stepByStepCode: {
      language: 'python',
      code: `# Exemplo com for (número de voltas conhecido):
for volta in range(1, 4):
    print(f"Pythox completou a volta {volta}!")

# Exemplo com while (com parada garantida):
energia = 3
while energia > 0:
    print(f"Treinando... Energia restante: {energia}")
    energia -= 1  # Crucial: diminuir a energia para não virar loop infinito!`,
      linesExplanation: [
        { line: 2, text: 'range(1, 4) gera os números 1, 2 e 3 (o 4 é o limite de parada e não entra).' },
        { line: 7, text: 'O while repete o bloco enquanto energia for estritamente maior que 0.' },
        { line: 9, text: 'Diminuir 1 a cada volta garante que energia chegará a 0 e o laço encerrará com vitória.' },
      ],
    },
    socraticReflection: {
      catMood: 'alert',
      soundEffect: 'alert_chirp',
      question: '*Orelhas alertas!* Se apagarmos a linha energia -= 1, quantas voltas o while dará?',
      reflectionHint: 'Pense no The Infinite Loop Drake: energia continuaria valendo 3 para sempre!',
    },
    practicalTakeaway: 'Em todo laço, certifique-se de que a condição de parada seja alcançada a cada volta.',
  },

  {
    id: 'py-lesson-5',
    track: 'python',
    starterMonster: 'pythox',
    stage: 5,
    slug: 'funcoes-maquina-cafe',
    title: '5. Funções: A Máquina de Café Programável ☕',
    subtitle: 'Criando feitiços reutilizáveis com def e return',
    zenMode: {
      enabled: true,
      description: 'Modo Zen Ativo: Entenda entradas (parâmetros) e saídas (return).',
      targetReadingTimeMinutes: 3,
    },
    visualMetaphor: {
      type: 'coffee_machine',
      icon: '☕',
      title: 'A Cafeteira Automática',
      description: 'Uma função é como uma cafeteira mágica: você coloca grãos e água na entrada (parâmetros), aperta o botão (chamada da função), a máquina processa e te entrega uma xícara pronta na saída (return)!',
    },
    memoryDiagram: {
      ascii: `
     ENTRADA (Parâmetros)           PROCESSAMENTO INTERNO           SAÍDA (return)
   ┌──────────────────────┐        ┌─────────────────────┐        ┌────────────────┐
   │ graos="forte"        │  ===>  │ Moer grãos...       │  ===>  │ ☕ Xícara Café  │
   │ acucar=2             │        │ Aquecer água...     │        │ com 2 colheres │
   └──────────────────────┘        └─────────────────────┘        └────────────────┘
`,
      explanation: 'A instrução "return" devolve o resultado para quem chamou a função poder usá-lo em outros cálculos.',
      badgeLabel: 'Modularização & Escopo',
    },
    stepByStepCode: {
      language: 'python',
      code: `def preparar_golpe(poder_base, bonus_treino):
    dano_total = poder_base + bonus_treino
    return dano_total  # Devolve o resultado empacotado!

# Agora podemos usar a função quantas vezes quisermos:
ataque_1 = preparar_golpe(30, 10)
ataque_2 = preparar_golpe(50, 15)

print(f"Ataque 1 causou {ataque_1} de dano!")`,
      linesExplanation: [
        { line: 1, text: '"def" ensina ao Python uma nova receita chamada preparar_golpe.' },
        { line: 2, text: 'dano_total só existe temporariamente dentro dessa função (escopo local).' },
        { line: 3, text: '"return" é a entrega da xícara: cospe o valor para fora da função.' },
        { line: 6, text: 'Chamamos a função com 30 e 10, guardando o retorno (40) em ataque_1.' },
      ],
    },
    socraticReflection: {
      catMood: 'purr',
      soundEffect: 'purr',
      question: '*Lamber de patas* Se você trocar "return dano_total" por "print(dano_total)", o que ataque_1 guardará?',
      reflectionHint: 'Print só exibe na tela; return devolve o dado para a variável guardar!',
    },
    practicalTakeaway: 'Use "def" para criar o feitiço e "return" para devolver o valor calculado a quem chamou.',
  },
];

// ============================================================================
// ⚡ TRILHA 2: SCRIPTY (JAVASCRIPT) — O Feixe Elétrico da Web
// ============================================================================

export const JAVASCRIPT_LESSONS: LessonModular[] = [
  {
    id: 'js-lesson-1',
    track: 'javascript',
    starterMonster: 'scripty',
    stage: 1,
    slug: 'variaveis-let-const-caixas',
    title: '1. Variáveis como Caixas Etiquetadas 📦',
    subtitle: 'Criando caixas com let e caixas blindadas com const',
    zenMode: {
      enabled: true,
      description: 'Modo Zen Ativo: Entenda por que usamos const e let no JavaScript moderno.',
      targetReadingTimeMinutes: 2,
    },
    visualMetaphor: {
      type: 'box',
      icon: '📦',
      title: 'Caixas Flexíveis vs Caixas Lacradas',
      description: 'No JavaScript moderno, temos duas caixas principais: "let" (uma caixa normal que você pode abrir e trocar o conteúdo) e "const" (uma caixa com cadeado: depois de colocar o valor, ninguém altera).',
    },
    memoryDiagram: {
      ascii: `
  +-------------------------------------------------+
  |             MEMÓRIA DO JAVASCRIPT               |
  |                                                 |
  |   const nomeMonstro        let cargaEletrica    |
  |   ┌───────────────┐        ┌────────────────┐   |
  |   │🔒 "Scripty"   │        │   🔓 75 -> 90  │   |
  |   └───────────────┘        └────────────────┘   |
  |     (Inalterável)            (Pode atualizar)   |
  +-------------------------------------------------+
`,
      explanation: 'Variáveis const protegem seus dados contra alterações acidentais de outros scripts.',
      badgeLabel: 'Declaração com Escopo de Bloco',
    },
    stepByStepCode: {
      language: 'javascript',
      code: `// Caixa lacrada: o nome não muda durante a batalha
const nome = "Scripty";

// Caixa flexível: a energia pode aumentar ou diminuir
let energia = 100;
energia = energia - 15;

console.log(nome);     // Saída: "Scripty"
console.log(energia);  // Saída: 85`,
      linesExplanation: [
        { line: 2, text: '"const" cria uma variável imutável (o identificador não pode ser reatribuído).' },
        { line: 5, text: '"let" cria uma variável que aceita novas atribuições posteriores.' },
        { line: 6, text: 'Atualizamos a caixa: 100 menos 15 vira 85.' },
      ],
    },
    socraticReflection: {
      catMood: 'curious',
      soundEffect: 'meow',
      question: 'Miau! O que o interpretador do JavaScript fará se você tentar executar: const chave = 1; chave = 2; ?',
      reflectionHint: 'Pense no cadeado da caixa const: TypeError por tentar violar o lacre!',
    },
    practicalTakeaway: 'Prefira sempre "const". Só use "let" quando tiver certeza de que o valor precisará mudar.',
  },

  {
    id: 'js-lesson-2',
    track: 'javascript',
    starterMonster: 'scripty',
    stage: 2,
    slug: 'tipos-dados-coercao',
    title: '2. Tipos de Dados e Gavetas na Memória 🗄️',
    subtitle: 'Numbers, Strings, Booleans e o Perigo da Coerção',
    zenMode: {
      enabled: true,
      description: 'Modo Zen Ativo: Veja como o JavaScript lida com tipos numéricos e textos.',
      targetReadingTimeMinutes: 2,
    },
    visualMetaphor: {
      type: 'cup',
      icon: '☕',
      title: 'A Xícara de Números vs O Copo de Letras',
      description: 'Em JS, números inteiros e decimais ficam na mesma xícara (tipo Number). Mas atenção: se você somar um texto com um número, o JS cola as duas palavras em vez de fazer a conta matemática!',
    },
    memoryDiagram: {
      ascii: `
  CUIDADO COM A COERÇÃO DE TIPOS:
  
     5 (number)   +   5 (number)    ===>   10 (number)  ✅
    "5" (string)  +   5 (number)    ===>  "55" (string) ⚠️ (Colou!)
`,
      explanation: 'O operador + com qualquer texto vira concatenação (junção de palavras).',
      badgeLabel: 'Tipagem Dinâmica JS',
    },
    stepByStepCode: {
      language: 'javascript',
      code: `const velocidade = 80;         // number
const nomeGolpe = "Raio Trovao"; // string
const estaCarregado = true;     // boolean

// Evitando a armadilha do texto:
const entradaTexto = "25";
const danoReal = Number(entradaTexto) + 5; // 25 + 5 = 30
console.log(danoReal);`,
      linesExplanation: [
        { line: 1, text: 'Em JS não há separação de int e float; tudo é tipo "number".' },
        { line: 7, text: 'Usamos Number(texto) para converter texto em valor numérico real antes de somar.' },
      ],
    },
    socraticReflection: {
      catMood: 'alert',
      soundEffect: 'alert_chirp',
      question: '*Olhos arregalados* Se você somar "10" + 20, o resultado é 30 ou "1020"? E se for "10" - 20?',
      reflectionHint: 'O sinal de + serve para texto e número, mas o sinal de - só existe na matemática!',
    },
    practicalTakeaway: 'Sempre converta strings numéricas com Number() para evitar que "10" + 5 vire "105".',
  },

  {
    id: 'js-lesson-3',
    track: 'javascript',
    starterMonster: 'scripty',
    stage: 3,
    slug: 'condicionais-estritas',
    title: '3. Condicionais: A Bifurcação do Caminho 🔀',
    subtitle: 'Tomando decisões seguras com if, else e a igualdade tripla ===',
    zenMode: {
      enabled: true,
      description: 'Modo Zen Ativo: Aprenda a diferença vital entre == e ===.',
      targetReadingTimeMinutes: 3,
    },
    visualMetaphor: {
      type: 'bifurcation',
      icon: '🔀',
      title: 'A Balança de Dois Pratos Estrita',
      description: 'Em JavaScript, sempre usamos três iguais "===" para testar igualdade. Ele verifica se tanto o valor quanto o tipo são idênticos, impedindo ilusões.',
    },
    memoryDiagram: {
      ascii: `
     5 === 5    ---> TRUE  (Mesmo valor e mesmo tipo)
     5 === "5"  ---> FALSE (Tipos diferentes: number vs string)
     5 == "5"   ---> TRUE  (Perigoso! Força conversão oculta)
`,
      explanation: 'Use sempre === (igualdade estrita) para evitar bugs sutis em produção.',
      badgeLabel: 'Strict Equality',
    },
    stepByStepCode: {
      language: 'javascript',
      code: `const voltagem = 220;

if (voltagem > 200) {
  console.log("Supercarga liberada! ⚡⚡");
} else if (voltagem >= 110) {
  console.log("Carga estável de combate! ⚡");
} else {
  console.log("Bateria fraca, recarregue! 🔋");
}`,
      linesExplanation: [
        { line: 3, text: 'Se voltagem for maior que 200, entra nas chaves deste bloco.' },
        { line: 5, text: '"else if" avalia a próxima condição se a primeira for falsa.' },
        { line: 7, text: '"else" atua como salvaguarda padrão.' },
      ],
    },
    socraticReflection: {
      catMood: 'curious',
      soundEffect: 'meow',
      question: 'Miau! Se colocarmos voltagem = "220" com aspas e compararmos com voltagem === 220, vai dar verdadeiro ou falso?',
      reflectionHint: 'Um é uma palavra de 3 caracteres, o outro é um número. A balança estrita detecta a farsa!',
    },
    practicalTakeaway: 'Use sempre "===" e delimite o bloco com chaves { } para clareza e segurança.',
  },

  {
    id: 'js-lesson-4',
    track: 'javascript',
    starterMonster: 'scripty',
    stage: 4,
    slug: 'lacos-for-while-js',
    title: '4. Laços de Repetição: A Pista de Corrida 🏃',
    subtitle: 'Iterando com segurança no laço for tradicional',
    zenMode: {
      enabled: true,
      description: 'Modo Zen Ativo: Veja as 3 partes do laço for em ação.',
      targetReadingTimeMinutes: 3,
    },
    visualMetaphor: {
      type: 'race_track',
      icon: '🏃',
      title: 'A Catraca com 3 Chaves',
      description: 'O laço for do JS tem 3 etapas entre parênteses: 1) Onde começa (let i = 0); 2) Até onde vai (i < 5); 3) Quanto anda a cada volta (i++).',
    },
    memoryDiagram: {
      ascii: `
        for (let i = 0 ;  i < 3 ;  i++)
               ▲            ▲       ▲
               │            │       └── 3. Incremento após cada volta
               │            └────────── 2. Teste antes de entrar na volta
               └─────────────────────── 1. Inicialização da variável
`,
      explanation: 'Se a condição de teste for sempre verdadeira, o processador travará a aba do navegador.',
      badgeLabel: 'Loop Invariants',
    },
    stepByStepCode: {
      language: 'javascript',
      code: `// Disparando 3 rajadas elétricas sequenciais:
for (let i = 1; i <= 3; i++) {
  console.log("Disparo elétrico #" + i + "! ⚡");
}

// i++ é o mesmo que: i = i + 1`,
      linesExplanation: [
        { line: 2, text: 'Começa em 1, repete enquanto i for menor ou igual a 3, e soma 1 a cada volta.' },
        { line: 3, text: 'Executa a cada volta exibindo o número do disparo atual.' },
      ],
    },
    socraticReflection: {
      catMood: 'alert',
      soundEffect: 'alert_chirp',
      question: '*Move o rabo rapidamente* Se escrevermos for (let i = 1; i > 0; i++), quando esse laço vai parar?',
      reflectionHint: 'Pense bem: se i sempre cresce (1, 2, 3...), ele algum dia deixará de ser maior que zero?',
    },
    practicalTakeaway: 'Certifique-se de que a condição caminhe em direção ao encerramento.',
  },

  {
    id: 'js-lesson-5',
    track: 'javascript',
    starterMonster: 'scripty',
    stage: 5,
    slug: 'funcoes-arrow-modularizacao',
    title: '5. Funções: A Máquina de Café Programável ☕',
    subtitle: 'Criando blocos reaproveitáveis com function e Arrow Functions',
    zenMode: {
      enabled: true,
      description: 'Modo Zen Ativo: Aprenda a receber argumentos e retornar resultados.',
      targetReadingTimeMinutes: 3,
    },
    visualMetaphor: {
      type: 'coffee_machine',
      icon: '☕',
      title: 'A Máquina de Expressos JS',
      description: 'Uma função recebe insumos nos parâmetros, calcula a lógica dentro das chaves e cospe o produto pronto com return.',
    },
    memoryDiagram: {
      ascii: `
    const calcularAtaque = (base, bonus) => {
         return base * bonus;
    };
    
    calcularAtaque( 10 , 3 )  ====>   RETORNA: 30
`,
      explanation: 'O return encerra a execução da função imediatamente e devolve o valor para a chamada.',
      badgeLabel: 'First-Class Functions',
    },
    stepByStepCode: {
      language: 'javascript',
      code: `function prepararCafeEletrico(tamanho, voltagem) {
  const potencia = tamanho * voltagem;
  return "Café com " + potencia + "W de pura energia! ☕⚡";
}

// Guardamos o produto entregue pela máquina:
const meuCafe = prepararCafeEletrico(2, 110);
console.log(meuCafe);`,
      linesExplanation: [
        { line: 1, text: 'Declara a função prepararCafeEletrico com 2 parâmetros de entrada.' },
        { line: 3, text: 'return entrega a frase pronta para quem chamou a função.' },
        { line: 7, text: 'meuCafe recebe a string retornada pela função.' },
      ],
    },
    socraticReflection: {
      catMood: 'purr',
      soundEffect: 'purr',
      question: 'Miau! O que acontece com as linhas de código que forem escritas DEPOIS da palavra "return" dentro da função?',
      reflectionHint: 'O return é a porta de saída da sala: ao passar por ela, a sala se fecha imediatamente!',
    },
    practicalTakeaway: 'O "return" é a linha final de entrega da função. Nada abaixo dele é executado.',
  },
];

// ============================================================================
// ☕ TRILHA 3: JAVAGON (JAVA) — O Dragão de Ferro e Tipagem Estrita
// ============================================================================

export const JAVA_LESSONS: LessonModular[] = [
  {
    id: 'java-lesson-1',
    track: 'java',
    starterMonster: 'javagon',
    stage: 1,
    slug: 'variaveis-metal-fundido',
    title: '1. Variáveis como Caixas de Metal Fundido 📦',
    subtitle: 'Em Java, você deve declarar o tipo exato da caixa antes de usá-la',
    zenMode: {
      enabled: true,
      description: 'Modo Zen Ativo: Veja como a tipagem estática protege seu código contra bugs.',
      targetReadingTimeMinutes: 2,
    },
    visualMetaphor: {
      type: 'box',
      icon: '📦',
      title: 'A Caixa Moldada em Ferro Fundido',
      description: 'Diferente de linguagens dinâmicas, uma caixa em Java é forjada com formato rígido. Se você declarou "int vida", ela é moldada para números inteiros. O compilador nunca deixará você colocar um texto nela!',
    },
    memoryDiagram: {
      ascii: `
  +-----------------------------------------------------+
  |                  MEMÓRIA NO JAVA                    |
  |                                                     |
  |    int nivelFogo               String nomeDragao    |
  |   ┌─────────────┐             ┌─────────────────┐   |
  |   │ [int]   50  │             │ [String] "Javagon"  |
  |   └─────────────┘             └─────────────────┘   |
  |   (Só cabe número)             (Só cabe texto)      |
  +-----------------------------------------------------+
`,
      explanation: 'A máquina virtual Java (JVM) reserva bytes exatos na memória para cada tipo primitivo.',
      badgeLabel: 'Tipagem Estática e Forte',
    },
    stepByStepCode: {
      language: 'java',
      code: `public class Main {
    public static void main(String[] args) {
        // 1. Declaramos o tipo e o nome da variável
        String nome = "Javagon";
        int nivel = 1;

        // 2. Imprimimos com quebra de linha usando println
        System.out.println("Dragão: " + nome);
        System.out.println("Nível: " + nivel);
    }
}`,
      linesExplanation: [
        { line: 4, text: 'String com "S" maiúsculo representa textos no Java.' },
        { line: 5, text: 'int com "i" minúsculo guarda números inteiros de 32 bits.' },
        { line: 8, text: 'System.out.println exibe na saída do terminal e salta para a próxima linha.' },
      ],
    },
    socraticReflection: {
      catMood: 'curious',
      soundEffect: 'meow',
      question: 'Miau! O que o compilador do Java diz se você escrever: int pontos = "dez"; ?',
      reflectionHint: 'Pense no erro "incompatible types": tentar colocar uma maçã na gaveta de garfos!',
    },
    practicalTakeaway: 'Em Java, toda variável exige seu tipo antes do nome, e toda instrução termina com ponto e vírgula (;)!',
  },

  {
    id: 'java-lesson-2',
    track: 'java',
    starterMonster: 'javagon',
    stage: 2,
    slug: 'tipos-primitivos-strict',
    title: '2. Tipos Primitivos Estritos (int, double, boolean) 🗄️',
    subtitle: 'Dominando o tamanho e a capacidade das gavetas da JVM',
    zenMode: {
      enabled: true,
      description: 'Modo Zen Ativo: Compreenda a diferença entre int, double e boolean.',
      targetReadingTimeMinutes: 2,
    },
    visualMetaphor: {
      type: 'cup',
      icon: '☕',
      title: 'A Forma de Gelo vs A Garrafa Térmica',
      description: 'Java tem 8 tipos primitivos. Os mais usados no início são int (inteiros), double (números com vírgula de alta precisão) e boolean (true/false).',
    },
    memoryDiagram: {
      ascii: `
  [ int ]    --> 32 bits (números inteiros de -2 bilhões a +2 bilhões)
  [ double ] --> 64 bits (ponto flutuante com casas decimais precisas)
  [ boolean] --> 1 bit (apenas true ou false)
  [ String ] --> Objeto que armazena sequência de caracteres Unicode
`,
      explanation: 'Tipos primitivos ficam na Stack (pilha ultra rápida), enquanto Strings ficam na Heap com referência.',
      badgeLabel: 'JVM Memory Model',
    },
    stepByStepCode: {
      language: 'java',
      code: `int vidaAtual = 100;
double temperaturaCafe = 85.5;
boolean baforadaPronta = true;

// Divisão inteira vs divisão decimal:
double divisaoExata = 5.0 / 2.0; // 2.5
int divisaoInteira = 5 / 2;       // 2 (perde as casas decimais!)`,
      linesExplanation: [
        { line: 2, text: 'Use double sempre que precisar de precisão com casas decimais.' },
        { line: 6, text: 'No Java, 5 / 2 entre dois ints gera 2, ignorando o resto. Use 5.0 para obter 2.5.' },
      ],
    },
    socraticReflection: {
      catMood: 'purr',
      soundEffect: 'purr',
      question: '*Move as orelhas* Se você dividir 7 por 2 em Java com int a = 7 / 2, qual será o resultado?',
      reflectionHint: 'Lembre-se: inteiro dividido por inteiro sempre corta os decimais sem arredondar!',
    },
    practicalTakeaway: 'Para contas com casas decimais no Java, use sempre o tipo double ou adicione ".0".',
  },

  {
    id: 'java-lesson-3',
    track: 'java',
    starterMonster: 'javagon',
    stage: 3,
    slug: 'condicionais-operadores-logicos',
    title: '3. Condicionais: A Bifurcação do Caminho 🔀',
    subtitle: 'Decidindo caminhos com if, else e operadores && e ||',
    zenMode: {
      enabled: true,
      description: 'Modo Zen Ativo: Veja o operador E (&&) e o operador OU (||).',
      targetReadingTimeMinutes: 3,
    },
    visualMetaphor: {
      type: 'bifurcation',
      icon: '🔀',
      title: 'A Ponte Levadiça do Castelo',
      description: 'A ponte levadiça do Java só baixa se a condição dentro dos parênteses for estritamente do tipo boolean (true). Nada de números no lugar de booleanos!',
    },
    memoryDiagram: {
      ascii: `
     if (nivel >= 10 && temAsas == true)
               ▲             ▲
               │             └── Ambos precisam ser verdadeiros (E lógico)
               └──────────────── Comparação numérica relacional
`,
      explanation: 'O operador && (AND) exige que ambos os lados sejam verdadeiros. O || (OR) aceita se pelo menos um for.',
      badgeLabel: 'Lógica Booleana Pura',
    },
    stepByStepCode: {
      language: 'java',
      code: `int pressaoVapor = 150;

if (pressaoVapor > 180) {
    System.out.println("Alerta: Superaquecimento de vapor! 🌋");
} else if (pressaoVapor >= 100) {
    System.out.println("Javagon cospe labaredas com pressão perfeita! 🔥");
} else {
    System.out.println("Aquecendo a caldeira de café... ☕");
}`,
      linesExplanation: [
        { line: 3, text: 'Avalia a primeira condição: 150 não é maior que 180.' },
        { line: 5, text: 'Cai no else if: 150 >= 100 é verdadeiro! Executa este bloco.' },
      ],
    },
    socraticReflection: {
      catMood: 'curious',
      soundEffect: 'meow',
      question: 'Miau! O que acontece no Java se você tentar escrever: if (pressaoVapor) { ... } sem comparar nada?',
      reflectionHint: 'Java não aceita números como se fossem booleanos. Exige expressamente um teste que resulte em true ou false!',
    },
    practicalTakeaway: 'Em Java, a condição do if SEMPRE precisa devolver um boolean legítimo.',
  },

  {
    id: 'java-lesson-4',
    track: 'java',
    starterMonster: 'javagon',
    stage: 4,
    slug: 'lacos-for-while-java',
    title: '4. Laços de Repetição: A Pista de Corrida 🏃',
    subtitle: 'Iterando com controle absoluto de variáveis e limites',
    zenMode: {
      enabled: true,
      description: 'Modo Zen Ativo: Compreenda a mecânica dos loops no Java.',
      targetReadingTimeMinutes: 3,
    },
    visualMetaphor: {
      type: 'race_track',
      icon: '🏃',
      title: 'A Engrenagem Dentada de Precisão',
      description: 'O laço for no Java funciona como uma engrenagem mecânica: ela gira dente por dente até o batente final travar o movimento.',
    },
    memoryDiagram: {
      ascii: `
    for (int dente = 1; dente <= 4; dente++) {
        // Volta 1: dente = 1 (1 <= 4? Sim)
        // Volta 2: dente = 2 (2 <= 4? Sim)
        // Volta 3: dente = 3 (3 <= 4? Sim)
        // Volta 4: dente = 4 (4 <= 4? Sim)
        // Fim:     dente = 5 (5 <= 4? Não! Laço encerra)
    }
`,
      explanation: 'Ao terminar o laço, a variável temporária do contador é liberada da memória da Stack.',
      badgeLabel: 'Stack Scope Cleanup',
    },
    stepByStepCode: {
      language: 'java',
      code: `// Baforada de vapor em 3 pulsos:
for (int i = 1; i <= 3; i++) {
    System.out.println("Pulso de vapor #" + i + "! 💨");
}

int calor = 3;
while (calor > 0) {
    System.out.println("Mantendo caldeira aquecida: " + calor);
    calor--; // Decrementa 1 unidade para garantir a saída do while
}`,
      linesExplanation: [
        { line: 2, text: 'Cria o contador int i local ao laço, roda até 3 e soma 1 com i++.' },
        { line: 9, text: 'calor-- reduz o calor para que o loop termine quando chegar a 0.' },
      ],
    },
    socraticReflection: {
      catMood: 'alert',
      soundEffect: 'alert_chirp',
      question: '*Ronco de alerta* O que aconteceria se você trocasse calor-- por calor++ dentro do while?',
      reflectionHint: 'Pense no The Infinite Loop Drake: o calor subiria ao infinito e o programa nunca terminaria!',
    },
    practicalTakeaway: 'Sempre garanta que a variável testada no while caminhe em direção à condição de encerramento.',
  },

  {
    id: 'java-lesson-5',
    track: 'java',
    starterMonster: 'javagon',
    stage: 5,
    slug: 'metodos-funcoes-estaticas',
    title: '5. Métodos: A Máquina de Café Programável ☕',
    subtitle: 'Criando métodos estáticos reutilizáveis com parâmetros e retorno tipado',
    zenMode: {
      enabled: true,
      description: 'Modo Zen Ativo: Entenda por que o método declara o tipo de retorno antes do nome.',
      targetReadingTimeMinutes: 3,
    },
    visualMetaphor: {
      type: 'coffee_machine',
      icon: '☕',
      title: 'A Máquina de Café Industrial de Inox',
      description: 'Em Java, as funções são chamadas de métodos. Elas têm contrato rigoroso: você precisa avisar antecipadamente que tipo de xícara vai sair na bandeja (int, String, etc.)!',
    },
    memoryDiagram: {
      ascii: `
    public static int prepararDano(int base, int bonus) {
                  ▲
                  └─ Tipo da xícara que será devolvida pelo return
        return base + bonus;
    }
`,
      explanation: 'O compilador verifica se o valor passado no return corresponde exatamente ao tipo prometido na assinatura.',
      badgeLabel: 'Contrato de Método Tipado',
    },
    stepByStepCode: {
      language: 'java',
      code: `public class Main {
    // Método que calcula e devolve a força total:
    public static int calcularAtaque(int forcaBase, int bonusCalor) {
        int total = forcaBase + bonusCalor;
        return total; // Devolve o número inteiro calculado
    }

    public static void main(String[] args) {
        int ataqueFinal = calcularAtaque(40, 15);
        System.out.println("Dano do Javagon: " + ataqueFinal); // 55
    }
}`,
      linesExplanation: [
        { line: 3, text: '"public static int" declara que este método devolve um número inteiro (int).' },
        { line: 5, text: '"return total" devolve o valor de 55 para quem chamou o método.' },
        { line: 9, text: 'No main, recebemos o retorno 55 e guardamos na variável ataqueFinal.' },
      ],
    },
    socraticReflection: {
      catMood: 'purr',
      soundEffect: 'purr',
      question: 'Miau! Se o método promete devolver um "int", mas você escreve return "Muito Dano"; o que o compilador faz?',
      reflectionHint: 'Ele trava na hora: você prometeu entregar uma xícara de café (int) e tentou entregar um livro (String)!',
    },
    practicalTakeaway: 'O tipo antes do nome do método é uma promessa solene que o comando "return" deve cumprir.',
  },
];

// ============================================================================
// DICIONÁRIO UNIFICADO DO CURRÍCULO
// ============================================================================

export const CURRICULUM_TRACKS: Record<StarterTrack, LessonModular[]> = {
  python: PYTHON_LESSONS,
  javascript: JAVASCRIPT_LESSONS,
  java: JAVA_LESSONS,
};

/**
 * Recupera uma lição por track e estágio
 */
export function getLessonByStage(track: StarterTrack, stage: number): LessonModular | undefined {
  return CURRICULUM_TRACKS[track]?.find((l) => l.stage === stage);
}

/**
 * Recupera uma lição por ID global
 */
export function getLessonById(lessonId: string): LessonModular | undefined {
  for (const track of Object.values(CURRICULUM_TRACKS)) {
    const found = track.find((l) => l.id === lessonId);
    if (found) return found;
  }
  return undefined;
}
