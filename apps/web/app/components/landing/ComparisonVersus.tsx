import React from 'react';
import Link from 'next/link';
// Frente 3 — ícones SVG únicos da landing
import { IconBolt, IconSwords } from './icons';

interface ComparisonRow {
  aspect: string;
  traditional: string;
  nexus: string;
}

const ROWS: ComparisonRow[] = [
  {
    aspect: 'Método Pedagógico',
    traditional: 'Horas de videoaulas passivas onde você assiste outra pessoa programar.',
    nexus: 'Batalhas de código ativas de 5 minutos onde você digita e vence desafios.',
  },
  {
    aspect: 'Ritmo & Conclusão',
    traditional: 'Abandono frequente por fadiga, tédio e sensação de impotência.',
    nexus: 'Progressão RPG, XP, sequências de estudo e feedback imediato que mantêm você avançando.',
  },
  {
    aspect: 'Resolução de Dúvidas',
    traditional: 'Fóruns lentos ou robôs que cospem código pronto sem ensinar a pensar.',
    nexus: 'Nossa tutora de IA com método socrático: perguntas investigativas de causa raiz.',
  },
  {
    aspect: 'Validação para o Mercado',
    traditional: 'Certificado em PDF genérico que recrutadores e tech leads desconsideram.',
    nexus: 'Repositório Git real criado na sua matrícula, projetos no portfólio e certificados com verificação SHA-256 que qualquer um pode conferir.',
  },
  {
    aspect: 'Setup de Ambiente',
    traditional: 'Horas instalando compiladores, dependências e corrigindo conflitos de SO.',
    nexus: 'Zero instalação: containers Linux dedicados rodando direto no seu navegador.',
  },
];

export const ComparisonVersus: React.FC = () => {
  return (
    <section className="relative py-28 px-4 sm:px-6 max-w-6xl mx-auto border-t border-border-1">
      {/* Cabeçalho da Seção Assimétrico (Esquerda + Direita) */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-16">
        <div className="max-w-2xl text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-2 border border-border-1 text-brand-rose text-xs font-mono font-bold mb-4 shadow-elev-xs">
            <IconSwords className="w-5 h-5" />
            <span>COMPARATIVO DIRETO // SEM ENROLAÇÃO</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-black text-ink-heading tracking-tight mb-4">
            Assistir aula x aprender fazendo
          </h2>
          <p className="text-base sm:text-lg text-ink-body font-sans leading-relaxed">
            Veja por que engenheiros formados na prática superam desenvolvedores presos em cursos tradicionais de vídeo.
          </p>
        </div>

        {/* Contraste de método na Direita */}
        <div className="hidden lg:flex flex-col items-end gap-2 font-mono text-xs">
          <div className="px-4 py-2 rounded-xl bg-brand-green/10 border border-brand-green/30 text-brand-green-neon flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-brand-green-neon" />
            <span>MÉTODO ATIVO VS AULA PASSIVA</span>
          </div>
          <span className="text-xs text-ink-span">PROGRESSÃO, XP E FEEDBACK IMEDIATO</span>
        </div>
      </div>

      {/* Tabela Comparativa Estilo Vercel/Stripe de Luxo */}
      <div className="relative rounded-[28px] p-[1px] bg-gradient-to-b from-surface-4 via-surface-3 to-transparent shadow-elev-xl">
        <div className="rounded-[27px] bg-surface-1/95 overflow-hidden backdrop-blur-2xl">
          {/* Header das Colunas */}
          <div className="grid grid-cols-1 md:grid-cols-12 border-b border-border-1 text-center font-heading font-black text-sm sm:text-base">
            <div className="md:col-span-3 p-5 bg-background text-ink-span flex items-center justify-center font-mono text-body-sm tracking-wider uppercase">
              Critério de Avaliação
            </div>
            <div className="md:col-span-4 p-5 bg-black/40 text-brand-rose flex items-center justify-center gap-2.5 border-t md:border-t-0 md:border-l border-border-1">
              <span className="text-brand-rose font-black">✕</span>
              <span>Cursos Tradicionais em Vídeo</span>
            </div>
            <div className="md:col-span-5 p-5 bg-brand-cyan/10 text-brand-cyan-neon flex items-center justify-center gap-2.5 border-t md:border-t-0 md:border-l border-border-1">
              <IconBolt className="w-5 h-5" />
              <span>NEXUS CODE (RPG & IDE Real)</span>
            </div>
          </div>

          {/* Linhas */}
          <div className="divide-y divide-border-1">
            {ROWS.map((row, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 transition-colors hover:bg-surface-1">
                {/* Aspecto */}
                <div className="md:col-span-3 p-5 bg-background/60 font-mono text-body-sm text-ink-body font-bold flex items-center">
                  {row.aspect}
                </div>

                {/* Tradicional */}
                <div className="md:col-span-4 p-5 bg-black/20 text-body-sm sm:text-sm text-ink-span leading-relaxed flex items-center border-t md:border-t-0 md:border-l border-border-1">
                  <span className="mr-3 text-brand-rose font-bold shrink-0 text-base">✕</span>
                  <span>{row.traditional}</span>
                </div>

                {/* NEXUS */}
                <div className="md:col-span-5 p-5 bg-brand-cyan/10 text-body-sm sm:text-sm text-ink-heading font-medium leading-relaxed flex items-center border-t md:border-t-0 md:border-l border-border-1">
                  <span className="mr-3 text-brand-green-neon font-bold shrink-0 text-base">✔</span>
                  <span>{row.nexus}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Micro-Gatilho de Conversão */}
      <div className="mt-12 text-center">
        {/* Sprint 6 — microcopy alinhada ao funil real: o jogo abre como
            convidado (sem cartão e sem cadastro, como promete), e a ponte
            para salvar o progresso é explícita — a conta grátis é o que
            guarda XP, starter e jornada. Sem contagem de "masmorras
            abertas" que o produto não garante. */}
        <p className="text-body-sm text-ink-span font-sans mb-5">
          Experimente sem risco: entre no jogo agora como convidado, sem cartão e sem cadastro.
          Jogou e quer guardar seu XP, seu starter e seu progresso? Crie sua conta grátis — é ela
          que salva a sua jornada.
        </p>
        {/* Sprint 5 — ação de JOGO (não é cadastro): tratamento secundário
            distinto, sem o gradiente verde de conversão */}
        <Link
          href="/game"
          className="inline-flex items-center gap-2.5 px-9 py-4.5 rounded-2xl bg-surface-2 hover:bg-surface-3 border border-border-1 hover:border-brand-cyan-neon/50 text-brand-cyan-neon font-heading font-bold text-sm tracking-tight hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <IconSwords className="w-5 h-5" />
          <span>Iniciar Primeira Batalha no RPG Agora</span>
          <span>→</span>
        </Link>
      </div>
    </section>
  );
};
