'use client';

import React, { useState, useEffect, useMemo } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'NEXUS CODE';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
  track?: string;
  experienceLevel?: string;
  dailyGoalMinutes?: number;
  aiTutorMode?: string;
}

interface OnboardingViewProps {
  onComplete: (user: UserSession) => void;
  onSwitchToLogin?: () => void;
}

interface TrackOption {
  id: string;
  title: string;
  tagline: string;
  techs: string[];
  svgIcon: string;
  accentColor: string;
  glowColor: string;
}

const TRACKS: TrackOption[] = [
  {
    id: 'fullstack-ts',
    title: 'Fullstack TypeScript',
    tagline: 'React 19, Next.js, Node.js, Prisma & Clean Architecture',
    techs: ['Next.js 15', 'TypeScript', 'Node.js', 'PostgreSQL'],
    svgIcon: '/tracks/track-fullstack.svg',
    accentColor: '#8257E5',
    glowColor: 'rgba(130, 87, 229, 0.45)',
  },
  {
    id: 'python-ai',
    title: 'Python & Socratic AI',
    tagline: 'Algoritmos, PyTorch, FastApi, LLM Agent Prompting & Data',
    techs: ['Python 3.12', 'PyTorch', 'FastAPI', 'Socratic AI'],
    svgIcon: '/tracks/track-python-ai.svg',
    accentColor: '#04D361',
    glowColor: 'rgba(4, 211, 97, 0.45)',
  },
  {
    id: 'go-systems',
    title: 'Go & High Concurrency',
    tagline: 'Goroutines, CSP Channels, Microservices, gRPC & Docker',
    techs: ['Go 1.23', 'Goroutines', 'gRPC', 'Docker Engine'],
    svgIcon: '/tracks/track-go-systems.svg',
    accentColor: '#00E5FF',
    glowColor: 'rgba(0, 229, 255, 0.45)',
  },
  {
    id: 'rust-wasm',
    title: 'Rust & Memory Safety',
    tagline: 'Sistemas de baixo nível, WebAssembly & Zero-Cost Abstractions',
    techs: ['Rust 2024', 'Wasm', 'Memory Safety', 'Async Rust'],
    svgIcon: '/tracks/track-rust-wasm.svg',
    accentColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.45)',
  },
];

