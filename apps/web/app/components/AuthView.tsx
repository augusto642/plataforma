'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Logo from './Logo';
import { OAuthButtons } from './OAuthButtons';
import { oauthErrorMessage } from '../lib/oauth-errors';
import { useAuth } from '../context/AuthContext';

interface AuthViewProps {
  onAuth: (user: { id: string; name: string; email: string; role: string }) => void;
}

export default function AuthView({ onAuth }: AuthViewProps) {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  // OAuth: o callback da API volta para /login?oauth_error=<código> quando
  // o login com Google/GitHub falha (ex.: e-mail não verificado, OAuth
  // não configurado). A mensagem é exibida aqui, sem inventar sessão.
  const oauthError = oauthErrorMessage(searchParams.get('oauth_error'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(oauthError);
  const [isLoading, setIsLoading] = useState(false);

  // C2/C3 (Lote 1): sem botões demo, sem credenciais hardcoded e sem
  // sessão local de fallback — login só autentica via API (cookie httpOnly).

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoading(true);

    try {
      // Fluxo cookie-only: POST /auth/login grava os cookies httpOnly e devolve
      // apenas { user }. O AuthContext hidrata a sessão (user + /users/me).
      const result = await login(email.trim(), password);

      if (!result.success) {
        // C3 (Lote 1): falha de login — inclusive falha de rede/conexão —
        // é erro visível ao usuário. Nunca criar sessão local nem
        // redirecionar ao dashboard sem autenticação real na API.
        setAuthError(result.error || 'Falha ao autenticar.');
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
              placeholder="voce@exemplo.com"
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

        {/* OAuth real (Google/GitHub) — links para a API, sem sessão local. */}
        <OAuthButtons />
      </div>
    </div>
  );
}
