import React from 'react';
import Link from 'next/link';
import { MaterialIcon } from '../MaterialIcon';

// Central 216 retrabalho (D1) — seção "Arsenal completo" do
// protótipo Stitch v2 (home-desktop.html): Tutora de IA 24/7,
// Revisão de Código por IA, Simulador de Entrevista e Certificado &
// Talent Match. Sem o "Clean Code Score: 96/100" do mock (número
// inventado): a revisão é descrita pelo que faz, sem nota de exemplo.
export const ResourcesSection: React.FC = () => (
  <section id="recursos" className="relative z-10 py-24 px-6 sm:px-8 max-w-7xl mx-auto border-t border-border-2/70">
    <div className="max-w-2xl mb-14">
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-cyan/10 border border-brand-cyan-neon/30 text-brand-cyan-neon text-xs font-mono font-bold mb-3">
        <MaterialIcon name="psychology" className="text-[16px]" />
        <span>ARSENAL COMPLETO</span>
      </div>
      <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-white tracking-tight mb-4">
        Recursos criados para acelerar sua evolução
      </h2>
      <p className="text-base sm:text-lg text-ink-body leading-relaxed font-sans">
        Tecnologia de ponta e inteligência artificial para que você nunca fique travado em uma dúvida de sintaxe ou lógica.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="rounded-xl bg-dark-surface-container-low border border-border-subtle p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 border border-primary/40 text-dark-primary">
            <MaterialIcon name="psychology" className="text-[22px]" />
          </span>
          <h3 className="font-headline text-lg font-bold text-white">Tutora de IA 24/7</h3>
        </div>
        <p className="text-sm text-ink-body leading-relaxed">
          Não dá a resposta pronta: ensina pelo método socrático, fazendo as perguntas certas para você entender onde o raciocínio falhou e descobrir a solução por conta própria.
        </p>
      </div>

      <div className="rounded-xl bg-dark-surface-container-low border border-border-subtle p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-cyan/15 border border-brand-cyan-neon/40 text-brand-cyan-neon">
            <MaterialIcon name="code_blocks" className="text-[22px]" />
          </span>
          <h3 className="font-headline text-lg font-bold text-white">Revisão de Código por IA</h3>
        </div>
        <p className="text-sm text-ink-body leading-relaxed">
          Assim que seu código passa nos testes, a IA analisa a qualidade da solução: legibilidade, convenções de mercado, complexidade de tempo (Big O) e boas práticas de arquitetura.
        </p>
      </div>

      <div className="rounded-xl bg-dark-surface-container-low border border-border-subtle p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/15 border border-secondary/40 text-secondary">
            <MaterialIcon name="record_voice_over" className="text-[22px]" />
          </span>
          <h3 className="font-headline text-lg font-bold text-white">Simulador de Entrevista de Emprego</h3>
        </div>
        <p className="text-sm text-ink-body leading-relaxed">
          Treine para processos seletivos reais. A IA assume o papel do recrutador técnico, faz perguntas teóricas, pede explicações de código e avalia sua comunicação — com live coding e perguntas comportamentais.
        </p>
        <Link href="/entrevista" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-dark-primary hover:underline">
          Treinar entrevista
          <MaterialIcon name="arrow_forward" className="text-[16px]" />
        </Link>
      </div>

      <div className="rounded-xl bg-dark-surface-container-low border border-border-subtle p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-amber/15 border border-brand-amber/40 text-brand-amber">
            <MaterialIcon name="badge" className="text-[22px]" />
          </span>
          <h3 className="font-headline text-lg font-bold text-white">Certificado &amp; Talent Match</h3>
        </div>
        <p className="text-sm text-ink-body leading-relaxed">
          Certificados autenticados com hash criptográfico comprovando as horas práticas e projetos entregues. Conexão direta com vagas em empresas parceiras que buscam devs testados.
        </p>
      </div>
    </div>
  </section>
);
