import QRCode from 'qrcode';

export function certificateVerificationUrl(webBase: string, code: string): string {
  return `${webBase.replace(/\/+$/, '')}/certificados/${encodeURIComponent(code)}`;
}

export function createCertificateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 192,
  });
}
