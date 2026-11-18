import { describe, expect, it } from 'vitest';
import {
  certificateVerificationUrl,
  createCertificateQrDataUrl,
} from './certificates';

describe('certificate QR helpers', () => {
  it('builds a canonical verification URL without duplicate slashes', () => {
    expect(certificateVerificationUrl('https://nexus.example/', 'abc/123')).toBe(
      'https://nexus.example/certificados/abc%2F123',
    );
  });

  it('generates a PNG QR code for the verification URL', async () => {
    await expect(
      createCertificateQrDataUrl('https://nexus.example/certificados/abc123'),
    ).resolves.toMatch(/^data:image\/png;base64,/);
  });
});
