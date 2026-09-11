'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Logo from './Logo';
import { setTokens, API_BASE } from '../lib/apiClient';

interface AuthViewProps {
  onAuth: (user: { id: string; name: string; email: string; role: string }) => void;
}

export default function AuthView({ onAuth }: AuthViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Quick autofill buttons for 1-click test
  const handleQuickGithub = () => {
    setEmail('augusto.dev@github.com');
    setPassword('NexusCode2026!#');
  };

  const handleQuickGoogle = () => {
    setEmail('augusto.silva@gmail.com');
    setPassword('GoogleNexus2026#');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Credenciais inválidas. Verifique seu e-mail e senha.');
      }

      if (data.accessToken) {
        setTokens(data.accessToken, data.refreshToken);
      }

      onAuth({
        id: data.user?.id || email,
        email: data.user?.email || email,
        name: data.user?.name || email.split('@')[0] || 'Desenvolvedor',
        role: data.user?.role || 'student',
      });
    } catch (err: any) {
      // Graceful fallback for local offline / demo preview
      if (err.message?.includes('fetch') || err.message?.includes('conectar') || err.message?.includes('Failed')) {
        onAuth({
          id: 'dev-demo-id',
          email: email || 'dev@nexuscode.dev',
          name: email.split('@')[0] || 'Desenvolvedor',
          role: 'student',
        });
        return;
      }
      setAuthError(err.message || 'Falha ao conectar com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#09090A',
        color: '#E1E1E6',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        position: 'relative',
        overflow: 'hidden',
        padding: '32px 16px',
        boxSizing: 'border-box',
      }}
    >
      {/* Background Ambient Glows & Dot Grid */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '15%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(130, 87, 229, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '15%',
          width: '550px',
          height: '550px',
          background: 'radial-gradient(circle, rgba(0, 179, 126, 0.12) 0%, transparent 70%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Main Login Card Container */}
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#121214',
          border: '1px solid #27272A',
          borderRadius: '20px',
          padding: '40px 32px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.03)',
          position: 'relative',
          zIndex: 1,
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Top Glow Accent Bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '20%',
            right: '20%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #8257E5, #00B37E, transparent)',
            borderRadius: '2px',
          }}
        />

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="flex justify-center mb-4">
            <Logo size="lg" href="/" />
          </div>

          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF', margin: '12px 0 6px 0', letterSpacing: '-0.3px' }}>
            Acesse sua Conta
          </h1>
          <p style={{ color: '#A8A8B3', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
            Continue sua jornada na trilha e resolva desafios práticos.
          </p>
        </div>

        {/* Social Auth Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={handleQuickGithub}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '11px 14px',
              background: '#18181B',
              border: '1px solid #27272A',
              borderRadius: '10px',
              color: '#F4F4F6',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#996DFF';
              e.currentTarget.style.backgroundColor = '#202024';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#27272A';
              e.currentTarget.style.backgroundColor = '#18181B';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            GitHub
          </button>

          <button
            type="button"
            onClick={handleQuickGoogle}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '11px 14px',
              background: '#18181B',
              border: '1px solid #27272A',
              borderRadius: '10px',
              color: '#F4F4F6',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#00E5FF';
              e.currentTarget.style.backgroundColor = '#202024';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#27272A';
              e.currentTarget.style.backgroundColor = '#18181B';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
              <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z" />
              <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z" />
            </svg>
            Google
          </button>
        </div>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
            color: '#71717A',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: '#27272A' }} />
          <span>ou com seu e-mail</span>
          <div style={{ flex: 1, height: '1px', background: '#27272A' }} />
        </div>

        {/* Error Notification Alert */}
        {authError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              backgroundColor: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              color: '#FDA4AF',
              padding: '12px 14px',
              borderRadius: '10px',
              fontSize: '13px',
              marginBottom: '20px',
              lineHeight: 1.4,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F43F5E" strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{authError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Email Field */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#A8A8B3', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              E-mail
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#71717A', pointerEvents: 'none' }}>
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
                  backgroundColor: '#18181B',
                  border: '1px solid #27272A',
                  borderRadius: '10px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxSizing: 'border-box',
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

          {/* Password Field */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#A8A8B3', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Senha
              </label>
              <span
                style={{
                  fontSize: '12px',
                  color: '#8257E5',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#996DFF')}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#8257E5')}
                onClick={() => alert('Para redefinir sua senha, entre em contato com o suporte da plataforma.')}
              >
                Esqueceu a senha?
              </span>
            </div>

            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#71717A', pointerEvents: 'none' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                placeholder="••••••••••••"
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 42px',
                  backgroundColor: '#18181B',
                  border: '1px solid #27272A',
                  borderRadius: '10px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxSizing: 'border-box',
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit CTA Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: '10px',
              padding: '14px 0',
              border: 'none',
              borderRadius: '10px',
              background: 'linear-gradient(90deg, #8257E5 0%, #996DFF 100%)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '14px',
              letterSpacing: '0.01em',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              opacity: isLoading ? 0.7 : 1,
              boxShadow: '0 8px 20px -4px rgba(130, 87, 229, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                (e.target as HTMLElement).style.boxShadow = '0 12px 28px -4px rgba(130, 87, 229, 0.65)';
                (e.target as HTMLElement).style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.boxShadow = '0 8px 20px -4px rgba(130, 87, 229, 0.45)';
              (e.target as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            {isLoading ? (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  style={{ animation: 'spin 1s linear infinite' }}
                >
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                </svg>
                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <span>Entrar na Plataforma</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Link to Register (Canonical Single Signup Point) */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid #27272A',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '13px', color: '#A1A1AA', margin: '0 0 10px 0' }}>
            Não tem uma conta na plataforma?
          </p>
          <Link
            href="/register"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 18px',
              backgroundColor: 'rgba(130, 87, 229, 0.1)',
              border: '1px solid rgba(130, 87, 229, 0.3)',
              borderRadius: '10px',
              color: '#C4B5FD',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(130, 87, 229, 0.2)';
              e.currentTarget.style.borderColor = '#8257E5';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(130, 87, 229, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(130, 87, 229, 0.3)';
              e.currentTarget.style.color = '#C4B5FD';
            }}
          >
            <span>Criar Conta Gratuita & Escolher Trilha</span>
            <span>→</span>
          </Link>
        </div>

        {/* Feature Highlights Badges */}
        <div
          style={{
            marginTop: '20px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#8D8D99' }}>
            <span style={{ color: '#00B37E' }}>✓</span> Sandbox Isolada Docker
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#8257E5' }}>
            <span style={{ color: '#8257E5' }}>✓</span> Tutor IA Socrático
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#0070F3' }}>
            <span style={{ color: '#0070F3' }}>✓</span> Liga Semanal & XP
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#FFA116' }}>
            <span style={{ color: '#FFA116' }}>✓</span> Heatmap 52 Semanas
          </div>
        </div>
      </div>
    </div>
  );
}
