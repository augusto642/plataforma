'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Logo from './components/Logo';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Unhandled runtime error in Web application:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#09090A] text-[#F4F4F5] font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-[#F43F5E]/30 selection:text-white">
      {/* Background Ambient Glows */}
      <div className="absolute -top-[15%] right-[10%] w-[600px] h-[600px] bg-[#F43F5E]/12 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-[15%] left-[10%] w-[600px] h-[600px] bg-[#8257E5]/12 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-[560px] w-full text-center relative z-10">
        {/* Brand Header */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" href="/" />
        </div>

        {/* Status Chip */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs font-mono font-bold mb-6">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span>STATUS: 500 // EXCEÇÃO NÃO TRATADA</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold font-heading tracking-tight mb-3 text-white">
          Falha de Execução na Aplicação
        </h1>
        <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
          Um erro inesperado interrompeu o ciclo de renderização desta página. A exceção foi capturada com segurança pelos boundaries da plataforma.
        </p>

        {/* Error Diagnostic Card */}
        <div className="bg-[#121217] border border-[#27272A] rounded-xl p-4 text-left font-mono text-xs text-zinc-300 mb-8 shadow-2xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/60 text-zinc-500 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
              <span className="ml-2">runtime-error-boundary</span>
            </div>
            {error.digest && (
              <span className="text-[10px] text-zinc-500 font-mono">
                digest: {error.digest.slice(0, 10)}...
              </span>
            )}
          </div>
          <div className="space-y-1.5 text-[11px]">
            <p className="text-rose-400 font-semibold">
              {error.message || 'Erro interno de renderização ou sincronização de estado.'}
            </p>
            <p className="text-zinc-500 text-[10px]">
              O estado anterior da sessão e seus códigos em edição estão preservados no armazenamento local.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8257E5] to-[#996DFF] hover:opacity-95 text-white font-extrabold text-xs transition-all shadow-[0_0_20px_rgba(130,87,229,0.35)] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🔄</span>
            <span>Tentar Novamente</span>
          </button>

          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#18181B] hover:bg-[#202024] border border-[#27272A] text-zinc-300 hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-2"
          >
            <span>📊</span>
            <span>Voltar ao Dashboard</span>
          </Link>

          <Link
            href="/"
            className="w-full sm:w-auto px-4 py-2.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Página Inicial →
          </Link>
        </div>
      </div>
    </div>
  );
}
