// Seed da Torre de Desafios (Fase 0): curso + 3 andares de exemplo.
// Cada andar tem 19 atividades: 18 de código + 1 guardião (casa 30).
// Idempotente: upsert por (courseId, slug). Rodar DEPOIS de aplicar a
// migration da torre e do `prisma generate` (o client precisa existir).
// Pré-requisito extra: o banco também precisa da deriva local
// (schema-drift.sql: bits_balance/streak_freezes em users). O seed verifica
// isso antes de escrever qualquer coisa e falha com o comando exato se a
// deriva estiver ausente — sem ela, o primeiro upsert quebra com P2022.
//   DATABASE_URL=... node scripts/seed-tower.mjs
// (DATABASE_URL vem do .env da raiz ou do ~/workspace/local-stack/.env)
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const apiRequire = createRequire(
  new URL('../apps/api/package.json', import.meta.url),
);
const { PrismaClient } = apiRequire('@prisma/client');
const { PrismaPg } = apiRequire('@prisma/adapter-pg');
const bcrypt = apiRequire('bcrypt');

apiRequire('dotenv').config();

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL ?? ''),
});
const BCRYPT_ROUNDS = 12;

// Tempo de execução do sandbox por tentativa (ms). NÃO confundir com o
// tempo limite da casa na torre (90/180/300/420 s), que é parede de relógio
// e é aplicado pelo TowerService via TowerMove.createdAt.
const TIME_LIMIT_MS = 5000;

/** Desafio mínimo: função, teste e solução de referência. */
function challenge(fn, title, description, instructions, initialCode, tests, solution) {
  const testCode = [
    `if (typeof ${fn} !== 'function') throw new Error('A funcao ${fn} precisa estar declarada');`,
    // A mensagem usa JSON.stringify para não quebrar quando a chamada ou o
    // valor esperado contém aspas simples (ex.: saudacao('Ana')).
    ...tests.map(
      ([call, expected]) =>
        `if (${call} !== ${expected}) throw new Error(${JSON.stringify(`${call} deve retornar ${expected}`)});`,
    ),
  ].join('\n');
  return { fn, title, description, instructions, initialCode, testCode, solution };
}

