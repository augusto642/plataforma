import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MailerService } from '../mail/mailer.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { hashToken } from './tokens.util';

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('new-hash') }));

describe('Password recovery', () => {
  const token = 'a'.repeat(64);

  function setup() {
    const user = { findUnique: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) };
    const refreshToken = { deleteMany: jest.fn() };
    const prisma = { user, $transaction: jest.fn((callback) => callback({ user, refreshToken })) };
    const mailer = { assertPasswordResetAvailable: jest.fn(), sendPasswordReset: jest.fn().mockResolvedValue(undefined) };
    const auth = new AuthService(
      prisma as unknown as PrismaService,
      new JwtService(),
      new ConfigService({ WEB_PUBLIC_URL: 'https://nexus.example' }),
      mailer as unknown as MailerService,
    );
    return { auth, user, refreshToken, mailer };
  }

  it('sends a link for a password account and stores only its hash', async () => {
    const { auth, user, mailer } = setup();
    user.findUnique.mockResolvedValue({ id: 'user-1', email: 'a@example.com', passwordHash: 'old' });
    await auth.requestPasswordReset(' A@example.com ');
    const link = new URL(mailer.sendPasswordReset.mock.calls[0][1]);
    const raw = new URLSearchParams(link.hash.slice(1)).get('token')!;
    expect(link.origin + link.pathname).toBe('https://nexus.example/redefinir-senha');
    expect(link.search).toBe('');
    expect(raw).toHaveLength(64);
    expect(user.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { passwordResetHash: hashToken(raw), passwordResetUntil: expect.any(Date) },
    }));
  });

  it('returns the same response without sending mail for unknown and OAuth-only accounts', async () => {
    const { auth, user, mailer } = setup();
    user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ passwordHash: null });
    await expect(auth.requestPasswordReset('unknown@example.com')).resolves.toBeUndefined();
    await expect(auth.requestPasswordReset('oauth@example.com')).resolves.toBeUndefined();
    expect(mailer.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('consumes the valid link and revokes refresh sessions, but rejects reuse', async () => {
    const { auth, user, refreshToken } = setup();
    user.findUnique.mockResolvedValue({ id: 'user-1', passwordResetUntil: new Date(Date.now() + 60_000) });
    user.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    await auth.resetPassword(token, 'new-password');
    await expect(auth.resetPassword(token, 'another-password')).rejects.toBeInstanceOf(BadRequestException);
    expect(bcrypt.hash).toHaveBeenCalledWith('new-password', expect.any(Number));
    expect(user.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { passwordHash: 'new-hash', passwordResetHash: null, passwordResetUntil: null },
    }));
    expect(refreshToken.deleteMany).toHaveBeenCalledTimes(1);
    expect(refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
  });
});
