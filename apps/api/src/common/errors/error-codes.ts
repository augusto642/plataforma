/**
 * M9 (Lote 4) — códigos de erro padronizados da API.
 *
 * O corpo de erro da API é `{ statusCode, errorCode, message, ... }`
 * (ver `common/filters/http-exception.filter.ts`). O front lê `message`
 * (pt-BR, exibida ao usuário) e pode ramificar por `errorCode` sem fazer
 * parse de texto. Regras:
 * - `message` NUNCA muda por causa do código: o texto exibido ao usuário é
 *   o mesmo de antes; o código é só um rótulo estável para o cliente.
 * - `errorCode` NUNCA revela o que a mensagem esconde por segurança: ex. o
 *   conflito de cadastro usa `AUTH_REGISTRATION_FAILED` (genérico) e não
 *   um código que denuncie "e-mail já existe" (anti-enumeração, C5/Lote 1).
 * - Exceções sem código explícito ganham um código default por status HTTP
 *   (`defaultErrorCodeForStatus`); validação (mensagem em array, do
 *   ValidationPipe) ganha `VALIDATION_ERROR`.
 */
export const ErrorCodes = {
  // Auth
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_EMAIL_NOT_VERIFIED: 'AUTH_EMAIL_NOT_VERIFIED',
  AUTH_INVALID_REFRESH_TOKEN: 'AUTH_INVALID_REFRESH_TOKEN',
  AUTH_MISSING_REFRESH_TOKEN: 'AUTH_MISSING_REFRESH_TOKEN',
  AUTH_INVALID_VERIFICATION_CODE: 'AUTH_INVALID_VERIFICATION_CODE',
  AUTH_VERIFICATION_CODE_EXPIRED: 'AUTH_VERIFICATION_CODE_EXPIRED',
  AUTH_VERIFICATION_CODE_ATTEMPTS_EXCEEDED:
    'AUTH_VERIFICATION_CODE_ATTEMPTS_EXCEEDED',
  AUTH_VERIFICATION_CODE_RESEND_COOLDOWN:
    'AUTH_VERIFICATION_CODE_RESEND_COOLDOWN',
  AUTH_VERIFICATION_CODE_RESEND_LIMIT: 'AUTH_VERIFICATION_CODE_RESEND_LIMIT',
  AUTH_MAILER_UNAVAILABLE: 'AUTH_MAILER_UNAVAILABLE',
  AUTH_REGISTRATION_FAILED: 'AUTH_REGISTRATION_FAILED',
  // OAuth (Google/GitHub)
  AUTH_OAUTH_UNAVAILABLE: 'AUTH_OAUTH_UNAVAILABLE',
  AUTH_OAUTH_EMAIL_REQUIRED: 'AUTH_OAUTH_EMAIL_REQUIRED',
  AUTH_OAUTH_EMAIL_UNVERIFIED: 'AUTH_OAUTH_EMAIL_UNVERIFIED',
  AUTH_OAUTH_GITHUB_EMAILS_UNAVAILABLE:
    'AUTH_OAUTH_GITHUB_EMAILS_UNAVAILABLE',
  /** D1 (QA): callback sem `state` válido (ausente, divergente, reutilizado). */
  AUTH_OAUTH_INVALID_STATE: 'AUTH_OAUTH_INVALID_STATE',
  /** D2 (QA): corrida P2002 no callback OAuth (conta/vínculo criado por outro callback). */
  AUTH_OAUTH_ACCOUNT_CONFLICT: 'AUTH_OAUTH_ACCOUNT_CONFLICT',
  // Submissões
  SUBMISSION_ACTIVITY_NOT_FOUND: 'SUBMISSION_ACTIVITY_NOT_FOUND',
  SUBMISSION_NOT_FOUND: 'SUBMISSION_NOT_FOUND',
  SUBMISSION_MISSING_INPUT: 'SUBMISSION_MISSING_INPUT',
  SUBMISSION_COMPANION_NOT_FOUND: 'SUBMISSION_COMPANION_NOT_FOUND',
  SUBMISSION_USER_NOT_FOUND: 'SUBMISSION_USER_NOT_FOUND',
  SUBMISSION_CONFLICT: 'SUBMISSION_CONFLICT',
  // Defaults por status
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  CONFLICT: 'CONFLICT',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Corpo de resposta para exceções Nest: `new UnauthorizedException(
 * withErrorCode('Invalid credentials', ErrorCodes.AUTH_INVALID_CREDENTIALS))`.
 * Mantém a classe da exceção (os specs e os guards continuam vendo
 * `instanceof UnauthorizedException`) e `error.message` igual ao texto —
 * só acrescenta o `errorCode` ao corpo que o filtro global devolve.
 */
export function withErrorCode(
  message: string,
  errorCode: string,
): { message: string; errorCode: string } {
  return { message, errorCode };
}

/** Código default quando a exceção não carrega um `errorCode` explícito. */
export function defaultErrorCodeForStatus(
  status: number,
  message: unknown,
): string {
  if (Array.isArray(message)) return ErrorCodes.VALIDATION_ERROR;
  switch (status) {
    case 400:
      return ErrorCodes.BAD_REQUEST;
    case 401:
      return ErrorCodes.UNAUTHORIZED;
    case 403:
      return ErrorCodes.FORBIDDEN;
    case 404:
      return ErrorCodes.NOT_FOUND;
    case 405:
      return ErrorCodes.METHOD_NOT_ALLOWED;
    case 409:
      return ErrorCodes.CONFLICT;
    case 429:
      return ErrorCodes.TOO_MANY_REQUESTS;
    case 503:
      return ErrorCodes.SERVICE_UNAVAILABLE;
    default:
      return status >= 500
        ? ErrorCodes.INTERNAL_ERROR
        : ErrorCodes.BAD_REQUEST;
  }
}