export default function OnboardingView({ onComplete, onSwitchToLogin }: OnboardingViewProps) {
  // Current Step: 1 = Credenciais, 2 = Trilha, 3 = Setup IA & Ritmo, 4 = Terminal Sandbox Provisioning
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1 Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const role = 'student';
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 2 Form States
  const [selectedTrack, setSelectedTrack] = useState<string>('fullstack-ts');

  // Step 3 Form States
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number>(30);
  const [aiTutorMode, setAiTutorMode] = useState<'socratic' | 'guided'>('socratic');

  // Step 4 Terminal Provisioning States
  const [terminalLogs, setTerminalLogs] = useState<Array<{ time: string; tag: string; tagColor: string; text: string; status?: string }>>([]);
  const [provisionProgress, setProvisionProgress] = useState<number>(0);
  const [isProvisioned, setIsProvisioned] = useState<boolean>(false);

  // Password Strength Calculation (4 levels: Fraca, Média, Forte, Imbatível)
  const passwordStrength = useMemo(() => {
    if (!password) return { level: 0, label: 'Não informada', color: '#71717A', percent: 0 };
    
    let score = 0;
    const hasLength8 = password.length >= 8;
    const hasLength12 = password.length >= 12;
    const hasNumbers = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);

    if (hasLength8) score += 1;
    if (hasNumbers) score += 1;
    if (hasSpecial) score += 1;
    if (hasMixedCase) score += 1;
    if (hasLength12 && score >= 3) score = 4;

    if (score <= 1) {
      return { level: 1, label: 'Fraca', color: '#F43F5E', percent: 25, badge: 'Vulnerável' };
    } else if (score === 2) {
      return { level: 2, label: 'Média', color: '#F59E0B', percent: 50, badge: 'Básica' };
    } else if (score === 3) {
      return { level: 3, label: 'Forte', color: '#00E5FF', percent: 75, badge: 'Segura' };
    } else {
      return { level: 4, label: 'Imbatível', color: '#04D361', percent: 100, badge: 'SHA-256 Ready' };
    }
  }, [password]);

  // Handle Step 1 Validation & API Register
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Por favor, informe seu nome completo.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Informe um endereço de e-mail válido.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        // If user already exists or other error, display message
        if (data.message && data.message.includes('já cadastrado')) {
          throw new Error('Este e-mail já possui cadastro. Faça login ou use outro e-mail.');
        }
        throw new Error(data.message || 'Erro ao registrar conta.');
      }

      // Proceed to Step 2: Track Selection
      setCurrentStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao conectar com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // GitHub OAuth Simulation
  const handleGitHubAuth = () => {
    setName('Augusto Developer');
    setEmail('augusto@nexuscode.dev');
    setPassword('NexusDev#2026Secure!');
    setErrorMsg(null);
  };

  // Step 4: Terminal Simulation Loop
  useEffect(() => {
    if (currentStep !== 4) return;

    setTerminalLogs([]);
    setProvisionProgress(10);
    setIsProvisioned(false);

    const now = () => {
      const d = new Date();
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    };

    const steps = [
      { delay: 400, tag: 'SYS', tagColor: '#00E5FF', text: 'Conectando ao cluster Kubernetes da NEXUS CODE...', status: '[OK]', progress: 25 },
      { delay: 1100, tag: 'DOCKER', tagColor: '#8257E5', text: `Provisionando sandbox Piston isolada (${selectedTrack})...`, status: '[OK]', progress: 50 },
      { delay: 1800, tag: 'GITEA', tagColor: '#F59E0B', text: `Inicializando repositório Git privado 'nexus-${email.split('@')[0] || 'dev'}'...`, status: '[OK]', progress: 75 },
      { delay: 2500, tag: 'AI-TUTOR', tagColor: '#04D361', text: `Injetando chave neural socrática (modo: ${aiTutorMode})...`, status: '[OK]', progress: 90 },
      { delay: 3200, tag: 'NEXUS', tagColor: '#04D361', text: 'Ambiente de desenvolvimento 100% pronto para compilação!', status: '[READY]', progress: 100 },
    ];

    const timeouts: NodeJS.Timeout[] = [];

    steps.forEach((s) => {
      const t = setTimeout(() => {
        setTerminalLogs((prev) => [
          ...prev,
          { time: now(), tag: s.tag, tagColor: s.tagColor, text: s.text, status: s.status },
        ]);
        setProvisionProgress(s.progress);
        if (s.progress === 100) {
          setIsProvisioned(true);
        }
      }, s.delay);
      timeouts.push(t);
    });

    return () => timeouts.forEach(clearTimeout);
  }, [currentStep, selectedTrack, email, aiTutorMode]);

  // Finalize Onboarding and Redirect
  const handleFinishOnboarding = () => {
    const userSession: UserSession = {
      id: email,
      name: name || 'Desenvolvedor',
      email: email,
      role: role,
      track: selectedTrack,
      experienceLevel: experienceLevel,
      dailyGoalMinutes: dailyGoalMinutes,
      aiTutorMode: aiTutorMode,
    };

    try {
      localStorage.setItem('user_session', JSON.stringify(userSession));
      localStorage.setItem('nexus_onboarding_completed', 'true');
    } catch {}

    onComplete(userSession);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#08080B',
        color: '#E1E1E6',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        position: 'relative',
        overflowX: 'hidden',
        padding: '36px 16px',
        boxSizing: 'border-box',
      }}
    >
      {/* Dynamic Ambient Neon Glows */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '10%',
          width: '560px',
          height: '560px',
          background: 'radial-gradient(circle, rgba(130, 87, 229, 0.16) 0%, transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-12%',
          right: '10%',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(4, 211, 97, 0.12) 0%, transparent 70%)',
          filter: 'blur(90px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '40%',
          right: '5%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(0, 229, 255, 0.08) 0%, transparent 70%)',
          filter: 'blur(75px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Grid Pattern Background Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Main Glassmorphic Onboarding Container */}
      <div
        style={{
          width: '100%',
          maxWidth: currentStep === 2 ? '780px' : '580px',
          backgroundColor: '#121217',
          border: '1px solid #27272A',
          borderRadius: '24px',
          padding: '40px 36px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.04)',
          position: 'relative',
          zIndex: 1,
          backdropFilter: 'blur(20px)',
          transition: 'max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Top Glow Accent Bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '15%',
            right: '15%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #8257E5 30%, #00E5FF 70%, #04D361 90%, transparent)',
            borderRadius: '2px',
          }}
        />

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              background: 'linear-gradient(135deg, rgba(130, 87, 229, 0.25) 0%, rgba(4, 211, 97, 0.18) 100%)',
              border: '1px solid rgba(130, 87, 229, 0.4)',
              borderRadius: '16px',
              marginBottom: '14px',
              boxShadow: '0 8px 24px -4px rgba(130, 87, 229, 0.35)',
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
                fill="url(#onboarding_lightning)"
                stroke="#04D361"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="onboarding_lightning" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#8257E5" />
                  <stop offset="0.5" stopColor="#00E5FF" />
                  <stop offset="1" stopColor="#04D361" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <h1
            style={{
              fontSize: '28px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              margin: 0,
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            NEXUS <span style={{ color: '#04D361' }}>CODE</span>
          </h1>

          <p style={{ color: '#A1A1AA', fontSize: '14px', marginTop: '6px', marginBottom: 0 }}>
            {currentStep === 1 && 'Crie sua conta de desenvolvedor e comece a praticar'}
            {currentStep === 2 && 'Escolha sua trilha principal de evolução prática'}
            {currentStep === 3 && 'Personalize seu assistente socrático e metas'}
            {currentStep === 4 && 'Alocando seu ambiente de sandbox isolado...'}
          </p>
        </div>

        {/* Horizontal Animated Stepper */}
        <div style={{ marginBottom: '32px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            {/* Connecting Progress Track Line */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '28px',
                right: '28px',
                height: '2px',
                backgroundColor: '#27272A',
                zIndex: 0,
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${((currentStep - 1) / 3) * 100}%`,
                  background: 'linear-gradient(90deg, #8257E5, #00E5FF, #04D361)',
                  transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: '0 0 10px rgba(0, 229, 255, 0.5)',
                }}
              />
            </div>

            {/* Stepper Node Items */}
            {[
              { step: 1, label: 'Conta' },
              { step: 2, label: 'Trilha' },
              { step: 3, label: 'Setup IA' },
              { step: 4, label: 'Sandbox' },
            ].map((item) => {
              const isPassed = currentStep > item.step;
              const isCurrent = currentStep === item.step;

              return (
                <div
                  key={item.step}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: isPassed ? '#04D361' : isCurrent ? '#8257E5' : '#181820',
                      color: isPassed || isCurrent ? '#FFFFFF' : '#71717A',
                      border: isCurrent
                        ? '2px solid #996DFF'
                        : isPassed
                        ? '2px solid #04D361'
                        : '1px solid #27272A',
                      boxShadow: isCurrent
                        ? '0 0 16px rgba(130, 87, 229, 0.65)'
                        : isPassed
                        ? '0 0 12px rgba(4, 211, 97, 0.4)'
                        : 'none',
                      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    {isPassed ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      item.step
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: isCurrent ? 600 : 400,
                      color: isCurrent ? '#FFFFFF' : isPassed ? '#04D361' : '#71717A',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              color: '#FDA4AF',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '13px',
              marginBottom: '20px',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F43F5E" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: CREDENTIALS & AUTH */}
        {currentStep === 1 && (
          <div>
            {/* GitHub 1-Click Fast Auth Button with Subtle Glow */}
            <button
              type="button"
              onClick={handleGitHubAuth}
              style={{
                width: '100%',
                padding: '13px 16px',
                backgroundColor: '#181820',
                border: '1px solid #3F3F46',
                borderRadius: '12px',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
                marginBottom: '20px',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.backgroundColor = '#20202B';
                el.style.borderColor = '#8257E5';
                el.style.boxShadow = '0 8px 24px -4px rgba(130, 87, 229, 0.45)';
                el.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.backgroundColor = '#181820';
                el.style.borderColor = '#3F3F46';
                el.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.4)';
                el.style.transform = 'translateY(0)';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>Continuar com GitHub</span>
              <span style={{ fontSize: '11px', color: '#00E5FF', background: 'rgba(0, 229, 255, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>1-Click</span>
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#27272A' }} />
              <span style={{ fontSize: '11px', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ou cadastre com e-mail</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#27272A' }} />
            </div>

            <form onSubmit={handleStep1Submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#A1A1AA', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Nome Completo
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#71717A' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    placeholder="Ex: Augusto Silva"
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      backgroundColor: '#181820',
                      border: '1px solid #27272A',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#8257E5';
                      e.target.style.boxShadow = '0 0 0 3px rgba(130, 87, 229, 0.25)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#27272A';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#A1A1AA', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  E-mail Corporativo ou Pessoal
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#71717A' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    placeholder="seu.email@exemplo.com"
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      backgroundColor: '#181820',
                      border: '1px solid #27272A',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#8257E5';
                      e.target.style.boxShadow = '0 0 0 3px rgba(130, 87, 229, 0.25)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#27272A';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Password & 4-Level Strength Meter */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Senha de Acesso
                  </label>
                  {password && (
                    <span style={{ fontSize: '11px', fontWeight: 700, color: passwordStrength.color }}>
                      Força: {passwordStrength.label}
                    </span>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#71717A' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    placeholder="Mínimo 8 caracteres"
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 42px 12px 42px',
                      backgroundColor: '#181820',
                      border: '1px solid #27272A',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#8257E5';
                      e.target.style.boxShadow = '0 0 0 3px rgba(130, 87, 229, 0.25)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#27272A';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#71717A',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* 4-Level Color Segmented Password Strength Bar */}
                {password && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', height: '5px' }}>
                      {[1, 2, 3, 4].map((barIndex) => (
                        <div
                          key={barIndex}
                          style={{
                            height: '100%',
                            borderRadius: '3px',
                            backgroundColor:
                              passwordStrength.level >= barIndex ? passwordStrength.color : '#27272A',
                            boxShadow:
                              passwordStrength.level >= barIndex
                                ? `0 0 8px ${passwordStrength.color}66`
                                : 'none',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                          }}
                        />
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px', color: '#71717A' }}>
                      <span>Recomendado: 8+ dígitos, símbolos e maiúsculas</span>
                      {passwordStrength.badge && (
                        <span style={{ color: passwordStrength.color, fontWeight: 600 }}>{passwordStrength.badge}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 1 Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  marginTop: '12px',
                  padding: '14px 0',
                  border: 'none',
                  borderRadius: '12px',
                  background: 'linear-gradient(90deg, #8257E5 0%, #00E5FF 100%)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: '0 8px 24px -4px rgba(130, 87, 229, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {isSubmitting ? 'Validando conta...' : 'Próximo: Escolher Trilha'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </form>

            {/* Switch to Login Link */}
            {onSwitchToLogin && (
              <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#8D8D99' }}>
                Já possui uma conta na plataforma?{' '}
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#8257E5',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Entrar
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: TRACK SELECTION CARDS */}
        {currentStep === 2 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              {TRACKS.map((track) => {
                const isSelected = selectedTrack === track.id;

                return (
                  <div
                    key={track.id}
                    onClick={() => setSelectedTrack(track.id)}
                    style={{
                      padding: '20px',
                      borderRadius: '16px',
                      border: isSelected ? `2px solid ${track.accentColor}` : '1px solid #27272A',
                      backgroundColor: isSelected ? '#181824' : '#14141B',
                      boxShadow: isSelected
                        ? `0 0 24px ${track.glowColor}, inset 0 0 12px ${track.glowColor}22`
                        : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#3F3F46';
                        e.currentTarget.style.backgroundColor = '#181820';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#27272A';
                        e.currentTarget.style.backgroundColor = '#14141B';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {/* Animated Checkmark in Top-Right */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '14px',
                        right: '14px',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        backgroundColor: isSelected ? track.accentColor : 'transparent',
                        border: isSelected ? 'none' : '1.5px solid #3F3F46',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        boxShadow: isSelected ? `0 0 10px ${track.glowColor}` : 'none',
                      }}
                    >
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>

                    <div>
                      {/* Track Icon SVG */}
                      <div style={{ width: '48px', height: '48px', marginBottom: '14px' }}>
                        <img
                          src={track.svgIcon}
                          alt={track.title}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      </div>

                      <h3
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: isSelected ? '#FFFFFF' : '#E1E1E6',
                          margin: '0 0 6px 0',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {track.title}
                      </h3>

                      <p style={{ fontSize: '12px', color: '#8D8D99', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                        {track.tagline}
                      </p>
                    </div>

                    {/* Tech Badges List */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {track.techs.map((tech) => (
                        <span
                          key={tech}
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.08)' : '#181820',
                            color: isSelected ? '#FFFFFF' : '#71717A',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                          }}
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Navigation Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                style={{
                  padding: '13px 20px',
                  backgroundColor: '#181820',
                  border: '1px solid #27272A',
                  borderRadius: '12px',
                  color: '#A1A1AA',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                style={{
                  flex: 1,
                  padding: '13px 0',
                  border: 'none',
                  borderRadius: '12px',
                  background: 'linear-gradient(90deg, #8257E5 0%, #00E5FF 100%)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 24px -4px rgba(130, 87, 229, 0.5)',
                }}
              >
                <span>Continuar com {TRACKS.find((t) => t.id === selectedTrack)?.title}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PREFERENCES & AI SETUP */}
        {currentStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Experience Level */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#A1A1AA', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Seu Nível Atual de Experiência
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { id: 'beginner', label: 'Iniciante', desc: 'Fundamentos & Sintaxe', icon: '🌱' },
                  { id: 'intermediate', label: 'Intermediário', desc: 'Estruturas & Projetos', icon: '⚡' },
                  { id: 'advanced', label: 'Avançado', desc: 'Sistemas & Otimização', icon: '💎' },
                ].map((lvl) => {
                  const isSel = experienceLevel === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setExperienceLevel(lvl.id as any)}
                      style={{
                        padding: '14px 10px',
                        borderRadius: '12px',
                        border: isSel ? '1.5px solid #8257E5' : '1px solid #27272A',
                        backgroundColor: isSel ? 'rgba(130, 87, 229, 0.15)' : '#181820',
                        color: isSel ? '#FFFFFF' : '#8D8D99',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontSize: '20px', marginBottom: '4px' }}>{lvl.icon}</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: isSel ? '#FFFFFF' : '#E1E1E6' }}>{lvl.label}</div>
                      <div style={{ fontSize: '10px', color: '#71717A', marginTop: '2px' }}>{lvl.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Daily Study Goal */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#A1A1AA', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Meta Diária de Prática (Streak Diário 🔥)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { min: 15, label: '15 min/dia', badge: 'Casual' },
                  { min: 30, label: '30 min/dia', badge: 'Recomendado' },
                  { min: 60, label: '60 min/dia', badge: 'Intensivo' },
                ].map((goal) => {
                  const isSel = dailyGoalMinutes === goal.min;
                  return (
                    <button
                      key={goal.min}
                      type="button"
                      onClick={() => setDailyGoalMinutes(goal.min)}
                      style={{
                        padding: '12px 8px',
                        borderRadius: '12px',
                        border: isSel ? '1.5px solid #00E5FF' : '1px solid #27272A',
                        backgroundColor: isSel ? 'rgba(0, 229, 255, 0.12)' : '#181820',
                        color: isSel ? '#FFFFFF' : '#8D8D99',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 700, color: isSel ? '#00E5FF' : '#FFFFFF' }}>{goal.label}</div>
                      <div style={{ fontSize: '10px', color: isSel ? '#00E5FF' : '#71717A', marginTop: '2px' }}>{goal.badge}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Socratic AI Tutor Mode */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#A1A1AA', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Modo de Tutoria IA (Método Socrático)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAiTutorMode('socratic')}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    border: aiTutorMode === 'socratic' ? '1.5px solid #04D361' : '1px solid #27272A',
                    backgroundColor: aiTutorMode === 'socratic' ? 'rgba(4, 211, 97, 0.12)' : '#181820',
                    color: aiTutorMode === 'socratic' ? '#FFFFFF' : '#8D8D99',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px' }}>🧠</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: aiTutorMode === 'socratic' ? '#04D361' : '#FFFFFF' }}>
                      Socrático Estrito
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: '#8D8D99', margin: 0, lineHeight: 1.3 }}>
                    Nunca entrega o código pronto. Faz perguntas que guiam seu raciocínio.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setAiTutorMode('guided')}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    border: aiTutorMode === 'guided' ? '1.5px solid #8257E5' : '1px solid #27272A',
                    backgroundColor: aiTutorMode === 'guided' ? 'rgba(130, 87, 229, 0.12)' : '#181820',
                    color: aiTutorMode === 'guided' ? '#FFFFFF' : '#8D8D99',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px' }}>💡</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: aiTutorMode === 'guided' ? '#8257E5' : '#FFFFFF' }}>
                      Assistido Híbrido
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: '#8D8D99', margin: 0, lineHeight: 1.3 }}>
                    Oferece dicas conceituais e snippets sintáticos parciais.
                  </p>
                </button>
              </div>
            </div>

            {/* Navigation Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                style={{
                  padding: '13px 20px',
                  backgroundColor: '#181820',
                  border: '1px solid #27272A',
                  borderRadius: '12px',
                  color: '#A1A1AA',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                style={{
                  flex: 1,
                  padding: '13px 0',
                  border: 'none',
                  borderRadius: '12px',
                  background: 'linear-gradient(90deg, #8257E5 0%, #04D361 100%)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 24px -4px rgba(4, 211, 97, 0.45)',
                }}
              >
                <span>Provisionar Sandbox & Iniciar</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: REAL-TIME PROVISIONING TERMINAL */}
        {currentStep === 4 && (
          <div>
            {/* Terminal Window Container */}
            <div
              style={{
                backgroundColor: '#09090D',
                border: '1px solid #27272A',
                borderRadius: '14px',
                overflow: 'hidden',
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.7), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: '20px',
              }}
            >
              {/* Terminal Window Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: '#121217',
                  borderBottom: '1px solid #27272A',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                </div>
                <div style={{ fontSize: '11px', color: '#71717A', letterSpacing: '0.05em' }}>
                  nexus-sandbox-provisioner // v2.4.0-cloud
                </div>
                <div style={{ fontSize: '10px', color: '#04D361', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#04D361' }} />
                  LIVE
                </div>
              </div>

              {/* Terminal Log Output Stream */}
              <div
                style={{
                  padding: '16px 18px',
                  minHeight: '190px',
                  fontSize: '12px',
                  lineHeight: '1.6',
                  color: '#E1E1E6',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {terminalLogs.map((log, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      animation: 'fadeIn 0.2s ease-in-out',
                    }}
                  >
                    <span style={{ color: '#64748B', fontSize: '11px' }}>{log.time}</span>
                    <span
                      style={{
                        color: log.tagColor,
                        fontWeight: 700,
                        fontSize: '11px',
                        padding: '1px 6px',
                        backgroundColor: `${log.tagColor}15`,
                        borderRadius: '4px',
                      }}
                    >
                      [{log.tag}]
                    </span>
                    <span style={{ flex: 1, color: '#D4D4D8' }}>{log.text}</span>
                    {log.status && (
                      <span style={{ color: '#04D361', fontWeight: 700, fontSize: '11px' }}>{log.status}</span>
                    )}
                  </div>
                ))}

                {!isProvisioned && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8257E5' }}>
                    <span style={{ animation: 'blink 1s infinite' }}>█</span>
                    <span style={{ fontSize: '11px', color: '#71717A' }}>Provisionando recursos isolados...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar & Telemetry Status */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                <span style={{ color: '#A1A1AA', fontWeight: 500 }}>
                  {isProvisioned ? 'Provisionamento Concluído com Sucesso!' : 'Alocando ambiente de execução...'}
                </span>
                <span style={{ color: '#04D361', fontWeight: 700 }}>{provisionProgress}%</span>
              </div>
              <div style={{ height: '6px', backgroundColor: '#181820', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${provisionProgress}%`,
                    background: 'linear-gradient(90deg, #8257E5, #00E5FF, #04D361)',
                    transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 0 12px rgba(4, 211, 97, 0.6)',
                  }}
                />
              </div>
            </div>

            {/* Final CTA to Enter Platform */}
            <button
              type="button"
              disabled={!isProvisioned}
              onClick={handleFinishOnboarding}
              style={{
                width: '100%',
                padding: '15px 0',
                border: 'none',
                borderRadius: '12px',
                background: isProvisioned
                  ? 'linear-gradient(90deg, #04D361 0%, #00E5FF 100%)'
                  : '#181820',
                color: isProvisioned ? '#08080B' : '#71717A',
                fontWeight: 800,
                fontSize: '15px',
                letterSpacing: '0.02em',
                cursor: isProvisioned ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: isProvisioned ? '0 8px 28px -4px rgba(4, 211, 97, 0.6)' : 'none',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <span>{isProvisioned ? 'Entrar no Workspace & Começar a Codar ⚡' : 'Aguardando Provisionamento...'}</span>
            </button>
          </div>
        )}

        {/* Footer Guarantee Badges */}
        <div
          style={{
            marginTop: '28px',
            paddingTop: '18px',
            borderTop: '1px solid #27272A',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '11px', color: '#71717A' }}>
            <span style={{ color: '#04D361' }}>✓</span> Docker Sandbox
          </div>
          <div style={{ fontSize: '11px', color: '#71717A' }}>
            <span style={{ color: '#8257E5' }}>✓</span> Tutor Socrático
          </div>
          <div style={{ fontSize: '11px', color: '#71717A' }}>
            <span style={{ color: '#00E5FF' }}>✓</span> Gitea Privado
          </div>
          <div style={{ fontSize: '11px', color: '#71717A' }}>
            <span style={{ color: '#F59E0B' }}>✓</span> Ranking & XP
          </div>
        </div>
      </div>
    </div>
  );
}
