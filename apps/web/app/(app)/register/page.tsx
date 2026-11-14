'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Logo from '../../components/Logo';
import { ConfettiCanvas, ConfettiCanvasHandle } from './components/ConfettiCanvas';
import { RegisterStepper } from './components/RegisterStepper';
import {
  EmailAvailabilityStatus,
  StepCredentials,
  RoleType,
} from './components/StepCredentials';
import { StepExperienceChallenge } from './components/StepExperienceChallenge';
import { StepGoals } from './components/StepGoals';
import { StepTechSelection } from './components/StepTechSelection';
import { StepTrackSuggestion } from './components/StepTrackSuggestion';
import { StepTerminalProvision } from './components/StepTerminalProvision';
import {
  CareerGoal,
  isTechRecommendedForGoals,
  LevelEvaluationResult,
  PRIMARY_TECH_MAP,
  PRIMARY_TECHNOLOGIES,
  PrimaryTechId,
  PriorLanguageId,
  RegistrationChallenge,
  TimeCommitment,
} from './data/registrationOptions';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/apiClient';
import {
  captureUtmFromUrl,
  readAttributionProps,
  readPlanIntentProps,
  readStoredUtm,
  readStoredDiagnosticToken,
  clearStoredDiagnosticToken,
} from '../../lib/attribution';
import { track, trackPageview } from '../../lib/analytics';
import { clearOnboardingChoices } from '../../lib/onboardingChoices';
import { resolveRegisterTrackParam } from '../../lib/deepLinks';

