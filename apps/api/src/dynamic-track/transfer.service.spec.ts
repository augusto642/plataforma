import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Language } from '@prisma/client';
import { TransferService } from './transfer.service';

function expectedOutput(input: number): number {
  return input <= 0 ? 0 : input < 5 ? input * 2 : input + 5;
}

function outputsForProgram(program: string, wrongIndex?: number): string {
  const match = program.match(/(?:const __nexus_inputs = |for __nexus_input in )(\[[^\]]+\])/);
  if (!match) throw new Error('test inputs not found in sandbox program');
  const inputs = JSON.parse(match[1]) as number[];
  return inputs
    .map((input, index) => {
      const value = expectedOutput(input);
      return index === wrongIndex ? String(value + 1) : String(value);
    })
    .join('\n');
}

describe('independent transfer exercise', () => {
  const record = {
    submissionId: 's',
    transferEligible: true,
    transfer: null,
    language: Language.javascript,
  };
  let prisma: any;
  let evidence: any;
  let runner: any;
  let service: TransferService;

  beforeEach(() => {
    prisma = { transferAttempt: { create: jest.fn(async ({ data }) => ({ ...data, assessedAt: new Date() })) } };
    evidence = { portfolio: jest.fn(async (userId) => userId === 'owner' ? [record] : []) };
    runner = {
      execute: jest.fn(async (_language, program) => ({
        kind: 'passed',
        status: 'passed',
        durationMs: 1,
        stdout: outputsForProgram(program),
        stderr: '',
      })),
    };
    service = new TransferService(prisma, evidence, runner);
  });

  it('runs a code transfer task in the sandbox and stores only the aggregate result', async () => {
    const challenge = await service.challenge('owner', 's');
    expect(challenge.challenge).toMatchObject({
      version: 'funcoes-pontos-code-v2',
      language: Language.javascript,
      functionName: 'calcular_pontos',
      maxScore: 5,
      examples: [
        { input: 0, expected: 0 },
        { input: 3, expected: 6 },
        { input: 5, expected: 10 },
      ],
    });
    expect(challenge.challenge.examples.every(({ input, expected: output }) => expectedOutput(input) === output)).toBe(true);
    expect(challenge.challenge.reflectionPrompt).toContain('limite 5');
    expect(challenge.challenge).not.toHaveProperty('inputs');
    const sourceCode = 'function calcular_pontos(quantidade) { return quantidade <= 0 ? 0 : quantidade < 5 ? quantidade * 2 : quantidade + 5; }';
    const result = await service.submit('owner', 's', sourceCode);
    expect(result).toMatchObject({ score: 5, maxScore: 5, passed: true });
    expect(runner.execute).toHaveBeenCalledWith(
      Language.javascript,
      expect.stringContaining(sourceCode),
      { timeLimitMs: 5_000, memoryLimitMb: 128 },
    );
    expect(prisma.transferAttempt.create.mock.calls[0][0].data).not.toHaveProperty('sourceCode');
    expect(JSON.stringify(result)).not.toContain(sourceCode);
  });

  it('scores failed cases without returning hidden input details', async () => {
    runner.execute.mockImplementationOnce(async (_language: Language, program: string) => ({
      kind: 'passed',
      status: 'passed',
      durationMs: 1,
      stdout: outputsForProgram(program, 2),
      stderr: '',
    }));
    const result = await service.submit(
      'owner',
      's',
      'function calcular_pontos(quantidade) { return 0; }',
    );
    expect(result).toMatchObject({ score: 4, maxScore: 5, passed: false });
    expect(JSON.stringify(result)).not.toContain('-2');
  });

  it('rejects extra output so printing additional results cannot satisfy the rubric', async () => {
    runner.execute.mockImplementationOnce(async (_language: Language, program: string) => ({
      kind: 'passed',
      status: 'passed',
      durationMs: 1,
      stdout: `${outputsForProgram(program)}\nextra output`,
      stderr: '',
    }));

    const result = await service.submit(
      'owner',
      's',
      'function calcular_pontos(quantidade) { return 0; }',
    );

    expect(result).toMatchObject({ score: 0, maxScore: 5, passed: false });
  });

  it('builds a Python assessment program and uses the learner practice language', async () => {
    evidence.portfolio.mockResolvedValueOnce([{ ...record, language: Language.python }]);
    const challenge = await service.challenge('owner', 's');
    expect(challenge.challenge.starterCode).toContain('def calcular_pontos');

    evidence.portfolio.mockResolvedValueOnce([{ ...record, language: Language.python }]);
    await service.submit('owner', 's', 'def calcular_pontos(quantidade): return 0');
    expect(runner.execute).toHaveBeenCalledWith(
      Language.python,
      expect.stringMatching(/for __nexus_input in \[-2,0,[1-4],5,(?:[6-9]|10)\]/),
      { timeLimitMs: 5_000, memoryLimitMb: 128 },
    );
  });

  it('does not consume an attempt when the sandbox is unavailable', async () => {
    runner.execute.mockResolvedValueOnce({
      kind: 'sandbox_unavailable',
      status: 'error',
      durationMs: 1,
      stdout: '',
      stderr: '',
    });
    await expect(service.submit('owner', 's', 'function calcular_pontos() { return 0; }'))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.transferAttempt.create).not.toHaveBeenCalled();
  });

  it('rejects other users, ineligible practice, invalid code and duplicate attempts', async () => {
    await expect(service.challenge('other', 's')).rejects.toBeInstanceOf(NotFoundException);
    const validCode = 'function calcular_pontos(quantidade) { return 0; }';
    await expect(service.submit('owner', 'missing', validCode)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.submit('owner', 's', '  ')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.submit('owner', 's', 'x'.repeat(12_001))).rejects.toBeInstanceOf(BadRequestException);
    evidence.portfolio.mockResolvedValueOnce([{ ...record, transferEligible: false }]);
    await expect(service.challenge('owner', 's')).rejects.toBeInstanceOf(NotFoundException);
    evidence.portfolio.mockResolvedValueOnce([{ ...record, transfer: { passed: true } }]);
    await expect(service.submit('owner', 's', validCode)).rejects.toBeInstanceOf(ConflictException);
    prisma.transferAttempt.create.mockRejectedValueOnce({ code: 'P2002' });
    await expect(service.submit('owner', 's', validCode)).rejects.toBeInstanceOf(ConflictException);
  });
});
