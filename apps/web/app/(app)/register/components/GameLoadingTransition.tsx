'use client';

import React, { useEffect, useRef } from 'react';
import Logo from '../../../components/Logo';

interface GameLoadingTransitionProps {
  isOpen: boolean;
  studentName: string;
  leagueLabel: string;
  totalXp: number;
  statusProgress?: number;
  onNavigateDashboard: () => void;
}

interface StarParticle {
  x: number;
  y: number;
  radius: number;
  speedX: number;
  speedY: number;
  color: string;
  alpha: number;
}

export const GameLoadingTransition: React.FC<GameLoadingTransitionProps> = ({
  isOpen,
  studentName,
  leagueLabel,
  totalXp,
  onNavigateDashboard,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [progress, setProgress] = React.useState<number>(88);
  const navigatedRef = useRef<boolean>(false);

  // Reset progress whenever overlay opens
  useEffect(() => {
    if (!isOpen) return;
    setProgress(88);
    navigatedRef.current = false;
  }, [isOpen]);

  // Particle Canvas Effect (~35 particles in #8257E5 / #00E5FF)
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const particles: StarParticle[] = Array.from({ length: 35 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.5 + 0.5,
      speedX: (Math.random() - 0.5) * 0.35,
      speedY: (Math.random() - 0.5) * 0.35,
      color: Math.random() > 0.5 ? '#8257E5' : '#00E5FF',
      alpha: Math.random() * 0.4 + 0.2,
    }));

    let rafId = 0;
    const animateParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      rafId = window.requestAnimationFrame(animateParticles);
    };

    rafId = window.requestAnimationFrame(animateParticles);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isOpen]);

  // Progress timer 88% -> 100%, then navigates ONLY after user triggered this overlay
  useEffect(() => {
    if (!isOpen) return;

    const interval = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return Math.min(100, prev + 2);
      });
    }, 180);

    return () => window.clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || progress < 100 || navigatedRef.current) return;
    const timeout = window.setTimeout(() => {
      if (!navigatedRef.current) {
        navigatedRef.current = true;
        onNavigateDashboard();
      }
    }, 950);
    return () => window.clearTimeout(timeout);
  }, [isOpen, onNavigateDashboard, progress]);

  if (!isOpen) return null;

  const isComplete = progress >= 100;
  const isMid = progress >= 94 && progress < 100;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Preparando seu Dashboard"
      className="fixed inset-0 z-50 bg-[#040508] text-[#F1F5F9] flex flex-col justify-between overflow-hidden select-none"
    >
      <style>{`
        @keyframes nexusAvatarFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        .nexus-avatar-float {
          animation: nexusAvatarFloat 3.5s ease-in-out infinite;
        }
        @keyframes nexusBeamSweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .nexus-beam-sweep {
          animation: nexusBeamSweep 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .nexus-space-grid {
          background-image:
            radial-gradient(rgba(130, 87, 229, 0.12) 1px, transparent 1px),
            radial-gradient(rgba(0, 229, 255, 0.08) 1px, transparent 1px);
          background-size: 32px 32px;
          background-position: 0 0, 16px 16px;
        }
      `}</style>

      {/* Grid cósmico + Canvas de Partículas */}
      <div className="fixed inset-0 nexus-space-grid opacity-30 pointer-events-none z-0" />
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0 opacity-60"
        aria-hidden="true"
      />

      {/* Header Minimalista */}
      <header className="relative z-30 px-6 sm:px-8 py-5 flex items-center justify-between gap-4 border-b border-[#181C2B]/80 bg-[#040508]/85 backdrop-blur-xl">
        <Logo size="sm" href="" />

        <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono text-[#8A8F9E] truncate">
          <span className="flex items-center gap-1.5 text-white truncate">
            <span className="w-2 h-2 rounded-full bg-[#00E676] shadow-[0_0_8px_#00E676] shrink-0" />
            <span className="truncate">{studentName}</span>
          </span>
          <span className="text-[#202538]">•</span>
          <span className="text-[#A379FF] font-semibold shrink-0">{leagueLabel}</span>
          <span className="text-[#202538]">•</span>
          <span className="text-[#00E5FF] font-bold shrink-0">+{totalXp} XP</span>
        </div>
      </header>

      {/* Conteúdo Central Focado */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 max-w-lg mx-auto w-full py-10 relative z-10">
        <div className="w-full space-y-7 text-center">
          {/* Avatar Flutuante da Tutora de IA */}
          <div className="inline-flex flex-col items-center relative">
            <div className="relative p-1 rounded-2xl bg-gradient-to-br from-[#8257E5] via-[#5629BE] to-[#00E5FF] shadow-[0_0_25px_rgba(130,87,229,0.25)] nexus-avatar-float">
              <img
                src="/images/onboarding/lumi-transition.png"
                alt="Tutora de IA"
                className="w-20 h-20 rounded-xl object-cover border border-black/40"
              />

              <div className="absolute -bottom-2 inset-x-0 flex justify-center">
                <span className="px-3 py-0.5 rounded-full bg-[#040508] border border-[#00E5FF]/60 text-[10px] font-mono text-[#00E5FF] font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,229,255,0.35)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-ping" />
                  Tutora de IA
                </span>
              </div>
            </div>
          </div>

          {/* Título & Subtítulo */}
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-brand font-black text-white tracking-tight">
              Preparando seu Dashboard
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] font-mono leading-relaxed">
              Sincronizando container, desafios calibrados e ranking da sua liga.
            </p>
          </div>

          {/* Barra de Progresso com Beam Sweep */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#A379FF] flex items-center gap-2">
                {isComplete ? (
                  <>
                    <span className="text-[#00E676]">✓</span>
                    <span>Tudo pronto!</span>
                  </>
                ) : isMid ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
                    <span>Sincronizando ranking da liga...</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
                    <span>Inicializando sandbox de desenvolvimento...</span>
                  </>
                )}
              </span>
              <span className="text-[#00E5FF] font-bold text-sm">{progress}%</span>
            </div>

            <div className="h-2 w-full rounded-full bg-[#0E111B] border border-[#181C2B] overflow-hidden p-[1px] relative">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#8257E5] via-[#A379FF] to-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.6)] transition-all duration-300 relative overflow-hidden flex items-center justify-end pr-1"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent nexus-beam-sweep" />
                <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#FFFFFF] relative z-20" />
              </div>
            </div>

            {/* 3 Badges de Status */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-mono">
              <div className="p-2 rounded-xl bg-[#0A0C13] border border-[#181C2B] flex items-center justify-center gap-1.5 text-[#00E676] shadow-sm">
                <span>✓</span>
                <span className="text-[#94A3B8]">Sandbox</span>
              </div>
              <div className="p-2 rounded-xl bg-[#0A0C13] border border-[#181C2B] flex items-center justify-center gap-1.5 text-[#00E676] shadow-sm">
                <span>✓</span>
                <span className="text-[#94A3B8]">Calibragem</span>
              </div>
              <div
                className={
                  isComplete
                    ? 'p-2 rounded-xl bg-[#0A0C13] border border-[#00E676]/40 flex items-center justify-center gap-1.5 text-[#00E676]'
                    : 'p-2 rounded-xl bg-[#0A0C13] border border-[#8257E5]/40 flex items-center justify-center gap-1.5 text-[#A379FF] shadow-[0_0_10px_rgba(130,87,229,0.15)]'
                }
              >
                {isComplete ? (
                  <>
                    <span>✓</span>
                    <span className="text-white truncate">Liga Sincronizada</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-ping shrink-0" />
                    <span className="text-white truncate">{leagueLabel}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Card de Dica Socrática */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#0A0C13] via-[#0E111B] to-[#0A0C13] border border-[#181C2B] hover:border-[#8257E5]/40 transition-colors text-xs font-mono text-[#94A3B8] text-left flex items-start gap-2.5">
            <span className="text-[#00E5FF] text-sm shrink-0" aria-hidden="true">
              💡
            </span>
            <p className="leading-relaxed m-0">
              <strong className="text-white">Dica:</strong> A Tutora de IA orienta você por perguntas
              socráticas para construir raciocínio autônomo, sem respostas prontas.
            </p>
          </div>

          {/* Botão Secundário Pular para o Dashboard */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                navigatedRef.current = true;
                onNavigateDashboard();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[#8A8F9E] hover:text-[#00E5FF] transition-colors group bg-transparent border-0 cursor-pointer"
            >
              <span>Pular para o Dashboard</span>
              <span className="group-hover:translate-x-1 transition-transform" aria-hidden="true">
                →
              </span>
            </button>
          </div>
        </div>
      </main>

      {/* Rodapé Minimalista */}
      <footer className="py-5 px-8 text-center text-[11px] font-mono text-[#4A5064] border-t border-[#181C2B]/60 relative z-20">
        Nexus Code © 2026 • Ambiente seguro e isolado
      </footer>
    </div>
  );
};
