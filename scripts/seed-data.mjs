// Resolve @prisma/client e bcrypt a partir de apps/api (onde estão instalados
// no workspace pnpm; este script vive fora do workspace de pacotes).
import { createRequire } from 'node:module';
const apiRequire = createRequire(
  new URL('../apps/api/package.json', import.meta.url),
);
const { PrismaClient } = apiRequire('@prisma/client');
const { PrismaPg } = apiRequire('@prisma/adapter-pg');
const bcrypt = apiRequire('bcrypt');

// Carrega o .env da raiz antes de ler DATABASE_URL
apiRequire('dotenv').config();

// Prisma 7 exige driver adapter (mesmo padrão do PrismaService da API)
const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL ?? ''),
});
const BCRYPT_ROUNDS = 12;

async function main() {
  console.log('[seed-data] Iniciando seed de dados...');

  // 1. Criar Usuários
  const adminPassword = await bcrypt.hash('admin12345', BCRYPT_ROUNDS);
  const instructorPassword = await bcrypt.hash('instrutor12345', BCRYPT_ROUNDS);
  const studentPassword = await bcrypt.hash('aluno12345', BCRYPT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@plataforma.local' },
    update: {},
    create: {
      email: 'admin@plataforma.local',
      name: 'Administrador da Plataforma',
      passwordHash: adminPassword,
      role: 'admin',
    },
  });

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

  const student = await prisma.user.upsert({
    where: { email: 'aluno@plataforma.local' },
    update: {},
    create: {
      email: 'aluno@plataforma.local',
      name: 'Estudante Ada Lovelace',
      passwordHash: studentPassword,
      role: 'student',
      xp: 220,
      level: 2,
      streakDays: 3,
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'bruno@plataforma.local' },
    update: {},
    create: {
      email: 'bruno@plataforma.local',
      name: 'Bruno Silva',
      passwordHash: studentPassword,
      role: 'student',
      xp: 140,
      level: 1,
      streakDays: 1,
    },
  });

  // Seed sample badges
  await prisma.userBadge.upsert({
    where: { userId_badgeCode: { userId: student.id, badgeCode: 'first_step' } },
    update: {},
    create: {
      userId: student.id,
      badgeCode: 'first_step',
      title: 'Primeiro Passo',
      description: 'Enviou sua primeira solução de código!',
      icon: '🌱',
    },
  });

  await prisma.userBadge.upsert({
    where: { userId_badgeCode: { userId: student.id, badgeCode: 'streak_3' } },
    update: {},
    create: {
      userId: student.id,
      badgeCode: 'streak_3',
      title: 'Foco Constante',
      description: 'Manteve 3 dias seguidos de estudo!',
      icon: '🔥',
    },
  });

  console.log('[seed-data] Usuários criados:');
  console.log(` - Admin:      admin@plataforma.local / admin12345`);
  console.log(` - Instrutor:  instrutor@plataforma.local / instrutor12345`);
  console.log(` - Aluno 1:    aluno@plataforma.local / aluno12345 (Ada Lovelace)`);
  console.log(` - Aluno 2:    bruno@plataforma.local / aluno12345 (Bruno Silva)`);

  // 2. Criar Cursos
  const course1 = await prisma.course.upsert({
    where: { slug: 'algoritmos-javascript' },
    update: { enrollmentCode: 'ALGO2024' },
    create: {
      title: 'Algoritmos e Estruturas em JavaScript',
      slug: 'algoritmos-javascript',
      description: 'Aprenda os fundamentos de lógica e estruturas de dados essenciais através de exercícios práticos.',
      instructorId: instructor.id,
      enrollmentCode: 'ALGO2024',
    },
  });

  const course2 = await prisma.course.upsert({
    where: { slug: 'introducao-python' },
    update: { enrollmentCode: 'WEB2024' },
    create: {
      title: 'Introdução à Programação com Python',
      slug: 'introducao-python',
      description: 'Domine a sintaxe limpa do Python, funções, laços e manipulação de listas.',
      instructorId: instructor.id,
      enrollmentCode: 'WEB2024',
    },
  });

  // 3. Matricular os alunos nos cursos
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student.id, courseId: course1.id } },
    update: {},
    create: { userId: student.id, courseId: course1.id },
  });

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student.id, courseId: course2.id } },
    update: {},
    create: { userId: student.id, courseId: course2.id },
  });

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student2.id, courseId: course1.id } },
    update: {},
    create: { userId: student2.id, courseId: course1.id },
  });

  // 4. Criar Atividades para o Curso de JavaScript
  const solutionSoma = `function soma(a, b) {\n  return a + b;\n}\n`;
  const solutionPalindromo = `function ehPalindromo(str) {\n  const invertida = str.split('').reverse().join('');\n  return str === invertida;\n}\n`;
  const solutionMaiorNumero = `function maiorNumero(arr) {\n  return Math.max(...arr);\n}\n`;
  const solutionDobro = `def dobro(n):\n    return n * 2\n`;
  const solutionVogais = `def contar_vogais(texto):\n    total = 0\n    for letra in texto.lower():\n        if letra in "aeiou":\n            total += 1\n    return total\n`;

  const activity1 = await prisma.activity.upsert({
    where: { courseId_slug: { courseId: course1.id, slug: 'soma-dois-numeros' } },
    update: { referenceSolution: solutionSoma },
    create: {
      courseId: course1.id,
      title: '1. Soma de Dois Números',
      slug: 'soma-dois-numeros',
      description: 'Escreva uma função chamada `soma(a, b)` que receba dois números como parâmetros e retorne o resultado da sua soma.',
      instructions: 'Exemplo: soma(2, 3) => 5; soma(-1, 5) => 4',
      language: 'javascript',
      initialCode: `function soma(a, b) {\n  // Implemente sua solucao aqui\n}\n`,
      testCode: `if (typeof soma !== 'function') throw new Error('A funcao soma precisa estar declarada');\nif (soma(2, 3) !== 5) throw new Error('soma(2, 3) deve retornar 5');\nif (soma(-1, 5) !== 4) throw new Error('soma(-1, 5) deve retornar 4');`,
      hiddenTests: `if (soma(0, 0) !== 0) throw new Error('soma(0, 0) deve retornar 0');\nif (soma(100, 200) !== 300) throw new Error('soma(100, 200) deve retornar 300');`,
      referenceSolution: solutionSoma,
      order: 1,
    },
  });

  const activity2 = await prisma.activity.upsert({
    where: { courseId_slug: { courseId: course1.id, slug: 'verificar-palindromo' } },
    update: { referenceSolution: solutionPalindromo },
    create: {
      courseId: course1.id,
      title: '2. Verificador de Palíndromo',
      slug: 'verificar-palindromo',
      description: 'Crie uma função `ehPalindromo(str)` que verifique se uma palavra ou sequência de caracteres é lida da mesma forma de trás para frente. Retorne `true` ou `false`.',
      instructions: 'Exemplo: ehPalindromo("radar") => true; ehPalindromo("programacao") => false',
      language: 'javascript',
      initialCode: `function ehPalindromo(str) {\n  // Retorne true se for palindromo e false caso contrario\n}\n`,
      testCode: `if (typeof ehPalindromo !== 'function') throw new Error('A funcao ehPalindromo precisa estar declarada');\nif (ehPalindromo('radar') !== true) throw new Error('ehPalindromo("radar") deve retornar true');\nif (ehPalindromo('codigo') !== false) throw new Error('ehPalindromo("codigo") deve retornar false');`,
      hiddenTests: `if (ehPalindromo('ana') !== true) throw new Error('ehPalindromo("ana") deve retornar true');\nif (ehPalindromo('osso') !== true) throw new Error('ehPalindromo("osso") deve retornar true');`,
      referenceSolution: solutionPalindromo,
      order: 2,
    },
  });

  const activity3 = await prisma.activity.upsert({
    where: { courseId_slug: { courseId: course1.id, slug: 'maior-numero-array' } },
    update: { referenceSolution: solutionMaiorNumero },
    create: {
      courseId: course1.id,
      title: '3. Encontrar o Maior Número',
      slug: 'maior-numero-array',
      description: 'Implemente a função `maiorNumero(arr)` que receba um array de números inteiros e retorne o maior elemento presente no array.',
      instructions: 'Exemplo: maiorNumero([1, 5, 3, 9, 2]) => 9',
      language: 'javascript',
      initialCode: `function maiorNumero(arr) {\n  // Retorne o maior elemento do array\n}\n`,
      testCode: `if (typeof maiorNumero !== 'function') throw new Error('A funcao maiorNumero precisa estar declarada');\nif (maiorNumero([1, 5, 3, 9, 2]) !== 9) throw new Error('maiorNumero([1, 5, 3, 9, 2]) deve retornar 9');\nif (maiorNumero([10]) !== 10) throw new Error('maiorNumero([10]) deve retornar 10');`,
      hiddenTests: `if (maiorNumero([-10, -5, -20]) !== -5) throw new Error('maiorNumero([-10, -5, -20]) deve retornar -5');\nif (maiorNumero([100, 20, 500, 1]) !== 500) throw new Error('maiorNumero([100, 20, 500, 1]) deve retornar 500');`,
      referenceSolution: solutionMaiorNumero,
      order: 3,
    },
  });

  // 5. Criar Atividades para o Curso de Python
  await prisma.activity.upsert({
    where: { courseId_slug: { courseId: course2.id, slug: 'dobro-numero-python' } },
    update: { referenceSolution: solutionDobro },
    create: {
      courseId: course2.id,
      title: '1. Dobro de um Número',
      slug: 'dobro-numero-python',
      description: 'Defina a função `dobro(n)` que recebe um número inteiro ou decimal e retorna o dobro dele.',
      instructions: 'Exemplo: dobro(4) => 8; dobro(-3) => -6',
      language: 'python',
      initialCode: `def dobro(n):\n    # Retorne o dobro de n\n    pass\n`,
      testCode: `assert dobro(4) == 8, "dobro(4) deve ser 8"\nassert dobro(-3) == -6, "dobro(-3) deve ser -6"`,
      hiddenTests: `assert dobro(0) == 0, "dobro(0) deve ser 0"\nassert dobro(2.5) == 5.0, "dobro(2.5) deve ser 5.0"`,
      referenceSolution: solutionDobro,
      order: 1,
    },
  });

  await prisma.activity.upsert({
    where: { courseId_slug: { courseId: course2.id, slug: 'contar-vogais-python' } },
    update: { referenceSolution: solutionVogais },
    create: {
      courseId: course2.id,
      title: '2. Contagem de Vogais',
      slug: 'contar-vogais-python',
      description: 'Defina a função `contar_vogais(texto)` que retorne o número de vogais (a, e, i, o, u - maiúsculas ou minúsculas) presentes na string fornecida.',
      instructions: 'Exemplo: contar_vogais("Python") => 1; contar_vogais("Desenvolvimento") => 6',
      language: 'python',
      initialCode: `def contar_vogais(texto):\n    # Retorne a quantidade de vogais\n    pass\n`,
      testCode: `assert contar_vogais("Python") == 1, "contar_vogais('Python') deve ser 1"\nassert contar_vogais("Desenvolvimento") == 6, "contar_vogais('Desenvolvimento') deve ser 6"`,
      hiddenTests: `assert contar_vogais("AEIOU") == 5, "contar_vogais('AEIOU') deve ser 5"\nassert contar_vogais("xyz") == 0, "contar_vogais('xyz') deve ser 0"`,
      referenceSolution: solutionVogais,
      order: 2,
    },
  });

  // 6. Biblioteca Pública (curso marcado como biblioteca, visível apenas para instrutores)
  const libraryCourse = await prisma.course.upsert({
    where: { slug: 'biblioteca' },
    update: { isPublicLibrary: true, instructorId: admin.id },
    create: {
      title: 'Biblioteca Pública',
      slug: 'biblioteca',
      description: 'Coleção pública de problemas organizados por conceito, prontos para copiar para qualquer turma.',
      isPublicLibrary: true,
      instructorId: admin.id,
    },
  });

  const libraryActivities = [
    {
      slug: 'bib-somar-elementos',
      title: 'Somar Elementos do Array',
      conceptTags: ['arrays'],
      description: 'Implemente a função `somaElementos(arr)` que receba um array de números e retorne a soma de todos os elementos. Para um array vazio, retorne 0.',
      instructions: 'Exemplo: somaElementos([1, 2, 3, 4]) => 10; somaElementos([]) => 0',
      language: 'javascript',
      initialCode: `function somaElementos(arr) {\n  // Retorne a soma de todos os elementos do array\n}\n`,
      testCode: `if (typeof somaElementos !== 'function') throw new Error('A funcao somaElementos precisa estar declarada');\nif (somaElementos([1, 2, 3, 4]) !== 10) throw new Error('somaElementos([1, 2, 3, 4]) deve retornar 10');\nif (somaElementos([]) !== 0) throw new Error('somaElementos([]) deve retornar 0');`,
      hiddenTests: `if (somaElementos([5, -5, 10]) !== 10) throw new Error('somaElementos([5, -5, 10]) deve retornar 10');\nif (somaElementos([2.5, 2.5]) !== 5) throw new Error('somaElementos([2.5, 2.5]) deve retornar 5');`,
      referenceSolution: `function somaElementos(arr) {\n  return arr.reduce((total, n) => total + n, 0);\n}\n`,
      order: 1,
    },
    {
      slug: 'bib-contar-pares',
      title: 'Contar Números Pares',
      conceptTags: ['arrays'],
      description: 'Implemente a função `contarPares(arr)` que receba um array de números inteiros e retorne quantos deles são pares.',
      instructions: 'Exemplo: contarPares([1, 2, 3, 4, 6]) => 3; contarPares([1, 3]) => 0',
      language: 'javascript',
      initialCode: `function contarPares(arr) {\n  // Retorne a quantidade de numeros pares do array\n}\n`,
      testCode: `if (typeof contarPares !== 'function') throw new Error('A funcao contarPares precisa estar declarada');\nif (contarPares([1, 2, 3, 4, 6]) !== 3) throw new Error('contarPares([1, 2, 3, 4, 6]) deve retornar 3');\nif (contarPares([1, 3]) !== 0) throw new Error('contarPares([1, 3]) deve retornar 0');`,
      hiddenTests: `if (contarPares([]) !== 0) throw new Error('contarPares([]) deve retornar 0');\nif (contarPares([-2, -4, 7]) !== 2) throw new Error('contarPares([-2, -4, 7]) deve retornar 2');`,
      referenceSolution: `function contarPares(arr) {\n  return arr.filter((n) => n % 2 === 0).length;\n}\n`,
      order: 2,
    },
    {
      slug: 'bib-tabuada-lista',
      title: 'Tabuada em Lista',
      conceptTags: ['loops'],
      description: 'Implemente a função `tabuada(n)` que retorne um array com os resultados de n multiplicado por 1 até 10, nessa ordem.',
      instructions: 'Exemplo: tabuada(5) => [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]',
      language: 'javascript',
      initialCode: `function tabuada(n) {\n  // Retorne um array com a tabuada de n de 1 a 10\n}\n`,
      testCode: `if (typeof tabuada !== 'function') throw new Error('A funcao tabuada precisa estar declarada');\nconst resultado = tabuada(5);\nif (!Array.isArray(resultado) || resultado.length !== 10) throw new Error('tabuada(5) deve retornar um array com 10 elementos');\nif (resultado[0] !== 5 || resultado[9] !== 50) throw new Error('tabuada(5) deve comecar em 5 e terminar em 50');`,
      hiddenTests: `if (JSON.stringify(tabuada(1)) !== JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])) throw new Error('tabuada(1) deve retornar [1, 2, ..., 10]');\nif (tabuada(0)[3] !== 0) throw new Error('tabuada(0) deve conter apenas zeros');`,
      referenceSolution: `function tabuada(n) {\n  const resultado = [];\n  for (let i = 1; i <= 10; i++) {\n    resultado.push(n * i);\n  }\n  return resultado;\n}\n`,
      order: 3,
    },
    {
      slug: 'bib-somar-ate-python',
      title: 'Somar até N (Python)',
      conceptTags: ['loops'],
      description: 'Defina a função `somar_ate(n)` que use um laço para somar todos os números inteiros de 1 até n (inclusive). Para n menor que 1, retorne 0.',
      instructions: 'Exemplo: somar_ate(4) => 10; somar_ate(0) => 0',
      language: 'python',
      initialCode: `def somar_ate(n):\n    # Use um laco para somar de 1 ate n\n    pass\n`,
      testCode: `assert somar_ate(4) == 10, "somar_ate(4) deve ser 10"\nassert somar_ate(0) == 0, "somar_ate(0) deve ser 0"`,
      hiddenTests: `assert somar_ate(10) == 55, "somar_ate(10) deve ser 55"\nassert somar_ate(1) == 1, "somar_ate(1) deve ser 1"`,
      referenceSolution: `def somar_ate(n):\n    total = 0\n    for i in range(1, n + 1):\n        total += i\n    return total\n`,
      order: 4,
    },
    {
      slug: 'bib-inverter-palavra',
      title: 'Inverter Palavra',
      conceptTags: ['strings'],
      description: 'Implemente a função `inverterPalavra(str)` que receba uma palavra e retorne a mesma sequência de caracteres na ordem inversa.',
      instructions: 'Exemplo: inverterPalavra("code") => "edoc"; inverterPalavra("a") => "a"',
      language: 'javascript',
      initialCode: `function inverterPalavra(str) {\n  // Retorne a palavra invertida\n}\n`,
      testCode: `if (typeof inverterPalavra !== 'function') throw new Error('A funcao inverterPalavra precisa estar declarada');\nif (inverterPalavra('code') !== 'edoc') throw new Error('inverterPalavra("code") deve retornar "edoc"');\nif (inverterPalavra('a') !== 'a') throw new Error('inverterPalavra("a") deve retornar "a"');`,
      hiddenTests: `if (inverterPalavra('') !== '') throw new Error('inverterPalavra("") deve retornar ""');\nif (inverterPalavra('arara') !== 'arara') throw new Error('inverterPalavra("arara") deve retornar "arara"');`,
      referenceSolution: `function inverterPalavra(str) {\n  return str.split('').reverse().join('');\n}\n`,
      order: 5,
    },
    {
      slug: 'bib-contar-palavras-python',
      title: 'Contar Palavras (Python)',
      conceptTags: ['strings'],
      description: 'Defina a função `contar_palavras(texto)` que retorne quantas palavras existem no texto, considerando um ou mais espaços como separadores. Texto vazio retorna 0.',
      instructions: 'Exemplo: contar_palavras("aprenda python hoje") => 3; contar_palavras("") => 0',
      language: 'python',
      initialCode: `def contar_palavras(texto):\n    # Retorne a quantidade de palavras do texto\n    pass\n`,
      testCode: `assert contar_palavras("aprenda python hoje") == 3, "contar_palavras('aprenda python hoje') deve ser 3"\nassert contar_palavras("") == 0, "contar_palavras('') deve ser 0"`,
      hiddenTests: `assert contar_palavras("um   espaçamento   duplo") == 3, "espaços múltiplos devem contar 3 palavras"\nassert contar_palavras("palavra") == 1, "contar_palavras('palavra') deve ser 1"`,
      referenceSolution: `def contar_palavras(texto):\n    return len(texto.split())\n`,
      order: 6,
    },
    {
      slug: 'bib-fatorial-recursivo',
      title: 'Fatorial Recursivo',
      conceptTags: ['recursao'],
      description: 'Implemente a função `fatorial(n)` usando recursão: retorne n! para n >= 1 e 1 para n = 0. A base da recursão deve tratar n = 0.',
      instructions: 'Exemplo: fatorial(5) => 120; fatorial(0) => 1',
      language: 'javascript',
      initialCode: `function fatorial(n) {\n  // Implemente usando recursao\n}\n`,
      testCode: `if (typeof fatorial !== 'function') throw new Error('A funcao fatorial precisa estar declarada');\nif (fatorial(5) !== 120) throw new Error('fatorial(5) deve retornar 120');\nif (fatorial(0) !== 1) throw new Error('fatorial(0) deve retornar 1');`,
      hiddenTests: `if (fatorial(1) !== 1) throw new Error('fatorial(1) deve retornar 1');\nif (fatorial(7) !== 5040) throw new Error('fatorial(7) deve retornar 5040');`,
      referenceSolution: `function fatorial(n) {\n  if (n <= 1) {\n    return 1;\n  }\n  return n * fatorial(n - 1);\n}\n`,
      order: 7,
    },
    {
      slug: 'bib-classificar-nota',
      title: 'Classificar Nota',
      conceptTags: ['condicionais'],
      description: 'Implemente a função `classificarNota(nota)` que retorne o conceito conforme a nota: "A" para notas >= 90, "B" para >= 80, "C" para >= 70, "D" para >= 60 e "F" abaixo disso.',
      instructions: 'Exemplo: classificarNota(95) => "A"; classificarNota(42) => "F"',
      language: 'javascript',
      initialCode: `function classificarNota(nota) {\n  // Retorne o conceito A, B, C, D ou F\n}\n`,
      testCode: `if (typeof classificarNota !== 'function') throw new Error('A funcao classificarNota precisa estar declarada');\nif (classificarNota(95) !== 'A') throw new Error('classificarNota(95) deve retornar "A"');\nif (classificarNota(85) !== 'B') throw new Error('classificarNota(85) deve retornar "B"');\nif (classificarNota(42) !== 'F') throw new Error('classificarNota(42) deve retornar "F"');`,
      hiddenTests: `if (classificarNota(90) !== 'A') throw new Error('classificarNota(90) deve retornar "A"');\nif (classificarNota(60) !== 'D') throw new Error('classificarNota(60) deve retornar "D"');\nif (classificarNota(70) !== 'C') throw new Error('classificarNota(70) deve retornar "C"');`,
      referenceSolution: `function classificarNota(nota) {\n  if (nota >= 90) {\n    return 'A';\n  }\n  if (nota >= 80) {\n    return 'B';\n  }\n  if (nota >= 70) {\n    return 'C';\n  }\n  if (nota >= 60) {\n    return 'D';\n  }\n  return 'F';\n}\n`,
      order: 8,
    },
    {
      slug: 'bib-calculadora-basica',
      title: 'Calculadora Básica',
      conceptTags: ['funcoes'],
      description: 'Implemente a função `calculadora(a, b, operador)` que receba dois números e um operador ("+", "-", "*", "/") e retorne o resultado da operação. Para divisão por zero, retorne null.',
      instructions: 'Exemplo: calculadora(2, 3, "+") => 5; calculadora(10, 2, "/") => 5; calculadora(1, 0, "/") => null',
      language: 'javascript',
      initialCode: `function calculadora(a, b, operador) {\n  // Retorne o resultado da operacao indicada\n}\n`,
      testCode: `if (typeof calculadora !== 'function') throw new Error('A funcao calculadora precisa estar declarada');\nif (calculadora(2, 3, '+') !== 5) throw new Error('calculadora(2, 3, "+") deve retornar 5');\nif (calculadora(10, 2, '/') !== 5) throw new Error('calculadora(10, 2, "/") deve retornar 5');\nif (calculadora(1, 0, '/') !== null) throw new Error('calculadora(1, 0, "/") deve retornar null');`,
      hiddenTests: `if (calculadora(4, 5, '*') !== 20) throw new Error('calculadora(4, 5, "*") deve retornar 20');\nif (calculadora(9, 4, '-') !== 5) throw new Error('calculadora(9, 4, "-") deve retornar 5');\nif (calculadora(2, 3, '%') !== null) throw new Error('operador inválido deve retornar null');`,
      referenceSolution: `function calculadora(a, b, operador) {\n  if (operador === '+') return a + b;\n  if (operador === '-') return a - b;\n  if (operador === '*') return a * b;\n  if (operador === '/') {\n    if (b === 0) return null;\n    return a / b;\n  }\n  return null;\n}\n`,
      order: 9,
    },
    {
      slug: 'bib-total-carrinho',
      title: 'Total do Carrinho',
      conceptTags: ['objetos'],
      description: 'Implemente a função `totalCarrinho(itens)` que receba um array de objetos no formato { preco, quantidade } e retorne o valor total do carrinho (soma de preco * quantidade).',
      instructions: 'Exemplo: totalCarrinho([{ preco: 10, quantidade: 2 }, { preco: 5, quantidade: 1 }]) => 25',
      language: 'javascript',
      initialCode: `function totalCarrinho(itens) {\n  // Retorne o valor total do carrinho\n}\n`,
      testCode: `if (typeof totalCarrinho !== 'function') throw new Error('A funcao totalCarrinho precisa estar declarada');\nif (totalCarrinho([{ preco: 10, quantidade: 2 }, { preco: 5, quantidade: 1 }]) !== 25) throw new Error('totalCarrinho deve retornar 25');\nif (totalCarrinho([]) !== 0) throw new Error('totalCarrinho([]) deve retornar 0');`,
      hiddenTests: `if (totalCarrinho([{ preco: 2.5, quantidade: 4 }]) !== 10) throw new Error('totalCarrinho deve retornar 10');\nif (totalCarrinho([{ preco: 7, quantidade: 0 }]) !== 0) throw new Error('quantidade 0 deve contribuir com 0');`,
      referenceSolution: `function totalCarrinho(itens) {\n  return itens.reduce((total, item) => total + item.preco * item.quantidade, 0);\n}\n`,
      order: 10,
    },
  ];

  for (const activity of libraryActivities) {
    await prisma.activity.upsert({
      where: { courseId_slug: { courseId: libraryCourse.id, slug: activity.slug } },
      update: {
        title: activity.title,
        description: activity.description,
        instructions: activity.instructions,
        language: activity.language,
        initialCode: activity.initialCode,
        testCode: activity.testCode,
        hiddenTests: activity.hiddenTests,
        referenceSolution: activity.referenceSolution,
        conceptTags: activity.conceptTags,
        order: activity.order,
      },
      create: {
        courseId: libraryCourse.id,
        ...activity,
      },
    });
  }

  console.log('[seed-data] Cursos e Atividades criados com sucesso!');
  console.log('[seed-data] Biblioteca Pública criada com 10 atividades por conceito.');
}

main()
  .catch((e) => {
    console.error('[seed-data] Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
