import React from 'react';
import Link from 'next/link';
import { MaterialIcon } from '../MaterialIcon';

// Central 216 retrabalho (D1) — seção "Arsenal completo" do
// protótipo Stitch v2 (home-desktop.html): Tutora de IA 24/7,
// Revisão de Código por IA, Simulador de Entrevista e Certificado &
// Talent Match.
// Central 218 (D1) — voltam os detalhes do protótipo que a versão
// simplificada tinha perdido: o "Exemplo de mentoria" com quote, a
// caixa do Clean Code Score (descrita sem nota fixa — 96/100 era
// número inventado, A3), "Simulações de Live Coding & Perguntas
// Comportamentais" e "Perfil com portfólio de desafios validados".
export const ResourcesSection: React.FC = () => (
  <section id="recursos" className="relative z-10 py-24 px-6 sm:px-8 max-w-7xl mx-auto border-t border-border-2/70">
    <div className="text-center max-w-2xl mx-auto mb-14">
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
        <p className="text-sm text-ink-body leading-relaxed mb-6">
          Não dá a resposta pronta: ensina pelo método socrático, fazendo as perguntas certas para você entender onde o raciocínio falhou e descobrir a solução por conta própria.
        </p>
        <div className="p-4 rounded-xl bg-dark-surface-container border border-border-subtle font-code text-xs text-dark-on-surface space-y-2">
          <div className="flex items-center gap-2 text-ink-span">
            <span className="w-2 h-2 rounded-full bg-secondary"></span>
            <span>Exemplo de mentoria:</span>
          </div>
          <div className="text-dark-on-surface">&ldquo;Observe a linha 8: o que acontece com a variável quando o loop atinge o último índice do array?&rdquo;</div>
        </div>
      </div>

      <div className="rounded-xl bg-dark-surface-container-low border border-border-subtle p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-cyan/15 border border-brand-cyan-neon/40 text-brand-cyan-neon">
            <MaterialIcon name="code_blocks" className="text-[22px]" />
          </span>
          <h3 className="font-headline text-lg font-bold text-white">Revisão de Código por IA</h3>
        </div>
        <p className="text-sm text-ink-body leading-relaxed mb-6">
          Assim que seu código passa nos testes, a IA analisa a qualidade da solução: legibilidade, convenções de mercado, complexidade de tempo (Big O) e boas práticas de arquitetura.
        </p>
        <div className="p-4 rounded-xl bg-dark-surface-container border border-border-subtle font-code text-xs text-dark-on-surface space-y-1.5">
          <div className="flex items-center justify-between text-secondary">
            <span>Clean Code Score: nota de legibilidade da sua solução</span>
            <span>O(n) linear</span>
          </div>
          <p className="text-ink-span">Sugestão de refatoração aplicada para melhor uso de memória.</p>
        </div>
      </div>

      <div className="rounded-xl bg-dark-surface-container-low border border-border-subtle p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/15 border border-secondary/40 text-secondary">
            <MaterialIcon name="record_voice_over" className="text-[22px]" />
          </span>
          <h3 className="font-headline text-lg font-bold text-white">Simulador de Entrevista de Emprego</h3>
        </div>
        <p className="text-sm text-ink-body leading-relaxed mb-6">
          Treine para processos seletivos reais. A IA assume o papel do recrutador técnico, faz perguntas teóricas, pede explicações de código e avalia sua comunicação — com live coding e perguntas comportamentais.
        </p>
        <div className="p-4 rounded-xl bg-dark-surface-container border border-border-subtle font-code text-xs text-dark-on-surface flex items-center justify-between gap-3">
          <span className="text-dark-on-surface">Simulações de Live Coding &amp; Perguntas Comportamentais</span>
          <span className="text-brand-cyan-neon font-bold shrink-0">Feedback em tempo real</span>
        </div>
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
        <p className="text-sm text-ink-body leading-relaxed mb-6">
          Certificados autenticados com hash criptográfico comprovando as horas práticas e projetos entregues. Conexão direta com vagas em empresas parceiras que buscam devs testados.
        </p>
        <div className="p-4 rounded-xl bg-dark-surface-container border border-border-subtle font-code text-xs text-dark-on-surface flex items-center justify-between gap-3">
          <span className="text-dark-on-surface">Perfil com portfólio de desafios validados</span>
          <span className="text-secondary font-bold shrink-0">Pronto para o mercado</span>
        </div>
      </div>
    </div>
  </section>
);
