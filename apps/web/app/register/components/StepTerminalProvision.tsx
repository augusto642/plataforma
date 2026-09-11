'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrackId, TRACKS } from './StepTracks';
import { ExpLevel, TimeCommitment, CareerGoal } from './StepGoals';

interface LogItem {
  pct: number;
  time: string;
  msg: string;
  color: string;
}

interface StepTerminalProvisionProps {
  name: string;
  email: string;
  role: string;
  selectedTrack: TrackId;
  expLevel: ExpLevel;
  timeCommitment: TimeCommitment;
  careerGoal: CareerGoal;
  onFinished: () => void;
}

const EXP_LABELS: Record<ExpLevel, string> = {
  junior: 'Iniciante / Transição',
  mid: 'Pleno / Intermediário',
  senior: 'Sênior / Tech Lead',
};

const TIME_LABELS: Record<TimeCommitment, string> = {
  '5h': '5 horas/semana',
  '10h': '10-15 horas/semana',
  '20h': '20+ horas/semana',
};

const GOAL_LABELS: Record<CareerGoal, string> = {
  global: 'Carreira Internacional (USD/EUR)',
  lead: 'Evolução Staff / Tech Lead',
  startup: 'Fundar Startup / Web3',
  hackathons: 'Vencer Hackathons & Ranking',
};

