'use client';

import React, { useState } from 'react';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

export type RoleType = 'student';

interface StepCredentialsProps {
  role: RoleType;
  setRole: (role: RoleType) => void;
  name: string;
  setName: (name: string) => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (pwd: string) => void;
  passwordConfirm: string;
  setPasswordConfirm: (pwd: string) => void;
  termsAccepted: boolean;
  setTermsAccepted: (terms: boolean) => void;
  onNext: () => void;
}

export const StepCredentials: React.FC<StepCredentialsProps> = ({
  role,
  setRole,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  passwordConfirm,
  setPasswordConfirm,
  termsAccepted,
  setTermsAccepted,
  onNext,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // Quick autofill buttons for 1-click preview
  const handleQuickGithub = () => {
    setName('Augusto Dev (GitHub)');
    setEmail('augusto.dev@github.com');
    setPassword('NexusCode2026!#');
    setPasswordConfirm('NexusCode2026!#');
  };

  const handleQuickGoogle = () => {
    setName('Augusto Silva (Google)');
    setEmail('augusto.silva@gmail.com');
    setPassword('GoogleNexus2026#');
    setPasswordConfirm('GoogleNexus2026#');
  };

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isNameValid = name.trim().length >= 3;
  const isPasswordValid = password.length >= 6;
  const isPasswordMatch = password.length > 0 && password === passwordConfirm;
  const isFormValid = isNameValid && isEmailValid && isPasswordValid && isPasswordMatch && termsAccepted;

  // Password strength label
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [hasMinLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;

  const getStrengthLabel = () => {
    if (password.length === 0) return { text: 'Digite sua senha', color: '#64687A' };
    if (score <= 1) return { text: 'Fraca (vulnerável)', color: '#F43F5E' };
    if (score === 2) return { text: 'Média (aceitável)', color: '#F59E0B' };
    if (score === 3) return { text: 'Forte (segura)', color: '#04D361' };
    return { text: 'Imbatível ⚡ (perfeita)', color: '#00E5FF' };
  };

  const strengthStatus = getStrengthLabel();

  return (
    <div style={{ animation: 'fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
      {/* Step Header */}
      <div style={{ marginBottom: '28px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: 'rgba(130, 87, 229, 0.15)',
            border: '1px solid rgba(130, 87, 229, 0.3)',
            color: '#996DFF',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '12px',
          }}
        >
          ⚡ Onboarding Rápido
        </div>
        <h1
          style={{
            fontSize: '26px',
            fontWeight: 800,
            letterSpacing: '-0.5px',
            color: '#FFF',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          Crie sua Conta de Desenvolvedor
        </h1>
        <p style={{ color: '#9499AD', fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
          Acesse o laboratório interativo com sandbox Docker dedicada, tutor IA socrático e desafios de elite.
        </p>
      </div>

      {/* Social Auth Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
        <button
          type="button"
          onClick={handleQuickGithub}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '13px 16px',
            background: '#151821',
            border: '1px solid #232738',
            borderRadius: '12px',
            color: '#F4F4F6',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#996DFF';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(130, 87, 229, 0.2)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#232738';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            />
          </svg>
          Continuar com GitHub
        </button>

        <button
          type="button"
          onClick={handleQuickGoogle}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '13px 16px',
            background: '#151821',
            border: '1px solid #232738',
            borderRadius: '12px',
            color: '#F4F4F6',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#00E5FF';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 229, 255, 0.2)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#232738';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
            <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z" />
            <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z" />
          </svg>
          Continuar com Google
        </button>
      </div>

      {/* Divider */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          marginBottom: '24px',
          color: '#64687A',
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
        }}
      >
        <div style={{ flex: 1, height: '1px', background: '#232738' }} />
        <span>Ou cadastre com seu e-mail</span>
        <div style={{ flex: 1, height: '1px', background: '#232738' }} />
      </div>

      {/* Form Fields Stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Name & Email Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#9499AD', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Nome Completo
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '14px', color: '#64687A', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Ex: Augusto Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  background: '#151821',
                  border: '1px solid #232738',
                  borderRadius: '12px',
                  padding: '13px 14px 13px 44px',
                  color: '#FFF',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.25s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#8257E5';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(130, 87, 229, 0.25)';
                  e.currentTarget.style.background = '#181B26';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#232738';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.background = '#151821';
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#9499AD', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              E-mail Profissional
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '14px', color: '#64687A', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <input
                type="email"
                placeholder="augusto@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  background: '#151821',
                  border: '1px solid #232738',
                  borderRadius: '12px',
                  padding: '13px 14px 13px 44px',
                  color: '#FFF',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.25s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#8257E5';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(130, 87, 229, 0.25)';
                  e.currentTarget.style.background = '#181B26';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#232738';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.background = '#151821';
                }}
              />
            </div>
          </div>
        </div>

        {/* Password Field + Strength Meter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#9499AD', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Senha de Acesso
            </label>
            <span style={{ fontSize: '11px', color: strengthStatus.color, fontWeight: 700 }}>
              {strengthStatus.text}
            </span>
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '14px', color: '#64687A', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                background: '#151821',
                border: '1px solid #232738',
                borderRadius: '12px',
                padding: '13px 44px 13px 44px',
                color: '#FFF',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.25s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#8257E5';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(130, 87, 229, 0.25)';
                e.currentTarget.style.background = '#181B26';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#232738';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.background = '#151821';
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                background: 'transparent',
                border: 'none',
                color: '#64687A',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>

          <PasswordStrengthMeter password={password} />
        </div>

        {/* Confirm Password Field */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#9499AD', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Confirmar Senha
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '14px', color: '#64687A', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </span>
            <input
              type={showPasswordConfirm ? 'text' : 'password'}
              placeholder="Repita sua senha"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              style={{
                width: '100%',
                background: '#151821',
                border: `1px solid ${
                  passwordConfirm.length > 0 && !isPasswordMatch ? '#F43F5E' : '#232738'
                }`,
                borderRadius: '12px',
                padding: '13px 44px 13px 44px',
                color: '#FFF',
                fontSize: '14px',
                outline: 'none',
                boxShadow:
                  passwordConfirm.length > 0 && !isPasswordMatch
                    ? '0 0 0 3px rgba(244, 63, 94, 0.2)'
                    : 'none',
                transition: 'all 0.25s',
              }}
              onFocus={(e) => {
                if (passwordConfirm.length === 0 || isPasswordMatch) {
                  e.currentTarget.style.borderColor = '#8257E5';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(130, 87, 229, 0.25)';
                }
              }}
              onBlur={(e) => {
                if (passwordConfirm.length === 0 || isPasswordMatch) {
                  e.currentTarget.style.borderColor = '#232738';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            />
            <button
              type="button"
              onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
              style={{
                position: 'absolute',
                right: '12px',
                background: 'transparent',
                border: 'none',
                color: '#64687A',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
        </div>

        {/* Terms Checkbox */}
        <div
          onClick={() => setTermsAccepted(!termsAccepted)}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            fontSize: '12px',
            color: '#9499AD',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '5px',
              background: termsAccepted ? '#8257E5' : '#151821',
              border: `1px solid ${termsAccepted ? '#996DFF' : '#232738'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '1px',
              boxShadow: termsAccepted ? '0 0 10px rgba(130, 87, 229, 0.4)' : 'none',
              transition: 'all 0.25s',
            }}
          >
            {termsAccepted && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          <span>
            Concordo com os <span style={{ color: '#996DFF', textDecoration: 'underline' }}>Termos de Uso</span>,{' '}
            <span style={{ color: '#996DFF', textDecoration: 'underline' }}>Política de Privacidade</span> e diretrizes de
            integridade da NEXUS CODE.
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginTop: '28px',
          paddingTop: '20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div style={{ fontSize: '12px', color: '#64687A' }}>Etapa 1 de 4: Dados Básicos</div>
        <button
          type="button"
          disabled={!isFormValid}
          onClick={onNext}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '13px 28px',
            background: 'linear-gradient(90deg, #8257E5 0%, #996DFF 100%)',
            border: 'none',
            borderRadius: '12px',
            color: '#FFF',
            fontSize: '14px',
            fontWeight: 700,
            cursor: isFormValid ? 'pointer' : 'not-allowed',
            opacity: isFormValid ? 1 : 0.5,
            boxShadow: isFormValid ? '0 8px 24px -4px rgba(130, 87, 229, 0.4)' : 'none',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={(e) => {
            if (isFormValid) {
              e.currentTarget.style.boxShadow = '0 12px 30px -4px rgba(130, 87, 229, 0.65)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (isFormValid) {
              e.currentTarget.style.boxShadow = '0 8px 24px -4px rgba(130, 87, 229, 0.4)';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          Escolher Minha Trilha
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
};
