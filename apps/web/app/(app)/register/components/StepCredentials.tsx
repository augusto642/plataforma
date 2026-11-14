'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { oauthLoginUrl } from '../../../lib/oauth-errors';
import {
  PasswordStrengthMeter,
  evaluatePasswordStrength,
} from './PasswordStrengthMeter';

export type RoleType = 'student';
export type EmailAvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

interface StepCredentialsProps {
  role: RoleType;
  setRole: (role: RoleType) => void;
  name: string;
  setName: (name: string) => void;
  email: string;
  setEmail: (email: string) => void;
  emailAvailability?: EmailAvailabilityStatus;
  password: string;
  setPassword: (pwd: string) => void;
  passwordConfirm: string;
  setPasswordConfirm: (pwd: string) => void;
  termsAccepted: boolean;
  setTermsAccepted: (terms: boolean) => void;
  onNext: () => void;
}

export const StepCredentials: React.FC<StepCredentialsProps> = ({
  role: _role,
  setRole: _setRole,
  name,
  setName,
  email,
  setEmail,
  emailAvailability = 'idle',
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

  // OAuth real (Google/GitHub): os botões criam a conta direto pelo provedor
  // (e-mail já verificado por ele); o cadastro por e-mail/senha exige os campos abaixo.
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isNameValid = name.trim().length >= 3;
  const isPasswordValid = password.length >= 8;
  const isPasswordMatch = password.length > 0 && password === passwordConfirm;
  const isEmailBlocked = emailAvailability === 'taken' || emailAvailability === 'checking';
  const isFormValid =
    isNameValid &&
    isEmailValid &&
    !isEmailBlocked &&
    isPasswordValid &&
    isPasswordMatch &&
    termsAccepted;

  const strength = evaluatePasswordStrength(password);

  const emailBorderClass =
    emailAvailability === 'taken'
      ? 'border-[#F43F5E] focus:border-[#F43F5E] shadow-[0_0_0_3px_rgba(244,63,94,0.16)]'
      : emailAvailability === 'available'
      ? 'border-[#00E676]/55 focus:border-[#00E676]'
      : 'border-[#1C2133] focus:border-[#8257E5]';

  const confirmBorderClass =
    passwordConfirm.length > 0 && !isPasswordMatch
      ? 'border-[#F43F5E] focus:border-[#F43F5E] shadow-[0_0_0_3px_rgba(244,63,94,0.16)]'
      : passwordConfirm.length > 0 && isPasswordMatch
      ? 'border-[#00E676]/55 focus:border-[#00E676]'
      : 'border-[#1C2133] focus:border-[#8257E5]';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header da Etapa 1 */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8257E5]/15 border border-[#8257E5]/30 text-[#A379FF] text-xs font-mono font-semibold uppercase tracking-wider mb-2">
          ⚡ Onboarding Rápido
        </div>
        <h1 className="text-2xl sm:text-3xl font-brand font-black text-white tracking-tight">
          Crie sua Conta de Desenvolvedor
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          Acesse o laboratório interativo com sandbox dedicado, tutoria socrática por IA e desafios reais.
        </p>
      </div>

      {/* Social Logins Reais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <a
          href={oauthLoginUrl('github')}
          className="flex items-center justify-center gap-3 p-3.5 rounded-xl bg-[#181C2C] hover:bg-[#1E2338] border border-[#1C2133] hover:border-[#8257E5]/50 transition-all font-medium text-sm text-white no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF]"
        >
          <svg className="w-5 h-5 fill-current text-white shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span>Continuar com GitHub</span>
        </a>

        <a
          href={oauthLoginUrl('google')}
          className="flex items-center justify-center gap-3 p-3.5 rounded-xl bg-[#181C2C] hover:bg-[#1E2338] border border-[#1C2133] hover:border-[#00E5FF]/50 transition-all font-medium text-sm text-white no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF]"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Continuar com Google</span>
        </a>
      </div>

      {/* Divisor */}
      <div className="relative flex items-center justify-center my-4">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-[#1C2133]" />
        </div>
        <span className="relative px-3 bg-[#111420] text-xs font-mono uppercase tracking-widest text-[#64748B]">
          ou preencha os dados
        </span>
      </div>

      {/* Nome e E-mail */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="register-name"
            className="block text-xs font-mono uppercase tracking-wider text-[#94A3B8] mb-1.5"
          >
            Nome Completo
          </label>
          <input
            id="register-name"
            type="text"
            autoComplete="name"
            placeholder="Ex: Augusto Silva"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#181C2C] border border-[#1C2133] focus:border-[#8257E5] focus:outline-none text-sm text-white font-sans placeholder-[#64748B] transition-colors"
          />
          {name.length > 0 && !isNameValid && (
            <p className="text-[11px] font-mono text-[#F59E0B] mt-1.5" role="status">
              Informe pelo menos 3 caracteres.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="register-email"
            className="block text-xs font-mono uppercase tracking-wider text-[#94A3B8] mb-1.5"
          >
            E-mail Profissional
          </label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder="augusto@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={emailAvailability === 'taken'}
            className={`w-full px-4 py-3 rounded-xl bg-[#181C2C] border focus:outline-none text-sm text-white font-sans placeholder-[#64748B] transition-colors ${emailBorderClass}`}
          />

          {isEmailValid && emailAvailability === 'checking' && (
            <p className="text-[11px] font-mono text-[#94A3B8] mt-1.5" role="status">
              Verificando disponibilidade do e-mail...
            </p>
          )}
          {isEmailValid && emailAvailability === 'available' && (
            <p className="text-[11px] font-mono text-[#00E676] font-semibold mt-1.5" role="status">
              ✓ E-mail disponível para cadastro
            </p>
          )}
          {isEmailValid && emailAvailability === 'taken' && (
            <p
              className="text-[11px] text-[#FCA5A5] font-semibold mt-1.5 flex flex-wrap items-center gap-1"
              role="alert"
            >
              <span>Este e-mail já possui cadastro. Use outro e-mail ou</span>
              <Link href="/login" className="text-[#00E5FF] underline font-bold">
                faça login aqui
              </Link>
              <span>.</span>
            </p>
          )}
        </div>
      </div>

      {/* Senha e Confirmação + Medidor */}
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="register-password"
                className="block text-xs font-mono uppercase tracking-wider text-[#94A3B8]"
              >
                Senha de Acesso
              </label>
              <span className={`text-xs font-mono font-semibold ${strength.textColorClass}`}>
                {strength.text}
              </span>
            </div>
            <div className="relative">
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Mínimo de 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-11 py-3 rounded-xl bg-[#181C2C] border border-[#1C2133] focus:border-[#8257E5] focus:outline-none text-sm text-white font-sans placeholder-[#64748B] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-white transition-colors cursor-pointer bg-transparent border-0"
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="register-password-confirm"
                className="block text-xs font-mono uppercase tracking-wider text-[#94A3B8]"
              >
                Confirmar Senha
              </label>
              {passwordConfirm.length > 0 && (
                <span
                  className={`text-xs font-mono font-semibold ${
                    isPasswordMatch ? 'text-[#00E676]' : 'text-[#F43F5E]'
                  }`}
                >
                  {isPasswordMatch ? '✓ Senhas coincidem' : 'Senhas diferentes'}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                id="register-password-confirm"
                type={showPasswordConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repita sua senha"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                aria-invalid={passwordConfirm.length > 0 && !isPasswordMatch}
                className={`w-full pl-4 pr-11 py-3 rounded-xl bg-[#181C2C] border focus:outline-none text-sm text-white font-sans placeholder-[#64748B] transition-colors ${confirmBorderClass}`}
              />
              <button
                type="button"
                onClick={() => setShowPasswordConfirm((prev) => !prev)}
                aria-label={showPasswordConfirm ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-white transition-colors cursor-pointer bg-transparent border-0"
              >
                {showPasswordConfirm ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <PasswordStrengthMeter password={password} />
      </div>

      {/* Aceite dos Termos */}
      <label
        htmlFor="register-terms"
        className="flex items-start gap-3 text-xs text-[#94A3B8] cursor-pointer select-none group"
      >
        <input
          id="register-terms"
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          className="sr-only"
        />
        <span
          aria-hidden="true"
          className={`w-[18px] h-[18px] mt-0.5 rounded-[5px] border flex items-center justify-center shrink-0 transition-all group-focus-within:ring-2 group-focus-within:ring-[#00E5FF] ${
            termsAccepted
              ? 'bg-[#8257E5] border-[#A379FF] shadow-[0_0_10px_rgba(130,87,229,0.4)]'
              : 'bg-[#181C2C] border-[#1C2133] group-hover:border-[#8257E5]/50'
          }`}
        >
          {termsAccepted && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
        <span className="leading-relaxed">
          Concordo com os{' '}
          <span className="text-[#A379FF] underline font-medium">Termos de Uso</span>,{' '}
          <span className="text-[#A379FF] underline font-medium">Política de Privacidade</span> e
          diretrizes de integridade da NEXUS CODE.
        </span>
      </label>

      {/* Footer da Etapa 1 */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-[#1C2133]">
        <span className="text-xs font-mono text-[#64748B]">Etapa 1 de 6: Dados Básicos</span>
        <button
          type="button"
          disabled={!isFormValid}
          onClick={onNext}
          className="px-6 py-3 rounded-xl bg-[#8257E5] hover:bg-[#9366f0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-[0_0_25px_rgba(130,87,229,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>
            {emailAvailability === 'checking'
              ? 'Verificando e-mail...'
              : emailAvailability === 'taken'
              ? 'E-mail já cadastrado'
              : 'Continuar para Experiência'}
          </span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
};
