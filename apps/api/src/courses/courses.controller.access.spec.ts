import { ForbiddenException } from '@nestjs/common';
import { CoursesController } from './courses.controller';

describe('CoursesController course preview', () => {
  const course = {
    id: 'course', title: 'Curso', enrollmentCode: 'PRIVATE',
    activities: [{ id: 'activity', title: 'Aula', slug: 'aula', language: 'python',
      order: 1, createdAt: new Date(), description: 'Enunciado', lessonPayload: { secret: 'conteúdo' } }],
  };
  const courses = { findAll: jest.fn(), findById: jest.fn() };
  const access = { requireCourse: jest.fn() };
  const controller = new CoursesController(courses as never, {} as never, {} as never, access as never);
  const user = { sub: 'student', role: 'student' } as never;

  beforeEach(() => {
    jest.resetAllMocks();
    courses.findAll.mockResolvedValue([course]);
    courses.findById.mockResolvedValue(course);
  });

  it('does not expose enrollment codes in course lists', async () => {
    const list = await controller.findAll();
    expect(list[0]).not.toHaveProperty('enrollmentCode');
  });

  it('shows only activity metadata to users without course access', async () => {
    access.requireCourse.mockRejectedValue(new ForbiddenException());
    const result = await controller.findById('course', user);
    expect(result).not.toHaveProperty('enrollmentCode');
    expect(result.activities[0]).not.toHaveProperty('description');
    expect(result.activities[0]).not.toHaveProperty('lessonPayload');
    expect(result.activities[0].title).toBe('Aula');
  });

  it('keeps content for users with access', async () => {
    const result = await controller.findById('course', user);
    expect(result.activities[0].description).toBe('Enunciado');
    expect(result).not.toHaveProperty('enrollmentCode');
  });
});
