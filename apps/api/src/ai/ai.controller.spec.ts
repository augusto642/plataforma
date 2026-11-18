import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiTutorFeedbackService } from './ai-tutor-feedback.service';
import { LineFeedbackService } from './line-feedback.service';
import { SocraticCatService } from './socratic-cat.service';

describe('AiController tutor feedback route', () => {
  it('delegates categorical feedback to the persistence service', async () => {
    const tutorFeedback = { submit: jest.fn().mockResolvedValue({ recorded: true }) };
    const controller = new AiController(
      {} as AiService,
      {} as LineFeedbackService,
      {} as SocraticCatService,
      tutorFeedback as unknown as AiTutorFeedbackService,
      {} as never,
    );
    const dto = {
      responseId: '01234567-89ab-cdef-0123-456789abcdef',
      activityId: '11234567-89ab-cdef-0123-456789abcdef',
      helpful: true,
    };

    await expect(controller.submitTutorFeedback(dto)).resolves.toEqual({ recorded: true });
    expect(tutorFeedback.submit).toHaveBeenCalledWith(dto);
  });

  it('checks activity access before invoking tutor chat or opening a stream', async () => {
    const access = { requireActivity: jest.fn().mockRejectedValue(new Error('forbidden')) };
    const ai = { chatWithTutor: jest.fn(), streamChatWithTutor: jest.fn() };
    const controller = new AiController(ai as never, {} as never, {} as never, {} as never, access as never);
    const dto = { activityId: 'activity', messages: [] };
    const user = { sub: 'user', role: 'student' } as never;
    const response = { setHeader: jest.fn() };
    await expect(controller.chat(dto, user)).rejects.toThrow('forbidden');
    await expect(controller.streamChat(dto, user, response as never)).rejects.toThrow('forbidden');
    expect(ai.chatWithTutor).not.toHaveBeenCalled();
    expect(ai.streamChatWithTutor).not.toHaveBeenCalled();
    expect(response.setHeader).not.toHaveBeenCalled();
  });
});
