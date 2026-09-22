'use client';

import React from 'react';
import Link from 'next/link';

interface ComparisonRow {
  aspect: string;
  traditional: string;
  nexus: string;
}

const ROWS: ComparisonRow[] = [
  {
    aspect: 'Método Pedagógico',
    traditional: '40 horas de videoaulas passivas onde você assiste outra pessoa programar.',
    nexus: 'Batalhas de código ativas de 5 minutos onde você digita e vence desafios.',
  },
  {
    aspect: 'Taxa de Retenção & Conclusão',
    traditional: 'Abandono superior a 85% por fadiga, tédio e sensação de impotência.',
    nexus: 'Retenção recorde de 84% impulsionada por progressão RPG e cartas TCG.',
  },
  {
    aspect: 'Resolução de Dúvidas',
    traditional: 'Fóruns lentos ou robôs que cospem código pronto sem ensinar a pensar.',
    nexus: 'Tutora Lumi com método socrático: perguntas investigativas de causa raiz.',
  },
  {
    aspect: 'Validação para o Mercado',
    traditional: 'Certificado em PDF genérico que recrutadores e tech leads desconsideram.',
    nexus: 'Repositórios no Git real com commits automáticos e dossiê SHA-256 auditável.',
  },
  {
    aspect: 'Setup de Ambiente',
    traditional: 'Horas instalando compiladores, dependências e corrigindo conflitos de SO.',
    nexus: 'Zero instalação: containers Linux dedicados rodando direto no seu navegador.',
  },
];

export const ComparisonVersus: React.FC = () => {
  return (
    <section className="relative py-28 px-4 sm:px-6 max-w-6xl mx-auto border-t border-white/[0.08]">
      {/* Cabeçalho da Seção Assimétrico (Esquerda + Direita) */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-16">
        <div className="max-w-2xl text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-rose-300 text-xs font-mono font-bold mb-4 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            <span className="text-base">⚔️</span>
            <span>O FIM DO TUTORIAL HELL // COMPARATIVO BRUTAL</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-black text-white tracking-tight mb-4">
            O Velho Mundo vs A Arena NEXUS
          </h2>
          <p className="text-base sm:text-lg text-zinc-300 font-sans leading-relaxed">
            Veja por que engenheiros formados na prática superam desenvolvedores presos em cursos tradicionais de vídeo.
          </p>
        </div>

        {/* Métrica de Retenção na Direita */}
        <div className="hidden lg:flex flex-col items-end gap-2 font-mono text-xs">
          <div className="px-4 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#04D361] animate-pulse" />
            <span>RETENÇÃO DE 84% VS 15% EM VÍDEOS</span>
          </div>
          <span className="text-[11px] text-zinc-500">MÉTODO ATIVO BASEADO EM DOPAMINA & XP</span>
        </div>
      </div>

      {/* Tabela Comparativa Estilo Vercel/Stripe de Luxo */}
      <div className="relative rounded-[28px] p-[1px] bg-gradient-to-b from-white/[0.15] via-white/[0.05] to-transparent shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
        <div className="rounded-[27px] bg-[#070B18]/95 overflow-hidden backdrop-blur-2xl">
          {/* Header das Colunas */}
          <div className="grid grid-cols-1 md:grid-cols-12 border-b border-white/[0.08] text-center font-heading font-black text-sm sm:text-base">
            <div className="md:col-span-3 p-5 bg-[#050814] text-zinc-400 flex items-center justify-center font-mono text-xs tracking-wider uppercase">
              Critério de Avaliação
            </div>
            <div className="md:col-span-4 p-5 bg-black/40 text-rose-300 flex items-center justify-center gap-2.5 border-t md:border-t-0 md:border-l border-white/[0.08]">
              <span className="text-base">❌</span>
              <span>Cursos Tradicionais em Vídeo</span>
            </div>
            <div className="md:col-span-5 p-5 bg-cyan-950/40 text-[#00E5FF] flex items-center justify-center gap-2.5 border-t md:border-t-0 md:border-l border-white/[0.08]">
              <span className="text-base">⚡</span>
              <span>NEXUS CODE (RPG & IDE Real)</span>
            </div>
          </div>

          {/* Linhas */}
          <div className="divide-y divide-white/[0.06]">
            {ROWS.map((row, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 transition-colors hover:bg-white/[0.02]">
                {/* Aspecto */}
                <div className="md:col-span-3 p-5 bg-[#050814]/60 font-mono text-xs text-zinc-300 font-bold flex items-center">
                  {row.aspect}
                </div>

                {/* Tradicional */}
                <div className="md:col-span-4 p-5 bg-black/20 text-xs sm:text-sm text-zinc-400 leading-relaxed flex items-center border-t md:border-t-0 md:border-l border-white/[0.06]">
                  <span className="mr-3 text-rose-500 font-bold shrink-0 text-base">✕</span>
                  <span>{row.traditional}</span>
                </div>

                {/* NEXUS */}
                <div className="md:col-span-5 p-5 bg-cyan-950/10 text-xs sm:text-sm text-zinc-100 font-medium leading-relaxed flex items-center border-t md:border-t-0 md:border-l border-white/[0.06]">
                  <span className="mr-3 text-[#04D361] font-bold shrink-0 text-base">✔</span>
                  <span>{row.nexus}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Micro-Gatilho de Conversão */}
      <div className="mt-12 text-center">
        <p className="text-xs text-zinc-400 font-sans mb-5">
          Experimente sem risco: as primeiras 3 masmorras de código estão 100% abertas sem cartão ou cadastro.
        </p>
        <Link
          href="/game"
          className="inline-flex items-center gap-2.5 px-9 py-4.5 rounded-2xl bg-gradient-to-r from-[#00E5FF] via-[#04D361] to-[#00E58F] text-black font-heading font-black text-sm uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_35px_rgba(4,211,97,0.4)]"
        >
          <span>⚔️ Iniciar Primeira Batalha no RPG Agora</span>
          <span>→</span>
        </Link>
      </div>
    </section>
  );
};
