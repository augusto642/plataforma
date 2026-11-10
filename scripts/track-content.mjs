/**
 * Conteúdo das trilhas do catálogo de aluno (Sprint 20A).
 *
 * Fonte única das atividades dos cursos de catálogo: o seed
 * (scripts/seed-data.mjs) importa daqui e faz upsert; o validador de
 * trilhas (scripts/validate-tracks.mjs) importa daqui e reprova
 * atividade incompleta. Antes da Sprint 20A estas definições viviam
 * inline no seed — sem como validar sem subir banco.
 *
 * Espinha de conceitos: content/concept-spine.json (toda conceptTag
 * daqui precisa existir lá; o seed e o validador conferem).
 *
 * FLUXO DE CONTEÚDO (decisão Q1 do Augusto, 2026-10-22): o AGENTE
 * escreve o rascunho, o ADMIN revisa e aprova antes de considerar o
 * conteúdo final. Os exemplos análogos (lessonPayload.analogousExample)
 * das 5 atividades abaixo são RASCUNHO de agente — marcados com
 * lessonPayload.reviewStatus = 'draft' — e aguardam revisão/aprovação
 * do admin. Ao aprovar uma atividade, troque o reviewStatus dela para
 * 'approved' neste arquivo e rode o seed de novo.
 */

