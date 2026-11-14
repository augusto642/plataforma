'use client';

import React from 'react';

export interface PasswordStrengthInfo {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  score: number;
  level: 0 | 1 | 2 | 3 | 4;
  text: string;
  textColorClass: string;
  barColorClass: string;
}

/**
 * Avalia critérios de força da senha de cadastro para uso conjunto no campo e no medidor.
 */
export function evaluatePasswordStrength(password: string): PasswordStrengthInfo {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const score = [hasMinLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;

  if (password.length === 0) {
    return {
      hasMinLength,
      hasUppercase,
      hasNumber,
      hasSpecial,
      score,
      level: 0,
      text: 'Digite sua senha',
      textColorClass: 'text-[#64748B]',
      barColorClass: 'bg-[#1C2133]',
    };
  }

  if (score <= 1) {
    return {
      hasMinLength,
      hasUppercase,
      hasNumber,
      hasSpecial,
      score,
      level: 1,
      text: 'Senha Fraca (vulnerável)',
      textColorClass: 'text-[#F43F5E]',
      barColorClass: 'bg-[#F43F5E] shadow-[0_0_8px_rgba(244,63,94,0.45)]',
    };
  }

  if (score === 2) {
    return {
      hasMinLength,
      hasUppercase,
      hasNumber,
      hasSpecial,
      score,
      level: 2,
      text: 'Senha Média (aceitável)',
      textColorClass: 'text-[#F59E0B]',
      barColorClass: 'bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.45)]',
    };
  }

  if (score === 3) {
    return {
      hasMinLength,
      hasUppercase,
      hasNumber,
      hasSpecial,
      score,
      level: 3,
      text: 'Senha Forte (segura)',
      textColorClass: 'text-[#00E676]',
      barColorClass: 'bg-[#00E676] shadow-[0_0_8px_rgba(0,230,116,0.45)]',
    };
  }

  return {
    hasMinLength,
    hasUppercase,
    hasNumber,
    hasSpecial,
    score,
    level: 4,
    text: 'Senha Imbatível ⚡',
    textColorClass: 'text-[#00E5FF]',
    barColorClass: 'bg-[#00E5FF] shadow-[0_0_8px_rgba(0,229,255,0.5)]',
  };
}

interface PasswordStrengthMeterProps {
  password: string;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  const strength = evaluatePasswordStrength(password);

  const requirements = [
    { label: 'Mínimo 8 caracteres', isMet: strength.hasMinLength },
    { label: 'Letra maiúscula (A-Z)', isMet: strength.hasUppercase },
    { label: 'Número (0-9)', isMet: strength.hasNumber },
    { label: 'Símbolo (@#$%)', isMet: strength.hasSpecial },
  ];

  return (
    <div className="mt-2.5 rounded-xl bg-[#0C0E15] border border-[#1C2133] p-3 space-y-2.5">
      <div
        className="grid grid-cols-4 gap-1.5 h-1.5"
        role="meter"
        aria-label="Força da senha"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={strength.level}
      >
        {[1, 2, 3, 4].map((segment) => (
          <div
            key={segment}
            className={`h-full rounded-full transition-all duration-300 ${
              segment <= strength.level ? strength.barColorClass : 'bg-[#181C2C]'
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
        {requirements.map((req) => (
          <span
            key={req.label}
            className={`flex items-center gap-1.5 transition-colors duration-200 ${
              req.isMet ? 'text-[#00E676]' : 'text-[#94A3B8]'
            }`}
          >
            <span aria-hidden="true">{req.isMet ? '✓' : '○'}</span>
            <span>{req.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
};
