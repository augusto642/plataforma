import { UnauthorizedException } from '@nestjs/common';
import { ErrorCodes } from '../common/errors/error-codes';
import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_TTL_MS,
  generateOAuthState,
  issueOAuthState,
  validateOAuthState,
} from './oauth.state';

/**
 * D1 (QA — ALTO) — `state` anti-CSRF do OAuth.
 *
 * (a) callback sem `state` válido é recusado;
 * (b) callback com `state` válido passa;
 * (c) `state` não pode ser reutilizado (replay recusado — o cookie é
 *     limpo na primeira validação, então a segunda chegada não tem com
 *     o que casar).
 */
describe('OAuth state (anti-CSRF do login)', () => {
  function reqRes(cookie?: string, queryState?: string) {
    const req = {
      headers: { cookie },
      query: queryState === undefined ? {} : { state: queryState },
    } as any;
    const res = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as any;
    return { req, res };
  }

  describe('generateOAuthState', () => {
    it('gera valores únicos, base64url, com 256 bits de entropia', () => {
      const a = generateOAuthState();
      const b = generateOAuthState();
      expect(a).not.toBe(b);
      expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(b).toMatch(/^[A-Za-z0-9_-]{43}$/);
    });
  });

  describe('issueOAuthState', () => {
    it('grava o state num cookie httpOnly de 10 min e devolve o valor', () => {
      const { res } = reqRes();
      const state = issueOAuthState(res);
      expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(res.cookie).toHaveBeenCalledWith(
        OAUTH_STATE_COOKIE,
        state,
        expect.objectContaining({
          httpOnly: true,
          maxAge: OAUTH_STATE_TTL_MS,
        }),
      );
    });
  });

  describe('validateOAuthState', () => {
    it('(b) state da query igual ao do cookie passa e limpa o cookie', () => {
      const state = generateOAuthState();
      const { req, res } = reqRes(
        `${OAUTH_STATE_COOKIE}=${state}`,
        state,
      );
      expect(() => validateOAuthState(req, res)).not.toThrow();
      expect(res.clearCookie).toHaveBeenCalledWith(OAUTH_STATE_COOKIE, {
        path: '/',
      });
    });

    it('(a) sem cookie de state → recusado (401, AUTH_OAUTH_INVALID_STATE)', () => {
      const { req, res } = reqRes(undefined, generateOAuthState());
      expect(() => validateOAuthState(req, res)).toThrow(
        UnauthorizedException,
      );
      try {
        validateOAuthState(req, res);
      } catch (err: any) {
        expect(err.getResponse().errorCode).toBe(
          ErrorCodes.AUTH_OAUTH_INVALID_STATE,
        );
      }
      // Uso único: o cookie é limpo mesmo na falha.
      expect(res.clearCookie).toHaveBeenCalledWith(OAUTH_STATE_COOKIE, {
        path: '/',
      });
    });

    it('(a) sem state na query → recusado', () => {
      const { req, res } = reqRes(
        `${OAUTH_STATE_COOKIE}=${generateOAuthState()}`,
      );
      expect(() => validateOAuthState(req, res)).toThrow(
        UnauthorizedException,
      );
    });

    it('(a) state divergente do cookie → recusado (ataque de login CSRF)', () => {
      const { req, res } = reqRes(
        `${OAUTH_STATE_COOKIE}=${generateOAuthState()}`,
        generateOAuthState(),
      );
      expect(() => validateOAuthState(req, res)).toThrow(
        UnauthorizedException,
      );
      try {
        validateOAuthState(req, res);
      } catch (err: any) {
        expect(err.getResponse().errorCode).toBe(
          ErrorCodes.AUTH_OAUTH_INVALID_STATE,
        );
      }
    });

    it('(c) replay do mesmo state é recusado: após o uso, não há cookie para casar', () => {
      const state = generateOAuthState();
      // Primeira chegada: válida, limpa o cookie.
      const first = reqRes(`${OAUTH_STATE_COOKIE}=${state}`, state);
      expect(() => validateOAuthState(first.req, first.res)).not.toThrow();
      expect(first.res.clearCookie).toHaveBeenCalled();
      // Segunda chegada (o atacante reabre a URL do callback): o
      // navegador já não envia o cookie — sem cookie, recusa.
      const replay = reqRes(undefined, state);
      expect(() => validateOAuthState(replay.req, replay.res)).toThrow(
        UnauthorizedException,
      );
    });

    it('comparação é exata: prefixo do state não passa', () => {
      const state = generateOAuthState();
      const { req, res } = reqRes(
        `${OAUTH_STATE_COOKIE}=${state}`,
        state.slice(0, -1),
      );
      expect(() => validateOAuthState(req, res)).toThrow(
        UnauthorizedException,
      );
    });
  });
});