const TUTOR_STATUS_BY_STEP: Record<number, { text: string; colorClass: string }> = {
  1: { text: 'Pronta para calibrar', colorClass: 'text-[#00E5FF]' },
  2: { text: 'Avaliando raciocínio lógico', colorClass: 'text-[#00E5FF]' },
  3: { text: 'Cruzando objetivos com vagas', colorClass: 'text-[#00E5FF]' },
  4: { text: 'Cruzando stack com oportunidades', colorClass: 'text-[#00E5FF]' },
  5: { text: 'Diagnóstico pronto', colorClass: 'text-[#00E5FF]' },
  6: { text: 'Container provisionado', colorClass: 'text-[#00E676]' },
};

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [maxReachedStep, setMaxReachedStep] = useState<number>(1);
  const [landingTrack, setLandingTrack] = useState<string | null>(null);
  const [landingTrackRaw, setLandingTrackRaw] = useState<string | null>(null);

  useEffect(() => {
    setMaxReachedStep((prev) => Math.max(prev, currentStep));
  }, [currentStep]);

  useEffect(() => {
    captureUtmFromUrl();
    trackPageview();
    const rawTrack = new URLSearchParams(window.location.search).get('track');
    const resolvedTrack = resolveRegisterTrackParam(rawTrack);
    if (resolvedTrack) {
      setLandingTrack(resolvedTrack);
      setLandingTrackRaw(rawTrack);
    }
  }, []);

  // Step 1 State (Credenciais)
  const [role, setRole] = useState<RoleType>('student');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [emailAvailability, setEmailAvailability] =
    useState<EmailAvailabilityStatus>('idle');
  const [password, setPassword] = useState<string>('');
  const [passwordConfirm, setPasswordConfirm] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);

  // Verificação imediata de disponibilidade do e-mail na Etapa 1
  useEffect(() => {
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailAvailability('idle');
      return;
    }

    const controller = new AbortController();
    setEmailAvailability('checking');

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/check-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: trimmed }),
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (!res.ok) {
          setEmailAvailability('error');
          return;
        }
        const data = (await res.json().catch(() => null)) as { available?: boolean } | null;
        if (controller.signal.aborted) return;
        if (typeof data?.available === 'boolean') {
          setEmailAvailability(data.available ? 'available' : 'taken');
        } else {
          setEmailAvailability('error');
        }
      } catch {
        if (!controller.signal.aborted) {
          setEmailAvailability('error');
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [email]);

  // Step 2 State (Experiência & Desafio avaliado pela IA)
  const [hasProgrammedBefore, setHasProgrammedBefore] = useState<boolean | null>(null);
  const [priorLanguage, setPriorLanguage] = useState<PriorLanguageId | ''>('');
  const [challenge, setChallenge] = useState<RegistrationChallenge | null>(null);
  const [challengeExplanation, setChallengeExplanation] = useState<string>('');
  const [evaluation, setEvaluation] = useState<LevelEvaluationResult | null>(null);

  // Step 3 State (Objetivos & Dedicação)
  const [timeCommitment, setTimeCommitment] = useState<TimeCommitment>('10h');
  const [careerGoals, setCareerGoals] = useState<CareerGoal[]>(['fullstack']);
  const [hasCustomizedGoals, setHasCustomizedGoals] = useState<boolean>(false);

  // Step 4 State (Linguagem & Tecnologia Principal)
  const [primaryTechnology, setPrimaryTechnology] = useState<PrimaryTechId>('javascript');
  const [hasCustomizedTech, setHasCustomizedTech] = useState<boolean>(false);

  const handleCareerGoalsChange = useCallback(
    (nextGoals: CareerGoal[]) => {
      if (!hasCustomizedGoals) {
        setHasCustomizedGoals(true);
        // Se o aluno saiu do placeholder inicial ['fullstack'] clicando em outro objetivo,
        // substitui o placeholder silencioso em vez de mantê-lo preso como Principal.
        if (
          careerGoals.length === 1 &&
          careerGoals[0] === 'fullstack' &&
          nextGoals.length > 1 &&
          nextGoals[0] === 'fullstack'
        ) {
          setCareerGoals(nextGoals.slice(1));
          return;
        }
      }
      setCareerGoals(nextGoals);
    },
    [careerGoals, hasCustomizedGoals],
  );

  const handlePrimaryTechChange = useCallback((tech: PrimaryTechId) => {
    setHasCustomizedTech(true);
    setPrimaryTechnology(tech);
  }, []);

  const confettiRef = useRef<ConfettiCanvasHandle | null>(null);

  const isStep1Valid = useCallback(() => {
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const isNameValid = name.trim().length >= 3;
    const isPasswordValid = password.length >= 8;
    const isPasswordMatch = password.length > 0 && password === passwordConfirm;
    const isEmailAllowed =
      emailAvailability !== 'taken' && emailAvailability !== 'checking';
    return (
      isNameValid &&
      isEmailValid &&
      isEmailAllowed &&
      isPasswordValid &&
      isPasswordMatch &&
      termsAccepted
    );
  }, [email, emailAvailability, name, password, passwordConfirm, termsAccepted]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleStep1Next = useCallback(() => {
    if (isStep1Valid()) {
      setCurrentStep(2);
      scrollToTop();
    }
  }, [isStep1Valid, scrollToTop]);

  const handleStep2Next = useCallback(() => {
    if (evaluation) {
      setCurrentStep(3);
      scrollToTop();
    }
  }, [evaluation, scrollToTop]);

  const handleStep3Next = useCallback(() => {
    if (!hasCustomizedTech) {
      const currentOption = PRIMARY_TECH_MAP[primaryTechnology];
      if (!currentOption || !isTechRecommendedForGoals(currentOption, careerGoals)) {
        const recommended = PRIMARY_TECHNOLOGIES.find(
          (tech) => tech.id !== 'undecided' && isTechRecommendedForGoals(tech, careerGoals),
        );
        if (recommended) {
          setPrimaryTechnology(recommended.id);
        }
      }
    }
    setCurrentStep(4);
    scrollToTop();
  }, [careerGoals, hasCustomizedTech, primaryTechnology, scrollToTop]);

  const handleStep4Next = useCallback(() => {
    setCurrentStep(5);
    scrollToTop();
  }, [scrollToTop]);

  const { register: authRegister } = useAuth();
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  const handleSelectStep = useCallback(
    (step: number) => {
      if (isRegistering || currentStep === 6) return;
      if (step >= 1 && step <= 5 && step <= maxReachedStep) {
        setCurrentStep(step);
        scrollToTop();
      }
    },
    [currentStep, isRegistering, maxReachedStep, scrollToTop],
  );

  const handleStep5Submit = useCallback(async () => {
    setIsRegistering(true);
    setRegisterError(null);

    const assessedLevel = evaluation?.level ?? 'Iniciante';
    const experienceLevel = evaluation?.experienceLevel ?? 'beginner';
    const primaryCareerGoal: CareerGoal = careerGoals[0] ?? 'fullstack';

    const signupProps = {
      ...readPlanIntentProps(),
      ...readAttributionProps(),
      source: 'register',
      expLevel: experienceLevel,
      assessedLevel,
      timeCommitment,
      careerGoal: primaryCareerGoal,
      careerGoals: careerGoals.join(','),
      careerGoalsCount: careerGoals.length,
      primaryTechnology,
      hasProgrammedBefore: Boolean(hasProgrammedBefore),
      ...(hasProgrammedBefore && priorLanguage ? { priorLanguage } : {}),
      ...(landingTrackRaw ? { sourceTrack: landingTrackRaw } : {}),
    };
    track('signup_submit', 'register_submit', signupProps);

    try {
      const result = await authRegister({
        email: email.trim(),
        password,
        name: name.trim(),
        role: 'student',
        ...readStoredUtm(),
        ...readStoredDiagnosticToken(),
        ...(landingTrack ? { sourceTrack: landingTrack } : {}),
        experienceLevel,
        weeklyTimeCommitment: timeCommitment,
        careerGoal: primaryCareerGoal,
        careerGoals,
        hasProgrammedBefore: Boolean(hasProgrammedBefore),
        ...(hasProgrammedBefore && priorLanguage ? { priorLanguage } : {}),
        ...(challenge ? { challengeId: challenge.id } : {}),
        ...(challengeExplanation.trim()
          ? { challengeExplanation: challengeExplanation.trim() }
          : {}),
        detectedLevel: experienceLevel,
        primaryTechnology,
      });

      if (!result.success) {
        setRegisterError(result.error || 'Falha ao registrar conta.');
        return;
      }

      track('signup_success', 'register_submit', signupProps);

      clearStoredDiagnosticToken();
      clearOnboardingChoices();
    } catch {
      setRegisterError(
        'Não foi possível conectar ao servidor para criar sua conta. Verifique sua conexão e tente novamente.',
      );
      return;
    } finally {
      setIsRegistering(false);
    }

    setCurrentStep(6);
    scrollToTop();
  }, [
    authRegister,
    careerGoals,
    challenge,
    challengeExplanation,
    email,
    evaluation,
    hasProgrammedBefore,
    landingTrack,
    landingTrackRaw,
    name,
    password,
    primaryTechnology,
    priorLanguage,
    scrollToTop,
    timeCommitment,
  ]);

  const handleProvisionFinished = useCallback(() => {
    confettiRef.current?.fire();
  }, []);

  // Keyboard Shortcuts Handler (respeita textarea, botões e links)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName;

      if (e.key === 'Enter') {
        if (
          e.metaKey ||
          e.ctrlKey ||
          e.altKey ||
          e.shiftKey ||
          tagName === 'TEXTAREA' ||
          tagName === 'BUTTON' ||
          tagName === 'A' ||
          tagName === 'SELECT' ||
          target?.isContentEditable
        ) {
          return;
        }

        if (currentStep === 1 && isStep1Valid()) {
          handleStep1Next();
        } else if (currentStep === 2 && evaluation) {
          handleStep2Next();
        } else if (currentStep === 3) {
          handleStep3Next();
        } else if (currentStep === 4) {
          handleStep4Next();
        } else if (currentStep === 5 && !isRegistering) {
          void handleStep5Submit();
        }
      } else if (e.key === 'Escape') {
        if (currentStep === 2) setCurrentStep(1);
        else if (currentStep === 3) setCurrentStep(2);
        else if (currentStep === 4) setCurrentStep(3);
        else if (currentStep === 5 && !isRegistering) setCurrentStep(4);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentStep,
    evaluation,
    handleStep1Next,
    handleStep2Next,
    handleStep3Next,
    handleStep4Next,
    handleStep5Submit,
    isRegistering,
    isStep1Valid,
  ]);

  const tutorStatus = TUTOR_STATUS_BY_STEP[currentStep] ?? TUTOR_STATUS_BY_STEP[1];

  return (
    <div className="bg-[#07080C] text-[#F1F5F9] font-sans antialiased min-h-screen flex flex-col justify-between selection:bg-[#8257E5] selection:text-white relative">
      {/* Ambient Glow */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-b from-[#8257E5]/15 via-[#00E5FF]/8 to-transparent blur-[140px] pointer-events-none -z-10"
      />

      {/* Confetti Canvas */}
      <ConfettiCanvas ref={confettiRef} />

      {/* Header Global */}
      <header className="h-16 border-b border-[#1C2133] bg-[#07080C]/90 backdrop-blur-xl px-6 lg:px-12 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Logo size="sm" href="/" />

          <div className="h-4 w-px bg-[#1C2133] mx-1 hidden sm:block" aria-hidden="true" />

          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#111420] border border-[#1C2133] text-xs">
            <img
              src="/images/onboarding/lumi-tutor.png"
              alt="Tutora de IA"
              className="w-4 h-4 rounded object-cover border border-[#8257E5]/50"
            />
            <span className="font-mono text-[#94A3B8]">
              Tutora de IA:{' '}
              <strong className={`font-semibold ${tutorStatus.colorClass}`}>
                {tutorStatus.text}
              </strong>
            </span>
          </div>
        </div>

        {currentStep === 6 ? (
          <div className="text-xs font-mono text-[#94A3B8]">Conta configurada com sucesso</div>
        ) : (
          <div className="text-xs font-mono text-[#94A3B8]">
            <span className="hidden sm:inline">Já tem uma conta? </span>
            <Link href="/login" className="text-[#00E5FF] hover:underline font-semibold sm:ml-1">
              Fazer Login
            </Link>
          </div>
        )}
      </header>

      {/* Stepper de 6 Etapas */}
      <section className="max-w-5xl mx-auto w-full px-4 pt-8 pb-4">
        <RegisterStepper
          currentStep={currentStep}
          maxStep={maxReachedStep}
          onSelectStep={handleSelectStep}
        />
      </section>

      {/* Conteúdo Principal Card */}
      <main className="max-w-5xl mx-auto w-full px-4 py-4 flex-1">
        <div className="rounded-3xl bg-gradient-to-b from-[#111420] to-[#0C0E15] border border-[#1C2133] shadow-[0_20px_70px_rgba(0,0,0,0.8),0_0_50px_rgba(130,87,229,0.08)] p-6 sm:p-10 relative overflow-hidden">
          <div
            aria-hidden="true"
            className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent ${
              currentStep === 6
                ? 'via-[#00E676] to-[#00E676]'
                : 'via-[#8257E5] to-[#00E5FF]'
            }`}
          />

          {registerError && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#EF4444]/10 border border-[#EF4444]/35 text-[#FCA5A5] text-xs sm:text-sm"
            >
              <div className="flex items-start gap-2.5">
                <span aria-hidden="true">⚠️</span>
                <div>
                  <p className="m-0 font-semibold text-[#FCA5A5]">{registerError}</p>
                  <p className="m-0 mt-1 text-xs text-[#FCA5A5]/80">
                    Dica: se este e-mail já possui conta ou a senha tem menos de 8 caracteres, volte à Etapa 1 para ajustar ou entre na sua conta.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setRegisterError(null);
                    setCurrentStep(1);
                    scrollToTop();
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer bg-[#181C2C] border border-[#EF4444]/35 text-white hover:bg-[#1E2338] transition-colors"
                >
                  Editar dados (Etapa 1)
                </button>
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold no-underline bg-[#EF4444]/20 border border-[#EF4444]/40 text-white hover:bg-[#EF4444]/30 transition-colors"
                >
                  Ir para Login
                </Link>
              </div>
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
              emailAvailability={emailAvailability}
              password={password}
              setPassword={setPassword}
              passwordConfirm={passwordConfirm}
              setPasswordConfirm={setPasswordConfirm}
              termsAccepted={termsAccepted}
              setTermsAccepted={setTermsAccepted}
              onNext={handleStep1Next}
            />
          )}

          {/* STEP 2: EXPERIÊNCIA & DESAFIO (AVALIADO PELA IA) */}
          {currentStep === 2 && (
            <StepExperienceChallenge
              hasProgrammedBefore={hasProgrammedBefore}
              setHasProgrammedBefore={setHasProgrammedBefore}
              priorLanguage={priorLanguage}
              setPriorLanguage={setPriorLanguage}
              challenge={challenge}
              setChallenge={setChallenge}
              explanation={challengeExplanation}
              setExplanation={setChallengeExplanation}
              evaluation={evaluation}
              setEvaluation={setEvaluation}
              onPrev={() => setCurrentStep(1)}
              onNext={handleStep2Next}
            />
          )}

          {/* STEP 3: OBJETIVOS & DEDICAÇÃO (SEM ESCOLHA MANUAL DE NÍVEL) */}
          {currentStep === 3 && (
            <StepGoals
              timeCommitment={timeCommitment}
              setTimeCommitment={setTimeCommitment}
              careerGoals={careerGoals}
              setCareerGoals={handleCareerGoalsChange}
              onPrev={() => setCurrentStep(2)}
              onNext={handleStep3Next}
            />
          )}

          {/* STEP 4: LINGUAGEM & TECNOLOGIA PRINCIPAL */}
          {currentStep === 4 && (
            <StepTechSelection
              careerGoals={careerGoals}
              primaryTechnology={primaryTechnology}
              setPrimaryTechnology={handlePrimaryTechChange}
              onPrev={() => setCurrentStep(3)}
              onNext={handleStep4Next}
            />
          )}

          {/* STEP 5: TRILHA PERSONALIZADA */}
          {currentStep === 5 && (
            <StepTrackSuggestion
              evaluation={evaluation}
              careerGoals={careerGoals}
              timeCommitment={timeCommitment}
              primaryTechnology={primaryTechnology}
              onPrev={() => setCurrentStep(4)}
              onNext={handleStep5Submit}
              isSubmitting={isRegistering}
            />
          )}

          {/* STEP 6: WORKSPACE INTERATIVO E LAUNCHPAD */}
          {currentStep === 6 && (
            <StepTerminalProvision
              name={name}
              email={email}
              role={role}
              assessedLevel={evaluation?.level ?? 'Iniciante'}
              timeCommitment={timeCommitment}
              careerGoals={careerGoals}
              primaryTechnology={primaryTechnology}
              onFinished={handleProvisionFinished}
            />
          )}
        </div>

        {/* Keyboard Shortcuts Indicator */}
        {currentStep < 6 && (
          <div className="hidden sm:flex items-center justify-center gap-1.5 text-[11px] font-mono text-[#64748B] mt-4">
            <span>Atalhos:</span>
            <kbd className="px-1.5 py-0.5 bg-[#111420] border border-[#1C2133] rounded font-mono text-[10px] text-[#94A3B8]">
              Enter
            </kbd>
            <span>Avançar</span>
            <span className="mx-1">•</span>
            <kbd className="px-1.5 py-0.5 bg-[#111420] border border-[#1C2133] rounded font-mono text-[10px] text-[#94A3B8]">
              Esc
            </kbd>
            <span>Voltar</span>
          </div>
        )}
      </main>

      {/* Footer Global */}
      <footer className="border-t border-[#1C2133] py-4 bg-[#07080C] px-6 text-center text-xs font-mono text-[#64748B]">
        Nexus Code © 2026. Ensino com código real e IA socrática.
      </footer>
    </div>
  );
}
