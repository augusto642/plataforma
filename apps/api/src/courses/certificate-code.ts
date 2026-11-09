import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * A11 (Lote 3) — código de verificação de certificado, formato v2.
 *
 * O formato antigo (v1) era `sha256(userId:courseId:completedAt)` em hex:
 * sem segredo, sem versão e sem expiração. `userId` vaza no leaderboard,
 * `courseId` é público e `completedAt` é o timestamp da última submissão —
 * o código era pré-computável/enumerável por qualquer um, e nunca expirava.
 * (O código sozinho nunca criou um certificado válido — não há endpoint de
 * verificação na API da main nem registro persistido do código — por isso o
 * achado não era crítico. Mesmo assim o código emitido não pode ser
 * forjável offline.)
 *
 * Formato v2 (auto-contido e assinado):
 *   `v2:<userId>:<courseId>:<completedAtUnix>:<expiresAtUnix>:<hmacHex>`
 * - `hmacHex` = HMAC-SHA256(`CERTIFICATE_HMAC_SECRET`,
 *   `v2:<userId>:<courseId>:<completedAtUnix>:<expiresAtUnix>`).
 *   Sem o segredo do servidor o código não é reproduzível nem forjável;
 *   a comparação usa `timingSafeEqual`.
 * - Versão (`v2`) no prefixo: permite rotacionar o formato/segredo sem
 *   quebrar a leitura dos códigos já emitidos.
 * - Expiração embutida: o código vale `CERTIFICATE_CODE_TTL_MS` a partir
 *   da emissão (5 anos — longo o bastante para um certificado, limitado
 *   o bastante para o código não ser válido para sempre).
 * - `userId`/`courseId`/`completedAt` no corpo não são segredos (já são
 *   públicos/dedutíveis); o que autentica o código é só o HMAC.
 *
 * Compatibilidade / invalidação explícita do v1:
 * - Códigos v1 (64 hex) são detectados por `verifyCertificateCode` e
 *   REJEITADOS com `reason: 'legacy'` — não há caminho de verificação
 *   para eles. Decisão consciente: na main não existe endpoint de
 *   verificação nem tabela de certificados, então nenhum código v1 jamais
 *   foi verificável por nada; reemitir o certificado (`getCertificate`
 *   recalcula o código a cada chamada) entrega um código v2. Não há
 *   migração de dados a fazer e nenhum consumidor quebra.
 * - Não existe revogação na main (não há `Certificate.revokedAt` nem
 *   endpoint de revoke); nada a preservar aqui. Se um dia houver
 *   verificação por banco, a revogação deve continuar respondendo 404
 *   sem vazar o motivo, como no desenho do premium.
 */

export const CERTIFICATE_CODE_VERSION = 'v2';

/** Validade do código a partir da emissão: 5 anos. */
export const CERTIFICATE_CODE_TTL_MS = 5 * 365 * 24 * 60 * 60 * 1000;

const LEGACY_SHA256_HEX = /^[0-9a-f]{64}$/;

export interface CertificateCodePayload {
  userId: string;
  courseId: string;
  completedAt: Date;
  /** Instante de emissão (default: agora). A expiração conta a partir daqui. */
  issuedAt?: Date;
}

export type CertificateCodeVerification =
  | {
      valid: true;
      userId: string;
      courseId: string;
      completedAt: Date;
      expiresAt: Date;
    }
  | {
      valid: false;
      reason: 'malformed' | 'legacy' | 'expired' | 'bad-signature';
    };

function hmacHex(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

export function buildCertificateCode(
  secret: string,
  payload: CertificateCodePayload,
): string {
  if (!secret) {
    throw new Error(
      'CERTIFICATE_HMAC_SECRET is required to issue a certificate code',
    );
  }
  const completedAtUnix = Math.floor(payload.completedAt.getTime() / 1000);
  const issuedAt = payload.issuedAt ?? new Date();
  const expiresAtUnix =
    Math.floor(issuedAt.getTime() / 1000) +
    Math.floor(CERTIFICATE_CODE_TTL_MS / 1000);
  const body = `${CERTIFICATE_CODE_VERSION}:${payload.userId}:${payload.courseId}:${completedAtUnix}:${expiresAtUnix}`;
  return `${body}:${hmacHex(secret, body)}`;
}

/**
 * Verifica um código v2 sem acesso ao banco: parseia os campos, confere a
 * assinatura (timing-safe) e a expiração. Códigos v1 são rejeitados como
 * `legacy`; qualquer outro formato inválido, como `malformed`.
 */
export function verifyCertificateCode(
  secret: string,
  code: string,
  now: Date = new Date(),
): CertificateCodeVerification {
  if (typeof code !== 'string' || code.length === 0) {
    return { valid: false, reason: 'malformed' };
  }
  const normalized = code.trim();
  // Formato antigo: SHA-256 hex sem segredo — invalidado explicitamente.
  if (LEGACY_SHA256_HEX.test(normalized)) {
    return { valid: false, reason: 'legacy' };
  }
  const parts = normalized.split(':');
  if (parts.length !== 6 || parts[0] !== CERTIFICATE_CODE_VERSION) {
    return { valid: false, reason: 'malformed' };
  }
  const [, userId, courseId, completedAtRaw, expiresAtRaw, macHex] = parts;
  const completedAtUnix = Number(completedAtRaw);
  const expiresAtUnix = Number(expiresAtRaw);
  if (
    !userId ||
    !courseId ||
    !Number.isInteger(completedAtUnix) ||
    !Number.isInteger(expiresAtUnix) ||
    !/^[0-9a-f]{64}$/.test(macHex)
  ) {
    return { valid: false, reason: 'malformed' };
  }

  const body = `${CERTIFICATE_CODE_VERSION}:${userId}:${courseId}:${completedAtUnix}:${expiresAtUnix}`;
  const expected = Buffer.from(hmacHex(secret, body), 'hex');
  let actual: Buffer;
  try {
    actual = Buffer.from(macHex, 'hex');
  } catch {
    return { valid: false, reason: 'malformed' };
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return { valid: false, reason: 'bad-signature' };
  }

  const expiresAt = new Date(expiresAtUnix * 1000);
  if (now.getTime() > expiresAt.getTime()) {
    return { valid: false, reason: 'expired' };
  }
  return {
    valid: true,
    userId,
    courseId,
    completedAt: new Date(completedAtUnix * 1000),
    expiresAt,
  };
}
