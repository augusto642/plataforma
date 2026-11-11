import 'reflect-metadata';
import { validate } from 'class-validator';
import { ChatMessageDto, ChatWithTutorDto } from '../ai/dto/chat-with-tutor.dto';
import { ComplexityAnalysisDto } from '../ai/dto/complexity-analysis.dto';
import { SocraticGuidanceDto } from '../ai/dto/socratic-guidance.dto';
import { BattleRunDto } from '../submissions/dto/battle-run.dto';
import { CreateSubmissionDto } from '../submissions/dto/create-submission.dto';
import { CreateCourseDto } from '../courses/dto/create-course.dto';
import { RegisterDto } from '../auth/dto/register.dto';
import { CreateActivityDto } from '../activities/dto/create-activity.dto';

/**
 * M14 (Lote 4) — DTOs com teto de tamanho (@MaxLength/@ArrayMaxSize).
 *
 * Antes: grep por `MaxLength` retornava zero na main — `ChatWithTutorDto`
 * aceitava mensagem e histórico sem limite, e o serviço mapeia `messages`
 * integralmente para o LLM (cada caractere vira custo). O ValidationPipe
 * global (whitelist + forbidNonWhitelisted + transform, main.ts) rejeita
 * o que exceder com 400 antes de chegar ao serviço.
 *
 * Convenção: cada caso testa o limite exato (aceito) e limite + 1
 * (rejeitado com a constraint `maxLength`/`arrayMaxSize`).
 */
describe('DTOs — M14 tetos de tamanho', () => {
  const activityId = '123e4567-e89b-12d3-a456-426614174000';
  const str = (n: number) => 'x'.repeat(n);

  function hasConstraint(
    errors: any[],
    property: string,
    constraint: string,
  ): boolean {
    const flat: any[] = [];
    const walk = (list: any[]) => {
      for (const e of list) {
        flat.push(e);
        if (e.children) walk(e.children);
      }
    };
    walk(errors);
    return flat.some(
      (e) => e.property === property && e.constraints?.[constraint],
    );
  }

  function chatDto(messageContent: string, messagesCount = 1, code?: string) {
    const messages = Array.from(
      { length: messagesCount },
      () => Object.assign(new ChatMessageDto(), { role: 'user', content: messageContent }),
    );
    return Object.assign(new ChatWithTutorDto(), { activityId, code, messages });
  }

  describe('ChatWithTutorDto (maior risco: custo de LLM)', () => {
    it('aceita mensagem com exatamente 8.000 caracteres', async () => {
      expect(await validate(chatDto(str(8000)))).toHaveLength(0);
    });

    it('rejeita mensagem com 8.001 caracteres (maxLength)', async () => {
      const errors = await validate(chatDto(str(8001)));
      expect(hasConstraint(errors, 'content', 'maxLength')).toBe(true);
    });

    it('aceita código com exatamente 100.000 caracteres', async () => {
      expect(await validate(chatDto('oi', 1, str(100000)))).toHaveLength(0);
    });

    it('rejeita código com 100.001 caracteres (maxLength)', async () => {
      const errors = await validate(chatDto('oi', 1, str(100001)));
      expect(hasConstraint(errors, 'code', 'maxLength')).toBe(true);
    });

    it('aceita histórico com exatamente 50 mensagens', async () => {
      expect(await validate(chatDto('oi', 50))).toHaveLength(0);
    });

    it('rejeita histórico com 51 mensagens (arrayMaxSize)', async () => {
      const errors = await validate(chatDto('oi', 51));
      expect(hasConstraint(errors, 'messages', 'arrayMaxSize')).toBe(true);
    });
  });

  describe('Submissão de código (Piston + LLM)', () => {
    it('BattleRunDto: aceita código com 100.000, rejeita com 100.001', async () => {
      const base = {
        activityId,
        companionId: activityId,
        language: 'python',
      };
      const ok = Object.assign(new BattleRunDto(), { ...base, code: str(100000) });
      expect(await validate(ok)).toHaveLength(0);
      const over = Object.assign(new BattleRunDto(), { ...base, code: str(100001) });
      expect(hasConstraint(await validate(over), 'code', 'maxLength')).toBe(true);
    });

    it('CreateSubmissionDto: aceita código com 100.000, rejeita com 100.001', async () => {
      const ok = Object.assign(new CreateSubmissionDto(), { activityId, code: str(100000) });
      expect(await validate(ok)).toHaveLength(0);
      const over = Object.assign(new CreateSubmissionDto(), { activityId, code: str(100001) });
      expect(hasConstraint(await validate(over), 'code', 'maxLength')).toBe(true);
    });

    it('CreateSubmissionDto: rejeita commitSha com mais de 64 caracteres', async () => {
      const dto = Object.assign(new CreateSubmissionDto(), {
        activityId,
        code: 'print(1)',
        commitSha: str(65),
      });
      expect(hasConstraint(await validate(dto), 'commitSha', 'maxLength')).toBe(true);
    });
  });

  describe('IA (outros DTOs que alimentam o LLM)', () => {
    it('ComplexityAnalysisDto: rejeita código com 100.001 caracteres', async () => {
      const dto = Object.assign(new ComplexityAnalysisDto(), {
        activityId,
        code: str(100001),
      });
      expect(hasConstraint(await validate(dto), 'code', 'maxLength')).toBe(true);
    });

    it('SocraticGuidanceDto: aceita pergunta com 8.000, rejeita com 8.001', async () => {
      const ok = Object.assign(new SocraticGuidanceDto(), { question: str(8000) });
      expect(await validate(ok)).toHaveLength(0);
      const over = Object.assign(new SocraticGuidanceDto(), { question: str(8001) });
      expect(hasConstraint(await validate(over), 'question', 'maxLength')).toBe(true);
    });
  });

  describe('Outros DTOs', () => {
    it('CreateCourseDto: rejeita título com 201 caracteres', async () => {
      const dto = Object.assign(new CreateCourseDto(), {
        title: str(201),
        slug: 'curso',
      });
      expect(hasConstraint(await validate(dto), 'title', 'maxLength')).toBe(true);
    });

    it('RegisterDto: rejeita nome com 101 e senha com 129 caracteres', async () => {
      const name = Object.assign(new RegisterDto(), {
        email: 'a@b.com',
        name: str(101),
        password: '12345678',
      });
      expect(hasConstraint(await validate(name), 'name', 'maxLength')).toBe(true);
      const password = Object.assign(new RegisterDto(), {
        email: 'a@b.com',
        name: 'Ana',
        password: str(129),
      });
      expect(hasConstraint(await validate(password), 'password', 'maxLength')).toBe(true);
    });

    it('CreateActivityDto: rejeita initialCode com 200.001 caracteres', async () => {
      const dto = Object.assign(new CreateActivityDto(), {
        courseId: activityId,
        title: 'Atividade',
        slug: 'atividade',
        description: 'd',
        initialCode: str(200001),
      });
      expect(hasConstraint(await validate(dto), 'initialCode', 'maxLength')).toBe(true);
    });
  });
});
