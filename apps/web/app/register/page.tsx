'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Logo from '../components/Logo';
import { ConfettiCanvas, ConfettiCanvasHandle } from './components/ConfettiCanvas';
import { RegisterStepper } from './components/RegisterStepper';
import { StepCredentials, RoleType } from './components/StepCredentials';
import { StepEmailVerification } from './components/StepEmailVerification';
import { StepTracks, TrackId } from './components/StepTracks';
import { StepGoals, ExpLevel, TimeCommitment, CareerGoal } from './components/StepGoals';
import { StepTerminalProvision } from './components/StepTerminalProvision';
import { useAuth } from '../context/AuthContext';
// B11 — atribuição (UTMs B07 + token do diagnóstico B09) vive na lib
// compartilhada: a landing e o /onboarding capturam na chegada e TODA porta
// de cadastro lê daí, para nenhuma porta perder o contexto do funil.
import {
  captureUtmFromUrl,
  readAttributionProps,
  readPlanIntentProps,
  readStoredUtm,
  readStoredDiagnosticToken,
  clearStoredDiagnosticToken,
} from '../lib/attribution';
// B08 — eventos do funil (signup_submit / signup_success)
// Sprint 5 — + pageview e contexto (intenção de plano + campanha) nos signups
import { track, trackPageview } from '../lib/analytics';
// Sprint 6 — cadastro concluído por esta porta também aposenta o
// espelho local das escolhas do prólogo (a conta vira a fonte)
import { clearOnboardingChoices } from '../lib/onboardingChoices';
// Sprint 8 — a trilha clicada na landing chega por ?track= e pré-
// seleciona a etapa 2 (antes o clique se perdia na porta)
import { resolveRegisterTrackParam } from '../lib/deepLinks';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  // Sprint 8 — trilha de origem (landing): o valor cru viaja nas props
  // do funil (sourceTrack) mesmo quando o mapeamento o aproxima de
  // outra especialização na etapa 2
  const [landingTrack, setLandingTrack] = useState<string | null>(null);

  // B07 — captura as UTMs da URL de chegada uma única vez, na montagem
  // Sprint 8 — e o ?track= da landing: pré-seleciona a etapa 2 com a
  // especialização correspondente à trilha clicada
  useEffect(() => {
    captureUtmFromUrl();
    trackPageview();
    const rawTrack = new URLSearchParams(window.location.search).get('track');
    const resolvedTrack = resolveRegisterTrackParam(rawTrack);
    if (resolvedTrack) {
      setSelectedTrack(resolvedTrack);
      setLandingTrack(rawTrack);
    }
  }, []);

  // Form State (Step 1)
  const [role, setRole] = useState<RoleType>('student');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [passwordConfirm, setPasswordConfirm] = useState<string>('');
  // B48/P1 (Sprint 16) — LGPD: o aceite dos termos nascia PRÉ-MARCADO
  // (consentimento presumido não é consentimento). Nasce desmarcado e
  // o cadastro só libera com o aceite explícito do visitante.
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);

  // Step 2 & 3 State
  const [selectedTrack, setSelectedTrack] = useState<TrackId>('web3');
  const [expLevel, setExpLevel] = useState<ExpLevel>('mid');
  const [timeCommitment, setTimeCommitment] = useState<TimeCommitment>('10h');
  const [careerGoal, setCareerGoal] = useState<CareerGoal>('global');

  const confettiRef = useRef<ConfettiCanvasHandle | null>(null);

  const isStep1Valid = useCallback(() => {
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const isNameValid = name.trim().length >= 3;
    const isPasswordValid = password.length >= 6;
    const isPasswordMatch = password.length > 0 && password === passwordConfirm;
    return isNameValid && isEmailValid && isPasswordValid && isPasswordMatch && termsAccepted;
  }, [email, name, password, passwordConfirm, termsAccepted]);

  const handleStep1Next = useCallback(() => {
    if (isStep1Valid()) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isStep1Valid]);

  const handleStep2Next = useCallback(() => {
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const { register: authRegister } = useAuth();
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  // C5 (Lote 1): o cadastro não cria sessão — o passo 4 exibe a digitação do
  // código antes da celebração do workspace.
  const [needsEmailVerification, setNeedsEmailVerification] = useState<boolean>(false);
  const [emailVerified, setEmailVerified] = useState<boolean>(false);

  const handleStep3Next = useCallback(async () => {
    setIsRegistering(true);
    setRegisterError(null);
    // B08 — o funil mede a tentativa e a conversão do cadastro.
    // Sprint 5 — a intenção de plano (escolha nos preços) e a campanha
    // acompanham o cadastro nas props, para a leitura do funil fechar.
    // Sprint 8 — as escolhas das etapas 2–3 (trilha/nível/tempo/objetivo)
    // entram nas props: até aqui eram coletadas e descartadas.
    const signupProps = {
      ...readPlanIntentProps(),
      ...readAttributionProps(),
      source: 'register',
      track: selectedTrack,
      expLevel,
      timeCommitment,
      careerGoal,
      ...(landingTrack ? { sourceTrack: landingTrack } : {}),
    };
    track('signup_submit', 'register_submit', signupProps);

    try {
      const result = await authRegister({
        email: email.trim(),
        password,
        name: name.trim(),
        role: 'student',
        // B07 — inclui as UTMs capturadas; sem UTM, nenhum campo é enviado
        ...readStoredUtm(),
        // B09 — inclui o token do diagnóstico; quem não fez o quiz não envia nada
        ...readStoredDiagnosticToken(),
        // Sprint 8 — as escolhas da porta fria valem de verdade: a API
        // persiste o nível como careerTier da conta (ver RegisterDto)
        preferredTrack: selectedTrack,
        experienceLevel: expLevel,
        weeklyTimeCommitment: timeCommitment,
        careerGoal,
      });

      if (!result.success) {
        // Erro formal da API (ex: email duplicado) — exibe e NÃO avança.
        setRegisterError(result.error || 'Falha ao registrar conta.');
        return;
      }

      // C5: conta criada mas não verificada — o passo 4 pede o código.
      setNeedsEmailVerification(result.emailVerificationRequired === true);
      setEmailVerified(false);

      track('signup_success', 'register_submit', signupProps);

      // B09 — resultado vinculado à conta: o token não é mais necessário
      clearStoredDiagnosticToken();
      // Sprint 6 — idem para as escolhas persistidas do prólogo (D3)
      clearOnboardingChoices();
    } catch {
      // C4 (Lote 1): falha de rede/exceção no cadastro é erro honesto e
      // NÃO avança ao passo 4. Antes o catch era vazio ("fallback
      // gracioso") e o passo 4 rodava sempre, simulando sucesso.
      setRegisterError(
        'Não foi possível conectar ao servidor para criar sua conta. Verifique sua conexão e tente novamente.'
      );
      return;
    } finally {
      setIsRegistering(false);
    }

    // Só avança após 2xx real da API (conta criada de fato).
    setCurrentStep(4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [email, password, name, authRegister, selectedTrack, expLevel, timeCommitment, careerGoal, landingTrack]);

  const handleProvisionFinished = useCallback(() => {
    confettiRef.current?.fire();
  }, []);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (currentStep === 1 && isStep1Valid()) {
          handleStep1Next();
        } else if (currentStep === 2) {
          handleStep2Next();
        } else if (currentStep === 3) {
          handleStep3Next();
        }
      } else if (e.key === 'Escape') {
        if (currentStep === 2) setCurrentStep(1);
        if (currentStep === 3) setCurrentStep(2);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, isStep1Valid, handleStep1Next, handleStep2Next, handleStep3Next]);

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#07080B',
        color: '#F4F4F6',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Helvetica Neue", Arial, sans-serif',
        position: 'relative',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Background Ambience & Canvas */}
      <div
        style={{
          position: 'fixed',
          top: '-10vw',
          left: '10vw',
          width: '45vw',
          height: '45vw',
          background: 'radial-gradient(circle, rgba(130, 87, 229, 0.12) 0%, transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: '-15vw',
          right: '5vw',
          width: '50vw',
          height: '50vw',
          background: 'radial-gradient(circle, rgba(4, 211, 97, 0.09) 0%, transparent 70%)',
          filter: 'blur(90px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '40%',
          left: '-10vw',
          width: '35vw',
          height: '35vw',
          background: 'radial-gradient(circle, rgba(0, 229, 255, 0.08) 0%, transparent 70%)',
          filter: 'blur(75px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Confetti Canvas */}
      <ConfettiCanvas ref={confettiRef} />

      {/* Top Navbar */}
      <nav
        style={{
          position: 'relative',
          zIndex: 10,
          height: '70px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          background: 'rgba(7, 8, 11, 0.7)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <Logo size="md" href="/" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            href="/login"
            style={{
              color: '#9499AD',
              fontSize: '14px',
              textDecoration: 'none',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'color 0.25s',
            }}
          >
            Já tem uma conta? <strong style={{ color: '#996DFF' }}>Fazer Login</strong>
          </Link>
        </div>
      </nav>

      {/* Main App Layout */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px 48px',
          position: 'relative',
          zIndex: 5,
          width: '100%',
          maxWidth: '960px',
          margin: '0 auto',
        }}
      >
        {/* Step Indicator Bar */}
        <RegisterStepper currentStep={currentStep} />

        {/* Wizard Main Card */}
        <div
          style={{
            width: '100%',
            background: '#0F1117',
            border: '1px solid #232738',
            borderRadius: '24px',
            padding: '36px 40px',
            boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.03)',
            position: 'relative',
            overflow: 'hidden',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* Card Top Accent Glow Line */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '15%',
              right: '15%',
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #8257E5, #04D361, transparent)',
            }}
          />

          {registerError && (
            <div
              style={{
                marginBottom: '20px',
                padding: '12px 16px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '8px',
                color: '#F87171',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>⚠️</span>
              <span>{registerError}</span>
            </div>
          )}

          {/* STEP 1: CREDENCIAIS & CONTA */}
          {currentStep === 1 && (
            <StepCredentials
              role={role}
              setRole={setRole}
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              passwordConfirm={passwordConfirm}
              setPasswordConfirm={setPasswordConfirm}
              termsAccepted={termsAccepted}
              setTermsAccepted={setTermsAccepted}
              onNext={handleStep1Next}
            />
          )}

          {/* STEP 2: TRILHAS TECH */}
          {currentStep === 2 && (
            <StepTracks
              selectedTrack={selectedTrack}
              onSelectTrack={setSelectedTrack}
              onPrev={() => setCurrentStep(1)}
              onNext={handleStep2Next}
            />
          )}

          {/* STEP 3: METAS E NÍVEL */}
          {currentStep === 3 && (
            <StepGoals
              expLevel={expLevel}
              setExpLevel={setExpLevel}
              timeCommitment={timeCommitment}
              setTimeCommitment={setTimeCommitment}
              careerGoal={careerGoal}
              setCareerGoal={setCareerGoal}
              onPrev={() => setCurrentStep(2)}
              onNext={handleStep3Next}
            />
          )}

          {/* STEP 4: VERIFICAÇÃO DE E-MAIL (C5) E DEPOIS TERMINAL PROVISION & CELEBRATION */}
          {currentStep === 4 && needsEmailVerification && !emailVerified && (
            <StepEmailVerification
              email={email}
              onVerified={() => {
                setEmailVerified(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
          {currentStep === 4 && (!needsEmailVerification || emailVerified) && (
            <StepTerminalProvision
              name={name}
              email={email}
              role={role}
              selectedTrack={selectedTrack}
              expLevel={expLevel}
              timeCommitment={timeCommitment}
              careerGoal={careerGoal}
              onFinished={handleProvisionFinished}
            />
          )}
        </div>

        {/* Keyboard Shortcuts Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '11px',
            color: '#64687A',
            marginTop: '14px',
          }}
        >
          <span>Atalhos:</span>
          <kbd
            style={{
              padding: '2px 6px',
              background: '#1B1E2B',
              border: '1px solid #232738',
              borderRadius: '4px',
              fontFamily: '"Fira Code", monospace',
              fontSize: '10px',
              color: '#9499AD',
            }}
          >
            Enter
          </kbd>{' '}
          <span>Avançar</span>
          <span style={{ margin: '0 4px' }}>•</span>
          <kbd
            style={{
              padding: '2px 6px',
              background: '#1B1E2B',
              border: '1px solid #232738',
              borderRadius: '4px',
              fontFamily: '"Fira Code", monospace',
              fontSize: '10px',
              color: '#9499AD',
            }}
          >
            Esc
          </kbd>{' '}
          <span>Voltar</span>
        </div>
      </main>
    </div>
  );
}
