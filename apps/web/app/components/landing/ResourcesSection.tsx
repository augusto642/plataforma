import React from 'react';
import Link from 'next/link';
import { MaterialIcon } from '../MaterialIcon';

export const ResourcesSection: React.FC = () => (
  <section
    id="recursos"
    className="py-24 border-b border-border-subtle bg-dark-surface-container-low"
  >
    <div className="max-w-7xl mx-auto px-6">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="font-code text-code-sm text-primary uppercase tracking-widest font-semibold block mb-2">
          Arsenal completo
        </span>
        <h2 className="font-headline text-headline-lg-mobile md:text-headline-lg font-bold text-white tracking-tight mb-4">
          Recursos criados para acelerar sua evolução
        </h2>
        <p className="font-body text-body-lg text-dark-on-surface-variant">
          Tecnologia de ponta e inteligência artificial para que você nunca fique travado em uma
          dúvida de sintaxe ou lógica.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Recurso 1: Tutora de IA */}
        <div className="bg-dark-surface border border-border-subtle rounded-lg p-8 hover:border-primary/50 transition-colors">
          <div className="w-12 h-12 rounded bg-primary/15 border border-primary/30 text-primary flex items-center justify-center mb-6">
            <MaterialIcon name="psychology" className="text-[26px]" />
          </div>
          <h3 className="font-headline text-headline-sm text-white font-bold mb-3">
            Tutora de IA 24/7
          </h3>
          <p className="font-body text-body-md text-dark-on-surface-variant mb-6 leading-relaxed">
            Não dá a resposta pronta: ensina pelo método socrático, fazendo as perguntas certas
            para você entender onde o raciocínio falhou e descobrir a solução por conta própria.
          </p>
          <div className="p-4 rounded bg-dark-surface-container border border-border-subtle font-code text-xs text-dark-on-surface space-y-2">
            <div className="flex items-center gap-2 text-dark-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-secondary" />
              <span>Exemplo de mentoria:</span>
            </div>
            <div className="text-dark-on-surface">
              &ldquo;Observe a linha 8: o que acontece com a variável quando o loop atinge o último
              índice do array?&rdquo;
            </div>
          </div>
        </div>

        {/* Recurso 2: Revisão de Código por IA */}
        <div className="bg-dark-surface border border-border-subtle rounded-lg p-8 hover:border-secondary/50 transition-colors">
          <div className="w-12 h-12 rounded bg-secondary/15 border border-secondary/30 text-secondary flex items-center justify-center mb-6">
            <MaterialIcon name="code_blocks" className="text-[26px]" />
          </div>
          <h3 className="font-headline text-headline-sm text-white font-bold mb-3">
            Revisão de Código por IA
          </h3>
          <p className="font-body text-body-md text-dark-on-surface-variant mb-6 leading-relaxed">
            Assim que seu código passa nos testes, a IA analisa a qualidade da solução:
            legibilidade, convenções de mercado, complexidade de tempo (Big O) e boas práticas de
            arquitetura.
          </p>
          <div className="p-4 rounded bg-dark-surface-container border border-border-subtle font-code text-xs text-dark-on-surface space-y-1.5">
            <div className="flex items-center justify-between text-secondary">
              <span>✓ Clean Code Score: 96/100</span>
              <span>O(n) linear</span>
            </div>
            <p className="text-dark-on-surface-variant">
              Sugestão de refatoração aplicada para melhor uso de memória.
            </p>
          </div>
        </div>

        {/* Recurso 3: Simulador de Entrevista Técnica */}
        <div className="bg-dark-surface border border-border-subtle rounded-lg p-8 hover:border-tertiary/50 transition-colors">
          <div className="w-12 h-12 rounded bg-tertiary/15 border border-tertiary/30 text-tertiary flex items-center justify-center mb-6">
            <MaterialIcon name="record_voice_over" className="text-[26px]" />
          </div>
          <h3 className="font-headline text-headline-sm text-white font-bold mb-3">
            Simulador de Entrevista de Emprego
          </h3>
          <p className="font-body text-body-md text-dark-on-surface-variant mb-6 leading-relaxed">
            Treine para processos seletivos reais. A IA assume o papel do recrutador técnico (tech
            lead), faz perguntas teóricas, pede explicações de código e avalia sua comunicação.
          </p>
          <div className="p-4 rounded bg-dark-surface-container border border-border-subtle font-code text-xs text-dark-on-surface flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-dark-on-surface">
              Simulações de Live Coding &amp; Perguntas Comportamentais
            </span>
            <span className="text-tertiary font-bold shrink-0">Feedback em tempo real</span>
          </div>
          <Link
            href="/entrevista"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-code font-bold text-tertiary hover:underline"
          >
            <span>Abrir simulador</span>
            <MaterialIcon name="arrow_forward" className="text-[14px]" />
          </Link>
        </div>

        {/* Recurso 4: Certificado Verificado & Talent Match */}
        <div className="bg-dark-surface border border-border-subtle rounded-lg p-8 hover:border-primary/50 transition-colors">
          <div className="w-12 h-12 rounded bg-primary/15 border border-primary/30 text-primary flex items-center justify-center mb-6">
            <MaterialIcon name="badge" className="text-[26px]" />
          </div>
          <h3 className="font-headline text-headline-sm text-white font-bold mb-3">
            Certificado &amp; Talent Match
          </h3>
          <p className="font-body text-body-md text-dark-on-surface-variant mb-6 leading-relaxed">
            Certificados autenticados com hash criptográfico comprovando as horas práticas e
            projetos entregues. Conexão direta com vagas em empresas parceiras que buscam devs
            testados.
          </p>
          <div className="p-4 rounded bg-dark-surface-container border border-border-subtle font-code text-xs text-dark-on-surface flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-dark-on-surface">
              Perfil com portfólio de desafios validados
            </span>
            <span className="text-secondary font-bold shrink-0">Pronto para o mercado</span>
          </div>
        </div>
      </div>
    </div>
  </section>
);
