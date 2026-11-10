import React from 'react';
import Link from 'next/link';
import { MaterialIcon } from '../MaterialIcon';

// Central 216 retrabalho (D1) — seção "Gamificação de verdade" do
// protótipo Stitch v2 (home-desktop.html): Mapa da Trilha, Liga,
// Streak e Badges. Sem números de aluno (não há aluno logado na
// home pública e os valores do mock — "12/18", "Liga Diamante #12",
// "Streak 14 dias", "28 Conquistas" — são inventados): a seção
// descreve o sistema — tiers reais Bronze, Prata e Ouro — e cada
// card leva à ação real (cadastro / desafios / ligas).
export const GamificationSection: React.FC = () => (
  <section id="gamificacao" className="relative z-10 py-24 px-6 sm:px-8 max-w-7xl mx-auto border-t border-border-2/70">
    <div className="max-w-2xl mb-14">
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-purple/10 border border-brand-purple/30 text-brand-purple-light text-xs font-mono font-bold mb-3">
        <MaterialIcon name="sports_esports" className="text-[16px]" />
        <span>GAMIFICAÇÃO DE VERDADE</span>
      </div>
      <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-white tracking-tight mb-4">
        Aprender programando vicia quando parece um RPG
      </h2>
      <p className="text-base sm:text-lg text-ink-body leading-relaxed font-sans">
        Você não estuda por obrigação. Cada linha de código correta acumula XP, desbloqueia novas fases e coloca você nas melhores divisões de desenvolvedores.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="rounded-xl bg-dark-surface-container-low border border-border-subtle p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 border border-primary/40 text-dark-primary">
            <MaterialIcon name="map" className="text-[22px]" />
          </span>
          <h3 className="font-headline text-lg font-bold text-white">Mapa da Trilha</h3>
        </div>
        <p className="text-sm text-ink-body leading-relaxed">
          Sua trilha é um mapa de fases: cada fase concluída abre a próxima, e o guardião da fase testa o que você aprendeu. O mapa completo aparece no seu painel, com o seu progresso real.
        </p>
        <Link href="/dashboard" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-dark-primary hover:underline">
          Ver meu mapa
          <MaterialIcon name="arrow_forward" className="text-[16px]" />
        </Link>
      </div>

      <div className="rounded-xl bg-dark-surface-container-low border border-border-subtle p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-amber/15 border border-brand-amber/40 text-brand-amber">
            <MaterialIcon name="emoji_events" className="text-[22px]" />
          </span>
          <h3 className="font-headline text-lg font-bold text-white">Ligas Bronze, Prata e Ouro</h3>
        </div>
        <p className="text-sm text-ink-body leading-relaxed">
          Semanalmente você compete na sua liga — Bronze, Prata ou Ouro, conforme o seu nível. Os primeiros sobem de divisão; o ranking é por nível, nunca uma liga única global.
        </p>
        <Link href="/leaderboard" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-dark-primary hover:underline">
          Ver ligas e ranking
          <MaterialIcon name="arrow_forward" className="text-[16px]" />
        </Link>
      </div>

      <div className="rounded-xl bg-dark-surface-container-low border border-border-subtle p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-amber/15 border border-brand-amber/40 text-brand-amber">
            <MaterialIcon name="local_fire_department" className="text-[22px]" />
          </span>
          <h3 className="font-headline text-lg font-bold text-white">Streak diário</h3>
        </div>
        <p className="text-sm text-ink-body leading-relaxed">
          Constância diária multiplica o seu ganho de XP. Seu streak aparece no painel e conta os dias seguidos em que você resolveu desafios.
        </p>
        <Link href="/desafios" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-dark-primary hover:underline">
          Resolver o desafio de hoje
          <MaterialIcon name="arrow_forward" className="text-[16px]" />
        </Link>
      </div>

      <div className="rounded-xl bg-dark-surface-container-low border border-border-subtle p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/15 border border-secondary/40 text-secondary">
            <MaterialIcon name="military_tech" className="text-[22px]" />
          </span>
          <h3 className="font-headline text-lg font-bold text-white">Badges e conquistas</h3>
        </div>
        <p className="text-sm text-ink-body leading-relaxed">
          Conquistas desbloqueadas pelo que você realmente fez — fases vencidas, streaks mantidos, desafios resolvidos. Mostre suas medalhas no seu perfil público.
        </p>
        <Link href="/profile" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-dark-primary hover:underline">
          Ver meu perfil
          <MaterialIcon name="arrow_forward" className="text-[16px]" />
        </Link>
      </div>
    </div>
  </section>
);