const FLOORS = [
  {
    floor: 1,
    title: 'Primeiros passos',
    theme: 'Lógica e variáveis',
    challenges: [
      challenge('soma', 'Somar dois números', 'Some dois números e retorne o resultado.',
        'Crie a função soma(a, b) que retorna a + b.',
        'function soma(a, b) {\n  // seu código aqui\n}',
        [['soma(2, 3)', '5'], ['soma(-1, 5)', '4'], ['soma(0, 0)', '0']],
        'function soma(a, b) {\n  return a + b;\n}'),
      challenge('dobro', 'Dobro de um número', 'Retorne o dobro de um número.',
        'Crie a função dobro(n) que retorna n * 2.',
        'function dobro(n) {\n  // seu código aqui\n}',
        [['dobro(4)', '8'], ['dobro(0)', '0'], ['dobro(-3)', '-6']],
        'function dobro(n) {\n  return n * 2;\n}'),
      challenge('ehPar', 'É par?', 'Diga se um número é par.',
        'Crie a função ehPar(n) que retorna true se n for par e false caso contrário.',
        'function ehPar(n) {\n  // seu código aqui\n}',
        [['ehPar(4)', 'true'], ['ehPar(7)', 'false'], ['ehPar(0)', 'true']],
        'function ehPar(n) {\n  return n % 2 === 0;\n}'),
      challenge('maior', 'Maior de dois', 'Retorne o maior entre dois números.',
        'Crie a função maior(a, b) que retorna o maior dos dois.',
        'function maior(a, b) {\n  // seu código aqui\n}',
        [['maior(3, 7)', '7'], ['maior(9, 2)', '9'], ['maior(5, 5)', '5']],
        'function maior(a, b) {\n  return a > b ? a : b;\n}'),
      challenge('areaRetangulo', 'Área do retângulo', 'Calcule a área de um retângulo.',
        'Crie a função areaRetangulo(largura, altura) que retorna largura * altura.',
        'function areaRetangulo(largura, altura) {\n  // seu código aqui\n}',
        [['areaRetangulo(4, 5)', '20'], ['areaRetangulo(3, 3)', '9']],
        'function areaRetangulo(largura, altura) {\n  return largura * altura;\n}'),
      challenge('celsiusParaFahrenheit', 'Celsius para Fahrenheit', 'Converta a temperatura.',
        'Crie a função celsiusParaFahrenheit(c) que retorna c * 9/5 + 32.',
        'function celsiusParaFahrenheit(c) {\n  // seu código aqui\n}',
        [['celsiusParaFahrenheit(0)', '32'], ['celsiusParaFahrenheit(100)', '212']],
        'function celsiusParaFahrenheit(c) {\n  return c * 9 / 5 + 32;\n}'),
      challenge('saudacao', 'Saudação', 'Monte uma saudação com o nome.',
        "Crie a função saudacao(nome) que retorna `Olá, ${nome}!`.",
        'function saudacao(nome) {\n  // seu código aqui\n}',
        [["saudacao('Ana')", "'Olá, Ana!'"], ["saudacao('Beto')", "'Olá, Beto!'"]],
        'function saudacao(nome) {\n  return `Olá, ${nome}!`;\n}'),
      challenge('ehPositivo', 'É positivo?', 'Diga se um número é positivo.',
        'Crie a função ehPositivo(n) que retorna true se n > 0.',
        'function ehPositivo(n) {\n  // seu código aqui\n}',
        [['ehPositivo(5)', 'true'], ['ehPositivo(-2)', 'false'], ['ehPositivo(0)', 'false']],
        'function ehPositivo(n) {\n  return n > 0;\n}'),
      challenge('resto', 'Resto da divisão', 'Retorne o resto da divisão.',
        'Crie a função resto(a, b) que retorna a % b.',
        'function resto(a, b) {\n  // seu código aqui\n}',
        [['resto(10, 3)', '1'], ['resto(8, 4)', '0']],
        'function resto(a, b) {\n  return a % b;\n}'),
      challenge('quadrado', 'Quadrado de um número', 'Eleve um número ao quadrado.',
        'Crie a função quadrado(n) que retorna n * n.',
        'function quadrado(n) {\n  // seu código aqui\n}',
        [['quadrado(5)', '25'], ['quadrado(-3)', '9']],
        'function quadrado(n) {\n  return n * n;\n}'),
      challenge('media', 'Média de três números', 'Calcule a média aritmética.',
        'Crie a função media(a, b, c) que retorna (a + b + c) / 3.',
        'function media(a, b, c) {\n  // seu código aqui\n}',
        [['media(6, 8, 10)', '8'], ['media(0, 0, 9)', '3']],
        'function media(a, b, c) {\n  return (a + b + c) / 3;\n}'),
      challenge('ehMaiorDeIdade', 'Maior de idade?', 'Diga se a idade é 18 ou mais.',
        'Crie a função ehMaiorDeIdade(idade) que retorna true se idade >= 18.',
        'function ehMaiorDeIdade(idade) {\n  // seu código aqui\n}',
        [['ehMaiorDeIdade(18)', 'true'], ['ehMaiorDeIdade(17)', 'false']],
        'function ehMaiorDeIdade(idade) {\n  return idade >= 18;\n}'),
      challenge('converteMinutos', 'Minutos para segundos', 'Converta minutos em segundos.',
        'Crie a função converteMinutos(min) que retorna min * 60.',
        'function converteMinutos(min) {\n  // seu código aqui\n}',
        [['converteMinutos(2)', '120'], ['converteMinutos(0)', '0']],
        'function converteMinutos(min) {\n  return min * 60;\n}'),
      challenge('menor', 'Menor de três', 'Retorne o menor entre três números.',
        'Crie a função menor(a, b, c) que retorna o menor dos três.',
        'function menor(a, b, c) {\n  // seu código aqui\n}',
        [['menor(3, 1, 2)', '1'], ['menor(9, 8, 7)', '7']],
        'function menor(a, b, c) {\n  return Math.min(a, b, c);\n}'),
      challenge('ehMultiploDeTres', 'Múltiplo de 3?', 'Diga se um número é múltiplo de 3.',
        'Crie a função ehMultiploDeTres(n) que retorna true se n % 3 === 0.',
        'function ehMultiploDeTres(n) {\n  // seu código aqui\n}',
        [['ehMultiploDeTres(9)', 'true'], ['ehMultiploDeTres(10)', 'false']],
        'function ehMultiploDeTres(n) {\n  return n % 3 === 0;\n}'),
      challenge('perimetroQuadrado', 'Perímetro do quadrado', 'Calcule o perímetro.',
        'Crie a função perimetroQuadrado(lado) que retorna lado * 4.',
        'function perimetroQuadrado(lado) {\n  // seu código aqui\n}',
        [['perimetroQuadrado(5)', '20'], ['perimetroQuadrado(1)', '4']],
        'function perimetroQuadrado(lado) {\n  return lado * 4;\n}'),
      challenge('desconto', 'Preço com desconto', 'Aplique um desconto percentual.',
        'Crie a função desconto(preco, percentual) que retorna preco - preco * percentual / 100.',
        'function desconto(preco, percentual) {\n  // seu código aqui\n}',
        [['desconto(100, 10)', '90'], ['desconto(200, 25)', '150']],
        'function desconto(preco, percentual) {\n  return preco - preco * percentual / 100;\n}'),
      challenge('classificaNota', 'Aprovado ou reprovado?', 'Classifique uma nota.',
        "Crie a função classificaNota(nota) que retorna 'Aprovado' se nota >= 7 e 'Reprovado' caso contrário.",
        'function classificaNota(nota) {\n  // seu código aqui\n}',
        [["classificaNota(8)", "'Aprovado'"], ["classificaNota(5)", "'Reprovado'"]],
        "function classificaNota(nota) {\n  return nota >= 7 ? 'Aprovado' : 'Reprovado';\n}"),
    ],
    guardian: challenge('classificaTriangulo', 'Guardião: tipo de triângulo', 'Classifique um triângulo pelos lados.',
      "Crie a função classificaTriangulo(a, b, c) que retorna 'Equilátero' (3 lados iguais), 'Isósceles' (2 iguais) ou 'Escaleno' (todos diferentes).",
      'function classificaTriangulo(a, b, c) {\n  // seu código aqui\n}',
      [["classificaTriangulo(3, 3, 3)", "'Equilátero'"], ["classificaTriangulo(3, 3, 4)", "'Isósceles'"], ["classificaTriangulo(3, 4, 5)", "'Escaleno'"]],
      "function classificaTriangulo(a, b, c) {\n  if (a === b && b === c) return 'Equilátero';\n  if (a === b || b === c || a === c) return 'Isósceles';\n  return 'Escaleno';\n}"),
  },
  {
    floor: 2,
    title: 'Repetição e coleções',
    theme: 'Arrays e laços',
    challenges: [
      challenge('somaElementos', 'Soma dos elementos', 'Some todos os elementos de um array.',
        'Crie a função somaElementos(arr) que retorna a soma de todos os elementos.',
        'function somaElementos(arr) {\n  // seu código aqui\n}',
        [['somaElementos([1, 2, 3])', '6'], ['somaElementos([])', '0'], ['somaElementos([5])', '5']],
        'function somaElementos(arr) {\n  let total = 0;\n  for (const n of arr) total += n;\n  return total;\n}'),
      challenge('contaPares', 'Quantos pares?', 'Conte os números pares de um array.',
        'Crie a função contaPares(arr) que retorna quantos elementos são pares.',
        'function contaPares(arr) {\n  // seu código aqui\n}',
        [['contaPares([1, 2, 3, 4])', '2'], ['contaPares([1, 3, 5])', '0']],
        'function contaPares(arr) {\n  return arr.filter((n) => n % 2 === 0).length;\n}'),
      challenge('maiorElemento', 'Maior elemento', 'Encontre o maior elemento de um array.',
        'Crie a função maiorElemento(arr) que retorna o maior elemento.',
        'function maiorElemento(arr) {\n  // seu código aqui\n}',
        [['maiorElemento([1, 5, 3, 9, 2])', '9'], ['maiorElemento([10])', '10']],
        'function maiorElemento(arr) {\n  return Math.max(...arr);\n}'),
      challenge('dobraElementos', 'Dobrar elementos', 'Dobre cada elemento de um array.',
        'Crie a função dobraElementos(arr) que retorna um novo array com cada elemento dobrado.',
        'function dobraElementos(arr) {\n  // seu código aqui\n}',
        [["JSON.stringify(dobraElementos([1, 2, 3]))", "'[2,4,6]'"]],
        'function dobraElementos(arr) {\n  return arr.map((n) => n * 2);\n}'),
      challenge('filtraPositivos', 'Só os positivos', 'Filtre os números positivos.',
        'Crie a função filtraPositivos(arr) que retorna um novo array só com os números > 0.',
        'function filtraPositivos(arr) {\n  // seu código aqui\n}',
        [["JSON.stringify(filtraPositivos([-1, 2, -3, 4]))", "'[2,4]'"]],
        'function filtraPositivos(arr) {\n  return arr.filter((n) => n > 0);\n}'),
      challenge('contaOcorrencias', 'Contar ocorrências', 'Conte quantas vezes um valor aparece.',
        'Crie a função contaOcorrencias(arr, valor) que retorna quantas vezes valor aparece em arr.',
        'function contaOcorrencias(arr, valor) {\n  // seu código aqui\n}',
        [['contaOcorrencias([1, 2, 2, 3, 2], 2)', '3'], ['contaOcorrencias([1, 2], 9)', '0']],
        'function contaOcorrencias(arr, valor) {\n  return arr.filter((n) => n === valor).length;\n}'),
      challenge('inverteArray', 'Inverter array', 'Inverta a ordem dos elementos.',
        'Crie a função inverteArray(arr) que retorna um novo array com os elementos na ordem inversa (sem alterar o original).',
        'function inverteArray(arr) {\n  // seu código aqui\n}',
        [["JSON.stringify(inverteArray([1, 2, 3]))", "'[3,2,1]'"]],
        'function inverteArray(arr) {\n  return [...arr].reverse();\n}'),
      challenge('somaAte', 'Soma de 1 até N', 'Some os números de 1 até N.',
        'Crie a função somaAte(n) que retorna 1 + 2 + ... + n.',
        'function somaAte(n) {\n  // seu código aqui\n}',
        [['somaAte(5)', '15'], ['somaAte(1)', '1'], ['somaAte(0)', '0']],
        'function somaAte(n) {\n  let total = 0;\n  for (let i = 1; i <= n; i++) total += i;\n  return total;\n}'),
      challenge('contem', 'O array contém?', 'Diga se um valor está no array.',
        'Crie a função contem(arr, valor) que retorna true se valor estiver em arr.',
        'function contem(arr, valor) {\n  // seu código aqui\n}',
        [['contem([1, 2, 3], 2)', 'true'], ['contem([1, 2, 3], 9)', 'false']],
        'function contem(arr, valor) {\n  return arr.includes(valor);\n}'),
      challenge('mediaElementos', 'Média dos elementos', 'Calcule a média de um array.',
        'Crie a função mediaElementos(arr) que retorna a média dos elementos.',
        'function mediaElementos(arr) {\n  // seu código aqui\n}',
        [['mediaElementos([2, 4, 6])', '4'], ['mediaElementos([10])', '10']],
        'function mediaElementos(arr) {\n  return arr.reduce((acc, n) => acc + n, 0) / arr.length;\n}'),
      challenge('removeDuplicados', 'Sem duplicados', 'Remova os valores repetidos.',
        'Crie a função removeDuplicados(arr) que retorna um novo array sem valores repetidos, mantendo a ordem.',
        'function removeDuplicados(arr) {\n  // seu código aqui\n}',
        [["JSON.stringify(removeDuplicados([1, 2, 2, 3, 1]))", "'[1,2,3]'"]],
        'function removeDuplicados(arr) {\n  return [...new Set(arr)];\n}'),
      challenge('fatorial', 'Fatorial', 'Calcule o fatorial de N.',
        'Crie a função fatorial(n) que retorna n! (0! = 1).',
        'function fatorial(n) {\n  // seu código aqui\n}',
        [['fatorial(5)', '120'], ['fatorial(0)', '1'], ['fatorial(3)', '6']],
        'function fatorial(n) {\n  let resultado = 1;\n  for (let i = 2; i <= n; i++) resultado *= i;\n  return resultado;\n}'),
      challenge('paresAte', 'Pares até N', 'Liste os pares de 0 até N.',
        'Crie a função paresAte(n) que retorna um array com os números pares de 0 até n.',
        'function paresAte(n) {\n  // seu código aqui\n}',
        [["JSON.stringify(paresAte(6))", "'[0,2,4,6]'"], ["JSON.stringify(paresAte(1))", "'[0]'"]],
        'function paresAte(n) {\n  const resultado = [];\n  for (let i = 0; i <= n; i += 2) resultado.push(i);\n  return resultado;\n}'),
      challenge('somaImpares', 'Soma dos ímpares', 'Some só os números ímpares.',
        'Crie a função somaImpares(arr) que retorna a soma dos elementos ímpares.',
        'function somaImpares(arr) {\n  // seu código aqui\n}',
        [['somaImpares([1, 2, 3, 4])', '4'], ['somaImpares([2, 4])', '0']],
        'function somaImpares(arr) {\n  return arr.filter((n) => n % 2 !== 0).reduce((acc, n) => acc + n, 0);\n}'),
      challenge('encontraIndice', 'Em qual posição?', 'Encontre o índice de um valor.',
        'Crie a função encontraIndice(arr, valor) que retorna o índice de valor em arr, ou -1 se não existir.',
        'function encontraIndice(arr, valor) {\n  // seu código aqui\n}',
        [['encontraIndice([10, 20, 30], 20)', '1'], ['encontraIndice([10, 20], 99)', '-1']],
        'function encontraIndice(arr, valor) {\n  return arr.indexOf(valor);\n}'),
      challenge('multiplicaElementos', 'Produto dos elementos', 'Multiplique todos os elementos.',
        'Crie a função multiplicaElementos(arr) que retorna o produto de todos os elementos.',
        'function multiplicaElementos(arr) {\n  // seu código aqui\n}',
        [['multiplicaElementos([2, 3, 4])', '24'], ['multiplicaElementos([5])', '5']],
        'function multiplicaElementos(arr) {\n  return arr.reduce((acc, n) => acc * n, 1);\n}'),
      challenge('filtraMaioresQue', 'Maiores que o limite', 'Filtre por um limite.',
        'Crie a função filtraMaioresQue(arr, limite) que retorna um novo array só com os elementos > limite.',
        'function filtraMaioresQue(arr, limite) {\n  // seu código aqui\n}',
        [["JSON.stringify(filtraMaioresQue([1, 5, 10], 4))", "'[5,10]'"]],
        'function filtraMaioresQue(arr, limite) {\n  return arr.filter((n) => n > limite);\n}'),
      challenge('segundoMaior', 'Segundo maior', 'Encontre o segundo maior valor.',
        'Crie a função segundoMaior(arr) que retorna o segundo maior valor distinto do array.',
        'function segundoMaior(arr) {\n  // seu código aqui\n}',
        [['segundoMaior([1, 5, 3, 9, 2])', '5'], ['segundoMaior([10, 10, 5])', '5']],
        'function segundoMaior(arr) {\n  const unicos = [...new Set(arr)].sort((a, b) => b - a);\n  return unicos[1];\n}'),
    ],
    guardian: challenge('agrupaParesImpares', 'Guardião: pares e ímpares', 'Separe pares e ímpares em um objeto.',
      'Crie a função agrupaParesImpares(arr) que retorna { pares: [...], impares: [...] } com os elementos separados.',
      'function agrupaParesImpares(arr) {\n  // seu código aqui\n}',
      [["JSON.stringify(agrupaParesImpares([1, 2, 3, 4]))", "'{\"pares\":[2,4],\"impares\":[1,3]}'"]],
      "function agrupaParesImpares(arr) {\n  return { pares: arr.filter((n) => n % 2 === 0), impares: arr.filter((n) => n % 2 !== 0) };\n}"),
  },
  {
    floor: 3,
    title: 'Palavras e objetos',
    theme: 'Strings e objetos',
    challenges: [
      challenge('inverteString', 'Inverter texto', 'Inverta os caracteres de um texto.',
        'Crie a função inverteString(s) que retorna o texto ao contrário.',
        'function inverteString(s) {\n  // seu código aqui\n}',
        [["inverteString('abc')", "'cba'"], ["inverteString('')", "''"]],
        "function inverteString(s) {\n  return s.split('').reverse().join('');\n}"),
      challenge('contaCaracteres', 'Quantos caracteres?', 'Conte os caracteres de um texto.',
        'Crie a função contaCaracteres(s) que retorna s.length.',
        'function contaCaracteres(s) {\n  // seu código aqui\n}',
        [["contaCaracteres('olá')", '3'], ["contaCaracteres('')", '0']],
        'function contaCaracteres(s) {\n  return s.length;\n}'),
      challenge('maiusculas', 'Tudo em maiúsculas', 'Converta para maiúsculas.',
        'Crie a função maiusculas(s) que retorna o texto em maiúsculas.',
        'function maiusculas(s) {\n  // seu código aqui\n}',
        [["maiusculas('abc')", "'ABC'"]],
        'function maiusculas(s) {\n  return s.toUpperCase();\n}'),
      challenge('primeiraLetra', 'Primeira letra', 'Pegue a primeira letra.',
        'Crie a função primeiraLetra(s) que retorna o primeiro caractere do texto.',
        'function primeiraLetra(s) {\n  // seu código aqui\n}',
        [["primeiraLetra('casa')", "'c'"]],
        'function primeiraLetra(s) {\n  return s[0];\n}'),
      challenge('ehPalindromo', 'É palíndromo?', 'Diga se o texto lê igual ao contrário.',
        "Crie a função ehPalindromo(s) que retorna true se o texto for igual ao seu inverso.",
        'function ehPalindromo(s) {\n  // seu código aqui\n}',
        [["ehPalindromo('radar')", 'true'], ["ehPalindromo('codigo')", 'false']],
        "function ehPalindromo(s) {\n  return s === s.split('').reverse().join('');\n}"),
      challenge('contaPalavras', 'Quantas palavras?', 'Conte as palavras de um texto.',
        'Crie a função contaPalavras(s) que retorna a quantidade de palavras (separadas por espaço).',
        'function contaPalavras(s) {\n  // seu código aqui\n}',
        [["contaPalavras('olá mundo')", '2'], ["contaPalavras('uma')", '1']],
        "function contaPalavras(s) {\n  return s.split(' ').filter(Boolean).length;\n}"),
      challenge('juntaComVirgula', 'Juntar com vírgula', 'Junte os itens com ", ".',
        'Crie a função juntaComVirgula(arr) que retorna os itens unidos por ", ".',
        'function juntaComVirgula(arr) {\n  // seu código aqui\n}',
        [["juntaComVirgula(['a', 'b'])", "'a, b'"]],
        "function juntaComVirgula(arr) {\n  return arr.join(', ');\n}"),
      challenge('iniciais', 'Iniciais do nome', 'Pegue a inicial de cada palavra.',
        "Crie a função iniciais(nome) que retorna as iniciais de cada palavra, separadas por espaço (ex.: 'José Augusto' → 'J A').",
        'function iniciais(nome) {\n  // seu código aqui\n}',
        [["iniciais('José Augusto')", "'J A'"], ["iniciais('Ana')", "'A'"]],
        "function iniciais(nome) {\n  return nome.split(' ').map((p) => p[0]).join(' ');\n}"),
      challenge('removeEspacos', 'Sem espaços nas pontas', 'Remova os espaços das pontas.',
        'Crie a função removeEspacos(s) que retorna o texto sem espaços no início e no fim.',
        'function removeEspacos(s) {\n  // seu código aqui\n}',
        [["removeEspacos('  olá  ')", "'olá'"]],
        'function removeEspacos(s) {\n  return s.trim();\n}'),
      challenge('repete', 'Repetir texto', 'Repita um texto N vezes.',
        'Crie a função repete(s, n) que retorna o texto repetido n vezes.',
        'function repete(s, n) {\n  // seu código aqui\n}',
        [["repete('ab', 3)", "'ababab'"], ["repete('x', 0)", "''"]],
        'function repete(s, n) {\n  return s.repeat(n);\n}'),
      challenge('contaLetra', 'Contar uma letra', 'Conte as ocorrências de uma letra.',
        "Crie a função contaLetra(s, letra) que retorna quantas vezes letra aparece em s.",
        'function contaLetra(s, letra) {\n  // seu código aqui\n}',
        [["contaLetra('banana', 'a')", '3'], ["contaLetra('casa', 'z')", '0']],
        "function contaLetra(s, letra) {\n  return s.split('').filter((c) => c === letra).length;\n}"),
      challenge('capitaliza', 'Primeira letra maiúscula', 'Capitalize um texto.',
        'Crie a função capitaliza(s) que retorna o texto com a primeira letra maiúscula e o resto minúsculo.',
        'function capitaliza(s) {\n  // seu código aqui\n}',
        [["capitaliza('cASA')", "'Casa'"]],
        "function capitaliza(s) {\n  return s[0].toUpperCase() + s.slice(1).toLowerCase();\n}"),
      challenge('somaPrecos', 'Soma de preços', 'Some os preços de uma lista de itens.',
        'Crie a função somaPrecos(itens) que retorna a soma de item.preco de todos os itens.',
        'function somaPrecos(itens) {\n  // seu código aqui\n}',
        [["somaPrecos([{ preco: 10 }, { preco: 5 }])", '15'], ['somaPrecos([])', '0']],
        'function somaPrecos(itens) {\n  return itens.reduce((acc, item) => acc + item.preco, 0);\n}'),
      challenge('nomeMaisVelho', 'Quem é o mais velho?', 'Encontre o nome da pessoa mais velha.',
        'Crie a função nomeMaisVelho(pessoas) que retorna o nome da pessoa com maior idade.',
        'function nomeMaisVelho(pessoas) {\n  // seu código aqui\n}',
        [["nomeMaisVelho([{ nome: 'Ana', idade: 20 }, { nome: 'Beto', idade: 30 }])", "'Beto'"]],
        "function nomeMaisVelho(pessoas) {\n  return pessoas.reduce((maisVelha, p) => (p.idade > maisVelha.idade ? p : maisVelha)).nome;\n}"),
      challenge('filtraPorIdade', 'Filtrar por idade', 'Liste os nomes com idade mínima.',
        'Crie a função filtraPorIdade(pessoas, minima) que retorna os nomes das pessoas com idade >= minima.',
        'function filtraPorIdade(pessoas, minima) {\n  // seu código aqui\n}',
        [["JSON.stringify(filtraPorIdade([{ nome: 'Ana', idade: 20 }, { nome: 'Beto', idade: 30 }], 25))", "'[\"Beto\"]'"]],
        "function filtraPorIdade(pessoas, minima) {\n  return pessoas.filter((p) => p.idade >= minima).map((p) => p.nome);\n}"),
      challenge('mediaIdades', 'Média das idades', 'Calcule a média de idade.',
        'Crie a função mediaIdades(pessoas) que retorna a média das idades.',
        'function mediaIdades(pessoas) {\n  // seu código aqui\n}',
        [["mediaIdades([{ idade: 20 }, { idade: 30 }])", '25']],
        'function mediaIdades(pessoas) {\n  return pessoas.reduce((acc, p) => acc + p.idade, 0) / pessoas.length;\n}'),
      challenge('contaPorTipo', 'Contar por tipo', 'Conte os itens de um tipo.',
        'Crie a função contaPorTipo(itens, tipo) que retorna quantos itens têm item.tipo === tipo.',
        'function contaPorTipo(itens, tipo) {\n  // seu código aqui\n}',
        [["contaPorTipo([{ tipo: 'a' }, { tipo: 'b' }, { tipo: 'a' }], 'a')", '2']],
        "function contaPorTipo(itens, tipo) {\n  return itens.filter((i) => i.tipo === tipo).length;\n}"),
      challenge('formataUsuario', 'Formatar usuário', 'Monte a descrição de um usuário.',
        "Crie a função formataUsuario(u) que retorna `${u.nome} (${u.idade} anos)`.",
        'function formataUsuario(u) {\n  // seu código aqui\n}',
        [["formataUsuario({ nome: 'Ana', idade: 20 })", "'Ana (20 anos)'"]],
        "function formataUsuario(u) {\n  return `${u.nome} (${u.idade} anos)`;\n}"),
    ],
    guardian: challenge('analisaTexto', 'Guardião: análise de texto', 'Analise um texto em um objeto.',
      'Crie a função analisaTexto(s) que retorna { palavras: <nº de palavras>, caracteres: <nº de caracteres>, vogais: <nº de vogais (a, e, i, o, u, sem acento)> }.',
      'function analisaTexto(s) {\n  // seu código aqui\n}',
      [["JSON.stringify(analisaTexto('ola mundo'))", "'{\"palavras\":2,\"caracteres\":9,\"vogais\":4}'"]],
      "function analisaTexto(s) {\n  const vogais = s.toLowerCase().split('').filter((c) => 'aeiou'.includes(c)).length;\n  return { palavras: s.split(' ').filter(Boolean).length, caracteres: s.length, vogais };\n}"),
  },
];

