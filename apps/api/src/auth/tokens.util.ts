import { createHash, randomBytes } from 'crypto';

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}