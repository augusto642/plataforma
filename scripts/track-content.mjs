/**
 * Conteúdo das trilhas do catálogo de aluno (Sprints 20A/20B).
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
 * das atividades de catálogo abaixo são RASCUNHO de agente — marcados
 * com lessonPayload.reviewStatus = 'draft' — e aguardam revisão/aprovação
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

  // ─── Curso: introducao-python (Trilha de Sintaxe Python — Sprint 20B) ───
  // Trilha completa sobre a espinha de conceitos: 27 atividades nos 10
  // módulos, em progressão. As atividades 6 e 7 são as duas originais do
  // curso (contagem de vogais e dobro), reposicionadas na progressão —
  // conteúdo, testes e exemplos análogos idênticos aos da Sprint 20A;
  // só o título (numeração da trilha) e o `order` mudaram.
  {
    courseSlug: 'introducao-python',
    slug: 'ola-mundo-python',
    title: '1. Olá, Mundo!',
    description:
      'Toda jornada em Python começa do mesmo jeito: fazer o computador falar. Defina a função `main()` para que, quando ela for chamada, imprima exatamente a mensagem `Olá, Mundo!` usando o comando `print`.',
    instructions: 'Exemplo: ao executar main(), a saída deve ser: Olá, Mundo!',
    language: 'python',
    initialCode: 'def main():\n    # Imprima a mensagem Olá, Mundo!\n    pass\n',
    testCode:
      'import io, contextlib\n_saida = io.StringIO()\nwith contextlib.redirect_stdout(_saida):\n    main()\nassert _saida.getvalue() == "Olá, Mundo!\\n", "a saída deve ser exatamente: Olá, Mundo!"',
    hiddenTests:
      'import io, contextlib\n_saida2 = io.StringIO()\nwith contextlib.redirect_stdout(_saida2):\n    main()\n_linhas = _saida2.getvalue().splitlines()\nassert len(_linhas) == 1, "a saída deve ter exatamente uma linha"\nassert _linhas[0] == "Olá, Mundo!", "a linha impressa deve ser Olá, Mundo!"',
    referenceSolution: 'def main():\n    print("Olá, Mundo!")\n',
    conceptTags: ['saida-e-variaveis'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Anunciar o nome do curso',
        statement:
          'Defina a função `exibir_curso()` que, quando chamada, imprima exatamente a frase `Python do Zero` usando o comando `print`.',
        solution:
          'def exibir_curso():\n    # O print escreve o texto na tela e pula uma linha no fim.\n    print("Python do Zero")',
        explanation:
          'A técnica é uma só: o print é o comando de saída — o que vai dentro dos parênteses é o texto que aparece na tela. No seu exercício, troque o texto pelo que o enunciado pede e confira letra por letra, incluindo maiúsculas e pontuação: a saída de um programa se compara ao pé da letra.',
        concept: 'Saída com print',
      },
    },
    order: 1,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'saudacao-personalizada-python',
    title: '2. Saudação Personalizada',
    description:
      'Defina a função `saudacao(nome)` que receba o nome de uma pessoa e retorne a saudação montada com ele, no formato `Olá, <nome>!`. Monte a resposta juntando (concatenando) os trechos fixos de texto com a variável recebida, usando o operador `+`.',
    instructions: 'Exemplo: saudacao("Ada") => "Olá, Ada!"; saudacao("mundo") => "Olá, mundo!"',
    language: 'python',
    initialCode: 'def saudacao(nome):\n    # Monte e retorne a saudação usando o nome recebido\n    pass\n',
    testCode:
      'assert saudacao("Ada") == "Olá, Ada!", "saudacao(\'Ada\') deve ser \'Olá, Ada!\'"\nassert saudacao("mundo") == "Olá, mundo!", "saudacao(\'mundo\') deve ser \'Olá, mundo!\'"',
    hiddenTests:
      'assert saudacao("Bruno") == "Olá, Bruno!", "saudacao(\'Bruno\') deve ser \'Olá, Bruno!\'"\nassert saudacao("Python") == "Olá, Python!", "saudacao(\'Python\') deve ser \'Olá, Python!\'"',
    referenceSolution: 'def saudacao(nome):\n    return "Olá, " + nome + "!"\n',
    conceptTags: ['saida-e-variaveis'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Montar um endereço de e-mail',
        statement:
          'Defina a função `montar_email(nome)` que receba um nome de usuário e retorne o e-mail dele no formato `<nome>@escola.com`.',
        solution:
          'def montar_email(nome):\n    # O trecho fixo "@escola.com" entra colado no fim da variável,\n    # com o operador + juntando texto com texto.\n    return nome + "@escola.com"',
        explanation:
          'O esqueleto é: variável recebida de um lado, trecho fixo do outro, e o + colando os dois na ordem certa. No seu exercício, são dois trechos fixos (um antes e um depois do nome) em vez de um só no fim — monte a frase na ordem em que ela é lida.',
        concept: 'Concatenação de strings com variáveis',
      },
    },
    order: 2,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'resumo-variaveis-python',
    title: '3. Resumo com Variáveis',
    description:
      'Defina a função `resumo(nome, idade)` que retorne a frase `<nome> tem <idade> anos.` montada com uma f-string. Repare nos tipos: `nome` é texto (str) e `idade` é número (int) — a f-string converte os dois para texto na hora de montar a frase.',
    instructions: 'Exemplo: resumo("Ada", 17) => "Ada tem 17 anos."; resumo("Bruno", 20) => "Bruno tem 20 anos."',
    language: 'python',
    initialCode: 'def resumo(nome, idade):\n    # Monte a frase com uma f-string e retorne\n    pass\n',
    testCode:
      'assert resumo("Ada", 17) == "Ada tem 17 anos.", "resumo(\'Ada\', 17) deve ser \'Ada tem 17 anos.\'"\nassert resumo("Bruno", 20) == "Bruno tem 20 anos.", "resumo(\'Bruno\', 20) deve ser \'Bruno tem 20 anos.\'"',
    hiddenTests:
      'assert resumo("Python", 30) == "Python tem 30 anos.", "resumo(\'Python\', 30) deve ser \'Python tem 30 anos.\'"\nassert resumo("Ada", 0) == "Ada tem 0 anos.", "resumo(\'Ada\', 0) deve ser \'Ada tem 0 anos.\'"',
    referenceSolution: 'def resumo(nome, idade):\n    return f"{nome} tem {idade} anos."\n',
    conceptTags: ['saida-e-variaveis', 'entrada-e-strings'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Etiqueta de produto',
        statement:
          'Defina a função `etiqueta(produto, preco)` que retorne a etiqueta no formato `Produto: <produto> | Preço: R$ <preco>`, montada com uma f-string.',
        solution:
          'def etiqueta(produto, preco):\n    # Dentro das chaves da f-string vai o nome da variável;\n    # fora delas, o texto fixo da etiqueta.\n    return f"Produto: {produto} | Preço: R$ {preco}"',
        explanation:
          'A f-string é um molde: texto fixo por fora, variáveis dentro das chaves, substituídas na ordem em que aparecem. No seu exercício, o molde é uma frase corrida em vez de etiqueta — escreva a frase inteira com buracos {} onde entram as variáveis, na mesma ordem da leitura.',
        concept: 'Formatação de texto com f-strings',
      },
    },
    order: 3,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'gritar-texto-python',
    title: '4. Texto em Maiúsculas',
    description:
      'Defina a função `gritar(texto)` que retorne o texto recebido todo em letras maiúsculas, usando o método de string `upper()`. Métodos de string não alteram o texto original: eles devolvem um texto novo.',
    instructions: 'Exemplo: gritar("python") => "PYTHON"; gritar("bom dia") => "BOM DIA"',
    language: 'python',
    initialCode: 'def gritar(texto):\n    # Retorne o texto todo em maiúsculas\n    pass\n',
    testCode:
      'assert gritar("python") == "PYTHON", "gritar(\'python\') deve ser \'PYTHON\'"\nassert gritar("bom dia") == "BOM DIA", "gritar(\'bom dia\') deve ser \'BOM DIA\'"',
    hiddenTests:
      'assert gritar("abc") == "ABC", "gritar(\'abc\') deve ser \'ABC\'"\nassert gritar("Python") == "PYTHON", "gritar(\'Python\') deve ser \'PYTHON\'"',
    referenceSolution: 'def gritar(texto):\n    return texto.upper()\n',
    conceptTags: ['entrada-e-strings'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Código de desconto em minúsculas',
        statement:
          'Defina a função `normalizar_codigo(codigo)` que retorne o código todo em letras minúsculas, usando o método de string `lower()`.',
        solution:
          'def normalizar_codigo(codigo):\n    # lower() é o método-irmão do upper(): devolve o texto\n    # convertido para minúsculas, sem tocar no original.\n    return codigo.lower()',
        explanation:
          'Strings em Python têm uma caixa de ferramentas de métodos: upper e lower são dois deles, um para cada direção da conversão. No seu exercício, a conversão pedida é a direção oposta à deste exemplo — o resto (chamar o método no texto recebido e retornar o resultado) é idêntico.',
        concept: 'Métodos de string: conversão de caixa',
      },
    },
    order: 4,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'primeira-e-ultima-letra-python',
    title: '5. Primeira e Última Letra',
    description:
      'Defina a função `primeira_e_ultima(palavra)` que retorne uma string com apenas dois caracteres: o primeiro e o último da palavra recebida. Use indexação: o índice `0` pega o primeiro caractere e o índice `-1`, o último. A palavra sempre terá pelo menos dois caracteres.',
    instructions: 'Exemplo: primeira_e_ultima("python") => "pn"; primeira_e_ultima("casa") => "ca"',
    language: 'python',
    initialCode: 'def primeira_e_ultima(palavra):\n    # Retorne o primeiro e o último caractere\n    pass\n',
    testCode:
      'assert primeira_e_ultima("python") == "pn", "primeira_e_ultima(\'python\') deve ser \'pn\'"\nassert primeira_e_ultima("casa") == "ca", "primeira_e_ultima(\'casa\') deve ser \'ca\'"',
    hiddenTests:
      'assert primeira_e_ultima("sol") == "sl", "primeira_e_ultima(\'sol\') deve ser \'sl\'"\nassert primeira_e_ultima("ab") == "ab", "primeira_e_ultima(\'ab\') deve ser \'ab\'"',
    referenceSolution: 'def primeira_e_ultima(palavra):\n    return palavra[0] + palavra[-1]\n',
    conceptTags: ['entrada-e-strings'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Último dígito de um código',
        statement:
          'Defina a função `ultimo_digito(codigo)` que retorne apenas o último caractere do código recebido.',
        solution:
          'def ultimo_digito(codigo):\n    # Índice -1 conta a partir do fim: é sempre o último\n    # caractere, não importa o tamanho do código.\n    return codigo[-1]',
        explanation:
          'Em Python, índice negativo conta de trás para frente: -1 é o último caractere, -2 o penúltimo, e assim por diante. No seu exercício, você precisa de dois caracteres — o do índice 0 e o do índice -1 — juntados numa string só. O que o operador + faz com duas strings mesmo?',
        concept: 'Indexação de strings, incluindo índice negativo',
      },
    },
    order: 5,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'contar-vogais-python',
    title: '6. Contagem de Vogais',
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
    order: 6,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'dobro-numero-python',
    title: '7. Dobro de um Número',
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
    order: 7,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'quociente-e-resto-python',
    title: '8. Quociente e Resto',
    description:
      'Defina a função `quociente_e_resto(a, b)` que retorne uma tupla com o quociente inteiro e o resto da divisão de `a` por `b`. Use os operadores de divisão inteira (`//`) e de resto (`%`). Considere `b` sempre diferente de zero.',
    instructions: 'Exemplo: quociente_e_resto(17, 5) => (3, 2); quociente_e_resto(10, 2) => (5, 0)',
    language: 'python',
    initialCode: 'def quociente_e_resto(a, b):\n    # Retorne (quociente inteiro, resto) da divisão\n    pass\n',
    testCode:
      'assert quociente_e_resto(17, 5) == (3, 2), "quociente_e_resto(17, 5) deve ser (3, 2)"\nassert quociente_e_resto(10, 2) == (5, 0), "quociente_e_resto(10, 2) deve ser (5, 0)"',
    hiddenTests:
      'assert quociente_e_resto(7, 3) == (2, 1), "quociente_e_resto(7, 3) deve ser (2, 1)"\nassert quociente_e_resto(100, 10) == (10, 0), "quociente_e_resto(100, 10) deve ser (10, 0)"',
    referenceSolution: 'def quociente_e_resto(a, b):\n    return (a // b, a % b)\n',
    conceptTags: ['operadores'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Converter minutos em horas e resto',
        statement:
          'Defina a função `converter_minutos(total)` que receba um total de minutos e retorne uma tupla com as horas inteiras e os minutos que sobram.',
        solution:
          'def converter_minutos(total):\n    # // fica com a parte inteira da divisão (as horas cheias)...\n    horas = total // 60\n    # ...e % fica com o que sobrou (os minutos restantes).\n    resto = total % 60\n    return (horas, resto)',
        explanation:
          'Divisão tem duas respostas possíveis: quantas vezes o divisor cabe inteiro (//) e quanto sobra (%). Juntas, elas descrevem a divisão completa. No seu exercício, os dois operadores aparecem sobre os parâmetros recebidos — monte a tupla com o quociente primeiro e o resto depois, na ordem que o enunciado pede.',
        concept: 'Divisão inteira e resto na mesma operação',
      },
    },
    order: 8,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'media-tres-notas-python',
    title: '9. Média de Três Notas',
    description:
      'Defina a função `media_tres(a, b, c)` que retorne a média aritmética das três notas, arredondada para duas casas decimais com `round(valor, 2)`.',
    instructions: 'Exemplo: media_tres(7, 8, 9) => 8.0; media_tres(5, 7, 8) => 6.67',
    language: 'python',
    initialCode: 'def media_tres(a, b, c):\n    # Retorne a média das três notas, com 2 casas decimais\n    pass\n',
    testCode:
      'assert media_tres(7, 8, 9) == 8.0, "media_tres(7, 8, 9) deve ser 8.0"\nassert media_tres(5, 7, 8) == 6.67, "media_tres(5, 7, 8) deve ser 6.67"',
    hiddenTests:
      'assert media_tres(10, 10, 7) == 9.0, "media_tres(10, 10, 7) deve ser 9.0"\nassert media_tres(6, 6, 7) == 6.33, "media_tres(6, 6, 7) deve ser 6.33"',
    referenceSolution: 'def media_tres(a, b, c):\n    return round((a + b + c) / 3, 2)\n',
    conceptTags: ['operadores'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Velocidade média',
        statement:
          'Defina a função `velocidade_media(distancia, tempo)` que retorne a velocidade média de um percurso: a distância dividida pelo tempo.',
        solution:
          'def velocidade_media(distancia, tempo):\n    # Média, no fundo, é sempre um total dividido pela\n    # quantidade de partes — aqui, distância por tempo.\n    return distancia / tempo',
        explanation:
          'Por trás de toda média existe a mesma conta: somar as partes e dividir pela quantidade delas. Neste exemplo a "soma" já vem pronta (é a distância total). No seu exercício, monte primeiro a soma das três notas — com parênteses, para a soma acontecer antes da divisão — e só então divida por 3 e arredonde.',
        concept: 'Média aritmética como total dividido pela quantidade',
      },
    },
    order: 9,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'par-ou-impar-python',
    title: '10. Par ou Ímpar',
    description:
      'Defina a função `par_ou_impar(n)` que retorne o texto `"par"` quando o número for par e `"ímpar"` quando for ímpar. A ferramenta é o operador de resto (`%`): número par tem resto 0 ao ser dividido por 2.',
    instructions: 'Exemplo: par_ou_impar(4) => "par"; par_ou_impar(7) => "ímpar"',
    language: 'python',
    initialCode: 'def par_ou_impar(n):\n    # Retorne "par" ou "ímpar"\n    pass\n',
    testCode:
      'assert par_ou_impar(4) == "par", "par_ou_impar(4) deve ser \'par\'"\nassert par_ou_impar(7) == "ímpar", "par_ou_impar(7) deve ser \'ímpar\'"',
    hiddenTests:
      'assert par_ou_impar(0) == "par", "par_ou_impar(0) deve ser \'par\'"\nassert par_ou_impar(-3) == "ímpar", "par_ou_impar(-3) deve ser \'ímpar\'"',
    referenceSolution: 'def par_ou_impar(n):\n    if n % 2 == 0:\n        return "par"\n    return "ímpar"\n',
    conceptTags: ['condicionais', 'operadores'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'É múltiplo de 5?',
        statement:
          'Defina a função `multiplo_de_cinco(n)` que retorne `"sim"` se o número for múltiplo de 5 e `"não"` caso contrário.',
        solution:
          'def multiplo_de_cinco(n):\n    # Ser múltiplo de 5 é ter resto 0 na divisão por 5.\n    if n % 5 == 0:\n        return "sim"\n    return "não"',
        explanation:
          'O padrão é: o resto da divisão vira o teste da condição, e cada ramo do if devolve um texto. No seu exercício, o divisor do resto é outro e os dois textos de resposta são outros — a estrutura (testa o resto, devolve um texto ou outro) é exatamente esta.',
        concept: 'Condicional sobre o resto da divisão',
      },
    },
    order: 10,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'pode-votar-python',
    title: '11. Pode Votar?',
    description:
      'No Brasil, votar é permitido a partir dos 16 anos. Defina a função `pode_votar(idade)` que retorne `True` se a pessoa já pode votar e `False` caso contrário. Uma comparação com `>=` já devolve o booleano pronto — nem sempre você precisa escrever o `if`.',
    instructions: 'Exemplo: pode_votar(16) => True; pode_votar(15) => False',
    language: 'python',
    initialCode: 'def pode_votar(idade):\n    # Retorne True se já pode votar, False senão\n    pass\n',
    testCode:
      'assert pode_votar(16) == True, "pode_votar(16) deve ser True"\nassert pode_votar(15) == False, "pode_votar(15) deve ser False"',
    hiddenTests:
      'assert pode_votar(18) == True, "pode_votar(18) deve ser True"\nassert pode_votar(0) == False, "pode_votar(0) deve ser False"',
    referenceSolution: 'def pode_votar(idade):\n    return idade >= 16\n',
    conceptTags: ['condicionais', 'operadores'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Pode dirigir?',
        statement:
          'Defina a função `pode_dirigir(idade)` que retorne `True` se a pessoa já tem idade para dirigir (18 anos ou mais) e `False` caso contrário.',
        solution:
          'def pode_dirigir(idade):\n    # A comparação já é a resposta: >= devolve True ou False.\n    return idade >= 18',
        explanation:
          'Comparações em Python não moram só dentro do if: elas produzem um valor booleano que pode ser retornado direto. No seu exercício, muda apenas o limite da comparação (a idade mínima da regra) — a linha é a mesma.',
        concept: 'Comparação como valor de retorno booleano',
      },
    },
    order: 11,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'conceito-nota-python',
    title: '12. Conceito da Nota',
    description:
      'Defina a função `conceito(nota)` que classifique uma nota de 0 a 10: retorne `"Aprovado"` para nota maior ou igual a 7, `"Recuperação"` para nota maior ou igual a 5 (e menor que 7) e `"Reprovado"` abaixo de 5. Use uma cadeia de `if`/`elif`/`else`, testando as faixas da maior para a menor.',
    instructions: 'Exemplo: conceito(8) => "Aprovado"; conceito(5.5) => "Recuperação"; conceito(3) => "Reprovado"',
    language: 'python',
    initialCode: 'def conceito(nota):\n    # Retorne "Aprovado", "Recuperação" ou "Reprovado"\n    pass\n',
    testCode:
      'assert conceito(8) == "Aprovado", "conceito(8) deve ser \'Aprovado\'"\nassert conceito(5.5) == "Recuperação", "conceito(5.5) deve ser \'Recuperação\'"\nassert conceito(3) == "Reprovado", "conceito(3) deve ser \'Reprovado\'"',
    hiddenTests:
      'assert conceito(7) == "Aprovado", "conceito(7) deve ser \'Aprovado\'"\nassert conceito(5) == "Recuperação", "conceito(5) deve ser \'Recuperação\'"\nassert conceito(4.9) == "Reprovado", "conceito(4.9) deve ser \'Reprovado\'"',
    referenceSolution:
      'def conceito(nota):\n    if nota >= 7:\n        return "Aprovado"\n    elif nota >= 5:\n        return "Recuperação"\n    else:\n        return "Reprovado"\n',
    conceptTags: ['condicionais'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Classificar a temperatura',
        statement:
          'Defina a função `clima(temperatura)` que retorne `"quente"` para 30 graus ou mais, `"agradável"` para 20 graus ou mais (e menos de 30) e `"frio"` abaixo de 20.',
        solution:
          'def clima(temperatura):\n    # As faixas são testadas da maior para a menor: a primeira\n    # que encaixar decide, e as de baixo nem são avaliadas.\n    if temperatura >= 30:\n        return "quente"\n    elif temperatura >= 20:\n        return "agradável"\n    else:\n        return "frio"',
        explanation:
          'A cadeia if/elif/else é uma fila de porteiros: cada faixa é testada em ordem e a primeira verdadeira encerra a decisão. Por isso a ordem importa — teste sempre da faixa mais alta para a mais baixa. No seu exercício, são outras faixas e outros textos, mas a fila é a mesma.',
        concept: 'Classificação em faixas com if/elif/else',
      },
    },
    order: 12,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'contar-multiplos-python',
    title: '13. Contar Múltiplos',
    description:
      'Defina a função `contar_multiplos(limite, divisor)` que conte quantos números de 1 até `limite` (inclusive) são múltiplos de `divisor`. Percorra o intervalo com um laço `for` sobre `range` e some 1 a um acumulador sempre que o resto da divisão por `divisor` for 0.',
    instructions: 'Exemplo: contar_multiplos(10, 3) => 3; contar_multiplos(5, 2) => 2',
    language: 'python',
    initialCode: 'def contar_multiplos(limite, divisor):\n    # Conte os múltiplos de divisor entre 1 e limite\n    pass\n',
    testCode:
      'assert contar_multiplos(10, 3) == 3, "contar_multiplos(10, 3) deve ser 3"\nassert contar_multiplos(5, 2) == 2, "contar_multiplos(5, 2) deve ser 2"',
    hiddenTests:
      'assert contar_multiplos(20, 7) == 2, "contar_multiplos(20, 7) deve ser 2"\nassert contar_multiplos(1, 1) == 1, "contar_multiplos(1, 1) deve ser 1"',
    referenceSolution:
      'def contar_multiplos(limite, divisor):\n    total = 0\n    for n in range(1, limite + 1):\n        if n % divisor == 0:\n            total += 1\n    return total\n',
    conceptTags: ['loops', 'operadores'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Contar os ímpares até o limite',
        statement:
          'Defina a função `contar_impares(limite)` que conte quantos números ímpares existem de 1 até `limite` (inclusive).',
        solution:
          'def contar_impares(limite):\n    total = 0\n    for n in range(1, limite + 1):\n        # Ímpar é quem deixa resto 1 ao dividir por 2.\n        if n % 2 == 1:\n            total += 1\n    return total',
        explanation:
          'O padrão contar-com-laço tem três peças: acumulador zerado antes, condição com resto dentro, return depois. No seu exercício, a condição deixa de ser "resto 1 por 2" e passa a usar o divisor recebido como parâmetro — todo o resto do esqueleto se transfere igual.',
        concept: 'Contagem com laço, acumulador e resto',
      },
    },
    order: 13,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'tabuada-python',
    title: '14. Tabuada em Lista',
    description:
      'Defina a função `tabuada(n)` que retorne a lista com a tabuada de `n` de 1 a 10, nessa ordem: `[n*1, n*2, ..., n*10]`. Monte a lista dentro de um laço, acrescentando um resultado por volta com `append`.',
    instructions: 'Exemplo: tabuada(5) => [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]; tabuada(1) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]',
    language: 'python',
    initialCode: 'def tabuada(n):\n    # Retorne a lista da tabuada de n, de 1 a 10\n    pass\n',
    testCode:
      'assert tabuada(5) == [5, 10, 15, 20, 25, 30, 35, 40, 45, 50], "tabuada(5) deve ser [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]"\nassert tabuada(1) == [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], "tabuada(1) deve ser [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]"',
    hiddenTests:
      'assert tabuada(0) == [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "tabuada(0) deve ser dez zeros"\nassert tabuada(3) == [3, 6, 9, 12, 15, 18, 21, 24, 27, 30], "tabuada(3) deve ser [3, 6, 9, 12, 15, 18, 21, 24, 27, 30]"',
    referenceSolution:
      'def tabuada(n):\n    resultado = []\n    for i in range(1, 11):\n        resultado.append(n * i)\n    return resultado\n',
    conceptTags: ['loops', 'listas'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Lista de quadrados',
        statement:
          'Defina a função `quadrados(n)` que retorne a lista dos quadrados de 1 até `n`: `[1, 4, 9, ..., n*n]`.',
        solution:
          'def quadrados(n):\n    # A compreensão de lista faz em uma linha o que um laço com\n    # append faria em três: percorre, calcula e já monta a lista.\n    return [i * i for i in range(1, n + 1)]',
        explanation:
          'Construir uma lista é repetir uma conta para cada posição. A compreensão acima é o atalho; no seu exercício, faça o caminho completo: lista vazia antes do laço, append com a conta de cada volta dentro dele, return no fim. Se o seu laço gerar os fatores de 1 a 10 sobre o número recebido, a tabuada sai pronta.',
        concept: 'Construção de listas em laço',
      },
    },
    order: 14,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'contagem-regressiva-python',
    title: '15. Contagem Regressiva',
    description:
      'Defina a função `contagem_regressiva(n)` que retorne a lista com a contagem de `n` até 1, em ordem decrescente. Desta vez, resolva com um laço `while`: ele repete enquanto a condição for verdadeira — e quem atualiza a variável de controle é você, dentro do laço. Para `n` igual a 0, a função retorna a lista vazia.',
    instructions: 'Exemplo: contagem_regressiva(3) => [3, 2, 1]; contagem_regressiva(0) => []',
    language: 'python',
    initialCode: 'def contagem_regressiva(n):\n    # Retorne a lista de n até 1, usando while\n    pass\n',
    testCode:
      'assert contagem_regressiva(3) == [3, 2, 1], "contagem_regressiva(3) deve ser [3, 2, 1]"\nassert contagem_regressiva(0) == [], "contagem_regressiva(0) deve ser []"',
    hiddenTests:
      'assert contagem_regressiva(5) == [5, 4, 3, 2, 1], "contagem_regressiva(5) deve ser [5, 4, 3, 2, 1]"\nassert contagem_regressiva(1) == [1], "contagem_regressiva(1) deve ser [1]"',
    referenceSolution:
      'def contagem_regressiva(n):\n    resultado = []\n    atual = n\n    while atual >= 1:\n        resultado.append(atual)\n        atual -= 1\n    return resultado\n',
    conceptTags: ['loops'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Contagem crescente com while',
        statement:
          'Defina a função `contar_ate(n)` que retorne a lista `[1, 2, ..., n]` usando um laço `while`.',
        solution:
          'def contar_ate(n):\n    resultado = []\n    atual = 1  # a variável de controle nasce antes do laço\n    while atual <= n:  # o laço repete enquanto a condição valer\n        resultado.append(atual)\n        atual += 1  # sem atualizar a variável, o laço nunca acaba\n    return resultado',
        explanation:
          'O while tem três compromissos: a variável de controle nasce antes, a condição decide cada volta e a atualização acontece dentro — esquecer a atualização é o famoso laço infinito. No seu exercício, inverta a direção: a variável nasce no topo da contagem e desce de um em um até a condição mandar parar.',
        concept: 'Laço while com variável de controle',
      },
    },
    order: 15,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'somar-lista-python',
    title: '16. Somar uma Lista',
    description:
      'Defina a função `somar_lista(numeros)` que retorne a soma de todos os elementos da lista. Some com um laço e um acumulador — sem usar a função pronta `sum`, porque o objetivo aqui é dominar o padrão. Lista vazia soma 0.',
    instructions: 'Exemplo: somar_lista([1, 2, 3]) => 6; somar_lista([]) => 0',
    language: 'python',
    initialCode: 'def somar_lista(numeros):\n    # Retorne a soma dos elementos da lista\n    pass\n',
    testCode:
      'assert somar_lista([1, 2, 3]) == 6, "somar_lista([1, 2, 3]) deve ser 6"\nassert somar_lista([]) == 0, "somar_lista([]) deve ser 0"',
    hiddenTests:
      'assert somar_lista([-1, 1]) == 0, "somar_lista([-1, 1]) deve ser 0"\nassert somar_lista([10, 20, 30]) == 60, "somar_lista([10, 20, 30]) deve ser 60"',
    referenceSolution:
      'def somar_lista(numeros):\n    total = 0\n    for numero in numeros:\n        total += numero\n    return total\n',
    conceptTags: ['listas', 'loops'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Total de uma compra',
        statement:
          'Defina a função `total_compra(precos)` que receba a lista de preços de uma compra e retorne o total a pagar.',
        solution:
          'def total_compra(precos):\n    total = 0  # o acumulador começa no elemento neutro da soma\n    for preco in precos:\n        total += preco  # cada item entra no acumulado, um por volta\n    return total',
        explanation:
          'Somar uma lista é o padrão acumulador em sua forma mais pura: zero antes do laço, += dentro, return depois — e uma lista vazia devolve o próprio zero de partida. É exatamente o esqueleto do seu exercício; só mudam o nome da lista e o que ela guarda.',
        concept: 'Acumulador sobre lista',
      },
    },
    order: 16,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'filtrar-pares-python',
    title: '17. Filtrar os Pares',
    description:
      'Defina a função `filtrar_pares(numeros)` que retorne uma nova lista só com os números pares da lista recebida, na mesma ordem. Monte com laço e `append`, ou com compreensão de lista no formato `[n for n in numeros if condição]`.',
    instructions: 'Exemplo: filtrar_pares([1, 2, 3, 4, 6]) => [2, 4, 6]; filtrar_pares([1, 3]) => []',
    language: 'python',
    initialCode: 'def filtrar_pares(numeros):\n    # Retorne uma nova lista só com os pares\n    pass\n',
    testCode:
      'assert filtrar_pares([1, 2, 3, 4, 6]) == [2, 4, 6], "filtrar_pares([1, 2, 3, 4, 6]) deve ser [2, 4, 6]"\nassert filtrar_pares([1, 3]) == [], "filtrar_pares([1, 3]) deve ser []"',
    hiddenTests:
      'assert filtrar_pares([]) == [], "filtrar_pares([]) deve ser []"\nassert filtrar_pares([-2, 3, 8]) == [-2, 8], "filtrar_pares([-2, 3, 8]) deve ser [-2, 8]"',
    referenceSolution:
      'def filtrar_pares(numeros):\n    return [n for n in numeros if n % 2 == 0]\n',
    conceptTags: ['listas', 'loops'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Filtrar as notas aprovadas',
        statement:
          'Defina a função `filtrar_aprovadas(notas)` que retorne uma nova lista só com as notas maiores ou iguais a 7.',
        solution:
          'def filtrar_aprovadas(notas):\n    # Filtrar é montar uma lista nova guardando só quem\n    # passa na condição — a lista original não muda.\n    return [nota for nota in notas if nota >= 7]',
        explanation:
          'Toda filtragem tem a mesma forma: percorrer a lista original e guardar numa lista nova apenas os itens que satisfazem um teste. Aqui o teste é "nota de aprovação"; no seu exercício, troque o teste pelo de paridade (o resto da divisão por 2) e a lista de entrada é a mesma ideia.',
        concept: 'Filtragem de listas com condição',
      },
    },
    order: 17,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'extremos-lista-python',
    title: '18. Extremos da Lista',
    description:
      'Defina a função `extremos_lista(numeros)` que retorne uma tupla com o menor e o maior elemento da lista, nessa ordem. Encontre os dois percorrendo a lista com um laço — sem usar as funções prontas `min` e `max`. A lista sempre terá pelo menos um elemento.',
    instructions: 'Exemplo: extremos_lista([4, 1, 9, 2]) => (1, 9); extremos_lista([7]) => (7, 7)',
    language: 'python',
    initialCode: 'def extremos_lista(numeros):\n    # Retorne (menor, maior) da lista\n    pass\n',
    testCode:
      'assert extremos_lista([4, 1, 9, 2]) == (1, 9), "extremos_lista([4, 1, 9, 2]) deve ser (1, 9)"\nassert extremos_lista([7]) == (7, 7), "extremos_lista([7]) deve ser (7, 7)"',
    hiddenTests:
      'assert extremos_lista([-5, -1, -9]) == (-9, -1), "extremos_lista([-5, -1, -9]) deve ser (-9, -1)"\nassert extremos_lista([3, 3]) == (3, 3), "extremos_lista([3, 3]) deve ser (3, 3)"',
    referenceSolution:
      'def extremos_lista(numeros):\n    menor = numeros[0]\n    maior = numeros[0]\n    for numero in numeros:\n        if numero < menor:\n            menor = numero\n        if numero > maior:\n            maior = numero\n    return (menor, maior)\n',
    conceptTags: ['listas', 'loops'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Faixa de preços de uma prateleira',
        statement:
          'Defina a função `faixa_de_precos(precos)` que retorne uma tupla com o menor e o maior preço da lista, nessa ordem. A lista sempre terá pelo menos um preço.',
        solution:
          'def faixa_de_precos(precos):\n    # Os dois "campeões" nascem como o primeiro elemento:\n    # qualquer outro precisa vencê-los para tomar o lugar.\n    menor = precos[0]\n    maior = precos[0]\n    for preco in precos:\n        if preco < menor:\n            menor = preco\n        if preco > maior:\n            maior = preco\n    return (menor, maior)',
        explanation:
          'Buscar extremos é guardar campeões provisórios e deixá-los ser desafiados por cada elemento do laço. Este exemplo é o seu exercício com outros nomes: transfira a varredura inteira e confira se a sua versão também acerta a lista de um elemento só, em que menor e maior são o mesmo número.',
        concept: 'Busca de extremos por varredura',
      },
    },
    order: 18,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'cadastro-dicionario-python',
    title: '19. Cadastro em Dicionário',
    description:
      'Defina a função `criar_cadastro(nome, idade)` que retorne um dicionário representando a pessoa, com as chaves `"nome"` e `"idade"` e os valores recebidos como parâmetro. Dicionário é a estrutura de chave e valor: cada informação mora sob um nome.',
    instructions: 'Exemplo: criar_cadastro("Ada", 17) => {"nome": "Ada", "idade": 17}',
    language: 'python',
    initialCode: 'def criar_cadastro(nome, idade):\n    # Retorne o dicionário do cadastro\n    pass\n',
    testCode:
      'assert criar_cadastro("Ada", 17) == {"nome": "Ada", "idade": 17}, "criar_cadastro(\'Ada\', 17) deve montar o dicionário com nome e idade"',
    hiddenTests:
      'assert criar_cadastro("Bruno", 20) == {"nome": "Bruno", "idade": 20}, "criar_cadastro(\'Bruno\', 20) deve montar o dicionário com nome e idade"\nassert criar_cadastro("Ada", 0)["idade"] == 0, "a idade 0 deve ser guardada, não descartada"',
    referenceSolution:
      'def criar_cadastro(nome, idade):\n    return {"nome": nome, "idade": idade}\n',
    conceptTags: ['dicionarios-e-estruturas'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Registro de um livro',
        statement:
          'Defina a função `criar_livro(titulo, autor)` que retorne um dicionário com as chaves `"titulo"` e `"autor"` e os valores recebidos.',
        solution:
          'def criar_livro(titulo, autor):\n    # Chaves entre aspas, valores vindos dos parâmetros:\n    # o dicionário é literal, montado na hora do return.\n    return {"titulo": titulo, "autor": autor}',
        explanation:
          'Montar um dicionário literal é listar os pares chave: valor entre chaves. No seu exercício, as chaves e os parâmetros têm outros nomes — a forma de montar é a mesma. Cuidado para não trocar: a chave é o texto fixo entre aspas; o valor é a variável.',
        concept: 'Criação de dicionários com pares chave-valor',
      },
    },
    order: 19,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'preco-no-estoque-python',
    title: '20. Preço no Estoque',
    description:
      'Defina a função `consultar_preco(estoque, produto)` que receba um dicionário de estoque (produto → preço) e retorne o preço do produto pedido. Se o produto não estiver no estoque, retorne `-1`. O método `get(chave, padrao)` do dicionário resolve a consulta sem levantar erro quando a chave não existe.',
    instructions: 'Exemplo: consultar_preco({"arroz": 5.5, "feijao": 8.0}, "arroz") => 5.5; consultar_preco({"arroz": 5.5}, "leite") => -1',
    language: 'python',
    initialCode: 'def consultar_preco(estoque, produto):\n    # Retorne o preço do produto, ou -1 se não houver\n    pass\n',
    testCode:
      'assert consultar_preco({"arroz": 5.5, "feijao": 8.0}, "arroz") == 5.5, "o preço do arroz deve ser 5.5"\nassert consultar_preco({"arroz": 5.5}, "leite") == -1, "produto ausente deve retornar -1"',
    hiddenTests:
      'assert consultar_preco({"caneta": 2.0}, "caneta") == 2.0, "o preço da caneta deve ser 2.0"\nassert consultar_preco({}, "arroz") == -1, "estoque vazio deve retornar -1"',
    referenceSolution:
      'def consultar_preco(estoque, produto):\n    return estoque.get(produto, -1)\n',
    conceptTags: ['dicionarios-e-estruturas'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Quantidade em estoque',
        statement:
          'Defina a função `quantidade_em_estoque(estoque, produto)` que receba um dicionário de estoque (produto → quantidade) e retorne a quantidade do produto. Se o produto não estiver no estoque, retorne `0`.',
        solution:
          'def quantidade_em_estoque(estoque, produto):\n    # get com valor padrão: chave presente devolve o valor;\n    # chave ausente devolve o padrão, sem erro.\n    return estoque.get(produto, 0)',
        explanation:
          'Acessar dicionário com colchetes quebra quando a chave não existe; o get foi feito exatamente para consultas que podem falhar, porque ele aceita um plano B. No seu exercício, o plano B (o valor devolvido quando o produto falta) é outro — identifique no enunciado qual número sinaliza a ausência.',
        concept: 'Consulta segura em dicionário com get',
      },
    },
    order: 20,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'contar-letras-python',
    title: '21. Contar Letras',
    description:
      'Defina a função `contar_letras(texto)` que retorne um dicionário com a contagem de cada letra do texto: cada chave é uma letra e o valor é quantas vezes ela aparece. Ignore os caracteres de espaço. Maiúsculas e minúsculas contam como letras diferentes.',
    instructions: 'Exemplo: contar_letras("banana") => {"b": 1, "a": 3, "n": 2}; contar_letras("a a") => {"a": 2}',
    language: 'python',
    initialCode: 'def contar_letras(texto):\n    # Retorne o dicionário de contagem das letras\n    pass\n',
    testCode:
      'assert contar_letras("banana") == {"b": 1, "a": 3, "n": 2}, "contar_letras(\'banana\') deve contar b:1, a:3, n:2"\nassert contar_letras("a a") == {"a": 2}, "espaços não entram na contagem"',
    hiddenTests:
      'assert contar_letras("") == {}, "texto vazio deve retornar dicionário vazio"\nassert contar_letras("sol") == {"s": 1, "o": 1, "l": 1}, "contar_letras(\'sol\') deve contar cada letra uma vez"',
    referenceSolution:
      'def contar_letras(texto):\n    contagem = {}\n    for letra in texto:\n        if letra == " ":\n            continue\n        contagem[letra] = contagem.get(letra, 0) + 1\n    return contagem\n',
    conceptTags: ['dicionarios-e-estruturas', 'loops', 'entrada-e-strings'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Contar os dígitos de um código',
        statement:
          'Defina a função `contar_digitos(codigo)` que retorne um dicionário com a contagem de cada dígito presente no código, ignorando os demais caracteres.',
        solution:
          'def contar_digitos(codigo):\n    contagem = {}\n    for caractere in codigo:\n        if caractere.isdigit():  # só dígitos entram na contagem\n            # get(caractere, 0) lê a contagem atual sem erro se for a 1ª vez\n            contagem[caractere] = contagem.get(caractere, 0) + 1\n    return contagem',
        explanation:
          'Contar ocorrências num dicionário usa o truque do get com padrão 0: a primeira aparição cria a chave já valendo 1, as próximas somam. No seu exercício, o filtro muda (em vez de "é dígito", você pula um caractere específico) — e o cuidado extra é que espaço não vira chave no dicionário.',
        concept: 'Contagem de ocorrências em dicionário',
      },
    },
    order: 21,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'fatorial-python',
    title: '22. Fatorial',
    description:
      'Defina a função `fatorial(n)` que retorne o fatorial de `n` (n! = 1 × 2 × ... × n). Por definição, o fatorial de 0 é 1. Monte o produto com um laço e um acumulador que começa em 1 — repare que ele é diferente do acumulador de soma, que começa em 0.',
    instructions: 'Exemplo: fatorial(5) => 120; fatorial(0) => 1',
    language: 'python',
    initialCode: 'def fatorial(n):\n    # Retorne o fatorial de n\n    pass\n',
    testCode:
      'assert fatorial(5) == 120, "fatorial(5) deve ser 120"\nassert fatorial(0) == 1, "fatorial(0) deve ser 1"',
    hiddenTests:
      'assert fatorial(1) == 1, "fatorial(1) deve ser 1"\nassert fatorial(7) == 5040, "fatorial(7) deve ser 5040"',
    referenceSolution:
      'def fatorial(n):\n    resultado = 1\n    for i in range(2, n + 1):\n        resultado *= i\n    return resultado\n',
    conceptTags: ['funcoes', 'loops'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Potência com laço',
        statement:
          'Defina a função `potencia(base, expoente)` que retorne a base elevada ao expoente, multiplicando em laço (sem usar o operador `**`). Potência de expoente 0 vale 1.',
        solution:
          'def potencia(base, expoente):\n    resultado = 1  # acumulador de produto começa em 1, não em 0\n    for _ in range(expoente):\n        resultado *= base  # multiplica pela base, uma vez por volta\n    return resultado',
        explanation:
          'Produto acumulado é o primo multiplicativo da soma acumulada: o acumulador nasce em 1 (o neutro da multiplicação — começar em 0 zeraria tudo) e cada volta multiplica pelo fator da vez. No seu exercício, o fator de cada volta não é fixo: ele cresce junto com o contador do laço. Qual é o fator da volta i?',
        concept: 'Acumulador multiplicativo em laço',
      },
    },
    order: 22,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'eh-primo-python',
    title: '23. É Primo?',
    description:
      'Defina a função `eh_primo(n)` que retorne `True` se o número for primo e `False` caso contrário. Um primo só é divisível por 1 e por ele mesmo: teste os divisores de 2 até n-1 e, se algum dividir `n` sem resto, ele não é primo. Números menores que 2 não são primos.',
    instructions: 'Exemplo: eh_primo(7) => True; eh_primo(9) => False; eh_primo(2) => True',
    language: 'python',
    initialCode: 'def eh_primo(n):\n    # Retorne True se n for primo, False senão\n    pass\n',
    testCode:
      'assert eh_primo(7) == True, "eh_primo(7) deve ser True"\nassert eh_primo(9) == False, "eh_primo(9) deve ser False"\nassert eh_primo(2) == True, "eh_primo(2) deve ser True"',
    hiddenTests:
      'assert eh_primo(1) == False, "eh_primo(1) deve ser False"\nassert eh_primo(13) == True, "eh_primo(13) deve ser True"\nassert eh_primo(25) == False, "eh_primo(25) deve ser False"',
    referenceSolution:
      'def eh_primo(n):\n    if n < 2:\n        return False\n    for divisor in range(2, n):\n        if n % divisor == 0:\n            return False\n    return True\n',
    conceptTags: ['funcoes', 'loops', 'condicionais'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'É potência de dois?',
        statement:
          'Defina a função `eh_potencia_de_dois(n)` que retorne `True` se `n` for uma potência de dois (1, 2, 4, 8, 16, ...) e `False` caso contrário. Zero e negativos não são potências de dois.',
        solution:
          'def eh_potencia_de_dois(n):\n    if n < 1:\n        return False\n    # Dividir por 2 enquanto der exato: uma potência de dois\n    # encolhe até virar 1; qualquer outro número trava num ímpar.\n    while n % 2 == 0:\n        n = n // 2\n    return n == 1',
        explanation:
          'Este exemplo mostra o padrão "responder uma pergunta sim/não com laço": você transforma o número até sobrar uma conclusão. No seu exercício, o laço procura um divisor que desminta a primalidade — encontrou um, a resposta é False na hora (return dentro do laço); se o laço acabar sem desmentir, a resposta é True. E os números abaixo de 2 precisam de tratamento antes do laço começar.',
        concept: 'Funções booleanas com laço e retorno antecipado',
      },
    },
    order: 23,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'saudacao-com-padrao-python',
    title: '24. Saudação com Padrão',
    description:
      'Defina a função `saudar(nome, cumprimento="Olá")` que retorne a frase `<cumprimento>, <nome>!` montada com uma f-string. O segundo parâmetro tem um valor padrão: quem chamar a função sem ele recebe a saudação com `"Olá"`.',
    instructions: 'Exemplo: saudar("Ada") => "Olá, Ada!"; saudar("Ada", "Bom dia") => "Bom dia, Ada!"',
    language: 'python',
    initialCode: 'def saudar(nome, cumprimento="Olá"):\n    # Retorne a saudação montada com f-string\n    pass\n',
    testCode:
      'assert saudar("Ada") == "Olá, Ada!", "saudar(\'Ada\') deve usar o cumprimento padrão"\nassert saudar("Ada", "Bom dia") == "Bom dia, Ada!", "saudar(\'Ada\', \'Bom dia\') deve usar o cumprimento dado"',
    hiddenTests:
      'assert saudar("Bruno") == "Olá, Bruno!", "saudar(\'Bruno\') deve usar o cumprimento padrão"\nassert saudar("Bruno", "Boa noite") == "Boa noite, Bruno!", "saudar(\'Bruno\', \'Boa noite\') deve usar o cumprimento dado"',
    referenceSolution:
      'def saudar(nome, cumprimento="Olá"):\n    return f"{cumprimento}, {nome}!"\n',
    conceptTags: ['funcoes', 'entrada-e-strings'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Frase com pontuação padrão',
        statement:
          'Defina a função `montar_frase(nome, pontuacao="!")` que retorne a frase `Olá, <nome><pontuacao>`, usando a pontuação padrão quando ela não for informada.',
        solution:
          'def montar_frase(nome, pontuacao="!"):\n    # O valor depois do = na assinatura é o padrão: ele só é\n    # usado quando a chamada não passa esse argumento.\n    return f"Olá, {nome}{pontuacao}"',
        explanation:
          'Parâmetro com padrão é um parâmetro que já nasce preenchido: a chamada pode omiti-lo sem erro. No seu exercício, quem tem padrão é o segundo parâmetro — e ele entra no começo da frase, não no fim. Repare também onde vai a vírgula do formato pedido.',
        concept: 'Parâmetros com valor padrão',
      },
    },
    order: 24,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'divisao-segura-python',
    title: '25. Divisão Segura',
    description:
      'Defina a função `dividir(a, b)` que retorne o resultado da divisão de `a` por `b`. Dividir por zero quebra o programa com `ZeroDivisionError`: proteja a divisão com `try`/`except` e retorne `None` quando o divisor for zero.',
    instructions: 'Exemplo: dividir(10, 2) => 5.0; dividir(1, 0) => None',
    language: 'python',
    initialCode: 'def dividir(a, b):\n    # Retorne a divisão, ou None se o divisor for zero\n    pass\n',
    testCode:
      'assert dividir(10, 2) == 5.0, "dividir(10, 2) deve ser 5.0"\nassert dividir(1, 0) is None, "dividir(1, 0) deve ser None"',
    hiddenTests:
      'assert dividir(7, 2) == 3.5, "dividir(7, 2) deve ser 3.5"\nassert dividir(0, 5) == 0.0, "dividir(0, 5) deve ser 0.0"',
    referenceSolution:
      'def dividir(a, b):\n    try:\n        return a / b\n    except ZeroDivisionError:\n        return None\n',
    conceptTags: ['erros-e-depuracao', 'funcoes'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Dividir a conta com segurança',
        statement:
          'Defina a função `dividir_conta(total, pessoas)` que retorne quanto cada pessoa paga ao dividir a conta igualmente. Se o número de pessoas for zero, retorne `None`.',
        solution:
          'def dividir_conta(total, pessoas):\n    try:\n        # A tentativa é a operação que pode falhar.\n        return total / pessoas\n    except ZeroDivisionError:\n        # O plano B: em vez do erro, o sinal combinado.\n        return None',
        explanation:
          'O try/except tem dois blocos com papéis claros: o try guarda a operação perigosa e o except escreve o plano B para quando ela falhar. Este exemplo é o seu exercício com outros nomes — troque os parâmetros e a operação é a mesma divisão. O que o seu except deve retornar quando a divisão não existe?',
        concept: 'Tratamento de erros com try/except',
      },
    },
    order: 25,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'converter-para-inteiro-python',
    title: '26. Converter para Inteiro',
    description:
      'Defina a função `para_inteiro(texto)` que converta o texto recebido para número inteiro com `int()`. Se o texto não for um número válido, a conversão levanta `ValueError`: capture com `try`/`except` e retorne `None` nesse caso.',
    instructions: 'Exemplo: para_inteiro("42") => 42; para_inteiro("abc") => None',
    language: 'python',
    initialCode: 'def para_inteiro(texto):\n    # Retorne o inteiro convertido, ou None se não der\n    pass\n',
    testCode:
      'assert para_inteiro("42") == 42, "para_inteiro(\'42\') deve ser 42"\nassert para_inteiro("abc") is None, "para_inteiro(\'abc\') deve ser None"',
    hiddenTests:
      'assert para_inteiro("-7") == -7, "para_inteiro(\'-7\') deve ser -7"\nassert para_inteiro("3.5") is None, "para_inteiro(\'3.5\') deve ser None"',
    referenceSolution:
      'def para_inteiro(texto):\n    try:\n        return int(texto)\n    except ValueError:\n        return None\n',
    conceptTags: ['erros-e-depuracao', 'funcoes'],
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Converter para decimal com segurança',
        statement:
          'Defina a função `para_decimal(texto)` que converta o texto para número decimal com `float()`. Se o texto não for um número válido, retorne `None`.',
        solution:
          'def para_decimal(texto):\n    try:\n        return float(texto)\n    except ValueError:\n        # float() levanta ValueError para texto que não é número.\n        return None',
        explanation:
          'Conversão de texto é outra operação que falha com ValueError — e o formato da proteção é o mesmo da atividade anterior: tentativa no try, None no except. No seu exercício, o conversor é o int() em vez do float(). Atenção ao caso traiçoeiro: um texto decimal como "3.5" é número para o float(), mas não é um inteiro válido para o int().',
        concept: 'Conversão de tipos com tratamento de ValueError',
      },
    },
    order: 26,
  },
  {
    courseSlug: 'introducao-python',
    slug: 'projeto-final-python',
    title: '27. Projeto Final: Relatório de Notas',
    description:
      'Projeto final da trilha: defina a função `relatorio_de_notas(notas)` que receba uma lista de notas (nunca vazia) e retorne um dicionário com o relatório da turma: `"media"` (a média, arredondada para 2 casas), `"maior"` (a maior nota), `"menor"` (a menor nota) e `"aprovados"` (quantos alunos tiraram nota maior ou igual a 7). É a trilha inteira trabalhando junta: laço, condicionais, lista, dicionário e função.',
    instructions: 'Exemplo: relatorio_de_notas([8, 6, 10]) => {"media": 8.0, "maior": 10, "menor": 6, "aprovados": 2}',
    language: 'python',
    initialCode: 'def relatorio_de_notas(notas):\n    # Monte o relatório: media, maior, menor, aprovados\n    pass\n',
    testCode:
      'assert relatorio_de_notas([8, 6, 10]) == {"media": 8.0, "maior": 10, "menor": 6, "aprovados": 2}, "o relatório de [8, 6, 10] deve ter media 8.0, maior 10, menor 6 e 2 aprovados"\nassert relatorio_de_notas([7]) == {"media": 7.0, "maior": 7, "menor": 7, "aprovados": 1}, "o relatório de [7] deve ter media 7.0, maior 7, menor 7 e 1 aprovado"',
    hiddenTests:
      'assert relatorio_de_notas([5, 5, 5]) == {"media": 5.0, "maior": 5, "menor": 5, "aprovados": 0}, "o relatório de [5, 5, 5] deve ter media 5.0 e nenhum aprovado"\nassert relatorio_de_notas([9.5, 6.5]) == {"media": 8.0, "maior": 9.5, "menor": 6.5, "aprovados": 1}, "o relatório de [9.5, 6.5] deve ter media 8.0, maior 9.5, menor 6.5 e 1 aprovado"',
    referenceSolution:
      'def relatorio_de_notas(notas):\n    total = 0\n    maior = notas[0]\n    menor = notas[0]\n    aprovados = 0\n    for nota in notas:\n        total += nota\n        if nota > maior:\n            maior = nota\n        if nota < menor:\n            menor = nota\n        if nota >= 7:\n            aprovados += 1\n    return {\n        "media": round(total / len(notas), 2),\n        "maior": maior,\n        "menor": menor,\n        "aprovados": aprovados,\n    }\n',
    conceptTags: ['projeto-final', 'listas', 'dicionarios-e-estruturas', 'funcoes', 'condicionais', 'loops'],
    isBossFight: true,
    lessonPayload: {
      // RASCUNHO (Q1): exemplo análogo autorado por agente, pendente de
      // revisão e aprovação do admin.
      reviewStatus: 'draft',
      analogousExample: {
        title: 'Resumo das temperaturas da semana',
        statement:
          'Defina a função `resumo_temperaturas(temperaturas)` que receba uma lista de temperaturas (nunca vazia) e retorne um dicionário com `"media"` (arredondada para 2 casas), `"maior"`, `"menor"` e `"dias_quentes"` (quantos dias tiveram 30 graus ou mais).',
        solution:
          'def resumo_temperaturas(temperaturas):\n    total = 0\n    maior = temperaturas[0]\n    menor = temperaturas[0]\n    dias_quentes = 0\n    # Uma única varredura alimenta os quatro números do resumo.\n    for temperatura in temperaturas:\n        total += temperatura\n        if temperatura > maior:\n            maior = temperatura\n        if temperatura < menor:\n            menor = temperatura\n        if temperatura >= 30:\n            dias_quentes += 1\n    return {\n        "media": round(total / len(temperaturas), 2),\n        "maior": maior,\n        "menor": menor,\n        "dias_quentes": dias_quentes,\n    }',
        explanation:
          'Este exemplo é o projeto final com outra roupa: um resumo de vários números calculado numa única varredura da lista — soma para a média, dois campeões para os extremos e um contador com condição. Transfira a estrutura inteira e troque apenas os nomes, a condição do contador e as chaves do dicionário final.',
        concept: 'Relatório agregado em uma única varredura',
      },
    },
    order: 27,
  },
];