// Colunas que o seed precisa mas que vivem FORA das migrations, na deriva
// pré-existente (~/workspace/local-stack/schema-drift.sql). Sem elas, o
// primeiro user.upsert quebra com P2022 (coluna não existe).
const DRIFT_COLUMNS = ['bits_balance', 'streak_freezes'];

/**
 * Pré-voo: garante que o banco tem as migrations E a deriva local antes de
 * escrever qualquer coisa. Falha rápido (exit 1) com o comando exato de
 * reparo, em vez de deixar o primeiro upsert explodir com P2022.
 */
async function checkPrerequisites() {
  const tables = await prisma.$queryRaw`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  `;
  if (tables.length === 0) {
    console.error(
      '[seed-tower] ERRO: tabela "users" não existe neste banco. ' +
        'Aplique as migrations antes do seed:\n' +
        '  cd apps/api && DATABASE_URL=<url-do-banco> ' +
        'SHADOW_DATABASE_URL=<url-do-banco-shadow> ' +
        'prisma migrate deploy\n' +
        'Nada foi escrito neste banco.',
    );
    await prisma.$disconnect();
    process.exit(1);
  }

  const rows = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
      AND column_name IN ('bits_balance', 'streak_freezes')
  `;
  const present = new Set(rows.map((r) => r.column_name));
  const missing = DRIFT_COLUMNS.filter((c) => !present.has(c));
  if (missing.length > 0) {
    console.error(
      `[seed-tower] ERRO: colunas da deriva pré-existente ausentes em "users": ${missing.join(', ')}.\n` +
        'Elas não estão nas migrations — vivem em ~/workspace/local-stack/schema-drift.sql.\n' +
        'Aplique a deriva neste banco antes do seed:\n' +
        '  node ~/workspace/local-stack/db-tools.mjs drift   # banco do .env do local-stack\n' +
        '  node ~/workspace/tower-validate/apply-drift.mjs <banco>   # banco scratch (localhost:5432)\n' +
        'Depois rode o seed novamente. Nada foi escrito neste banco.',
    );
    await prisma.$disconnect();
    process.exit(1);
  }
}

async function main() {
  console.log('[seed-tower] Iniciando seed da Torre de Desafios...');
  await checkPrerequisites();

  const instructorPassword = await bcrypt.hash('instrutor12345', BCRYPT_ROUNDS);
  const instructor = await prisma.user.upsert({
    where: { email: 'instrutor@plataforma.local' },
    update: {},
    create: {
      email: 'instrutor@plataforma.local',
      name: 'Professor Alan Turing',
      passwordHash: instructorPassword,
      role: 'instructor',
    },
  });

  const course = await prisma.course.upsert({
    where: { slug: 'torre-de-desafios' },
    update: { title: 'Torre de Desafios', description: 'Desafios da Torre de Desafios da Nexus Code.' },
    create: {
      title: 'Torre de Desafios',
      slug: 'torre-de-desafios',
      description: 'Desafios da Torre de Desafios da Nexus Code.',
      instructorId: instructor.id,
    },
  });

  let total = 0;
  for (const floor of FLOORS) {
    // 18 desafios de código (slugs torre-f{f}-c{1..18}) + 1 guardião.
    for (let i = 0; i < floor.challenges.length; i++) {
      const c = floor.challenges[i];
      const slug = `torre-f${floor.floor}-c${i + 1}`;
      await prisma.activity.upsert({
        where: { courseId_slug: { courseId: course.id, slug } },
        update: {},
        create: {
          courseId: course.id,
          title: `Torre A${floor.floor} — ${c.title}`,
          slug,
          description: c.description,
          instructions: c.instructions,
          language: 'javascript',
          initialCode: c.initialCode,
          testCode: c.testCode,
          timeLimitMs: TIME_LIMIT_MS,
          memoryLimitMb: 256,
          order: i + 1,
          conceptTags: ['torre-de-desafios', `andar-${floor.floor}`],
          referenceSolution: c.solution,
        },
      });
      total += 1;
    }
    const g = floor.guardian;
    await prisma.activity.upsert({
      where: { courseId_slug: { courseId: course.id, slug: `torre-f${floor.floor}-guardiao` } },
      update: {},
      create: {
        courseId: course.id,
        title: `Torre A${floor.floor} — Guardião: ${g.title}`,
        slug: `torre-f${floor.floor}-guardiao`,
        description: g.description,
        instructions: g.instructions,
        language: 'javascript',
        initialCode: g.initialCode,
        testCode: g.testCode,
        timeLimitMs: TIME_LIMIT_MS,
        memoryLimitMb: 256,
        order: 30,
        conceptTags: ['torre-de-desafios', `andar-${floor.floor}`, 'guardiao'],
        referenceSolution: g.solution,
        isBossFight: true,
      },
    });
    total += 1;
    console.log(`[seed-tower] Andar ${floor.floor} (${floor.title}): 19 atividades.`);
  }

  console.log(`[seed-tower] Concluído: curso ${course.slug}, ${total} atividades.`);
}

export { FLOORS };

// Só executa o seed quando rodado diretamente (importado, serve para
// validação: scripts/validate-seed-tower.mjs importa FLOORS e roda cada
// solução de referência contra o próprio testCode).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
    .catch((e) => {
      console.error('[seed-tower] Erro:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
