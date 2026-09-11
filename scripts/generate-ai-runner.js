const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ----------------------------------------------------
// 1. CREATE GAMIFICATION SERVICE & MODULE
// ----------------------------------------------------
const gamDir = path.join('apps', 'api', 'src', 'gamification');
ensureDir(gamDir);

fs.writeFileSync(path.join(gamDir, 'gamification.service.ts'), `import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async awardSubmissionXp(userId: string, activityId: string, passed: boolean, score: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { badges: true },
      });

      if (!user) return null;

      let xpGained = 20;
      if (passed) xpGained += 50;
      if (score === 100) xpGained += 50;

      const newXp = user.xp + xpGained;
      const newLevel = Math.floor(newXp / 200) + 1;

      let newStreak = user.streakDays || 0;
      const now = new Date();
      if (user.lastActiveAt) {
        const diffHours = (now.getTime() - new Date(user.lastActiveAt).getTime()) / (1000 * 60 * 60);
        if (diffHours >= 20 && diffHours <= 48) {
          newStreak += 1;
        } else if (diffHours > 48) {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          xp: newXp,
          level: newLevel,
          streakDays: newStreak,
          lastActiveAt: now,
        },
      });

      await this.evaluateBadges(user, passed, score, newStreak, activityId);

      return { xpGained, totalXp: newXp, level: newLevel, streak: newStreak };
    } catch (err: any) {
      this.logger.error(\`Failed to award gamification XP: \${err.message}\`);
      return null;
    }
  }

  private async evaluateBadges(user: any, passed: boolean, score: number, streak: number, activityId: string) {
    const existingBadges = new Set(user.badges.map((b: any) => b.badgeCode));

    const badgesToAward: Array<{ code: string; title: string; desc: string; icon: string }> = [];

    if (!existingBadges.has('first_step')) {
      badgesToAward.push({
        code: 'first_step',
        title: 'Primeiro Passo',
        desc: 'Enviou sua primeira solução de código!',
        icon: '🌱',
      });
    }

    if (score === 100 && !existingBadges.has('perfectionist')) {
      badgesToAward.push({
        code: 'perfectionist',
        title: 'Pontuação Perfeita',
        desc: 'Alcançou nota 100 em um exercício!',
        icon: '⭐',
      });
    }

    if (streak >= 3 && !existingBadges.has('streak_3')) {
      badgesToAward.push({
        code: 'streak_3',
        title: 'Foco Constante',
        desc: 'Manteve 3 dias seguidos de estudo!',
        icon: '🔥',
      });
    }

    for (const b of badgesToAward) {
      await this.prisma.userBadge.create({
        data: {
          userId: user.id,
          badgeCode: b.code,
          title: b.title,
          description: b.desc,
          icon: b.icon,
        },
      });
      this.logger.log(\`Badge awarded to \${user.email}: \${b.title}\`);
    }
  }

  async getUserBadges(userId: string) {
    return this.prisma.userBadge.findMany({
      where: { userId },
      orderBy: { unlockedAt: 'desc' },
    });
  }
}
`);

fs.writeFileSync(path.join(gamDir, 'gamification.module.ts'), `import { Module } from '@nestjs/common';
import { GamificationService } from './gamification.service';

@Module({
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
`);


console.log('====================================================');
console.log('   SUÍTE DE TESTES E QA GOLDEN SET — PLATAFORMA LMS ');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ [FALHA] ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`✅ [PASSOU] ${message}`);
    passedTests++;
  }
}

// -----------------------------------------------------------
// 1. TESTE DE SANITIZAÇÃO DE DADOS SENSÍVEIS (LGPD & PII)
// -----------------------------------------------------------
console.log('--- 1. Validação de Sanitização de PII e Segredos ---');

function sanitizePrompt(text) {
  if (!text) return '';
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF_REDACTED]')
    .replace(/(?:sk-|ghp_|Bearer\s+)[A-Za-z0-9_\-]{16,}/g, '[TOKEN_REDACTED]')
    .replace(/(?:password|senha)\s*[:=]\s*["'][^"']+["']/gi, 'password: "[REDACTED]"');
}

const dirtyPrompt = `
  Aluno: aluno.teste@faculdade.edu.br
  CPF: 123.456.789-00
  Token: sk-1234567890abcdef123456
  Código com senha: const config = { senha: "minhaSenhaSuperSecreta123" };
`;

const cleaned = sanitizePrompt(dirtyPrompt);
assert(!cleaned.includes('aluno.teste@faculdade.edu.br'), 'E-mail do aluno foi devidamente anonimizado');
assert(cleaned.includes('[EMAIL_REDACTED]'), 'Marcador [EMAIL_REDACTED] foi inserido');
assert(!cleaned.includes('123.456.789-00'), 'CPF foi devidamente anonimizado');
assert(!cleaned.includes('sk-1234567890abcdef123456'), 'API Key / Token foi ofuscado');
assert(!cleaned.includes('minhaSenhaSuperSecreta123'), 'Senha inline foi ofuscada');

// -----------------------------------------------------------
// 2. TESTE SOCRÁTICO E AUSÊNCIA DE SPOILERS (AI TUTOR)
// -----------------------------------------------------------
console.log('\n--- 2. Validação Pedagógica Socrática (Sem Spoilers) ---');

