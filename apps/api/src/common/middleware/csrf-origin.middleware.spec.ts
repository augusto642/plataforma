import { CsrfOriginMiddleware } from './csrf-origin.middleware';

/**
 * M15 (Lote 4) — CSRF por Origin/Referer nas mutações.
 * Origem permitida = lista do CORS_ORIGIN (a mesma do main.ts).
 */
describe('CsrfOriginMiddleware', () => {
  const configStub = {
    get: jest.fn((key: string) =>
      key === 'CORS_ORIGIN'
        ? 'http://localhost:3001,https://app.exemplo.com'
        : undefined,
    ),
  };

  function run(reqHeaders: Record<string, string>, method = 'POST') {
    const middleware = new CsrfOriginMiddleware(configStub as any);
    const req: any = { method, headers: reqHeaders };
    let statusCode = 0;
    let body: Record<string, unknown> = {};
    const res: any = {
      status: jest.fn((code: number) => {
        statusCode = code;
        return res;
      }),
      json: jest.fn((payload: Record<string, unknown>) => {
        body = payload;
        return res;
      }),
    };
    const next = jest.fn();
    middleware.use(req, res, next);
    return { next, statusCode, body };
  }

  it('permite mutação com Origin permitida (web app)', () => {
    const { next, statusCode } = run({ origin: 'http://localhost:3001' });
    expect(next).toHaveBeenCalledTimes(1);
    expect(statusCode).toBe(0);
  });

  it('REJEITA mutação com Origin de site atacante (403 CSRF_ORIGIN_MISMATCH)', () => {
    const { next, statusCode, body } = run({
      origin: 'https://site-malicioso.com',
    });
    expect(next).not.toHaveBeenCalled();
    expect(statusCode).toBe(403);
    expect(body).toMatchObject({
      statusCode: 403,
      errorCode: 'CSRF_ORIGIN_MISMATCH',
    });
  });

  it('REJEITA mutação com Referer de origem não permitida (sem Origin)', () => {
    const { next, statusCode, body } = run({
      referer: 'https://site-malicioso.com/pagina',
    });
    expect(next).not.toHaveBeenCalled();
    expect(statusCode).toBe(403);
    expect(body).toMatchObject({ errorCode: 'CSRF_ORIGIN_MISMATCH' });
  });

  it('permite mutação com Referer de origem permitida (sem Origin)', () => {
    const { next } = run({
      referer: 'https://app.exemplo.com/alguma-pagina',
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('permite mutação sem Origin nem Referer (cliente não-navegador: curl, webhook HMAC do Gitea)', () => {
    const { next, statusCode } = run({});
    expect(next).toHaveBeenCalledTimes(1);
    expect(statusCode).toBe(0);
  });

  it('não toca em GET mesmo com Origin atacante (só mutações são validadas)', () => {
    const { next } = run({ origin: 'https://site-malicioso.com' }, 'GET');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
