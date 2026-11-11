import React from 'react';
import Image from 'next/image';

/* B79 (Sprint 19 · destravamento B4) — o fundador, NOMEADO: até aqui
   a Nexus Code era uma plataforma sem pessoa por trás, e o painel
   cobrava prova humana desde a Volta 1. Decisão do Augusto
   (2026-10-22): entra o nome e o papel verdadeiro — professor do
   curso técnico de Informática para Internet e criador da
   plataforma — e NENHUMA foto por enquanto (ele envia a dele
   depois). Por isso o visual é um monograma tipográfico com as
   iniciais: nada de imagem de pessoa substituta, nem a foto do
   currículo, nem stock. Quando a foto chegar, basta passar
   `photoSrc` — o componente já sabe exibi-la no lugar do monograma.
   A copy só afirma fatos confirmados: o cargo, o curso que ele
   ministra e a formação em andamento. */

export interface FounderSectionProps {
  /** Foto do fundador (a caminho — decisão B4). Sem ela, monograma. */
  photoSrc?: string;
}

export const FounderSection: React.FC<FounderSectionProps> = ({ photoSrc }) => (
  <section
    id="fundador"
    className="relative z-10 py-24 px-6 sm:px-8 max-w-7xl mx-auto border-t border-border-2/70"
  >
    <div className="max-w-2xl text-left mb-12">
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-purple-low border border-brand-purple/30 text-brand-purple-light text-xs font-mono font-bold mb-3">
        <span className="w-2 h-2 rounded-full bg-brand-purple"></span>
        <span>QUEM ESTÁ POR TRÁS</span>
      </div>
      <h2 className="text-3xl sm:text-5xl font-heading font-black text-ink-heading tracking-tight">
        Quem criou a Nexus Code
      </h2>
    </div>

    <div className="rounded-2xl bg-surface-1 border border-border-2 p-7 sm:p-10 flex flex-col sm:flex-row gap-7 sm:gap-9 items-start">
      {photoSrc ? (
        <Image
          src={photoSrc}
          alt="Foto de Augusto Fortes, professor de Informática e criador da Nexus Code"
          width={112}
          height={112}
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border border-border-brand shrink-0"
        />
      ) : (
        <div
          aria-hidden="true"
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-brand-purple-low border border-brand-purple/30 flex items-center justify-center shrink-0"
        >
          <span className="font-heading text-3xl sm:text-4xl font-black text-brand-purple-light tracking-tight">
            AF
          </span>
        </div>
      )}

      <div className="text-left">
        <p className="font-heading text-2xl sm:text-3xl font-black text-ink-heading tracking-tight">
          Augusto Fortes
        </p>
        <p className="mt-1.5 text-xs font-mono font-bold text-brand-purple-light uppercase tracking-widest">
          Professor de Informática · Criador da Nexus Code
        </p>
        <p className="mt-4 text-base sm:text-lg text-ink-body leading-relaxed font-sans max-w-2xl">
          Professor do curso técnico de Informática para Internet e formando em Sistemas
          de Informação, Augusto criou a Nexus Code para quem está começando do zero:
          nada de horas de vídeo sem prática — aqui, cada conceito vira um exercício,
          corrigido na hora, com uma tutora de IA que faz a pergunta certa em vez de
          entregar a resposta.
        </p>
      </div>
    </div>
  </section>
);
