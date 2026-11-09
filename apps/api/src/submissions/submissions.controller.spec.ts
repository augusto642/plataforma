import { SubmissionsController } from './submissions.controller';
import { SubmissionEventsService } from './submission-events.service';

/**
 * A5 — SSE: polling com backoff (2 s → 3 s → 4,5 s ... teto 10 s), push
 * imediato na conclusão do job e timeout máximo do stream (5 min).
 *
 * Usa fake timers do Jest: o `timer`/`expand` do RxJS rodam sobre
 * setTimeout, então `advanceTimersByTimeAsync` controla os ticks.
 */
describe('SubmissionsController.streamEvents (A5)', () => {
  let submissions: { findProgress: jest.Mock };
  let events: SubmissionEventsService;
  let controller: SubmissionsController;

  const user = { sub: 'user-1', role: 'student' } as any;

  function collect() {
    const received: Array<{ data: unknown }> = [];
    let completed = false;
    let error: unknown = null;
    const subscription = controller
      .streamEvents('sub-1' as any, user)
      .subscribe({
        next: (event) => received.push(event),
        error: (err) => {
          error = err;
        },
        complete: () => {
          completed = true;
        },
      });
    return {
      received,
      get completed() {
        return completed;
      },
      get error() {
        return error;
      },
      unsubscribe: () => subscription.unsubscribe(),
    };
  }

  beforeEach(() => {
    jest.useFakeTimers();
    submissions = {
      findProgress: jest.fn().mockResolvedValue({ status: 'queued' }),
    };
    events = new SubmissionEventsService();
    controller = new SubmissionsController(submissions as any, events);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('polls with backoff: 2s, then 3s, then 4.5s between fetches', async () => {
    const stream = collect();

    // 1º tick imediato na inscrição.
    await jest.advanceTimersByTimeAsync(0);
    expect(submissions.findProgress).toHaveBeenCalledTimes(1);

    // 2 s depois: 2º fetch.
    await jest.advanceTimersByTimeAsync(2000);
    expect(submissions.findProgress).toHaveBeenCalledTimes(2);

    // 2,999 s depois: ainda sem fetch (backoff de 3 s).
    await jest.advanceTimersByTimeAsync(2999);
    expect(submissions.findProgress).toHaveBeenCalledTimes(2);

    // 1 ms depois (3 s desde o 2º fetch): 3º fetch.
    await jest.advanceTimersByTimeAsync(1);
    expect(submissions.findProgress).toHaveBeenCalledTimes(3);

    // Próximo backoff é 4,5 s: 4 s depois, ainda sem fetch.
    await jest.advanceTimersByTimeAsync(4000);
    expect(submissions.findProgress).toHaveBeenCalledTimes(3);

    // 500 ms depois (4,5 s): 4º fetch.
    await jest.advanceTimersByTimeAsync(500);
    expect(submissions.findProgress).toHaveBeenCalledTimes(4);
    expect(stream.received.length).toBe(4);

    stream.unsubscribe();
  });

  it('emits the final state and completes when the status turns terminal', async () => {
    submissions.findProgress
      .mockResolvedValueOnce({ status: 'running' })
      .mockResolvedValueOnce({ status: 'passed', score: 100 });
    const stream = collect();

    await jest.advanceTimersByTimeAsync(0);
    expect(stream.received.length).toBe(1);
    expect(stream.completed).toBe(false);

    await jest.advanceTimersByTimeAsync(2000);
    expect(stream.received.length).toBe(2);
    expect(stream.received[1].data).toEqual({ status: 'passed', score: 100 });
    expect(stream.completed).toBe(true);

    // Stream encerrado: avançar o relógio não dispara mais fetches.
    await jest.advanceTimersByTimeAsync(60_000);
    expect(submissions.findProgress).toHaveBeenCalledTimes(2);

    stream.unsubscribe();
  });

  it('push: a completion event triggers an immediate fetch without waiting for the next tick', async () => {
    const stream = collect();

    await jest.advanceTimersByTimeAsync(0);
    expect(submissions.findProgress).toHaveBeenCalledTimes(1);

    // Push 500 ms depois do 1º fetch — o próximo tick só viria em 2 s.
    await jest.advanceTimersByTimeAsync(500);
    events.notify('sub-1');
    await jest.advanceTimersByTimeAsync(0);
    expect(submissions.findProgress).toHaveBeenCalledTimes(2);
    expect(stream.received.length).toBe(2);

    stream.unsubscribe();
  });

  it('push: the stream completes as soon as the pushed fetch sees a terminal status', async () => {
    submissions.findProgress
      .mockResolvedValueOnce({ status: 'queued' })
      .mockResolvedValueOnce({ status: 'passed', score: 80 });
    const stream = collect();

    await jest.advanceTimersByTimeAsync(0);
    expect(stream.completed).toBe(false);

    events.notify('sub-1');
    await jest.advanceTimersByTimeAsync(0);
    expect(stream.received.length).toBe(2);
    expect(stream.received[1].data).toEqual({ status: 'passed', score: 80 });
    expect(stream.completed).toBe(true);

    stream.unsubscribe();
  });

  it('times out: a submission stuck in queued closes the stream after 5 minutes', async () => {
    const stream = collect();

    await jest.advanceTimersByTimeAsync(0);
    expect(stream.completed).toBe(false);

    await jest.advanceTimersByTimeAsync(5 * 60 * 1000 - 1);
    expect(stream.completed).toBe(false);

    await jest.advanceTimersByTimeAsync(1);
    expect(stream.completed).toBe(true);

    const callsAtTimeout = submissions.findProgress.mock.calls.length;
    expect(callsAtTimeout).toBeGreaterThan(1);
    // Encerrado: nada mais é buscado depois do timeout.
    await jest.advanceTimersByTimeAsync(60_000);
    expect(submissions.findProgress).toHaveBeenCalledTimes(callsAtTimeout);

    stream.unsubscribe();
  });
});
