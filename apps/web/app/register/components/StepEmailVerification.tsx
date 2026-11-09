'use client';

import React, { useEffect, useState } from 'react';
import { API_BASE } from '../../lib/apiClient';

/**
 * C5 (Lote 1) — Passo de verificação de e-mail no cadastro.
 * Renderizado no passo 4 do wizard quando o cadastro respondeu
 * emailVerificationRequired: o usuário digita o código de 6 dígitos enviado
 * para o e-mail e pode reenviar (o backend impõe cooldown de 60 s + teto de
 * 5 envios/hora; 429 vira mensagem honesta aqui). Sem código correto não há
 * sessão — a confirmação (verify-email) emite os cookies httpOnly e só então
 * o wizard avança para a celebração do workspace.
 */
interface StepEmailVerificationProps {
  email: string;
  onVerified: () => void;
}

const RESEND_COOLDOWN_SECONDS = 60;

export const StepEmailVerification: React.FC<StepEmailVerificationProps> = ({
  email,
  onVerified,
}) => {
  const [code, setCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<number>(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Digite o código de 6 dígitos enviado para o seu e-mail.');
      return;
    }
    setIsVerifying(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (data as any).message ||
            'Não foi possível confirmar o código. Tente novamente.',
        );
        return;
      }
      onVerified();
    } catch {
      setError(
        'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`${API_BASE}/auth/resend-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (data as any).message ||
            'Não foi possível reenviar o código. Tente novamente em instantes.',
        );
        return;
      }
      setInfo('Novo código enviado. Verifique sua caixa de entrada (e o spam).');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError(
        'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px' }}>
          Confirme seu e-mail ✉️
        </h2>
        <p style={{ color: '#9499AD', fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
          Enviamos um código de 6 dígitos para <strong style={{ color: '#F4F4F6' }}>{email}</strong>.
          Digite-o abaixo para ativar sua conta. O código vale por 15 minutos.
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '8px',
            color: '#F87171',
            fontSize: '13px',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {info && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(4, 211, 97, 0.10)',
            border: '1px solid rgba(4, 211, 97, 0.35)',
            borderRadius: '8px',
            color: '#4ADE80',
            fontSize: '13px',
          }}
        >
          ✓ {info}
        </div>
      )}

      <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#C6C9D4' }}>
            Código de confirmação
          </span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            style={{
              width: '100%',
              maxWidth: '240px',
              padding: '14px 16px',
              background: '#1B1E2B',
              border: '1px solid #232738',
              borderRadius: '12px',
              color: '#F4F4F6',
              fontSize: '24px',
              fontFamily: '"Fira Code", monospace',
              letterSpacing: '8px',
              textAlign: 'center',
              outline: 'none',
            }}
          />
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={isVerifying || code.length !== 6}
            style={{
              padding: '12px 28px',
              background: isVerifying || code.length !== 6 ? '#3A3F55' : '#8257E5',
              border: 'none',
              borderRadius: '12px',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 700,
              cursor: isVerifying || code.length !== 6 ? 'not-allowed' : 'pointer',
            }}
          >
            {isVerifying ? 'Confirmando…' : 'Confirmar e ativar conta'}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || isResending}
            style={{
              padding: '12px 20px',
              background: 'transparent',
              border: '1px solid #232738',
              borderRadius: '12px',
              color: cooldown > 0 ? '#64687A' : '#996DFF',
              fontSize: '14px',
              fontWeight: 600,
              cursor: cooldown > 0 || isResending ? 'not-allowed' : 'pointer',
            }}
          >
            {isResending
              ? 'Reenviando…'
              : cooldown > 0
                ? `Reenviar código (${cooldown}s)`
                : 'Reenviar código'}
          </button>
        </div>
      </form>

      <p style={{ color: '#64687A', fontSize: '12px', margin: 0 }}>
        Não encontrou o e-mail? Verifique a caixa de spam. Após 5 tentativas com o mesmo código,
        é preciso solicitar um novo.
      </p>
    </div>
  );
};