export const CATALOG_TRACK_ACTIVITIES = [
  // ─── Curso: algoritmos-javascript ─────────────────────────────────
  {
    courseSlug: 'algoritmos-javascript',
    slug: 'soma-dois-numeros',
    title: '1. Soma de Dois Números',
    description:
      'Escreva uma função chamada `soma(a, b)` que receba dois números como parâmetros e retorne o resultado da sua soma.',
    instructions: 'Exemplo: soma(2, 3) => 5; soma(-1, 5) => 4',
    language: 'javascript',
    initialCode: 'function soma(a, b) {\n  // Implemente sua solucao aqui\n}\n',
    testCode:
      "if (typeof soma !== 'function') throw new Error('A funcao soma precisa estar declarada');\nif (soma(2, 3) !== 5) throw new Error('soma(2, 3) deve retornar 5');\nif (soma(-1, 5) !== 4) throw new Error('soma(-1, 5) deve retornar 4');",
    hiddenTests:
      "if (soma(0, 0) !== 0) throw new Error('soma(0, 0) deve retornar 0');\nif (soma(100, 200) !== 300) throw new Error('soma(100, 200) deve retornar 300');",
    referenceSolution: 'function soma(a, b) {\n  return a + b;\n}\n',
    conceptTags: ['operadores', 'funcoes'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Calcular a média de duas notas',
        statement:
          'Escreva uma função `media(a, b)` que receba duas notas como parâmetros e retorne a média aritmética entre elas.',
        solution:
          'function media(a, b) {\n  // Some os dois valores recebidos como parâmetro...\n  const somaDasNotas = a + b;\n  // ...e divida pela quantidade de notas (2) antes de retornar.\n  return somaDasNotas / 2;\n}',
        explanation:
          'Repare no esqueleto: a função recebe dois parâmetros, combina os dois com um operador aritmético e devolve o resultado com return — sem imprimir nada. No seu exercício, pergunte-se: qual operador combina os dois números do jeito que o enunciado pede? Transfira o esqueleto, não os valores.',
        concept: 'Funções com parâmetros e operadores aritméticos',
      },
    },
    order: 1,
  },
  {
    courseSlug: 'algoritmos-javascript',
    slug: 'verificar-palindromo',
    title: '2. Verificador de Palíndromo',
    description:
      'Crie uma função `ehPalindromo(str)` que verifique se uma palavra ou sequência de caracteres é lida da mesma forma de trás para frente. Retorne `true` ou `false`.',
    instructions:
      'Exemplo: ehPalindromo("radar") => true; ehPalindromo("programacao") => false',
    language: 'javascript',
    initialCode:
      'function ehPalindromo(str) {\n  // Retorne true se for palindromo e false caso contrario\n}\n',
    testCode:
      "if (typeof ehPalindromo !== 'function') throw new Error('A funcao ehPalindromo precisa estar declarada');\nif (ehPalindromo('radar') !== true) throw new Error('ehPalindromo(\"radar\") deve retornar true');\nif (ehPalindromo('codigo') !== false) throw new Error('ehPalindromo(\"codigo\") deve retornar false');",
    hiddenTests:
      "if (ehPalindromo('ana') !== true) throw new Error('ehPalindromo(\"ana\") deve retornar true');\nif (ehPalindromo('osso') !== true) throw new Error('ehPalindromo(\"osso\") deve retornar true');",
    referenceSolution:
      "function ehPalindromo(str) {\n  const invertida = str.split('').reverse().join('');\n  return str === invertida;\n}\n",
    conceptTags: ['entrada-e-strings', 'funcoes'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Inverter um código de rastreio',
        statement:
          'Escreva uma função `inverterCodigo(codigo)` que receba uma string e retorne os mesmos caracteres na ordem inversa.',
        solution:
          "function inverterCodigo(codigo) {\n  // split('') quebra a string em um array de caracteres...\n  const caracteres = codigo.split('');\n  // ...reverse() inverte a ordem desse array...\n  const invertidos = caracteres.reverse();\n  // ...e join('') junta tudo de volta numa string só.\n  return invertidos.join('');\n}",
        explanation:
          'A técnica aqui é transformar a string em lista de caracteres, inverter a lista e remontar a string. No seu exercício, depois de montar a versão invertida, o que falta é comparar: a palavra original e a invertida são iguais ou não? A resposta dessa comparação é o retorno.',
        concept: 'Manipulação de strings: quebrar, inverter e remontar',
      },
    },
    order: 2,
  },
  {
    courseSlug: 'algoritmos-javascript',
    slug: 'maior-numero-array',
    title: '3. Encontrar o Maior Número',
    description:
      'Implemente a função `maiorNumero(arr)` que receba um array de números inteiros e retorne o maior elemento presente no array.',
    instructions: 'Exemplo: maiorNumero([1, 5, 3, 9, 2]) => 9',
    language: 'javascript',
    initialCode:
      'function maiorNumero(arr) {\n  // Retorne o maior elemento do array\n}\n',
    testCode:
      "if (typeof maiorNumero !== 'function') throw new Error('A funcao maiorNumero precisa estar declarada');\nif (maiorNumero([1, 5, 3, 9, 2]) !== 9) throw new Error('maiorNumero([1, 5, 3, 9, 2]) deve retornar 9');\nif (maiorNumero([10]) !== 10) throw new Error('maiorNumero([10]) deve retornar 10');",
    hiddenTests:
      "if (maiorNumero([-10, -5, -20]) !== -5) throw new Error('maiorNumero([-10, -5, -20]) deve retornar -5');\nif (maiorNumero([100, 20, 500, 1]) !== 500) throw new Error('maiorNumero([100, 20, 500, 1]) deve retornar 500');",
    referenceSolution:
      'function maiorNumero(arr) {\n  return Math.max(...arr);\n}\n',
    conceptTags: ['listas', 'funcoes'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Encontrar a menor temperatura da semana',
        statement:
          'Escreva uma função `menorTemperatura(temperaturas)` que receba um array de números e retorne o menor valor dele.',
        solution:
          'function menorTemperatura(temperaturas) {\n  // O espalhamento (...) passa cada elemento do array como\n  // argumento separado para Math.min, que devolve o menor deles.\n  return Math.min(...temperaturas);\n}',
        explanation:
          'A ideia é delegar a busca do extremo para uma função pronta que recebe todos os elementos de uma vez (o espalhamento). No seu exercício, a busca é pelo extremo oposto: qual é a função-irmã da que usei aqui? O resto do esqueleto é idêntico.',
        concept: 'Extremos de uma lista com espalhamento',
      },
    },
    order: 3,
  },

  // ─── Curso: introducao-python ─────────────────────────────────────
  {
    courseSlug: 'introducao-python',
    slug: 'dobro-numero-python',
    title: '1. Dobro de um Número',
    description:
      'Defina a função `dobro(n)` que recebe um número inteiro ou decimal e retorna o dobro dele.',
    instructions: 'Exemplo: dobro(4) => 8; dobro(-3) => -6',
    language: 'python',
    initialCode: 'def dobro(n):\n    # Retorne o dobro de n\n    pass\n',
    testCode:
      'assert dobro(4) == 8, "dobro(4) deve ser 8"\nassert dobro(-3) == -6, "dobro(-3) deve ser -6"',
    hiddenTests:
      'assert dobro(0) == 0, "dobro(0) deve ser 0"\nassert dobro(2.5) == 5.0, "dobro(2.5) deve ser 5.0"',
    referenceSolution: 'def dobro(n):\n    return n * 2\n',
    conceptTags: ['operadores', 'funcoes'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Converter horas em minutos',
        statement:
          'Defina a função `horas_para_minutos(horas)` que receba uma quantidade de horas e retorne o equivalente em minutos.',
        solution:
          'def horas_para_minutos(horas):\n    # Cada hora vale 60 minutos: multiplique o valor\n    # recebido pelo fator de conversão e retorne o resultado.\n    return horas * 60',
        explanation:
          'O esqueleto é: a função recebe um número, multiplica por um fator fixo e devolve o resultado com return. No seu exercício, o fator não é 60 — é o fator que o próprio nome da função anuncia. Troque o fator e o nome; o resto é igual.',
        concept: 'Funções com parâmetro, multiplicação e retorno',
      },
    },
    order: 1,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'contar-vogais-python',
    title: '2. Contagem de Vogais',
    description:
      'Defina a função `contar_vogais(texto)` que retorne o número de vogais (a, e, i, o, u - maiúsculas ou minúsculas) presentes na string fornecida.',
    instructions:
      'Exemplo: contar_vogais("Python") => 1; contar_vogais("Desenvolvimento") => 6',
    language: 'python',
    initialCode:
      'def contar_vogais(texto):\n    # Retorne a quantidade de vogais\n    pass\n',
    testCode:
      'assert contar_vogais("Python") == 1, "contar_vogais(\'Python\') deve ser 1"\nassert contar_vogais("Desenvolvimento") == 6, "contar_vogais(\'Desenvolvimento\') deve ser 6"',
    hiddenTests:
      'assert contar_vogais("AEIOU") == 5, "contar_vogais(\'AEIOU\') deve ser 5"\nassert contar_vogais("xyz") == 0, "contar_vogais(\'xyz\') deve ser 0"',
    referenceSolution:
      'def contar_vogais(texto):\n    total = 0\n    for letra in texto.lower():\n        if letra in "aeiou":\n            total += 1\n    return total\n',
    conceptTags: ['entrada-e-strings', 'loops', 'condicionais'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Contar os espaços de uma frase',
        statement:
          'Defina a função `contar_espacos(texto)` que retorne quantos caracteres de espaço (" ") existem na string.',
        solution:
          'def contar_espacos(texto):\n    total = 0  # acumulador: começa zerado, antes do laço\n    for letra in texto:  # percorre a string caractere por caractere\n        if letra == " ":  # a condição decide se acumula\n            total += 1  # acumula um por vez, dentro do laço\n    return total  # devolve o acumulado DEPOIS que o laço termina',
        explanation:
          'Repare no esqueleto da técnica: um acumulador nasce zerado ANTES do laço, é atualizado DENTRO dele só quando a condição pede, e o return acontece DEPOIS da última volta. No seu exercício, pergunte-se: qual é a condição no lugar do espaço? (Em vez de um caractere só, é um conjunto de caracteres — e a caixa, maiúscula ou minúscula, não pode importar.)',
        concept: 'Laços sobre strings com acumulador e condição',
      },
    },
    order: 2,
  },
];
