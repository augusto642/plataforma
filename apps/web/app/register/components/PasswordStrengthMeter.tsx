'use client';

import React from 'react';

interface PasswordStrengthMeterProps {
  password: string;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let score = 0;
  if (hasMinLength) score++;
  if (hasUppercase) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  const getStatus = () => {
    if (password.length === 0) {
      return { text: 'Digite sua senha', color: '#64687A', level: 0 };
    }
    if (score <= 1) {
      return { text: 'Fraca (vulnerável)', color: '#F43F5E', level: 1 };
    }
    if (score === 2) {
      return { text: 'Média (aceitável)', color: '#F59E0B', level: 2 };
    }
    if (score === 3) {
      return { text: 'Forte (segura)', color: '#04D361', level: 3 };
    }
    return { text: 'Imbatível ⚡ (perfeita)', color: '#00E5FF', level: 4 };
  };

  const status = getStatus();

  const getSegmentColor = (segmentIndex: number) => {
    if (segmentIndex > status.level) return 'rgba(255, 255, 255, 0.08)';
    if (status.level === 1) return '#F43F5E';
    if (status.level === 2) return '#F59E0B';
    if (status.level === 3) return '#04D361';
    if (status.level === 4) return '#00E5FF';
    return 'rgba(255, 255, 255, 0.08)';
  };

  const getSegmentShadow = (segmentIndex: number) => {
    if (segmentIndex > status.level) return 'none';
    if (status.level === 1) return '0 0 8px rgba(244, 63, 94, 0.5)';
    if (status.level === 2) return '0 0 8px rgba(245, 158, 11, 0.5)';
    if (status.level === 3) return '0 0 8px rgba(4, 211, 97, 0.5)';
    if (status.level === 4) return '0 0 8px rgba(0, 229, 255, 0.6)';
    return 'none';
  };

  const reqs = [
    { label: 'Mínimo 8 caracteres', isMet: hasMinLength },
    { label: 'Letra maiúscula (A-Z)', isMet: hasUppercase },
    { label: 'Número (0-9)', isMet: hasNumber },
    { label: 'Símbolo especial (@#$%!)', isMet: hasSpecial },
  ];

  return (
    <div
      style={{
        marginTop: '6px',
        background: 'rgba(21, 24, 33, 0.6)',
        border: '1px solid #232738',
        borderRadius: '8px',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', height: '5px' }}>
        {[1, 2, 3, 4].map((seg) => (
          <div
            key={seg}
            style={{
              height: '100%',
              borderRadius: '4px',
              backgroundColor: getSegmentColor(seg),
              boxShadow: getSegmentShadow(seg),
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', fontSize: '11px' }}>
        {reqs.map((req, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              color: req.isMet ? '#04D361' : '#64687A',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <span>{req.isMet ? '✓' : '○'}</span>
            <span>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