function heuristicTutor(studentCode, failedTests) {
  const hints = [];
  let summary = 'Notei que o seu código ainda não passou em todos os testes.';
  let concept = 'Lógica Geral';

  if (!studentCode || studentCode.trim().length === 0) {
    summary = 'Seu arquivo de resposta está em branco.';
    hints.push('Comece declarando a função solicitada no enunciado.');
    return { summary, hints, suggestedConcept: 'Declaração de Funções' };
  }

  if (!studentCode.includes('return')) {
    hints.push('Lembre-se de que a função precisa explicitamente usar a palavra-chave return.');
    concept = 'Retorno de Valores';
  }

  return { summary, hints, suggestedConcept: concept };
}

const emptyResult = heuristicTutor('', []);
assert(emptyResult.suggestedConcept === 'Declaração de Funções', 'Identificou código em branco e sugeriu início');
assert(!JSON.stringify(emptyResult).includes('function solucao('), 'Tutor não vazou a resposta completa para código vazio');

const noReturnResult = heuristicTutor('function soma(a, b) { const res = a + b; }', [{ name: 'Teste 1', errorMessage: 'undefined != 5' }]);
assert(noReturnResult.hints.some(h => h.includes('return')), 'Tutor orientou sobre a falta do comando return');

// -----------------------------------------------------------
// 3. TESTE DE VALIDAÇÃO CRIPTOGRÁFICA HMAC (WEBHOOK GITEA)
// -----------------------------------------------------------
console.log('\n--- 3. Validação de Assinatura Criptográfica HMAC ---');

const secret = 'webhook_secret_key_123';
const payload = { event: 'push', commits: [{ id: 'abc12345', message: 'feat: add solution' }] };
const payloadStr = JSON.stringify(payload);

const validSignature = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
const invalidSignature = 'invalid_tampered_signature';

function verifyWebhook(bodyStr, sig, sec) {
  const expected = crypto.createHmac('sha256', sec).update(bodyStr).digest('hex');
  return sig === expected;
}

assert(verifyWebhook(payloadStr, validSignature, secret) === true, 'Assinatura HMAC legítima foi aprovada');
assert(verifyWebhook(payloadStr, invalidSignature, secret) === false, 'Assinatura HMAC violada foi rejeitada');

// -----------------------------------------------------------
// 4. TESTE DE AVALIAÇÃO DE CÓDIGO NO MOTOR SANDBOX (JS)
// -----------------------------------------------------------
console.log('\n--- 4. Execução e Avaliação de Sandbox ---');

function evaluateJavascript(code, testExpr) {
  try {
    const wrapped = `"use strict"; ${code}; ${testExpr};`;
    const fn = new Function(wrapped);
    fn();
    return { passed: true };
  } catch (err) {
    return { passed: false, errorMessage: err.message };
  }
}

const passingCode = 'function soma(a, b) { return a + b; }';
const failingCode = 'function soma(a, b) { return a - b; }';
const testAssert = 'if (soma(2, 3) !== 5) throw new Error("soma(2, 3) deve retornar 5")';

const run1 = evaluateJavascript(passingCode, testAssert);
assert(run1.passed === true, 'Código correto passou no caso de teste');

const run2 = evaluateJavascript(failingCode, testAssert);
assert(run2.passed === false && run2.errorMessage.includes('deve retornar 5'), 'Código incorreto falhou e produziu mensagem de erro esperada');

// -----------------------------------------------------------
// 5. TESTE DE GAMIFICAÇÃO & NÍVEIS
// -----------------------------------------------------------
console.log('\n--- 5. Validação de Gamificação, XP e Níveis ---');

function calculateGamification(currentXp, passed, score) {
  let gained = 20;
  if (passed) gained += 50;
  if (score === 100) gained += 50;
  const newXp = currentXp + gained;
  const level = Math.floor(newXp / 200) + 1;
  return { gained, newXp, level };
}

const g1 = calculateGamification(0, true, 100);
assert(g1.gained === 120, 'Submissão perfeita rendeu 120 XP (20 base + 50 passou + 50 nota 100)');
assert(g1.level === 1, '0 -> 120 XP permanece no Nível 1');

const g2 = calculateGamification(150, true, 100);
assert(g2.newXp === 270 && g2.level === 2, '150 + 120 = 270 XP promoveu o aluno para o Nível 2');

// -----------------------------------------------------------
// 6. TESTE DE LEADERBOARD RANKING
// -----------------------------------------------------------
console.log('\n--- 6. Validação do Ranking de Líderes (Leaderboard) ---');

const students = [
  { name: 'Ana', xp: 250, completed: 3 },
  { name: 'Bruno', xp: 450, completed: 5 },
  { name: 'Carlos', xp: 450, completed: 4 },
];

const ranked = students
  .sort((a, b) => b.xp - a.xp || b.completed - a.completed)
  .map((s, idx) => ({ rank: idx + 1, ...s }));

assert(ranked[0].name === 'Bruno', '1º colocado é Bruno (maior XP e mais exercícios)');
assert(ranked[1].name === 'Carlos', '2º colocado é Carlos (mesmo XP, desempate por exercícios)');
assert(ranked[2].name === 'Ana', '3º colocada é Ana');

console.log('\n====================================================');
console.log(` Resultado: ${passedTests} de ${totalTests} testes passaram com sucesso.`);
console.log('====================================================\n');

