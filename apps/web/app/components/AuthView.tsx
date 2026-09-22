'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';

interface AuthViewProps {
  onAuth: (user: { id: string; name: string; email: string; role: string }) => void;
}

export default function AuthView({ onAuth }: AuthViewProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Quick autofill buttons for 1-click test
  const handleQuickGithub = () => {
    setEmail('aluno@plataforma.local');
    setPassword('aluno12345');
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
      // Fluxo cookie-only: POST /auth/login grava os cookies httpOnly e devolve
      // apenas { user }. O AuthContext hidrata a sessão (user + /users/me).
      const result = await login(email.trim(), password);

      if (!result.success) {
        const message = result.error || 'Falha ao autenticar.';
        // Graceful fallback for local offline / demo preview
        if (message.toLowerCase().includes('conex') || message.toLowerCase().includes('fetch')) {
          onAuth({
            id: 'usr_demo_session',
            email,
            name: email.split('@')[0] || 'Desenvolvedor Nexus',
            role: 'student',
          });
          return;
        }
        setAuthError(message);
        return;
      }

      onAuth({
        id: result.user?.id || email,
        email: result.user?.email || email,
        name: result.user?.name || email.split('@')[0] || 'Desenvolvedor',
        role: result.user?.role || 'student',
      });
    } catch (err: any) {
      setAuthError(err?.message || 'Falha ao autenticar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#09090A] text-[#F4F4F5] font-sans relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute -top-[10%] left-[15%] w-[500px] h-[500px] bg-[#8257E5]/15 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute -bottom-[10%] right-[15%] w-[550px] h-[550px] bg-[#00B37E]/12 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />

      {/* Main Login Card Container */}
      <div className="w-full max-w-[460px] bg-[#121214] border border-[#27272A] rounded-2xl p-8 sm:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] relative z-10 backdrop-blur-xl">
        {/* Top Glow Accent Bar */}
        <div className="absolute top-0 left-[20%] right-[20%] h-[2px] bg-gradient-to-r from-transparent via-[#8257E5] to-[#04D361] rounded-full" />

        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Entrar na Plataforma</h1>
          <p className="text-xs text-zinc-400">
            Acesse seus desafios, repositórios de código e mentoria de IA.
          </p>
        </div>

        {/* Error Alert */}
        {authError && (
          <div className="mb-5 p-3.5 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2.5 animate-fadeIn">
            <span>⚠️</span>
            <span>{authError}</span>
          </div>
        )}

        {/* Social / Quick Login Buttons */}
        <div className="space-y-2.5 mb-6">
          <button
            type="button"
            onClick={handleQuickGithub}
            className="w-full h-11 px-4 rounded-xl bg-[#18181B] border border-[#27272A] hover:border-[#8257E5]/50 hover:bg-[#202024] text-xs font-semibold text-zinc-200 transition-all flex items-center justify-center gap-3 cursor-pointer group"
          >
            <svg className="w-4 h-4 fill-current text-zinc-400 group-hover:text-white" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>Preencher Demo Aluno (1-Clique)</span>
          </button>

          <button
            type="button"
            onClick={handleQuickGoogle}
            className="w-full h-11 px-4 rounded-xl bg-[#18181B] border border-[#27272A] hover:border-[#04D361]/50 hover:bg-[#202024] text-xs font-semibold text-zinc-200 transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            <span>🚀</span>
            <span>Preencher Demo Google</span>
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-[#27272A]" />
          <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
            ou com credenciais
          </span>
          <div className="flex-1 h-px bg-[#27272A]" />
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              E-mail do Aluno
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="aluno@plataforma.local"
              required
              className="w-full h-11 px-4 rounded-xl bg-[#18181B] border border-[#27272A] focus:border-[#8257E5] focus:outline-none text-xs text-white placeholder:text-zinc-600 transition-colors font-mono"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-300">Senha</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full h-11 px-4 rounded-xl bg-[#18181B] border border-[#27272A] focus:border-[#8257E5] focus:outline-none text-xs text-white placeholder:text-zinc-600 transition-colors font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 mt-2 rounded-xl bg-gradient-to-r from-[#8257E5] to-[#996DFF] hover:opacity-95 text-white font-bold text-xs shadow-[0_4px_16px_rgba(130,87,229,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⚡</span>
                <span>Entrando...</span>
              </>
            ) : (
              <span>Entrar na Plataforma</span>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-6 pt-5 border-t border-[#27272A] text-center text-xs text-zinc-400">
          Ainda não tem conta?{' '}
          <Link href="/register" className="text-[#996DFF] font-semibold hover:underline">
            Cadastre-se gratuitamente
          </Link>
        </div>
      </div>
    </div>
  );
}
