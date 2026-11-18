import { randomInt } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Language } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PistonRunnerService, type RunnerExecution } from '../submissions/runner/runner.service';
import { SkillEvidenceService } from './skill-evidence.service';

const TASK_VERSION = 'funcoes-pontos-code-v2';
const TEST_CASE_COUNT = 5;
const MAX_SOURCE_LENGTH = 12_000;
const CHALLENGE = {
  version: TASK_VERSION,
  title: 'Transferência: pontos de uma loja',
  functionName: 'calcular_pontos',
  instructions:
    'Implemente a função calcular_pontos(quantidade). Se a quantidade for menor ou igual a zero, retorne zero. Se for menor que cinco, retorne o dobro; caso contrário, retorne a quantidade mais cinco. Não imprima resultados adicionais.',
  criterion:
    'Implementar a função e passar cinco casos automatizados, incluindo valores não positivos e o limite cinco.',
  reflectionPrompt:
    'Antes de enviar, identifique as faixas de quantidade <= 0, de 1 a 4 e >= 5. Confira especialmente o comportamento no limite 5.',
  examples: [
    { input: 0, expected: 0 },
    { input: 3, expected: 6 },
    { input: 5, expected: 10 },
  ],
  notice:
    'Atividade distinta, sem tutor integrado e executada uma única vez. A plataforma não consegue verificar ajuda externa. O código enviado não é armazenado.',
};

function expected(input: number): number {
  return input <= 0 ? 0 : input < 5 ? input * 2 : input + 5;
}

function createTestInputs(): number[] {
  return [-2, 0, randomInt(1, 5), 5, randomInt(6, 11)];
}

function starterCode(language: Language): string {
  if (language === Language.python) {
    return 'def calcular_pontos(quantidade):\n    # Retorne o resultado conforme as regras da atividade.\n    pass\n';
  }
  if (language === Language.javascript || language === Language.typescript) {
    return 'function calcular_pontos(quantidade) {\n  // Retorne o resultado conforme as regras da atividade.\n  return 0;\n}\n';
  }
  throw new BadRequestException('Esta avaliação não está disponível para a linguagem da prática.');
}

function buildProgram(language: Language, sourceCode: string, inputs: number[]): string {
  const serializedInputs = JSON.stringify(inputs);
  if (language === Language.python) {
    return `${sourceCode}\n\nfor __nexus_input in ${serializedInputs}:\n    print(calcular_pontos(__nexus_input))\n`;
  }
  if (language === Language.javascript || language === Language.typescript) {
    return `${sourceCode}\n\nconst __nexus_inputs = ${serializedInputs};\nfor (const __nexus_input of __nexus_inputs) {\n  console.log(calcular_pontos(__nexus_input));\n}\n`;
  }
  throw new BadRequestException('Esta avaliação não está disponível para a linguagem da prática.');
}

function scoreOutput(stdout: string, inputs: number[]): number {
  const trimmed = stdout.trim();
  if (!trimmed) return 0;
  const outputs = trimmed.split(/\r?\n/).map((line) => line.trim());
  if (outputs.length !== inputs.length) return 0;

  return outputs.reduce((score, output, index) => {
    if (!/^-?\d+(?:\.0+)?$/.test(output)) return score;
    return Number(output) === expected(inputs[index]) ? score + 1 : score;
  }, 0);
}

@Injectable()
export class TransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly evidence: SkillEvidenceService,
    private readonly runner: PistonRunnerService,
  ) {}

  private async eligible(userId: string, submissionId: string) {
    const records = await this.evidence.portfolio(userId);
    const record = records.find((item) => item.submissionId === submissionId && item.transferEligible);
    if (!record) throw new NotFoundException('Prática elegível não encontrada.');
    return record;
  }

  async challenge(userId: string, submissionId: string) {
    const record = await this.eligible(userId, submissionId);
    return {
      challenge: {
        ...CHALLENGE,
        language: record.language,
        starterCode: starterCode(record.language),
        maxScore: TEST_CASE_COUNT,
      },
      attempt: record.transfer,
    };
  }

  async submit(userId: string, submissionId: string, sourceCode: string) {
    const record = await this.eligible(userId, submissionId);
    if (record.transfer) throw new ConflictException('Esta prática já possui uma tentativa de transferência.');
    if (typeof sourceCode !== 'string' || !sourceCode.trim() || sourceCode.length > MAX_SOURCE_LENGTH) {
      throw new BadRequestException('Informe código válido com até 12.000 caracteres.');
    }

    const testInputs = createTestInputs();
    let execution: RunnerExecution;
    try {
      execution = await this.runner.execute(
        record.language,
        buildProgram(record.language, sourceCode, testInputs),
        {
        timeLimitMs: 5_000,
        memoryLimitMb: 128,
        },
      );
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new ServiceUnavailableException('Ambiente de avaliação indisponível.');
    }

    if (execution.kind === 'sandbox_unavailable' || execution.kind === 'unsupported') {
      throw new ServiceUnavailableException('Ambiente de avaliação indisponível.');
    }

    const score = execution.kind === 'passed' ? scoreOutput(execution.stdout, testInputs) : 0;
    try {
      return await this.prisma.transferAttempt.create({
        data: {
          userId,
          submissionId,
          taskVersion: TASK_VERSION,
          score,
          maxScore: TEST_CASE_COUNT,
          passed: score === TEST_CASE_COUNT,
        },
        select: { taskVersion: true, score: true, maxScore: true, passed: true, assessedAt: true },
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('Esta prática já possui uma tentativa de transferência.');
      }
      throw error;
    }
  }
}
