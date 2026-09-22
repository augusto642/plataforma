import React from 'react';
import Link from 'next/link';
import Logo from './components/Logo';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#09090A] text-[#F4F4F5] font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-[#8257E5]/30 selection:text-white">
      {/* Background Ambient Glows */}
      <div className="absolute -top-[15%] left-[10%] w-[600px] h-[600px] bg-[#8257E5]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-[15%] right-[10%] w-[600px] h-[600px] bg-[#00B37E]/12 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-[560px] w-full text-center relative z-10">
        {/* Brand Header */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" href="/" />
        </div>

        {/* Status Chip */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/40 border border-red-800/50 text-red-300 text-xs font-mono font-bold mb-6">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>STATUS: 404 // ROTA NÃO ENCONTRADA</span>
        </div>

        {/* Big Glitch Title */}
        <h1 className="text-5xl sm:text-6xl font-black font-heading tracking-tight mb-4 text-white">
          404
        </h1>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-200 mb-3 tracking-tight">
          Você alcançou o vácuo de código.
        </h2>
        <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
          O endpoint, aula ou repositório solicitado não existe ou foi refatorado para uma nova arquitetura.
        </p>

        {/* Terminal Diagnostic Box */}
        <div className="bg-[#121217] border border-[#27272A] rounded-xl p-4 text-left font-mono text-xs text-zinc-300 mb-8 shadow-2xl">
          <div className="flex items-center gap-1.5 pb-3 mb-3 border-b border-zinc-800/60 text-zinc-500 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            <span className="ml-2">terminal ~ nexus-probe</span>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <p className="text-zinc-500">$ nexus resolve --target current-route</p>
            <p className="text-red-400">
              [CRITICAL] SymbolNotFoundException: Path does not match any registered AST node or API contract.
            </p>
            <p className="text-emerald-400">✔ Fallback options available: [/courses, /dashboard, /]</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/courses"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00B37E] to-[#04D361] hover:from-[#00875F] hover:to-[#00B37E] text-[#09090A] font-extrabold text-xs transition-all shadow-[0_0_20px_rgba(4,211,97,0.35)] flex items-center justify-center gap-2"
          >
            <span>📚</span>
            <span>Explorar Trilhas & Cursos</span>
          </Link>

          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#18181B] hover:bg-[#202024] border border-[#27272A] text-zinc-300 hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-2"
          >
            <span>📊</span>
            <span>Ir para o Dashboard</span>
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
