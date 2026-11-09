import { createHash } from 'node:crypto';
import {
  buildCertificateCode,
  verifyCertificateCode,
  CERTIFICATE_CODE_TTL_MS,
  type CertificateCodePayload,
} from './certificate-code';

// Segredos de teste (nunca usados fora deste spec).
const SECRET = 'test-cert-secret-0123456789abcdef0123456789abcdef';
const OTHER_SECRET = 'other-cert-secret-0123456789abcdef0123456789abcdef';

const PAYLOAD: CertificateCodePayload = {
  userId: '11111111-1111-4111-8111-111111111111',
  courseId: '22222222-2222-4222-8222-222222222222',
  completedAt: new Date('2026-11-01T10:00:00.000Z'),
  issuedAt: new Date('2026-11-07T12:00:00.000Z'),
};

describe('certificate-code (A11)', () => {
  it('emite código v2 com versão + expiração e verifica com o segredo certo', () => {
    const code = buildCertificateCode(SECRET, PAYLOAD);

    expect(code.startsWith('v2:')).toBe(true);
    const parts = code.split(':');
    expect(parts).toHaveLength(6);
    // expiração = emissão + TTL (5 anos), não conclusão + TTL
    expect(Number(parts[4])).toBe(
      Math.floor(PAYLOAD.issuedAt!.getTime() / 1000) +
        Math.floor(CERTIFICATE_CODE_TTL_MS / 1000),
    );

    const result = verifyCertificateCode(
      SECRET,
      code,
      new Date('2026-11-07T12:00:00.000Z'),
    );
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.userId).toBe(PAYLOAD.userId);
      expect(result.courseId).toBe(PAYLOAD.courseId);
      expect(result.completedAt).toEqual(PAYLOAD.completedAt);
    }
  });

  it('código novo usa HMAC: não é reproduzível sem o segredo', () => {
    const code = buildCertificateCode(SECRET, PAYLOAD);

    // SHA-256 sem segredo (formato v1) não gera o mesmo código.
    const naive = createHash('sha256')
      .update(
        `${PAYLOAD.userId}:${PAYLOAD.courseId}:${PAYLOAD.completedAt.toISOString()}`,
      )
      .digest('hex');
    expect(code).not.toContain(naive);

    // Com outro segredo, a verificação falha.
    expect(verifyCertificateCode(OTHER_SECRET, code).valid).toBe(false);
    expect(verifyCertificateCode(OTHER_SECRET, code)).toEqual({
      valid: false,
      reason: 'bad-signature',
    });
  });

  it('rejeita código forjado (payload adulterado)', () => {
    const code = buildCertificateCode(SECRET, PAYLOAD);
    // Troca o courseId mantendo o HMAC original.
    const forged = code.replace(PAYLOAD.courseId, '33333333-3333-4333-8333-333333333333');
    expect(verifyCertificateCode(SECRET, forged)).toEqual({
      valid: false,
      reason: 'bad-signature',
    });

    // Troca um caractere do HMAC.
    const tamperedMac = `${code.slice(0, -1)}${code.endsWith('0') ? '1' : '0'}`;
    expect(verifyCertificateCode(SECRET, tamperedMac).valid).toBe(false);
  });

  it('rejeita código expirado (assinatura válida, prazo vencido)', () => {
    const code = buildCertificateCode(SECRET, PAYLOAD);
    const afterExpiry = new Date(
      PAYLOAD.issuedAt!.getTime() + CERTIFICATE_CODE_TTL_MS + 1000,
    );
    expect(verifyCertificateCode(SECRET, code, afterExpiry)).toEqual({
      valid: false,
      reason: 'expired',
    });
  });

  it('rejeita explicitamente o código antigo v1 (SHA-256 sem segredo)', () => {
    const legacy = createHash('sha256')
      .update(
        `${PAYLOAD.userId}:${PAYLOAD.courseId}:${PAYLOAD.completedAt.toISOString()}`,
      )
      .digest('hex');
    expect(legacy).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyCertificateCode(SECRET, legacy)).toEqual({
      valid: false,
      reason: 'legacy',
    });
  });

  it('rejeita formatos malformados', () => {
    for (const bad of ['', 'v2:', 'v1:a:b:c:d:e', 'v2:a:b:c', 'not-a-code']) {
      expect(verifyCertificateCode(SECRET, bad)).toEqual({
        valid: false,
        reason: 'malformed',
      });
    }
  });

  it('recusa emitir sem segredo (fail-closed)', () => {
    expect(() => buildCertificateCode('', PAYLOAD)).toThrow(/CERTIFICATE_HMAC_SECRET/);
  });
});