export const StepTerminalProvision: React.FC<StepTerminalProvisionProps> = ({
  name,
  email,
  role,
  selectedTrack,
  expLevel,
  timeCommitment,
  careerGoal,
  onFinished,
}) => {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [isDone, setIsDone] = useState(false);
  const terminalScreenRef = useRef<HTMLDivElement | null>(null);

  const currentTrack = TRACKS.find((t) => t.id === selectedTrack) || TRACKS[0];

  useEffect(() => {
    let isCancelled = false;

    const sequence: LogItem[] = [
      {
        pct: 10,
        time: '00:00:01',
        msg: '🟢 Initializing sandbox micro-VM hypervisor (KVM/QEMU kernel 6.8.0-nexus)...',
        color: '#00E5FF',
      },
      {
        pct: 25,
        time: '00:00:02',
        msg: `📦 Pulling pre-cached Docker image (nexus/${selectedTrack}-devcontainer:latest)...`,
        color: '#00E5FF',
      },
      {
        pct: 40,
        time: '00:00:03',
        msg: '🔑 Generating Ed25519 ephemeral SSH keypair & zero-trust security token...',
        color: '#996DFF',
      },
      {
        pct: 55,
        time: '00:00:04',
        msg: '⚡ Allocating dedicated Redis cluster & isolated memory sandbox (2 vCPU, 4GB RAM)...',
        color: '#00E5FF',
      },
      {
        pct: 70,
        time: '00:00:05',
        msg: `🤖 Booting Socratic AI Tutor v4 with vector memory index (${EXP_LABELS[expLevel]})...`,
        color: '#996DFF',
      },
      {
        pct: 85,
        time: '00:00:06',
        msg: `🎯 Compiling personalized track curriculum: "${currentTrack.name}"...`,
        color: '#F59E0B',
      },
      {
        pct: 95,
        time: '00:00:07',
        msg: '🚀 Attaching live Monaco Editor WebSocket stream & test runner sandbox...',
        color: '#00E5FF',
      },
      {
        pct: 100,
        time: '00:00:08',
        msg: '✅ ALL SYSTEMS OPERATIONAL: Sandbox IP allocated [10.244.18.99] • Ready to Code!',
        color: '#04D361',
      },
    ];

    let currentIdx = 0;

    const runStep = () => {
      if (isCancelled) return;
      if (currentIdx < sequence.length) {
        const item = sequence[currentIdx];
        setLogs((prev) => [...prev, item]);
        setProgress(item.pct);
        currentIdx++;
        const delay = currentIdx === sequence.length ? 700 : 500;
        setTimeout(runStep, delay);
      } else {
        setIsDone(true);
        onFinished();
      }
    };

    const initialTimer = setTimeout(runStep, 350);

    return () => {
      isCancelled = true;
      clearTimeout(initialTimer);
    };
  }, [selectedTrack, expLevel, currentTrack.name, onFinished]);

  // Auto scroll terminal logs
  useEffect(() => {
    if (terminalScreenRef.current) {
      terminalScreenRef.current.scrollTop = terminalScreenRef.current.scrollHeight;
    }
  }, [logs]);

  const handleGoToDashboard = () => {
    try {
      const userObj = {
        id: 'usr_' + Date.now(),
        name: name || 'Desenvolvedor Nexus',
        email: email || 'dev@nexuscode.dev',
        role,
        track: currentTrack.name,
        level: EXP_LABELS[expLevel],
      };
      localStorage.setItem('user_session', JSON.stringify(userObj));
    } catch {}

    router.push('/dashboard');
  };

  return (
    <div style={{ animation: 'fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
      {/* Provisioning Progress Card */}
      <div
        style={{
          background: '#151821',
          border: '1px solid #232738',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
          <div style={{ fontWeight: 600, color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isDone && (
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(130, 87, 229, 0.3)',
                  borderTopColor: '#996DFF',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
            )}
            {isDone ? (
              <span style={{ color: '#04D361' }}>✓ Ambiente Provisionado com Sucesso!</span>
            ) : (
              <span>Provisionando seu Ambiente NEXUS Sandbox...</span>
            )}
          </div>
          <div style={{ fontWeight: 800, fontFamily: '"Fira Code", monospace', color: '#00E5FF' }}>
            {progress}%
          </div>
        </div>

        <div
          style={{
            width: '100%',
            height: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '6px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #8257E5, #00E5FF, #04D361)',
              borderRadius: '6px',
              transition: 'width 0.3s ease',
              boxShadow: '0 0 16px rgba(4, 211, 97, 0.6)',
            }}
          />
        </div>
      </div>

      {/* CLI Terminal Window */}
      <div
        style={{
          background: '#090A10',
          border: '1px solid #232738',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          marginBottom: '24px',
          fontFamily: '"Fira Code", "JetBrains Mono", Menlo, monospace',
        }}
      >
        <div
          style={{
            background: '#12141F',
            borderBottom: '1px solid #232738',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF5F56' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FFBD2E' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27C93F' }} />
          </div>
          <div style={{ fontSize: '11px', color: '#64687A', fontWeight: 600, letterSpacing: '0.5px' }}>
            nexus-sandbox-provisioner ~ micro-vm-instantiator
          </div>
          <div
            style={{
              fontSize: '10px',
              background: isDone ? 'rgba(4, 211, 97, 0.2)' : 'rgba(4, 211, 97, 0.15)',
              color: '#04D361',
              border: '1px solid rgba(4, 211, 97, 0.3)',
              padding: '2px 8px',
              borderRadius: '10px',
              fontWeight: 700,
            }}
          >
            {isDone ? 'READY (100%)' : 'LIVE EXEC'}
          </div>
        </div>

        <div
          ref={terminalScreenRef}
          style={{
            padding: '20px',
            height: '240px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '12px',
            color: '#E1E1E6',
            lineHeight: 1.5,
          }}
        >
          {logs.map((log, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                animation: 'terminalLineIn 0.2s ease-out',
              }}
            >
              <span style={{ color: '#64687A', fontSize: '11px', flexShrink: 0 }}>[{log.time}]</span>
              <span style={{ flex: 1, color: log.color, fontWeight: log.pct === 100 ? 600 : 400 }}>
                {log.msg}
              </span>
            </div>
          ))}

          {!isDone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#64687A', fontSize: '11px' }}>[00:00:0{logs.length + 1}]</span>
              <span style={{ color: '#00E5FF' }}>provisioning container...</span>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '14px',
                  background: '#04D361',
                  animation: 'blink 1s infinite',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Celebration Card */}
      {isDone && (
        <div
          style={{
            textAlign: 'center',
            padding: '24px',
            background: 'linear-gradient(180deg, rgba(130, 87, 229, 0.1) 0%, rgba(4, 211, 97, 0.05) 100%)',
            border: '1px solid rgba(4, 211, 97, 0.4)',
            borderRadius: '18px',
            marginBottom: '24px',
            animation: 'scalePop 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'relative',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎉</div>
          <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#FFF', marginBottom: '6px' }}>
            Bem-vindo(a) à Elite NEXUS CODE!
          </h3>
          <p style={{ fontSize: '13px', color: '#9499AD', maxWidth: '500px', margin: '0 auto 16px' }}>
            Seu ambiente de desenvolvimento Docker foi instanciado e o Tutor IA socrático foi calibrado.
          </p>

          <div
            style={{
              display: 'inline-flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: '#0F1117',
              border: '1px solid #232738',
              borderRadius: '12px',
              fontSize: '12px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'rgba(130, 87, 229, 0.15)',
                border: '1px solid #8257E5',
                color: '#996DFF',
                fontFamily: '"Fira Code", monospace',
              }}
            >
              👤 {name || 'Desenvolvedor'}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'rgba(4, 211, 97, 0.15)',
                border: '1px solid #04D361',
                color: '#04D361',
                fontFamily: '"Fira Code", monospace',
              }}
            >
              ⚡ {currentTrack.name}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'rgba(0, 229, 255, 0.15)',
                border: '1px solid #00E5FF',
                color: '#00E5FF',
                fontFamily: '"Fira Code", monospace',
              }}
            >
              ⏱️ {TIME_LABELS[timeCommitment]}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid #F59E0B',
                color: '#F59E0B',
                fontFamily: '"Fira Code", monospace',
              }}
            >
              🎯 {GOAL_LABELS[careerGoal]}
            </span>
          </div>
        </div>
      )}

      {/* Final Action Buttons */}
      {isDone && (
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
          <button
            type="button"
            onClick={() => router.push('/courses')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '13px 20px',
              background: '#151821',
              border: '1px solid #232738',
              borderRadius: '12px',
              color: '#9499AD',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.25s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1B1E2B';
              e.currentTarget.style.color = '#FFF';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#151821';
              e.currentTarget.style.color = '#9499AD';
              e.currentTarget.style.borderColor = '#232738';
            }}
          >
            📚 Explorar Catálogo de Trilhas
          </button>

          <button
            type="button"
            onClick={handleGoToDashboard}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '13px 28px',
              background: 'linear-gradient(90deg, #04D361 0%, #00E5FF 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#07080B',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 8px 24px -4px rgba(4, 211, 97, 0.4)',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 12px 30px -4px rgba(4, 211, 97, 0.65)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 24px -4px rgba(4, 211, 97, 0.4)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            🚀 Acessar Meu Dashboard & IDE
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
